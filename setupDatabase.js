// setupDatabase.js
require('dotenv').config();
const { Client } = require('pg');

async function setupDatabase() {
    // First, we'll connect to the default PostgreSQL database
    const client = new Client({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: 'postgres' // We connect to the default database first
    });

    try {
        console.log('Connecting to PostgreSQL...');
        await client.connect();
        
        // Check if our database exists
        const checkDb = await client.query(
            "SELECT datname FROM pg_database WHERE datname = 'student_service_db'"
        );

        if (checkDb.rows.length === 0) {
            console.log('Creating student_service_db...');
            // We need to use single quotes here for the database name
            await client.query('CREATE DATABASE student_service_db');
            console.log('Database created successfully!');
        } else {
            console.log('Database student_service_db already exists');
        }

    } catch (error) {
        console.error('Error during database setup:', error.message);
    } finally {
        await client.end();
    }

    // Now let's connect to our new database and create the tables
    if (checkDb.rows.length === 0) {
        const dbClient = new Client({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: 'student_service_db' // Now we connect to our new database
        });

        try {
            await dbClient.connect();
            console.log('Creating tables...');
            
            // Create tables
            await dbClient.query(`
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE,
                    password_hash VARCHAR(255),
                    full_name VARCHAR(255),
                    user_type VARCHAR(50),
                    student_id VARCHAR(50) UNIQUE,
                    grade INTEGER,
                    total_hours INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE organizations (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255),
                    org_key VARCHAR(50) UNIQUE,
                    contact_email VARCHAR(255),
                    contact_person VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE service_records (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER REFERENCES users(id),
                    hours INTEGER,
                    service_type VARCHAR(50),
                    description TEXT,
                    date_completed DATE,
                    assigned_by INTEGER REFERENCES users(id),
                    organization_id INTEGER REFERENCES organizations(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            console.log('Tables created successfully!');
        } catch (error) {
            console.error('Error creating tables:', error.message);
        } finally {
            await dbClient.end();
        }
    }
}

setupDatabase().catch(console.error);