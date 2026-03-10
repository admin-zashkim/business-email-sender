const nodemailer = require('nodemailer');

async function validateAppPassword(email, appPassword) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: email, pass: appPassword }
  });

  try {
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
    ]);
    return true;
  } catch {
    return false;
  }
}

module.exports = { validateAppPassword };
