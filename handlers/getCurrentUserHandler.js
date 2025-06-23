const { getActiveSession } = require('./signInHandler');

function handleGetCurrentUser(req, res) {
    try {
        // Extrage cookie-urile din header
        const cookies = parseCookies(req.headers.cookie || '');
        const sessionToken = cookies.session_token;
        
        if (!sessionToken) {
            // Nu exista session token
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                user: null, 
                message: 'Niciun utilizator conectat' 
            }));
            return;
        }
        
        // Verifica daca sesiunea exista si este valida
        const userSession = getActiveSession(sessionToken);
        
        if (!userSession) {
            // Session token invalid sau expirat
            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Set-Cookie': 'session_token=; HttpOnly; Path=/; Max-Age=0' // Sterge cookie-ul invalid
            });
            res.end(JSON.stringify({ 
                success: true, 
                user: null, 
                message: 'Sesiune expirata' 
            }));
            return;
        }
        
        console.log('User conectat gasit:', userSession.username);
        
        // Returneaza datele user-ului conectat
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true, 
            user: userSession,
            message: 'Utilizator conectat gasit'
        }));
        
    } catch (error) {
        console.error('Eroare verificare user conectat:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            user: null, 
            message: 'Eroare server' 
        }));
    }
}

// Handler pentru logout
function handleLogout(req, res) {
    try {
        const cookies = parseCookies(req.headers.cookie || '');
        const sessionToken = cookies.session_token;
        
        if (sessionToken) {
            // Sterge sesiunea din memorie
            const { deleteSession } = require('./signInHandler');
            deleteSession(sessionToken);
            console.log('Sesiune stearsa pentru token:', sessionToken.substring(0, 8) + '...');
        }
        
        // Sterge cookie-ul
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Set-Cookie': 'session_token=; HttpOnly; Path=/; Max-Age=0'
        });
        
        res.end(JSON.stringify({ 
            success: true, 
            message: 'Deconectare reusita' 
        }));
        
    } catch (error) {
        console.error('Eroare logout:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            message: 'Eroare la deconectare' 
        }));
    }
}

// Functie helper pentru parsarea cookie-urilor
function parseCookies(cookieString) {
    const cookies = {};
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
            cookies[name] = decodeURIComponent(value);
        }
    });
    
    return cookies;
}

module.exports = { 
    handleGetCurrentUser, 
    handleLogout, 
    parseCookies 
};