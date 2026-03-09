const nodemailer = require('nodemailer');

async function validateAppPassword(email, appPassword) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: email, pass: appPassword },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
        greetingTimeout: 3000,
        socketTimeout: 5000,
    });

    try {
        await Promise.race([
            transporter.verify(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000)),
        ]);
        return true;
    } catch {
        return false;
    }
}

module.exports = { validateAppPassword };