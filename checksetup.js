// checkSetup.js
require('dotenv').config();
const { Pool } = require('pg');

async function checkEnvironment() {
    // First, let's check our environment variables
    console.log('\n=== Checking Environment Variables ===');
    console.log('DB_USER:', process.env.DB_USER ? '✓ Set' : '✗ Missing');
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✓ Set' : '✗ Missing');
    console.log('DB_HOST:', process.env.DB_HOST ? '✓ Set' : '✗ Missing');
    console.log('DB_PORT:', process.env.DB_PORT ? '✓ Set' : '✗ Missing');
    console.log('DB_DATABASE:', process.env.DB_DATABASE ? '✓ Set' : '✗ Missing');

    // Now let's try to connect to PostgreSQL server (without specifying a database)
    console.log('\n=== Testing PostgreSQL Server Connection ===');
    const serverPool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: 'postgres' // This is the default database that always exists
    });

    try {
        const serverResult = await serverPool.query('SELECT version()');
        console.log('✓ PostgreSQL server is running');
        console.log('Version:', serverResult.rows[0].version);
    } catch (error) {
        console.log('✗ Could not connect to PostgreSQL server');
        console.log('Error:', error.message);
        return;
    } finally {
        await serverPool.end();
    }

    // Now let's check if our specific database exists
    console.log('\n=== Checking for student_service_db ===');
    try {
        const result = await serverPool.query(
            "SELECT datname FROM pg_database WHERE datname = 'student_service_db'"
        );
        if (result.rows.length > 0) {
            console.log('✓ student_service_db exists');
        } else {
            console.log('✗ student_service_db does not exist');
            console.log('Attempting to create database...');
            await serverPool.query('CREATE DATABASE student_service_db');
            console.log('✓ Database created successfully');
        }
    } catch (error) {
        console.log('✗ Error checking/creating database');
        console.log('Error:', error.message);
    }
}

checkEnvironment().catch(console.error);