const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONFIG ---
// RULE: Use the External Database URL from Render Dashboard
const connectionString = "PASTE_YOUR_RENDER_EXTERNAL_URL_HERE";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// AUTO-FIX: This creates the table automatically so you don't get the 42601 error
const initDb = async () => {
    try {
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
        console.log("✅ Database Table Verified/Created");
    } catch (err) {
        console.error("❌ Database Init Error:", err.message);
    }
};
initDb();

const ADMIN_PASS = "SOLOMON200";

// --- ADMIN API ---
app.post('/api/admin/verify', (req, res) => {
    if (req.body.password === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance, wallet_address FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Access Denied" }); }
});

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "User exists" });
        
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
        else res.status(401).json({ error: "Invalid credentials" });
    } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

// --- DATA SYNC ---
app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: "User not found" });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

app.post('/api/user/update-balance', async (req, res) => {
    const { email, amount } = req.body;
    try {
        await pool.query('UPDATE users SET balance = balance + $1 WHERE email = $2', [amount, email]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Update failed" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Tesla Base Master Live on ${PORT}`));
