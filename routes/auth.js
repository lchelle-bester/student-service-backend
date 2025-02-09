const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Student Login
router.post('/login/student', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt received:', { email, password });

        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND user_type = $2',
            [email.toLowerCase(), 'student']
        );
        console.log('Database query result count:', result.rows.length);

        if (result.rows.length === 0) {
            console.log('No user found with email:', email);
            return res.status(401).json({ message: 'Invalid credentials (user not found)' });
        }

        const student = result.rows[0];
        console.log('Found user:', {
            id: student.id,
            email: student.email,
            hasPasswordHash: !!student.password_hash
        });

        const validPassword = await bcrypt.compare(password, student.password_hash);
        console.log('Password validation result:', validPassword);

        if (!validPassword) {
            console.log('Password validation failed');
            return res.status(401).json({ message: 'Invalid credentials (invalid password)' });
        }

        // ... rest of the code remains the same

        const token = jwt.sign(
            { 
                id: student.id, 
                type: 'student',
                email: student.email 
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
                grade: student.grade,
                totalHours: student.total_hours
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Teacher Login
router.post('/login/teacher', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Teacher login attempt:', email);

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
 
module.exports = router;