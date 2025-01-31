// backend/createTestStudents.js
const bcrypt = require('bcrypt');
const db = require('./config/db');

async function createTestStudents() {
    try {
        const students = [
            {
                email: 'student1@curro.com',
                password: 'student123',
                fullName: 'John Smith',
                studentId: 'CUR001',
                grade: 11
            },
            {
                email: 'student2@curro.com',
                password: 'student123',
                fullName: 'Sarah Jones',
                studentId: 'CUR002',
                grade: 10
            }
        ];

        for (const student of students) {
            const passwordHash = await bcrypt.hash(student.password, 10);
            await db.query(
                `INSERT INTO users (
                    email, password_hash, full_name, user_type, student_id, grade
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (email) DO NOTHING`,
                [student.email, passwordHash, student.fullName, 'student', student.studentId, student.grade]
            );
            console.log(`Created student: ${student.email} with password: ${student.password}`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

createTestStudents();