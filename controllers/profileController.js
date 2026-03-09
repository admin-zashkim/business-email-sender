const db = require('../db');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res) => {
    try {
        const user = await db.query(
            'SELECT id, email, display_name, avatar, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Get session count
        const sessionCount = await db.query('SELECT COUNT(*) FROM sessions WHERE user_id = $1', [req.user.id]);

        res.json({
            ...user.rows[0],
            sessionCount: parseInt(sessionCount.rows[0].count),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.updateProfile = async (req, res) => {
    const { displayName } = req.body;
    if (!displayName) {
        return res.status(400).json({ error: 'Display name required.' });
    }

    try {
        await db.query(
            'UPDATE users SET display_name = $1 WHERE id = $2',
            [displayName, req.user.id]
        );
        res.json({ message: 'Profile updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields required.' });
    }

    try {
        const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const valid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, req.user.id]);
        res.json({ message: 'Password changed.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};