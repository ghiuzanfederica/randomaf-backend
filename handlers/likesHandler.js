const pool = require('../config/database');
const { getActiveSession } = require('./signInHandler');
const { parseCookies } = require('./getCurrentUserHandler');

// Handler pentru adaugare/stergere like
function handleLikeToggle(req, res) {
    const url = require('url');
    const parsedUrl = url.parse(req.url, true);
    const anuntId = parsedUrl.pathname.split('/').pop();

    // Verifica autentificarea
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies.session_token;
    const userSession = getActiveSession(sessionToken);

    if (!userSession) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Neautentificat' }));
        return;
    }

    if (req.method === 'POST') {
        // Toggle like
        const checkSql = 'SELECT * FROM likes WHERE user_id = $1 AND anunt_id = $2';
        
        pool.query(checkSql, [userSession.id, anuntId], (err, result) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Eroare server' }));
                return;
            }

            if (result.rows.length > 0) {
                // Exista deja, il stergem
                const deleteSql = 'DELETE FROM likes WHERE user_id = $1 AND anunt_id = $2';
                pool.query(deleteSql, [userSession.id, anuntId], (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Eroare la stergere' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ liked: false }));
                });
            } else {
                // Nu exista, il adaugam
                const insertSql = 'INSERT INTO likes (user_id, anunt_id) VALUES ($1, $2)';
                pool.query(insertSql, [userSession.id, anuntId], (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Eroare la adaugare' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ liked: true }));
                });
            }
        });
    } else if (req.method === 'GET') {
        // Verifica daca user-ul a dat like
        const sql = 'SELECT * FROM likes WHERE user_id = $1 AND anunt_id = $2';
        pool.query(sql, [userSession.id, anuntId], (err, result) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Eroare server' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ liked: result.rows.length > 0 }));
        });
    }
}

// Handler pentru obtinerea favoritelor unui user
function handleGetFavorites(req, res) {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies.session_token;
    const userSession = getActiveSession(sessionToken);

    if (!userSession) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Neautentificat' }));
        return;
    }

    const sql = `
        SELECT a.*, l.data_adaugare as liked_at
        FROM likes l
        JOIN anunturi a ON l.anunt_id = a.id
        WHERE l.user_id = $1
        ORDER BY l.data_adaugare DESC
    `;

    pool.query(sql, [userSession.id], (err, result) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Eroare server' }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows));
    });
}

module.exports = { handleLikeToggle, handleGetFavorites };