// backend/createTestData.js
const bcrypt = require('bcrypt');
const db = require('./config/db');

async function createTestData() {
    try {
        // First, let's clear existing test data
        await db.query("DELETE FROM service_records");
        await db.query("DELETE FROM users WHERE user_type IN ('student', 'teacher')");

        // Create a test teacher
        const teacherPassword = await bcrypt.hash('teacher123', 10);
        const teacherResult = await db.query(
            `INSERT INTO users (
                email,
                password_hash,
                full_name,
                user_type
            ) VALUES ($1, $2, $3, $4) RETURNING id`,
            ['teacher@curro.com', teacherPassword, 'Mrs. Johnson', 'teacher']
        );

        console.log('Created teacher: teacher@curro.com / teacher123');

        // Create test students
        const students = [
            {
                email: 'james.smith@curro.com',
                name: 'James Smith',
                studentId: 'CUR2024001',
                grade: 11
            },
            {
                email: 'emily.brown@curro.com',
                name: 'Emily Brown',
                studentId: 'CUR2024002',
                grade: 10
            },
            {
                email: 'michael.davis@curro.com',
                name: 'Michael Davis',
                studentId: 'CUR2024003',
                grade: 12
            }
        ];

        const studentPassword = await bcrypt.hash('student123', 10);

        for (const student of students) {
            await db.query(
                `INSERT INTO users (
                    email,
                    password_hash,
                    full_name,
                    user_type,
                    student_id,
                    grade,
                    total_hours
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    student.email,
                    studentPassword,
                    student.name,
                    'student',
                    student.studentId,
                    student.grade,
                    0
                ]
            );

            console.log(`Created student: ${student.email} / student123`);
        }

        console.log('\nTest data created successfully!');
        console.log('\nYou can now log in with:');
        console.log('Teacher: teacher@curro.com / teacher123');
        console.log('Students: [student email] / student123');

    } catch (error) {
        console.error('Error creating test data:', error);
    } finally {
        process.exit();
    }
}

createTestData();