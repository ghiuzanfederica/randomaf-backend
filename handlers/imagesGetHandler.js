function handleImagesGet(req, res) {
    const pool = require('../config/database');

    // Test rapid al pool-ului
    console.log('Pool de conexiuni incarcat:', !!pool);

    console.log('=== HANDLER IMAGINI APELAT ===');
    console.log('URL primit:', req.url); // Debug
    console.log('Method:', req.method); // Debug
    
    const anuntId = req.url.split('/').pop();
    console.log('Anunt ID extras:', anuntId); // Debug
    
    // Validare ca anuntId este un numar valid
    if (!anuntId || isNaN(anuntId)) {
        console.log('ID invalid:', anuntId); // Debug
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ID anunt invalid' }));
        return;
    }
    
    const parsedId = parseInt(anuntId);
    console.log('ID parsat:', parsedId); // Debug
    
    // Query pentru a obtine toate imaginile unui anunt, ordonate dupa ordinea specificata
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