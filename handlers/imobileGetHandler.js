function handleImobileGet(req, res) {
    const pool = require('../config/database');

    const query = new URL(req.url, `http://${req.headers.host}`).searchParams;

    let sql = 'SELECT * FROM anunturi WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (query.get('minPrice')) {
        sql += ` AND pret >= $${paramIndex}`;
        params.push(parseInt(query.get('minPrice')));
        paramIndex++;
    }
    
    if (query.get('maxPrice')) {
        sql += ` AND pret <= $${paramIndex}`;
        params.push(parseInt(query.get('maxPrice')));
        paramIndex++;
    }
    
    if (query.get('tip')) {
        sql += ` AND tip_imobil = $${paramIndex}`;
        params.push(query.get('tip'));
        paramIndex++;
    }
    
    if (query.get('oferta')) {
        sql += ` AND tip_oferta = $${paramIndex}`;
        params.push(query.get('oferta'));
        paramIndex++;
    }
    
    console.log('SQL Query:', sql);
    console.log('Params:', params);

    pool.query(sql, params, (err, result) => {
        if (err) {
            console.error('Eroare SQL:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la citire din baza de date!' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows));
    });
}

module.exports = handleImobileGet;