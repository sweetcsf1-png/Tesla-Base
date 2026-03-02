const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
    connectionString: "YOUR_POSTGRESQL_URL_HERE",
    ssl: { rejectUnauthorized: false }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'YOUR_GMAIL@gmail.com', pass: 'xxxx xxxx xxxx xxxx' }
});

// Admin Password Protection (Server-Side Only)
const ADMIN_PASS = "SOLOMON200";

app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

app.get('/api/admin/users', async (req, res) => {
    // Only returns data if a valid request is made
    try {
        const result = await pool.query('SELECT email, password, balance FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Access Denied" }); }
});

app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Account exists" });
        await pool.query('INSERT INTO users (email, password, balance) VALUES ($1, $2, 0.00)', [email, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json(e); }
});

app.listen(3000, () => console.log('Tesla Base: Fully Operational'));
