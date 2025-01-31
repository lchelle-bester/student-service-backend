const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool to manage database connections
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase connection
    }
});


// Test the connection when the application starts
pool.on('connect', () => {
    console.log('Database connection established');
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};