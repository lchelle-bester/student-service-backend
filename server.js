const express = require('express');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/service');
const cors = require('cors');
const feedbackRoutes = require('./routes/feedback');
const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'https://student-service-frontend.vercel.app',
    'https://student-service-frontend-6tftdbzqi-shellys-projects-f0df4ef5.vercel.app', // Your preview domain
    /^https:\/\/student-service-frontend.*\.vercel\.app$/, // Pattern to match all Vercel preview domains
    'http://localhost:3000'  // For local development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use('/api/feedback', feedbackRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/service', serviceRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Service Hours API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});