function handleImobileGet(req, res) {
    const pool = require('../config/database');

    const query = new URL(req.url, `http://${req.headers.host}`).searchParams;

    // Query principal pentru anunturi cu JOIN-uri pentru datele specifice
    let sql = `
        SELECT 
            a.id,
            a.tip_imobil,
            a.tip_oferta,
            a.titlu,
            a.pret,
            a.comision,
            a.localizare,
            a.descriere,
            a.data_publicare,
            -- Apartamente
            ap.nr_camere as ap_nr_camere,
            ap.nr_bai as ap_nr_bai,
            ap.compartimentare,
            ap.confort,
            ap.etaj,
            ap.an_constructie as ap_an_constructie,
            ap.suprafata_utila as ap_suprafata_utila,
            -- Case
            c.nr_camere as c_nr_camere,
            c.nr_bai as c_nr_bai,
            c.an_constructie as c_an_constructie,
            c.suprafata_utila as c_suprafata_utila,
            c.suprafata_teren as c_suprafata_teren,
            -- Terenuri
            t.suprafata_teren as t_suprafata_teren,
            t.tip_teren,
            t.clasificare,
            t.front_stradal,
            -- Spatii comerciale
            sc.suprafata_utila as sc_suprafata_utila,
            sc.nr_camere as sc_nr_camere,
            sc.nr_bai as sc_nr_bai,
            sc.an_constructie as sc_an_constructie
        FROM anunturi a
        LEFT JOIN apartamente ap ON a.id = ap.anunt_id
        LEFT JOIN casee c ON a.id = c.anunt_id
        LEFT JOIN terenuri t ON a.id = t.anunt_id
        LEFT JOIN spatii_comerciale sc ON a.id = sc.anunt_id
        WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Filtrare dupa pret minim
    if (query.get('minPrice')) {
        sql += ` AND a.pret >= $${paramIndex}`;
        params.push(parseFloat(query.get('minPrice')));
        paramIndex++;
    }

    // Filtrare dupa pret maxim
    if (query.get('maxPrice')) {
        sql += ` AND a.pret <= $${paramIndex}`;
        params.push(parseFloat(query.get('maxPrice')));
        paramIndex++;
    }

    // Filtrare dupa tipul imobilului
    if (query.get('tip')) {
        sql += ` AND a.tip_imobil = $${paramIndex}`;
        params.push(query.get('tip'));
        paramIndex++;
    }

    // Filtrare dupa tipul ofertei
    if (query.get('oferta')) {
        sql += ` AND a.tip_oferta = $${paramIndex}`;
        params.push(query.get('oferta'));
        paramIndex++;
    }

    // Filtrare dupa oras
    if (query.get('oras')) {
        sql += ` AND LOWER(SPLIT_PART(a.localizare, ',', 1)) = $${paramIndex}`;
        params.push(query.get('oras').toLowerCase());
        paramIndex++;
    }

    // Filtrare dupa localitate
    if (query.get('localitate')) {
        sql += ` AND LOWER(TRIM(SPLIT_PART(a.localizare, ',', 2))) = $${paramIndex}`;
        params.push(query.get('localitate').toLowerCase());
        paramIndex++;
    }

    // Filtrare dupa ownership
    if (query.get('userId')) {
        sql = sql.replace(
            'WHERE 1=1',
            `INNER JOIN ownership o ON a.id = o.anunt_id
            WHERE o.user_id = $${paramIndex}`
        );
        params.push(parseInt(query.get('userId')));
        paramIndex++;
    }

    console.log('SQL Query:', sql);
    console.log('Params:', params);

    // Executare query principal
    pool.query(sql, params, (err, result) => {
        if (err) {
            console.error('Eroare SQL:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la citire din baza de date!' }));
            return;
        }

        if (result.rows.length === 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
        }

        // Filtrare dupa search in descriere
        let filteredRows = result.rows;
        if (query.get('search')) {
            const searchTerms = query.get('search').split(',').map(term => term.trim().toLowerCase()).filter(term => term.length > 0);
            if (searchTerms.length > 0) {
                filteredRows = result.rows.filter(row => {
                    const descriere = row.descriere ? row.descriere.toLowerCase() : '';
                    return searchTerms.some(term => descriere.includes(term));
                });
            }
        }

        if (filteredRows.length === 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
        }

        // Obtinere imagini pentru toate anunturile
        const anuntIds = filteredRows.map(row => row.id);
        const imaginiSql = `
            SELECT anunt_id, url, ordine 
            FROM imagini 
            WHERE anunt_id = ANY($1) 
            ORDER BY anunt_id, ordine
        `;

        pool.query(imaginiSql, [anuntIds], (errImagini, resultImagini) => {
            if (errImagini) {
                console.error('Eroare la incarcarea imaginilor:', errImagini);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la incarcarea imaginilor!' }));
                return;
            }

            // Grupare imagini dupa anunt_id
            const imaginiMap = {};
            resultImagini.rows.forEach(img => {
                if (!imaginiMap[img.anunt_id]) {
                    imaginiMap[img.anunt_id] = [];
                }
                imaginiMap[img.anunt_id].push({
                    url: img.url,
                    ordine: img.ordine
                });
            });

            // Structurare raspuns final
            const anunturi = filteredRows.map(row => {
                // Date comune pentru toate anunturile
                const anunt = {
                    id: row.id,
                    tip_imobil: row.tip_imobil,
                    tip_oferta: row.tip_oferta,
                    titlu: row.titlu,
                    pret: parseFloat(row.pret),
                    comision: row.comision ? parseFloat(row.comision) : null,
                    localizare: row.localizare,
                    descriere: row.descriere,
                    data_publicare: row.data_publicare,
                    imagini: imaginiMap[row.id] || []
                };

                // Date specifice in functie de tipul imobilului
                switch (row.tip_imobil) {
                    case 'apartament':
                        anunt.detalii_specifice = {
                            nr_camere: row.ap_nr_camere,
                            nr_bai: row.ap_nr_bai,
                            compartimentare: row.compartimentare,
                            confort: row.confort,
                            etaj: row.etaj,
                            an_constructie: row.ap_an_constructie,
                            suprafata_utila: row.ap_suprafata_utila ? parseFloat(row.ap_suprafata_utila) : null
                        };
                        break;

                    case 'casa':
                        anunt.detalii_specifice = {
                            nr_camere: row.c_nr_camere,
                            nr_bai: row.c_nr_bai,
                            an_constructie: row.c_an_constructie,
                            suprafata_utila: row.c_suprafata_utila ? parseFloat(row.c_suprafata_utila) : null,
                            suprafata_teren: row.c_suprafata_teren ? parseFloat(row.c_suprafata_teren) : null
                        };
                        break;

                    case 'teren':
                        anunt.detalii_specifice = {
                            suprafata_teren: row.t_suprafata_teren ? parseFloat(row.t_suprafata_teren) : null,
                            tip_teren: row.tip_teren,
                            clasificare: row.clasificare,
                            front_stradal: row.front_stradal ? parseFloat(row.front_stradal) : null
                        };
                        break;

                    case 'spatiu_comercial':
                        anunt.detalii_specifice = {
                            suprafata_utila: row.sc_suprafata_utila ? parseFloat(row.sc_suprafata_utila) : null,
                            nr_camere: row.sc_nr_camere,
                            nr_bai: row.sc_nr_bai,
                            an_constructie: row.sc_an_constructie
                        };
                        break;

                    default:
                        anunt.detalii_specifice = {};
                }

                return anunt;
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(anunturi));
        });
    });
}

module.exports = handleImobileGet;