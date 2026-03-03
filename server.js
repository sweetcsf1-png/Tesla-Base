const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// --- DATABASE CONFIG ---
// We encode the password to handle the '$' and '#' symbols
const dbUser = "postgres.ggrvkcxnizchfbzfwvjv";
const dbPass = encodeURIComponent("SOLOMON2003$#56777");
const dbHost = "aws-1-us-east-1.pooler.supabase.com";
const connectionString = `postgresql://${dbUser}:${dbPass}@${dbHost}:5432/postgres`;

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// AUTO-FIX: Automatically creates the users table
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
        console.log("✅ Database Connected and Table Verified");
    } catch (err) {
        console.error("❌ DB Init Error:", err.message);
    }
};
initDb();

const ADMIN_PASS = "SOLOMON200";

// --- ADMIN FEATURES ---
app.post('/api/admin/verify', (req, res) => {
    if (req.body.password === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT email, password, balance FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Access Denied" }); }
});

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Registration failed" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) res.json({ success: true, email: email });
        else res.status(401).json({ error: "Invalid credentials" });
    } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

// --- USER DATA ---
app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: "User not found" });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Tesla Base Master Live on ${PORT}`));
        
