// backend/createTestUsers.js
const bcrypt = require('bcrypt');
const db = require('./config/db');

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
        console.log('Created test teacher: teacher@school.com with password: teacher123');

        // Create a test student
        const studentPassword = await bcrypt.hash('student123', 10);
        await db.query(
            `INSERT INTO users (email, password_hash, full_name, user_type, student_id, grade)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (student_id) DO NOTHING`,
            ['student@school.com', studentPassword, 'Test Student', 'student', 'STU001', 11]
        );
        console.log('Created test student: student@school.com with password: student123');

        console.log('Test users created successfully');
    } catch (error) {
        console.error('Error creating test users:', error);
    } finally {
        process.exit();
    }
}

createTestUsers();