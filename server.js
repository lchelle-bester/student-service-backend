const express = require('express');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/service');
const cors = require('cors');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'https://student-service-frontend.vercel.app',
    'http://localhost:3000'  // For local development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/service', serviceRoutes);

// Simple test route to verify server is running
app.get('/', (req, res) => {
  res.send('Service Hours API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});