const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    const token = authHeader.replace('Bearer ', '');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.query('SELECT id, email, verified FROM users WHERE id = $1', [decoded.userId]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'User not found.' });
        }
        req.user = user.rows[0];
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};