const db = require('../db');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const net = require('net');
const { decrypt } = require('../utils/encrypt');

// Helper to test raw TCP connection
async function testConnection(host, port, timeout = 5000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, timeout);
        socket.connect(port, host, () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(false);
        });
    });
}

// Enhanced transporter creation with diagnostics
async function createGmailTransporter(email, appPassword, port = 587) {
    // Resolve SMTP host IPs
    try {
        const addresses = await dns.resolve4('smtp.gmail.com');
        console.log(`Resolved smtp.gmail.com IPv4: ${addresses.join(', ')}`);
    } catch (e) {
        console.log('IPv4 lookup failed, trying AAAA...');
        try {
            const addresses = await dns.resolve6('smtp.gmail.com');
            console.log(`Resolved smtp.gmail.com IPv6: ${addresses.join(', ')}`);
        } catch (e2) {
            console.log('DNS resolution failed completely');
        }
    }

    // Test raw TCP connection
    const canConnect = await testConnection('smtp.gmail.com', port);
    console.log(`Raw TCP connection to smtp.gmail.com:${port} – ${canConnect ? 'SUCCESS' : 'FAILED'}`);

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: port,
        secure: port === 465, // true for 465, false for 587
        auth: { user: email, pass: appPassword },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false },
    });
    return transporter;
}

exports.send = async (req, res) => {
    const { sessionId, recipient, subject, body, isHtml } = req.body;
    if (!sessionId || !recipient || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const sessionRes = await db.query(
            'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
            [sessionId, req.user.id]
        );
        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        const session = sessionRes.rows[0];

        if (session.sent_count >= session.max_emails) {
            return res.status(403).json({ error: 'Email limit reached for this session.' });
        }

        const appPassword = decrypt(session.app_password_encrypted);
        const transporter = await createGmailTransporter(session.email, appPassword, 587); // try port 587 first

        const footer = `<br><hr><small>This email was sent using <a href="https://businessemailsender.com">BusinessEmailSender</a></small>`;
        const htmlBody = isHtml ? body + footer : body.replace(/\n/g, '<br>') + footer;
        const textBody = isHtml ? undefined : body + '\n\n---\nSent via BusinessEmailSender (https://businessemailsender.com)';

        const mailOptions = {
            from: session.email,
            to: recipient,
            subject,
            text: textBody,
            html: htmlBody,
        };

        await transporter.sendMail(mailOptions);

        await db.query('UPDATE sessions SET sent_count = sent_count + 1 WHERE id = $1', [sessionId]);

        await db.query(
            `INSERT INTO email_history (session_id, recipient, subject, body, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [sessionId, recipient, subject, body, 'success']
        );

        res.json({ success: true, message: 'Email sent successfully.' });
    } catch (err) {
        console.error('❌ Email send error:', err);
        try {
            await db.query(
                `INSERT INTO email_history (session_id, recipient, subject, body, status, error_message)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [sessionId, recipient, subject, body, 'failed', err.message]
            );
        } catch (logErr) {
            console.error('Failed to log email error:', logErr);
        }
        res.status(500).json({ error: 'Failed to send email: ' + err.message });
    }
};

exports.getHistory = async (req, res) => {
    const { sessionId } = req.params;
    try {
        const session = await db.query('SELECT id FROM sessions WHERE id = $1 AND user_id = $2', [sessionId, req.user.id]);
        if (session.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        const history = await db.query(
            'SELECT id, recipient, subject, body, status, error_message, sent_at FROM email_history WHERE session_id = $1 ORDER BY sent_at DESC',
            [sessionId]
        );
        res.json(history.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.resend = async (req, res) => {
    const { historyId } = req.params;
    try {
        const historyRes = await db.query(
            `SELECT eh.*, s.email as session_email, s.app_password_encrypted, s.user_id, s.id as session_id, s.sent_count, s.max_emails
             FROM email_history eh
             JOIN sessions s ON eh.session_id = s.id
             WHERE eh.id = $1 AND s.user_id = $2`,
            [historyId, req.user.id]
        );
        if (historyRes.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found.' });
        }
        const record = historyRes.rows[0];

        if (record.sent_count >= record.max_emails) {
            return res.status(403).json({ error: 'Email limit reached for this session.' });
        }

        const appPassword = decrypt(record.app_password_encrypted);
        // Try port 587 first
        const transporter = await createGmailTransporter(record.session_email, appPassword, 587);

        const footer = `<br><hr><small>This email was sent using <a href="https://businessemailsender.com">BusinessEmailSender</a></small>`;
        const htmlBody = record.body.includes('<') ? record.body + footer : record.body.replace(/\n/g, '<br>') + footer;
        const textBody = record.body.includes('<') ? undefined : record.body + '\n\n---\nSent via BusinessEmailSender (https://businessemailsender.com)';

        const mailOptions = {
            from: record.session_email,
            to: record.recipient,
            subject: record.subject,
            text: textBody,
            html: htmlBody,
        };

        console.log('Attempting to resend email via:', record.session_email);
        await transporter.sendMail(mailOptions);
        console.log('Resend successful');

        await db.query('UPDATE sessions SET sent_count = sent_count + 1 WHERE id = $1', [record.session_id]);

        await db.query(
            `INSERT INTO email_history (session_id, recipient, subject, body, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [record.session_id, record.recipient, record.subject, record.body, 'success']
        );

        res.json({ success: true, message: 'Email resent successfully.' });
    } catch (err) {
        console.error('❌ Resend error:', err);
        res.status(500).json({ error: 'Failed to resend email: ' + err.message });
    }
};
