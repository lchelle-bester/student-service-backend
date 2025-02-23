const router = require('express').Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

const validateServiceHours = (hours, dateCompleted, studentName) => {
    const errors = [];
    
    if (!hours || !dateCompleted || !studentName) {
        errors.push('All fields are required');
    }

    const selectedDate = new Date(dateCompleted);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
        errors.push('Service date cannot be in the future');
    }

    const hoursNum = parseFloat(hours);
    console.log('Validating hours:', { original: hours, parsed: hoursNum });
    
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 10) {
        errors.push('Hours must be between 0.5 and 10');
    }

    if (Math.round(hoursNum * 10) % 5 !== 0) {
        errors.push('Hours must be in half hour increments (0.5)');
    }

    return errors;
};

router.get('/student-details/:studentId', authMiddleware.verifyToken, async (req, res) => {
    try {
        const studentInfo = await db.query(
            `SELECT id, full_name, grade, total_hours 
             FROM users 
             WHERE id = $1 AND user_type = 'student'`,
            [req.params.studentId]
        );

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
             WHERE sr.user_id = $1
             ORDER BY sr.date_completed DESC`,
            [req.params.studentId]
        );

        const schoolHours = serviceRecords.rows
            .filter(record => record.service_type === 'school')
            .reduce((sum, record) => sum + parseFloat(record.hours), 0.0);

        const communityHours = serviceRecords.rows
            .filter(record => record.service_type === 'community')
            .reduce((sum, record) => sum + parseFloat(record.hours), 0.0);

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

router.post('/log-community', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { studentName, hours, dateCompleted, description } = req.body;
        const hoursFloat = parseFloat(hours);
        console.log('Processing hours:', { received: hours, parsed: hoursFloat });
        
        const organizationId = req.user.id;

        const validationErrors = validateServiceHours(hoursFloat, dateCompleted, studentName);
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: validationErrors.join(', ') 
            });
        }

        const studentResult = await db.query(
            'SELECT id FROM users WHERE LOWER(full_name) = LOWER($1) AND user_type = $2',
            [studentName, 'student']
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const insertResult = await db.query(
            `INSERT INTO service_records (
                user_id,
                hours,
                service_type,
                description,
                date_completed,
                organization_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, hours`,
            [
                studentResult.rows[0].id,
                hoursFloat,
                'community',
                description,
                dateCompleted,
                organizationId
            ]
        );

        await db.query(
            'UPDATE users SET total_hours = total_hours + $1 WHERE id = $2',
            [hoursFloat, studentResult.rows[0].id]
        );

        res.json({ 
            success: true, 
            message: 'Community service hours logged successfully',
            recordId: insertResult.rows[0].id,
            hoursLogged: hoursFloat
        });

    } catch (error) {
        console.error('Error logging community service hours:', error);
        res.status(500).json({ message: 'Failed to log service hours' });
    }
});

router.get('/search-students', async (req, res) => {
    try {
        const { query } = req.query;
        
        const result = await db.query(
            `SELECT id, full_name, grade, total_hours 
             FROM users 
             WHERE user_type = 'student' 
             AND LOWER(full_name) LIKE LOWER($1)`,
            [`%${query}%`]
        );

        res.json(result.rows);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error searching for students' });
    }
});

router.post('/log', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { studentName, numberOfHours, dateCompleted, description } = req.body;
        const hoursFloat = parseFloat(numberOfHours);
        const teacherId = req.user.id;

        const validationErrors = validateServiceHours(hoursFloat, dateCompleted, studentName);
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: validationErrors.join(', ') 
            });
        }

        const studentResult = await db.query(
            'SELECT id FROM users WHERE LOWER(full_name) = LOWER($1) AND user_type = $2',
            [studentName, 'student']
        );

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const insertResult = await db.query(
            `INSERT INTO service_records (
                user_id,
                hours,
                service_type,
                description,
                date_completed,
                assigned_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, hours`,
            [
                studentResult.rows[0].id,
                hoursFloat,
                'school',
                description,
                dateCompleted,
                teacherId
            ]
        );

        await db.query(
            'UPDATE users SET total_hours = total_hours + $1 WHERE id = $2',
            [hoursFloat, studentResult.rows[0].id]
        );

        res.json({ 
            success: true, 
            message: 'Service hours logged successfully',
            recordId: insertResult.rows[0].id,
            hoursLogged: hoursFloat
        });

    } catch (error) {
        console.error('Error logging service hours:', error);
        res.status(500).json({ message: 'Failed to log service hours' });
    }
});

module.exports = router;