const router = require('express').Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

router.use((req, res, next) => {
    console.log('Service Route accessed:', req.method, req.path);
    console.log('Headers:', req.headers);
    next();
});


// Student details route
router.get('/student-details/:studentId', authMiddleware.verifyToken, async (req, res) => {
    console.log('Accessing student details with ID:', req.params.studentId);

    try {
        console.log('Fetching details for student ID:', req.params.studentId);
        console.log('User from token:', req.user);

        // First get student information
        const studentInfo = await db.query(
            `SELECT id, full_name, grade, total_hours 
             FROM users 
             WHERE id = $1 AND user_type = 'student'`,
            [req.params.studentId]
        );
        console.log('Student info query result:', studentInfo.rows);

        if (studentInfo.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const serviceRecords = await db.query(
            `SELECT 
                sr.id,
                sr.hours,
                sr.service_type,
                sr.description,
                sr.date_completed,
                CASE 
                    WHEN sr.assigned_by IS NOT NULL THEN u.full_name
                    WHEN sr.organization_id IS NOT NULL THEN o.name
                END as assigned_by
             FROM service_records sr
             LEFT JOIN users u ON sr.assigned_by = u.id
             LEFT JOIN organizations o ON sr.organization_id = o.id
             WHERE sr.user_id = $1  -- Changed from student_id to user_id
             ORDER BY sr.date_completed DESC`,
            [req.params.studentId]
        );

        const schoolHours = serviceRecords.rows
            .filter(record => record.service_type === 'school')
            .reduce((sum, record) => sum + record.hours, 0);

        const communityHours = serviceRecords.rows
            .filter(record => record.service_type === 'community')
            .reduce((sum, record) => sum + record.hours, 0);

        res.json({
            student: {
                ...studentInfo.rows[0],
                schoolHours,
                communityHours
            },
            serviceRecords: serviceRecords.rows
        });

    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ message: 'Error fetching student details' });
    }
});

// Log community service route
router.post('/log-community', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { studentName, hours, dateCompleted, description } = req.body;
        const organizationId = req.user.id;

        // Find student by name
        const studentResult = await db.query(
            'SELECT id FROM users WHERE full_name = $1 AND user_type = $2',
            [studentName, 'student']
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Insert service record
        const insertResult = await db.query(
            `INSERT INTO service_records (
                user_id,  -- Changed from student_id
                hours,
                service_type,
                description,
                date_completed,
                organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [
                studentResult.rows[0].id,
                hours,
                'community',
                description,
                dateCompleted,
                organizationId
            ]
        );

        // Update student's total hours
        await db.query(
            'UPDATE users SET total_hours = total_hours + $1 WHERE id = $2',
            [hours, studentResult.rows[0].id]
        );

        res.json({ 
            success: true, 
            message: 'Community service hours logged successfully',
            recordId: insertResult.rows[0].id
        });
    } catch (error) {
        console.error('Error logging community service hours:', error);
        res.status(500).json({ message: 'Failed to log service hours' });
    }
});

// Search students route
router.get('/search-students', async (req, res) => {
    try {
        const { query } = req.query;
        console.log('Searching for:', query);

        const result = await db.query(
            `SELECT id, full_name, grade, total_hours 
             FROM users 
             WHERE user_type = 'student' 
             AND LOWER(full_name) LIKE LOWER($1)`,  // Removed student_id from search
            [`%${query}%`]
        );

        console.log('Found students:', result.rows);
        res.json(result.rows);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error searching for students' });
    }
});

// Log service hours route
router.post('/log', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { studentName, numberOfHours, dateCompleted, description } = req.body;
        const teacherId = req.user.id;

        const studentResult = await db.query(
            'SELECT id FROM users WHERE full_name = $1 AND user_type = $2',
            [studentName, 'student']
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const insertResult = await db.query(
            `INSERT INTO service_records (
                user_id,  -- Changed from student_id
                hours,
                service_type,
                description,
                date_completed,
                assigned_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [
                studentResult.rows[0].id,
                numberOfHours,
                'school',
                description,
                dateCompleted,
                teacherId
            ]
        );

        await db.query(
            'UPDATE users SET total_hours = total_hours + $1 WHERE id = $2',
            [numberOfHours, studentResult.rows[0].id]
        );

        res.json({ 
            success: true, 
            message: 'Service hours logged successfully',
            recordId: insertResult.rows[0].id
        });

    } catch (error) {
        console.error('Error logging service hours:', error);
        res.status(500).json({ message: 'Failed to log service hours' });
    }
});

module.exports = router;