const express = require('express');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/service');  // Make sure this is added
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/service', serviceRoutes);  // Make sure this is added

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});