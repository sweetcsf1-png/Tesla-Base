const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Serves your dashboard.html

// 1. DATABASE CONNECTION
const pool = new Pool({
    connectionString: "YOUR_POSTGRESQL_URL_HERE", 
    ssl: { rejectUnauthorized: false }
});

// 2. GMAIL CONFIGURE (For Verification Codes)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_GMAIL@gmail.com',
        pass: 'YOUR_APP_PASSWORD' // 16-character code from Google
    }
});

let tempOTPs = {};

// --- ADMIN API: THIS IS WHAT WAS MISSING ---
// This route allows your dashboard to see EVERY user's Email and Password
app.get('/api/admin/users', async (req, res) => {
    try {
        // SQL Query to get all user details from your Postgres 'users' table
        const result = await pool.query('SELECT email, password, balance FROM users ORDER BY id DESC');
        res.json(result.rows); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database Error" });
    }
});

// --- AUTH & VERIFICATION ---
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    tempOTPs[email] = otp;

    try {
        await transporter.sendMail({
            from: '"Tesla Base Security" <YOUR_GMAIL@gmail.com>',
            to: email,
            subject: 'Your Verification Code: ' + otp,
            html: `<div style="background:#000;color:#fff;padding:20px;text-align:center;border:1px solid #E31937;">
                    <h1>TESLA BASE</h1><p>Code: <b>${otp}</b></p></div>`
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (tempOTPs[email] == otp) {
        delete tempOTPs[email];
        res.json({ success: true });
    } else { res.status(400).json({ success: false }); }
});

// --- USER DATA SYNC ---
app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).send(e); }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
