require('dotenv').config();
const http                  = require('http');
const handleImobileGet      = require('./handlers/imobileGetHandler');
const handleImobileAdd      = require('./handlers/imobileAddHandler');
const handleCoordsGet       = require('./handlers/coordsGetHandler');
const handleImagesStatic    = require('./handlers/imagesStaticHandler');
const handleImageUpload     = require('./handlers/imageUploadHandler');
const handleImagesGet       = require('./handlers/imagesGetHandler');
const handleSignUp          = require('./handlers/signUpHandler');
const { handleSignIn }      = require('./handlers/signInHandler');
const { handleLikeToggle, handleGetFavorites }  = require('./handlers/likesHandler');
const { handleGetCurrentUser, handleLogout }    = require('./handlers/getCurrentUserHandler');

const hostname              = '0.0.0.0';
const port                  = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
    console.log('Cerere primita:', req.method, req.url);
    
    // CORS
    const allowedOrigins = [
        'https://ghiuzanfederica.github.io'
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');

    // Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Routing
    if (req.method === 'GET' && req.url.startsWith('/api/imobile')) {
        handleImobileGet(req, res);
    } else if (req.method === 'POST' && req.url === '/api/imobile') {
        handleImobileAdd(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/api/coords')) {
        handleCoordsGet(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/api/imagini/')) {
        handleImagesGet(req, res);
    } else if (req.method === 'POST' && req.url === '/api/upload-imagine') {
        handleImageUpload(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/images/')) {
        handleImagesStatic(req, res);
    } else if (req.method === 'POST' && req.url === '/api/auth/register') {
        handleSignUp(req, res);
    } else if (req.method === 'POST' && req.url === '/api/auth/login') {
        handleSignIn(req, res);
    } else if (req.method === 'GET' && req.url === '/api/auth/current-user') {
        handleGetCurrentUser(req, res);
    } else if (req.method === 'POST' && req.url === '/api/auth/logout') {
        handleLogout(req, res);
    } else if (req.method === 'POST' && req.url.startsWith('/api/likes/')) {
        handleLikeToggle(req, res);
    } else if (req.method === 'GET' && req.url.startsWith('/api/likes/')) {
        handleLikeToggle(req, res);
    } else if (req.method === 'GET' && req.url === '/api/favorites') {
        handleGetFavorites(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', mesaj: 'Not found' }));
    }
});

server.listen(port, hostname, () => {
  console.log(`Serverul ruleaza pe http://${hostname}:${port}`);
});