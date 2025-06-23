function handleImagesStatic(req, res) {
    const fs = require('fs');
    const path = require('path');

    const filePath = path.join(__dirname, '..', req.url);
    console.log('Calea fisierului:', filePath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end();
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

module.exports = handleImagesStatic;