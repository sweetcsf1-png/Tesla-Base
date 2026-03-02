const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors()); // This allows the Admin and Users to communicate without errors
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
        pass: 'xxxx xxxx xxxx xxxx' 
    }
});

// 3. SECRET ADMIN ACCESS (SOLOMON200)
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    if (password === "SOLOMON200") {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Invalid Admin Password" });
    }
});

// 4. GET ALL USERS (For Admin Dashboard)
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database Communication Error" });
    }
});

// 5. REGISTRATION LOGIC
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Email already registered" });
        
        await pool.query('INSERT INTO users (email, password, balance) VALUES ($1, $2, $3)', [email, password, 0.00]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. FETCH USER DATA (For Balance and BTC Calc)
app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: "User not found" });
    }
});

app.listen(3000, () => console.log('Tesla Base: Admin-User Link Active on Port 3000'));
    
