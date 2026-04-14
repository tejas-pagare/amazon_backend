'use strict';

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function migrate() {
  const sqlPath = path.join(__dirname, '../migrations/001_init.sql');
  const sql     = fs.readFileSync(sqlPath, 'utf8');

  console.log('\n🔧  Running migration: 001_init.sql...\n');

  try {
    await pool.query('SELECT 1');
    console.log('✅  DB connected\n');

    await pool.query(sql);

    console.log('✅  Migration applied successfully');
    console.log('    Tables created: users, addresses, categories, products, cart_items, orders, order_items');
    console.log('    ENUM created:   order_status\n');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
