const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test the connection
pool.on('connect', () => {
    console.log('Database connected successfully');
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};