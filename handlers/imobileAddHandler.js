function handleImobileAdd(req, res) {
    const pool = require('../config/database');
    const { getActiveSession } = require('./signInHandler');
    const { parseCookies } = require('./getCurrentUserHandler');
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const anunt = JSON.parse(body);
            
            // Validare date obligatorii
            if (!anunt.tip_imobil || !anunt.tip_oferta || !anunt.titlu || !anunt.pret) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', mesaj: 'Date obligatorii lipsesc!' }));
                return;
            }
            
            // 1. Inserare in tabela anunturi
            const anuntSql = `
                INSERT INTO anunturi (tip_imobil, tip_oferta, titlu, pret, comision, localizare, descriere, data_publicare)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `;
            
            const anuntParams = [
                anunt.tip_imobil,
                anunt.tip_oferta,
                anunt.titlu,
                anunt.pret,
                anunt.comision || null,
                anunt.localizare || null,
                anunt.descriere || null,
                anunt.data_publicare || new Date().toISOString()
            ];
            
            pool.query(anuntSql, anuntParams, (err, result) => {
                if (err) {
                    console.error('Eroare inserare anunt:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la salvarea anuntului!' }));
                    return;
                }
                
                const anuntId = result.rows[0].id;
                console.log('Anunt ID creat:', anuntId);

                // Obtine user-ul din sesiune
                const cookies = parseCookies(req.headers.cookie || '');
                const sessionToken = cookies.session_token;
                const userSession = getActiveSession(sessionToken);

                // Salveaza ownership daca user-ul e autentificat
                if (userSession && userSession.id) {
                    const ownershipSql = 'INSERT INTO ownership (user_id, anunt_id) VALUES ($1, $2)';
                    pool.query(ownershipSql, [userSession.id, anuntId], (err) => {
                        if (err) {
                            console.error('Eroare ownership:', err);
                        } else {
                            console.log('Ownership salvat pentru user:', userSession.username);
                        }
                    });
                }
                
                // 2. Inserare date specifice in functie de tip
                insertSpecificData(pool, anunt.tip_imobil, anuntId, anunt.detalii_specifice, (err) => {
                    if (err) {
                        console.error('Eroare inserare detalii specifice:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la salvarea detaliilor!' }));
                        return;
                    }
                    
                    // 3. Inserare imagini (daca exista)
                    if (anunt.imagini && anunt.imagini.length > 0) {
                        console.log('Inserez imagini pentru anuntId:', anuntId);
                        insertImages(pool, anuntId, anunt.imagini, (err) => {
                            if (err) {
                                console.error('Eroare inserare imagini:', err);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la salvarea imaginilor!' }));
                                return;
                            }
                            
                            res.writeHead(201, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                status: 'success', 
                                mesaj: 'Anunt adaugat cu succes!',
                                id: anuntId,
                                anunt: {
                                    id: anuntId,
                                    tip_imobil: anunt.tip_imobil,
                                    tip_oferta: anunt.tip_oferta,
                                    titlu: anunt.titlu,
                                    pret: parseFloat(anunt.pret),
                                    comision: anunt.comision ? parseFloat(anunt.comision) : null,
                                    localizare: anunt.localizare,
                                    descriere: anunt.descriere,
                                    data_publicare: anunt.data_publicare,
                                    imagini: anunt.imagini,
                                    detalii_specifice: anunt.detalii_specifice
                                }
                            }));
                        });
                    } else {
                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            status: 'success', 
                            mesaj: 'Anunt adaugat cu succes!',
                            id: anuntId,
                            anunt: {
                                id: anuntId,
                                tip_imobil: anunt.tip_imobil,
                                tip_oferta: anunt.tip_oferta,
                                titlu: anunt.titlu,
                                pret: parseFloat(anunt.pret),
                                comision: anunt.comision ? parseFloat(anunt.comision) : null,
                                localizare: anunt.localizare,
                                descriere: anunt.descriere,
                                data_publicare: anunt.data_publicare,
                                imagini: [],
                                detalii_specifice: anunt.detalii_specifice
                            }
                        }));
                    }
                });
            });
            
        } catch (error) {
            console.error('Eroare JSON parse:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', mesaj: 'Date JSON invalide!' }));
        }
    });
}

function insertSpecificData(pool, tipImobil, anuntId, detalii, callback) {
    if (!detalii) {
        callback(null);
        return;
    }
    
    let sql, params;
    
    switch (tipImobil) {
        case 'apartament':
            sql = `
                INSERT INTO apartamente (anunt_id, nr_camere, nr_bai, compartimentare, confort, etaj, an_constructie, suprafata_utila)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            params = [
                anuntId,
                detalii.nr_camere || null,
                detalii.nr_bai || null,
                detalii.compartimentare || null,
                detalii.confort || null,
                detalii.etaj || null,
                detalii.an_constructie || null,
                detalii.suprafata_utila || null
            ];
            break;
            
        case 'casa':
            sql = `
                INSERT INTO casee (anunt_id, nr_camere, nr_bai, an_constructie, suprafata_utila, suprafata_teren)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            params = [
                anuntId,
                detalii.nr_camere || null,
                detalii.nr_bai || null,
                detalii.an_constructie || null,
                detalii.suprafata_utila || null,
                detalii.suprafata_teren || null
            ];
            break;
            
        case 'teren':
            sql = `
                INSERT INTO terenuri (anunt_id, suprafata_teren, tip_teren, clasificare, front_stradal)
                VALUES ($1, $2, $3, $4, $5)
            `;
            params = [
                anuntId,
                detalii.suprafata_teren || null,
                detalii.tip_teren || null,
                detalii.clasificare || null,
                detalii.front_stradal || null
            ];
            break;
            
        case 'spatiu-comercial':
        case 'spatiu_comercial':
            sql = `
                INSERT INTO spatii_comerciale (anunt_id, suprafata_utila, nr_camere, nr_bai, an_constructie)
                VALUES ($1, $2, $3, $4, $5)
            `;
            params = [
                anuntId,
                detalii.suprafata_utila || null,
                detalii.nr_camere || null,
                detalii.nr_bai || null,
                detalii.an_constructie || null
            ];
            break;
            
        default:
            callback(null);
            return;
    }
    
    pool.query(sql, params, callback);
}

function insertImages(pool, anuntId, imagini, callback) {
    if (!imagini || imagini.length === 0) {
        callback(null);
        return;
    }
    
    let completed = 0;
    let hasError = false;
    
    imagini.forEach((img, index) => {
        if (hasError) return;
        
        const sql = `INSERT INTO imagini (anunt_id, url, ordine) VALUES ($1, $2, $3)`;
        const params = [anuntId, img.url, img.ordine || (index + 1)];
        
        pool.query(sql, params, (err) => {
            if (err && !hasError) {
                hasError = true;
                callback(err);
                return;
            }
            
            completed++;
            if (completed === imagini.length && !hasError) {
                callback(null);
            }
        });
    });
}

module.exports = handleImobileAdd;