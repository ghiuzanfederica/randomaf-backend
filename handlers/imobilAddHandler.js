async function handleImobilAdd(req, res) {
    const pool = require('../config/database');

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            
            // Mapare corectă pentru tabela anunturi
            const mainQuery = `
                INSERT INTO anunturi (tip_imobil, tip_oferta, titlu, pret, localizare, descriere)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `;
            const mainValues = [
                data.tip, data.tranzactie, data.titlu, data.pret, data.locatie, data.descriere
            ];

            const client = await pool.connect();
            try {
                const mainResult = await client.query(mainQuery, mainValues);
                const anuntId = mainResult.rows[0].id;

                // Inserare în tabelele specifice
                if (data.tip === 'apartament') {
                    await client.query(
                        `INSERT INTO apartamente (anunt_id, nr_camere, nr_bai, compartimentare, confort, etaj, an_constructie, suprafata_utila)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [anuntId, data.nrCamere, data.nrBai, data.compartimentare, data.confort, data.etaj, data.anConstructie, data.suprafataUtila]
                    );
                } else if (data.tip === 'casa') {
                    await client.query(
                        `INSERT INTO casee (anunt_id, nr_camere, nr_bai, an_constructie, suprafata_utila, suprafata_teren)
                        VALUES ($1, $2, $3, $4, $5, $6)`,
                        [anuntId, data.nrCamere, data.nrBai, data.anConstructie, data.suprafataUtila, data.suprafataTeren]
                    );
                } else if (data.tip === 'teren') {
                    await client.query(
                        `INSERT INTO terenuri (anunt_id, suprafata_teren, tip_teren, clasificare, front_stradal)
                        VALUES ($1, $2, $3, $4, $5)`,
                        [anuntId, data.suprafataTeren, data.tipTeren, data.clasificare, data.frontStradal]
                    );
                } else if (data.tip === 'spatiu-comercial') {
                    await client.query(
                        `INSERT INTO spatii_comerciale (anunt_id, suprafata_utila)
                        VALUES ($1, $2)`,
                        [anuntId, data.suprafataUtila]
                    );
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', mesaj: 'Anunț salvat!', id: anuntId }));

            } catch (err) {
                console.error('Eroare la inserare:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la salvare!' }));
            } finally {
                client.release();
            }
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', mesaj: 'Date invalide!' }));
        }
    });
}

module.exports = handleImobilAdd;