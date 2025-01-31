// backend/routes/auth.js
const router = require('express').Router();  // Add this line at the top
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

router.post('/login/student', async (req, res) => {
    try {
        const { studentId, password } = req.body;
        
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND user_type = $2',
            [studentId.toLowerCase(), 'student']
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const student = result.rows[0];
        const validPassword = await bcrypt.compare(password, student.password_hash);

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { 
                id: student.id, 
                type: 'student',
                studentId: student.student_id 
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: student.id,
                email: student.email,
                name: student.full_name,
                studentId: student.student_id,
                grade: student.grade
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.post('/verify/organization', async (req, res) => {
    try {
        const { orgKey } = req.body;
        console.log('Verifying organization key:', orgKey);

        const result = await db.query(
            'SELECT * FROM organizations WHERE org_key = $1',
            [orgKey.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid organization key' 
            });
        }

        const organization = result.rows[0];
        const token = jwt.sign(
            { 
                id: organization.id, 
                type: 'organization',
                name: organization.name 
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({
            success: true,
            token,
            organization: {
                name: organization.name,
                contactPerson: organization.contact_person
            }
        });

    } catch (error) {
        console.error('Organization verification error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during verification' 
        });
    }
});    
 

router.post('/login/teacher', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);

        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND user_type = $2',
            [email.toLowerCase(), 'teacher']
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const teacher = result.rows[0];
        const validPassword = await bcrypt.compare(password, teacher.password_hash);

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { 
                id: teacher.id, 
                type: 'teacher',
                email: teacher.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        res.json({
            token,
            user: {
                id: teacher.id,
                email: teacher.email,
                name: teacher.full_name
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;