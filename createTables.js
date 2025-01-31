// createTables.js
// This script creates all the necessary tables for our student service system
require('dotenv').config();
const { Pool } = require('pg');

// Create a connection to our database
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

async function createTables() {
    // We'll use a single client for all our operations
    const client = await pool.connect();
    
    try {
        // Start a transaction - this ensures all tables are created or none are
        await client.query('BEGIN');

        console.log('Creating users table...');
        // Create the users table first since other tables will reference it
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE,
                password_hash VARCHAR(255),
                full_name VARCHAR(255),
                user_type VARCHAR(50) CHECK (user_type IN ('student', 'teacher')),
                student_id VARCHAR(50) UNIQUE,
                grade INTEGER CHECK (grade BETWEEN 8 AND 12),
                total_hours INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating organizations table...');
        // Create the organizations table next
        await client.query(`
            CREATE TABLE IF NOT EXISTS organizations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                org_key VARCHAR(50) UNIQUE,
                contact_email VARCHAR(255),
                contact_person VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating service records table...');
        // Finally, create the service_records table that references both previous tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS service_records (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES users(id),
                hours INTEGER CHECK (hours > 0 AND hours <= 24),
                service_type VARCHAR(50) CHECK (service_type IN ('school', 'community')),
                description TEXT,
                date_completed DATE,
                assigned_by INTEGER REFERENCES users(id),
                organization_id INTEGER REFERENCES organizations(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Commit the transaction - make all our changes permanent
        await client.query('COMMIT');
        console.log('All tables created successfully!');

    } catch (error) {
        // If anything goes wrong, undo all changes
        await client.query('ROLLBACK');
        console.error('Error creating tables:', error);
        throw error;
    } finally {
        // Always release the client back to the pool
        client.release();
    }
}

// Run our function and handle any errors
createTables()
    .then(() => {
        console.log('Database setup completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('Database setup failed:', error);
        process.exit(1);
    });