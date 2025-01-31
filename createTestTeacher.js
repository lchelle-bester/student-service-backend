// createTestTeacher.js
// This script creates a test teacher account in our database
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

async function createTestTeacher() {
    // First, we'll define our test teacher's credentials
    const teacherEmail = 'teacher@school.com';
    const teacherPassword = 'teacher123';  // This is a simple password for testing
    const teacherName = 'Test Teacher';

    try {
        console.log('Starting test teacher creation process...');

        // First, we hash the password for security
        // We use bcrypt, which is a secure way to store passwords
        const passwordHash = await bcrypt.hash(teacherPassword, 10);
        console.log('Password successfully hashed');

        // Now we'll try to insert the teacher into our database
        const result = await pool.query(`
            INSERT INTO users (
                email,
                password_hash,
                full_name,
                user_type
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO UPDATE 
            SET password_hash = $2
            RETURNING id, email, full_name
        `, [teacherEmail, passwordHash, teacherName, 'teacher']);

        console.log('\nTest teacher account created successfully!');
        console.log('----------------------------------------');
        console.log('You can now log in with these credentials:');
        console.log(`Email: ${teacherEmail}`);
        console.log(`Password: ${teacherPassword}`);
        console.log('----------------------------------------');

    } catch (error) {
        console.error('Error creating test teacher:', error.message);
    } finally {
        // Always close our database connection
        await pool.end();
    }
}

// Run our function
createTestTeacher().catch(console.error);