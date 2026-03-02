const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());

// 1. DATABASE CONNECTION
const pool = new Pool({
    connectionString: "YOUR_POSTGRESQL_URL_HERE", // Example: postgresql://user:pass@localhost:5432/db
    ssl: { rejectUnauthorized: false }
});

// 2. GMAIL SETUP (Use App Password from Google)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_GMAIL@gmail.com', // Your actual Gmail
        pass: 'xxxx xxxx xxxx xxxx'  // Your 16-character App Password
    }
});

// Store OTPs temporarily in memory
let otpStore = {};

// 3. SEND OTP ENDPOINT
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;

    const mailOptions = {
        from: '"Tesla Base Security" <YOUR_GMAIL@gmail.com>',
        to: email,
        subject: 'Verification Code: ' + otp,
        html: `
        <div style="font-family: sans-serif; background:#000; color:#fff; padding:30px; border-radius:15px; text-align:center; border:2px solid #E31937;">
            <h1 style="color:#E31937; margin-bottom:10px;">TESLA BASE</h1>
            <p style="font-size:16px;">Verify your account to start trading.</p>
            <div style="font-size:40px; font-weight:bold; letter-spacing:8px; margin:20px 0; color:#fff;">${otp}</div>
            <p style="color:#888; font-size:12px;">This code expires in 5 minutes.</p>
        </div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Code sent to Gmail" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Email failed to send" });
    }
});

// 4. VERIFY OTP ENDPOINT
app.post('/api/auth/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (otpStore[email] == otp) {
        delete otpStore[email];
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: "Incorrect code" });
    }
});

// 5. UPDATE BALANCE & SYNC
app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT email, password, balance FROM users WHERE email = $1', [email]);
        res.json(result.rows[0] || { error: "Not found" });
    } catch (err) { res.status(500).json(err); }
});

app.post('/api/user/update-balance', async (req, res) => {
    const { email, newBalance } = req.body;
    try {
        await pool.query('UPDATE users SET balance = $1 WHERE email = $2', [newBalance, email]);
        res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
});

app.listen(3000, () => console.log('Tesla Base Server Live on Port 3000'));
