const db = require('../db');
const { validateAppPassword } = require('../utils/emailValidator');
const { encrypt, decrypt } = require('../utils/encrypt');

exports.getAll = async (req, res) => {
    try {
        const sessions = await db.query(
            'SELECT id, session_name, email, sent_count, max_emails, created_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(sessions.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.getOne = async (req, res) => {
    const { id } = req.params;
    try {
        const session = await db.query(
            'SELECT id, session_name, email, sent_count, max_emails, created_at FROM sessions WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        if (session.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        res.json(session.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.create = async (req, res) => {
    const { sessionName, email, appPassword } = req.body;
    if (!sessionName || !email || !appPassword) {
        return res.status(400).json({ error: 'All fields required.' });
    }

    try {
        // Check session count
        const count = await db.query('SELECT COUNT(*) FROM sessions WHERE user_id = $1', [req.user.id]);
        if (parseInt(count.rows[0].count) >= 6) {
            return res.status(403).json({ error: 'Maximum 6 sessions reached.' });
        }

        // Validate credentials
        const isValid = await validateAppPassword(email, appPassword);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid email or app password.' });
        }

        // Encrypt app password
        const encrypted = encrypt(appPassword);

        // Insert session
        const result = await db.query(
            `INSERT INTO sessions (user_id, session_name, email, app_password_encrypted)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [req.user.id, sessionName, email, encrypted]
        );

        res.status(201).json({ id: result.rows[0].id, message: 'Session created.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { sessionName } = req.body;
    if (!sessionName) {
        return res.status(400).json({ error: 'Session name required.' });
    }

    try {
        const result = await db.query(
            'UPDATE sessions SET session_name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id',
            [sessionName, id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        res.json({ message: 'Session updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        res.json({ message: 'Session deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};