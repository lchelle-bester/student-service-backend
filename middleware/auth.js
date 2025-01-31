// middleware/auth.js
const jwt = require('jsonwebtoken');
// Change this line at the top
const bcrypt = require('bcryptjs');  // instead of require('bcrypt')

const authMiddleware = {
    // Verify that the request has a valid JWT token
    verifyToken: async (req, res, next) => {
        console.log('Auth headers:', req.headers);
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('Extracted token:', token);
        
        if (!token) {
            return res.status(401).json({ message: 'No auth token' });
        }
    
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({ message: 'Invalid token' });
        }
    },

    // Check if the user has the required role
    checkRole(allowedRoles) {
        return (req, res, next) => {
            if (!allowedRoles.includes(req.user.type)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.'
                });
            }
            next();
        };
    }
};

module.exports = authMiddleware;