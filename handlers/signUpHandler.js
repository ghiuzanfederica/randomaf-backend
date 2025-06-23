const bcrypt = require('bcrypt');

function handleSignUp(req, res) {
    const pool = require('../config/database');
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', async () => {
        try {
            const { username, email, password } = JSON.parse(body);
            
            // Validare date obligatorii
            if (!username || !email || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Toate campurile sunt obligatorii!' 
                }));
                return;
            }
            
            // Validare lungime username si password
            if (username.length < 3) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Username-ul trebuie sa aiba minim 3 caractere!' 
                }));
                return;
            }
            
            if (password.length < 6) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Parola trebuie sa aiba minim 6 caractere!' 
                }));
                return;
            }
            
            // Verificare daca username sau email exista deja
            const checkSql = `
                SELECT id FROM users 
                WHERE username = $1 OR email = $2
            `;
            
            pool.query(checkSql, [username, email], async (err, result) => {
                if (err) {
                    console.error('Eroare verificare user:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Eroare la verificarea datelor!' 
                    }));
                    return;
                }
                
                if (result.rows.length > 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Username-ul sau email-ul exista deja!' 
                    }));
                    return;
                }
                
                try {
                    // Hash parola
                    const saltRounds = 10;
                    const passwordHash = await bcrypt.hash(password, saltRounds);
                    
                    // Inserare user nou
                    const insertSql = `
                        INSERT INTO users (username, email, password_hash)
                        VALUES ($1, $2, $3)
                        RETURNING id, username, email, data_inregistrare
                    `;
                    
                    pool.query(insertSql, [username, email, passwordHash], (err, result) => {
                        if (err) {
                            console.error('Eroare inserare user:', err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                success: false, 
                                message: 'Eroare la crearea contului!' 
                            }));
                            return;
                        }
                        
                        const newUser = result.rows[0];
                        console.log('User nou creat:', newUser.id, newUser.username);
                        
                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: true, 
                            message: 'Cont creat cu succes!',
                            user: {
                                id: newUser.id,
                                username: newUser.username,
                                email: newUser.email,
                                data_inregistrare: newUser.data_inregistrare
                            }
                        }));
                    });
                    
                } catch (hashError) {
                    console.error('Eroare hash parola:', hashError);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Eroare la procesarea parolei!' 
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

module.exports = handleSignUp;