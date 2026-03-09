const rateLimit = require('express-rate-limit');

// Stricter limit for email sending endpoint
const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 email sends per hour
    message: { error: 'Too many email requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { emailLimiter };