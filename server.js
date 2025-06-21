const http                  = require('http');
const handleImagesStatic    = require('./handlers/imagesStaticHandler');
const handleImobilAdd       = require('./handlers/imobilAddHandler');
const handleImageUpload     = require('./handlers/imageUploadHandler');
const handleImobileGet      = require('./handlers/imobileGetHandler');
const handleImagesGet       = require('./handlers/imagesGetHandler');

const hostname              = 'localhost';
const port                  = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
    console.log('Cerere primită:', req.method, req.url);
    
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Routing
    if (req.method === 'GET' && req.url.startsWith('/images/')) {
        handleImagesStatic(req, res);
    } else if (req.method === 'POST' && req.url === '/api/imobil') {
        handleImobilAdd(req, res);
    } else if (req.method === 'POST' && req.url === '/api/upload-imagine') {
        handleImageUpload(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/api/imobile')) {
        handleImobileGet(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/api/imagini/')) {
        handleImagesGet(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', mesaj: 'Not found' }));
    }
});

server.listen(port, () => {
  console.log(`Serverul rulează pe http://${hostname}:${port}`);
});