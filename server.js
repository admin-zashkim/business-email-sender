require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Trust Render's proxy (required for rate‑limiting behind a proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/email', require('./routes/emailRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

// Catch-all to serve frontend SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Optional: Auto‑initialize database tables on startup
// Uncomment the following lines if you want the app to create tables automatically.
// Make sure your schema.sql uses "CREATE TABLE IF NOT EXISTS" to avoid errors on restart.
/*
const initDb = require('./db/init');
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
*/

// If not using auto‑init, just start the server:
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
