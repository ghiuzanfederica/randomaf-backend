function handleImagesGet(req, res) {
    const pool = require('../config/database');

    // Test rapid al pool-ului
    console.log('Pool de conexiuni încărcat:', !!pool);

    console.log('=== HANDLER IMAGINI APELAT ===');
    console.log('URL primit:', req.url); // Debug
    console.log('Method:', req.method); // Debug
    
    const anuntId = req.url.split('/').pop();
    console.log('Anunt ID extras:', anuntId); // Debug
    
    // Validare că anuntId este un număr valid
    if (!anuntId || isNaN(anuntId)) {
        console.log('ID invalid:', anuntId); // Debug
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ID anunț invalid' }));
        return;
    }
    
    const parsedId = parseInt(anuntId);
    console.log('ID parsat:', parsedId); // Debug
    
    // Query pentru a obține toate imaginile unui anunț, ordonate după ordinea specificată
    const query = 'SELECT id, url, ordine FROM imagini WHERE anunt_id = $1 ORDER BY ordine ASC';
    console.log('Query executat:', query, 'cu parametrul:', parsedId); // Debug
    
    pool.query(query, [parsedId], (err, result) => {
        if (err) {
            console.error('Eroare la interogarea bazei de date:', err);
            console.error('Stack trace:', err.stack);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Eroare server', details: err.message }));
            return;
        }
        
        console.log('Rezultat query:', result.rows); // Debug
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows));
    });
}

module.exports = handleImagesGet;