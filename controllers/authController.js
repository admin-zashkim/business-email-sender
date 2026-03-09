const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const sendVerificationEmail = require('../utils/sendVerificationEmail');

exports.signup = async (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required.' });
    }

    try {
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        const result = await db.query(
            `INSERT INTO users (email, password_hash, display_name, verification_token, token_expiry)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [email, hashedPassword, displayName || email.split('@')[0], token, expiry]
        );

        // Try to send verification email, but don't fail signup if it fails
        try {
            await sendVerificationEmail(email, token);
        } catch (emailErr) {
            console.error('Failed to send verification email:', emailErr);
        }

        res.status(201).json({ message: 'User created. Please verify your email.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required.' });
    }

    try {
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const valid = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        if (!user.rows[0].verified) {
            return res.status(403).json({ error: 'Please verify your email first.' });
        }

        const token = jwt.sign(
            { userId: user.rows[0].id, email: user.rows[0].email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            user: {
                id: user.rows[0].id,
                email: user.rows[0].email,
                displayName: user.rows[0].display_name,
                avatar: user.rows[0].avatar,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.verifyEmail = async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ error: 'Token required.' });
    }

    try {
        const user = await db.query(
            'SELECT id FROM users WHERE verification_token = $1 AND token_expiry > NOW()',
            [token]
        );
        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        await db.query(
            'UPDATE users SET verified = true, verification_token = NULL, token_expiry = NULL WHERE id = $1',
            [user.rows[0].id]
        );

        res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.resendVerification = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email required.' });
    }

    try {
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (user.rows[0].verified) {
            return res.status(400).json({ error: 'Email already verified.' });
        }

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            'UPDATE users SET verification_token = $1, token_expiry = $2 WHERE id = $3',
            [token, expiry, user.rows[0].id]
        );

        await sendVerificationEmail(email, token);

        res.json({ message: 'Verification email resent.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
