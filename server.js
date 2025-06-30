const express = require('express');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/service');
const cors = require('cors');
const feedbackRoutes = require('./routes/feedback');
const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    // Your custom domains
    'https://studentservicediary.co.za',
    'https://www.studentservicediary.co.za',
    
    // Vercel domains
    'https://student-service-frontend.vercel.app',
    'https://student-service-frontend-6tftdbzqi-shellys-projects-f0df4ef5.vercel.app',
    /^https:\/\/student-service-frontend.*\.vercel\.app$/,
    
    // Local development
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
};

// Apply CORS with explicit options
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add logging middleware to debug CORS
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// Routes
app.use('/api/feedback', feedbackRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/service', serviceRoutes);

// Test route with CORS info
app.get('/', (req, res) => {
  res.json({ 
    message: 'Service Hours API is running',
    corsOrigins: corsOptions.origin,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.originalUrl} not found` 
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS enabled for origins:', corsOptions.origin);
});

module.exports = app;