function handleCoordsGet(req, res) {
    const fs = require('fs');
    const path = require('path');
    const url = require('url');

    try {
        // Parse query parameters
        const parsedUrl = url.parse(req.url, true);
        const { numeOras, numeLocalitate } = parsedUrl.query;

        // Verifica daca parametrii sunt prezenti
        if (!numeOras || !numeLocalitate) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Parametrii numeOras si numeLocalitate sunt obligatorii' }));
            return;
        }

        // Construieste calea catre fisierul coordinates.json
        const coordsFilePath = path.join(__dirname, '..', 'coords', 'coordinates.json');

        // Verifica daca fisierul exista
        if (!fs.existsSync(coordsFilePath)) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Fisierul coordinates.json nu a fost gasit' }));
            return;
        }

        // Citeste fisierul coordinates.json
        const coordsData = JSON.parse(fs.readFileSync(coordsFilePath, 'utf8'));

        // Construieste cheia pentru cautare (format: "numeOras/numeLocalitate")
        const searchKey = `${numeOras}/${numeLocalitate}`;

        // Cauta coordonatele in fisier
        const coordinates = coordsData[searchKey];

        if (coordinates) {
            // Returneaza coordonatele gasite
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                lat: coordinates.lat,
                lon: coordinates.lon
            }));
        } else {
            // Returneaza null daca nu s-au gasit coordonate
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(null));
        }

    } catch (error) {
        console.error('Eroare in handleCoordsGet:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Eroare interna a serverului' }));
    }
}

module.exports = handleCoordsGet;