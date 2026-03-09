const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.VERIFICATION_EMAIL,
        pass: process.env.VERIFICATION_EMAIL_PASS,
    },
    connection: { family: 4 },          // force IPv4
    connectionTimeout: 5000,             // 5 seconds
    greetingTimeout: 3000,
    socketTimeout: 5000,
});

module.exports = async (toEmail, token) => {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const mailOptions = {
        from: `"BusinessEmailSender" <${process.env.VERIFICATION_EMAIL}>`,
        to: toEmail,
        subject: 'Verify your email address',
        html: `
            <p>Please click the link below to verify your email address. This link expires in 15 minutes.</p>
            <p><a href="${verificationLink}">${verificationLink}</a></p>
            <p>If you didn't request this, please ignore this email.</p>
            <p><small>Check your spam folder if you don't see it.</small></p>
        `,
    };
    await transporter.sendMail(mailOptions);
};
