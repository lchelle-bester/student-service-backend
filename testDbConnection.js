// backend/testDbConnection.js
const db = require('./config/db');

async function testConnection() {
    try {
        console.log('Testing database connection...');
        
        // Test basic connection
        const result = await db.query('SELECT NOW()');
        console.log('Database connection successful!');
        
        // Test users table
        const users = await db.query('SELECT COUNT(*) FROM users');
        console.log('Total users in database:', users.rows[0].count);
        
        // Test teacher account
        const teachers = await db.query(
            "SELECT email FROM users WHERE user_type = 'teacher'"
        );
        console.log('Teacher accounts:', teachers.rows);
        
    } catch (error) {
        console.error('Database test failed:', error);
    } finally {
        process.exit();
    }
}

testConnection();