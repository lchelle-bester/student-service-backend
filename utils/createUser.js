// utils/createUser.js
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function createTestUsers() {
    try {
        // Create a test teacher
        const teacherPassword = await bcrypt.hash('teacher123', 10);
        await db.query(
            `INSERT INTO users (email, password_hash, full_name, user_type)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email) DO NOTHING`,
            ['teacher@school.com', teacherPassword, 'Test Teacher', 'teacher']
        );

        // Create a test student
        const studentPassword = await bcrypt.hash('student123', 10);
        await db.query(
            `INSERT INTO users (email, password_hash, full_name, user_type, student_id, grade)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (student_id) DO NOTHING`,
            ['student@school.com', studentPassword, 'Test Student', 'student', 'STU001', 11]
        );

        console.log('Test users created successfully');
    } catch (error) {
        console.error('Error creating test users:', error);
    }
}

// Run this function if this file is executed directly
if (require.main === module) {
    createTestUsers().then(() => process.exit());
}

module.exports = createTestUsers;