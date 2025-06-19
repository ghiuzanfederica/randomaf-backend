const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'REM',
  password: 'Federica1234',
  port: 5432,
});

const http = require('http');
const PORT = 3001;

const server = http.createServer((req, res) => {
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

  // Servește imaginile din uploads
  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, req.url);
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
    return;
  }

  // Adaugă imobil
  if (req.method === 'POST' && req.url === '/api/imobil') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const mainQuery = `
          INSERT INTO imobile (titlu, pret, locatie, descriere, tip, tranzactie)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;
        const mainValues = [
          data.titlu, data.pret, data.locatie, data.descriere, data.tip, data.tranzactie
        ];
        const client = await pool.connect();
        try {
          const mainResult = await client.query(mainQuery, mainValues);
          const imobilId = mainResult.rows[0].id;

          if (data.tip === 'apartament') {
            await client.query(
              `INSERT INTO apartamente (imobil_id, suprafata_utila, nr_camere, nr_bai, compartimentare, confort, etaj, an_constructie)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [
                imobilId, data.suprafataUtila, data.nrCamere, data.nrBai,
                data.compartimentare, data.confort, data.etaj, data.anConstructie
              ]
            );
          } else if (data.tip === 'casee' || data.tip === 'casa') {
            await client.query(
              `INSERT INTO casee (imobil_id, suprafata_utila, suprafata_teren, nr_camere, nr_bai, an_constructie, alte_dotari)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [
                imobilId, data.suprafataUtila, data.suprafataTeren, data.nrCamere,
                data.nrBai, data.anConstructie, data.alteDotari
              ]
            );
          } else if (data.tip === 'teren') {
            await client.query(
              `INSERT INTO terenuri (imobil_id, suprafata_teren, tip_teren, clasificare, front_stradal)
               VALUES ($1,$2,$3,$4,$5)`,
              [
                imobilId, data.suprafataTeren, data.tipTeren, data.clasificare, data.frontStradal
              ]
            );
          } else if (data.tip === 'spatiu-comercial') {
            await client.query(
              `INSERT INTO spatii_comerciale (imobil_id, suprafata_utila, alte_dotari)
               VALUES ($1,$2,$3)`,
              [
                imobilId, data.suprafataUtila, data.alteDotari
              ]
            );
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', mesaj: 'Anunț salvat!', id: imobilId }));
        } catch (err) {
          console.error('Eroare la inserare:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la salvare în baza de date!' }));
        } finally {
          client.release();
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', mesaj: 'Date invalide!' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/upload-imagine') {
    const boundary = req.headers['content-type'].split('boundary=')[1];
    let body = Buffer.alloc(0);

    req.on('data', chunk => {
      body = Buffer.concat([body, chunk]);
    });

    req.on('end', async () => {
      // Folosește latin1 pentru a păstra datele binare
      const parts = body
        .toString('latin1')
        .split('--' + boundary)
        .filter(p => p.includes('Content-Disposition'));

      let imobil_id = null;
      let fileBuffer = null;
      let fileName = null;

      for (const part of parts) {
        if (part.includes('name="imobil_id"')) {
          imobil_id = part.split('\r\n\r\n')[1]?.trim();
        }
        if (part.includes('name="imagine"')) {
          const match = part.match(/filename="(.+?)"/);
          if (match) {
            fileName = Date.now() + '-' + match[1];
            const fileStart = part.indexOf('\r\n\r\n') + 4;
            const fileEnd = part.lastIndexOf('\r\n');
            const fileContent = part.substring(fileStart, fileEnd);
            fileBuffer = Buffer.from(fileContent, 'latin1');
          }
        }
      }

      if (imobil_id && fileBuffer && fileName) {
        if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
        fs.writeFileSync(path.join('uploads', fileName), fileBuffer);
        await pool.query(
          'INSERT INTO imagini_imobil (imobil_id, url) VALUES ($1, $2)',
          [imobil_id, 'uploads/' + fileName]
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', url: 'uploads/' + fileName }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', mesaj: 'Upload invalid!' }));
      }
    });
    return;
  }
// ...existing code...

  // Returnează imobilele cu prima imagine
  // ...existing code...
if (req.method === 'GET' && req.url === '/api/imobile') {
    const query = `
      SELECT i.*,
        img.url AS imagine,
        COALESCE(a.suprafata_utila, c.suprafata_utila, t.suprafata_teren, s.suprafata_utila) AS suprafata
      FROM imobile i
      LEFT JOIN LATERAL (
        SELECT url FROM imagini_imobil WHERE imobil_id = i.id ORDER BY id ASC LIMIT 1
      ) img ON true
      LEFT JOIN apartamente a ON a.imobil_id = i.id
      LEFT JOIN casee c ON c.imobil_id = i.id
      LEFT JOIN terenuri t ON t.imobil_id = i.id
      LEFT JOIN spatii_comerciale s ON s.imobil_id = i.id
      ORDER BY i.id DESC
    `;
    pool.query(query, (err, result) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', mesaj: 'Eroare la citire din baza de date!' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows));
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/imagini/')) {
  const id = req.url.split('/').pop();
  pool.query('SELECT url FROM imagini_imobil WHERE imobil_id = $1 ORDER BY id ASC', [id], (err, result) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.rows));
  });
  return;
}

  // 404 fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'error', mesaj: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Serverul rulează pe http://localhost:${PORT}`);
});