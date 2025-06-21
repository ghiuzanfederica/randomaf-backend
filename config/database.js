require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://rem_8x5a_user:ofkZ5quphiTEbzop37iOosebMllfAUJ1@dpg-d1a7g9je5dus73eb6sa0-a.oregon-postgres.render.com/rem_8x5a', // setezi variabila în Render Dashboard
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;