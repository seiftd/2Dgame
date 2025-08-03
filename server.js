const express = require('express');
const cors = require('cors');
const path = require('path');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Admin dashboard routes
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Default route - redirect to admin dashboard
app.get('/', (req, res) => {
    res.redirect('/admin');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌾 Farmer Game Admin Server running on port ${PORT}`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`🔌 API Endpoints: http://localhost:${PORT}/api/admin`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;