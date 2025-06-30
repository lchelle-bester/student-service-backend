const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Student Login
router.post('/login/student', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Received login attempt for:', email);

        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND user_type = $2',
            [email.toLowerCase(), 'student']
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials (user not found)' });
        }

        const student = result.rows[0];
        console.log('Stored password hash:', student.password_hash);
        console.log('Attempting to compare with password:', password);

        // Let's also test bcrypt directly
        const testHash = await bcrypt.hash('password123', 10);
        console.log('Test hash generated:', testHash);
        const testCompare = await bcrypt.compare('password123', testHash);
        console.log('Test comparison result:', testCompare);

        // Now try the actual comparison
        const validPassword = await bcrypt.compare(password, student.password_hash);
        console.log('Actual comparison result:', validPassword);

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials (invalid password)' });
        }

        // ... rest of the code

        if (!validPassword) {
            console.log('Password validation failed');
            return res.status(401).json({ message: 'Invalid credentials (invalid password)' });
        }


        const token = jwt.sign(
            { 
                id: student.id, 
                type: 'student',
                email: student.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        console.log('Generated token payload:', { id: student.id, type: 'student', email: student.email });

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

// Add this new route temporarily for testing
router.post('/test-password', async (req, res) => {
    try {
        const testPassword = 'test123';
        // Generate a new hash
        const hash = await bcrypt.hash(testPassword, 10);
        console.log('Generated hash:', hash);
        
        // Test the comparison immediately
        const testCompare = await bcrypt.compare(testPassword, hash);
        console.log('Test comparison result:', testCompare);
        
        // Update the database with this new hash
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [hash, 'student1@curro.co.za']
        );
        
        res.json({ 
            message: 'Password updated', 
            hash: hash,
            testCompare: testCompare 
        });
    } catch (error) {
        console.error('Test password error:', error);
        res.status(500).json({ message: 'Error in test password route' });
    }
});


// Teacher Login
router.post('/login/teacher', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Teacher login attempt with:', { 
            email, 
            providedPassword: password 
        });

        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND user_type = $2',
            [email.toLowerCase(), 'teacher']
        );
        console.log('Query result:', {
            userFound: result.rows.length > 0,
            storedHash: result.rows[0]?.password_hash
        });

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials (user not found)' });
        }

        const teacher = result.rows[0];
        
        // Test the password comparison
        console.log('Attempting password comparison:', {
            passwordProvided: password,
            storedHash: teacher.password_hash
        });

        const validPassword = await bcrypt.compare(password, teacher.password_hash);
        console.log('Password comparison result:', validPassword);

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials (invalid password)' });
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
            message: null,
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