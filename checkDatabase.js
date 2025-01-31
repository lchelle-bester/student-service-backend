// backend/checkDatabase.js
const db = require('./config/db');

async function checkUsers() {
    try {
        const result = await db.query('SELECT email, user_type, full_name FROM users');
        console.log('Users in database:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkUsers();