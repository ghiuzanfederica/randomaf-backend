function handleImobileGet(req, res) {
    const pool = require('../config/database');
    const query = new URL(req.url, `http://${req.headers.host}`).searchParams;

    // Selectează prima imagine și suprafața pentru fiecare anunț
    let sql = `
        SELECT a.*, 
            COALESCE(ap.suprafata_utila, c.suprafata_utila, t.suprafata_teren, s.suprafata_utila) AS suprafata,
            (SELECT url FROM imagini WHERE anunt_id = a.id ORDER BY ordine ASC, id ASC LIMIT 1) AS imagine
        FROM anunturi a
        LEFT JOIN apartamente ap ON ap.anunt_id = a.id
        LEFT JOIN casee c ON c.anunt_id = a.id
        LEFT JOIN terenuri t ON t.anunt_id = a.id
        LEFT JOIN spatii_comerciale s ON s.anunt_id = a.id
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (query.get('minPrice')) {
        sql += ` AND a.pret >= $${paramIndex}`;
        params.push(parseInt(query.get('minPrice')));
        paramIndex++;
    }
    if (query.get('maxPrice')) {
        sql += ` AND a.pret <= $${paramIndex}`;
        params.push(parseInt(query.get('maxPrice')));
        paramIndex++;
    }
    if (query.get('tip')) {
        sql += ` AND a.tip_imobil = $${paramIndex}`;
        params.push(query.get('tip'));
        paramIndex++;
    }
    if (query.get('oferta')) {
        sql += ` AND a.tip_oferta = $${paramIndex}`;
        params.push(query.get('oferta'));
        paramIndex++;
    }

    pool.query(sql, params, (err, result) => {
        if (err) {
            console.error('Eroare SQL:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare SQL' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows));
    });
}

module.exports = handleImobileGet;