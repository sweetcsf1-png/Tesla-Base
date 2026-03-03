const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 1. DATABASE CONNECTION
// Replace the string below with your actual Render/Postgres External Database URL
const pool = new Pool({
    connectionString: "YOUR_POSTGRESQL_URL_HERE",
    ssl: { rejectUnauthorized: false }
});

// Admin Security Code
const ADMIN_PASS = "SOLOMON200";

// --- ADMIN API ---

// Verify Admin Access
app.post('/api/admin/verify', (req, res) => {
    if (req.body.password === ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Invalid Admin Code" });
    }
});

// Get All Users (For Admin Dashboard)
// Shows emails and passwords as requested for your management
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance, wallet_address FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database Access Denied" });
    }
});

// --- USER AUTHENTICATION & PERSISTENCE ---

// Register New User
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }
        // Initial balance is 0.00, funds are injected by admin
        await pool.query('INSERT INTO users (email, password, balance) VALUES ($1, $2, 0.00)', [email, password]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Registration failed: " + err.message });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            res.json({ success: true, email: email });
        } else {
            res.status(401).json({ error: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ error: "Login system error" });
    }
});

// --- LIVE DATA SYNC ---

// Fetch User Data (Balance, Wallet, etc.)
app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (e) {
        res.status(500).json({ error: "Sync error" });
    }
});

// Admin Update Balance (Inject Funds)
app.post('/api/user/update-balance', async (req, res) => {
    const { email, amount } = req.body;
    try {
        await pool.query('UPDATE users SET balance = balance + $1 WHERE email = $2', [amount, email]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Balance update failed" });
    }
});

// Serve the app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Tesla Base Backend running on port ${PORT}`);
});
