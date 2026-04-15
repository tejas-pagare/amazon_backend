'use strict';

require('dotenv').config();
const app  = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Verify DB connection on startup
    await pool.query('SELECT 1');
    console.log('✅  Connected to Neon PostgreSQL');

    app.listen(PORT, () => {
      console.log(`🚀  Server running on http://localhost:${PORT}`);
      console.log(`📡  API prefix: http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    console.error('❌  Failed to connect to database:', err.message);
    process.exit(1);
  }
}

start();
