const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Store pentru sesiuni in memorie (pentru dezvoltare)
const activeSessions = new Map();

function handleSignIn(req, res) {
    const pool = require('../config/database');
    res.setHeader('Set-Cookie', `sesiune=${token}; Path=/; HttpOnly; SameSite=None; Secure`);
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', async () => {
        try {
            const { username, password } = JSON.parse(body);
            
            // Validare date obligatorii
            if (!username || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Username si parola sunt obligatorii!' 
                }));
                return;
            }
            
            // Cauta user-ul in baza de date
            const sql = `
                SELECT id, username, email, password_hash, data_inregistrare 
                FROM users 
                WHERE username = $1
            `;
            
            pool.query(sql, [username], async (err, result) => {
                if (err) {
                    console.error('Eroare cautare user:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Eroare la verificarea datelor!' 
                    }));
                    return;
                }
                
                if (result.rows.length === 0) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Username sau parola incorecta!' 
                    }));
                    return;
                }
                
                const user = result.rows[0];
                
                try {
                    // Verifica parola
                    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
                    
                    if (!isPasswordValid) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: false, 
                            message: 'Username sau parola incorecta!' 
                        }));
                        return;
                    }
                    
                    // Genereaza session token
                    const sessionToken = crypto.randomBytes(32).toString('hex');
                    
                    // Salveaza sesiunea (fara password_hash)
                    const userSession = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        data_inregistrare: user.data_inregistrare,
                        loginTime: new Date()
                    };
                    
                    activeSessions.set(sessionToken, userSession);
                    
                    console.log('User logat:', user.username, 'Token:', sessionToken.substring(0, 8) + '...');
                    
                    // Seteaza cookie-ul cu session token
                    const cookieOptions = [
                        `session_token=${sessionToken}`,
                        'HttpOnly', // Pentru securitate
                        'Path=/',
                        'Max-Age=86400', // 24 ore
                        'SameSite=Strict'
                    ];
                    
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Set-Cookie': cookieOptions.join('; ')
                    });
                    
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: 'Conectare reusita!',
                        user: userSession
                    }));
                    
                } catch (compareError) {
                    console.error('Eroare verificare parola:', compareError);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Eroare la verificarea parolei!' 
                    }));
                }
            });
            
        } catch (error) {
            console.error('Eroare JSON parse:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                message: 'Date JSON invalide!' 
            }));
        }
    });
}

// Functie helper pentru verificarea sesiunii
function getActiveSession(sessionToken) {
    return activeSessions.get(sessionToken) || null;
}

// Functie helper pentru stergerea sesiunii
function deleteSession(sessionToken) {
    return activeSessions.delete(sessionToken);
}

module.exports = { 
    handleSignIn, 
    getActiveSession, 
    deleteSession 
};