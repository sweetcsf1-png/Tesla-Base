const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// --- DATABASE CONFIG ---
const dbUser = "postgres.ggrvkcxnizchfbzfwvjv";
const dbPass = encodeURIComponent("SOLOMON2003$#56777");
const dbHost = "aws-1-us-east-1.pooler.supabase.com";
const connectionString = `postgresql://${dbUser}:${dbPass}@${dbHost}:5432/postgres`;

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// Auto-Table Fixer
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                balance DECIMAL(20, 2) DEFAULT 0.00,
                wallet_address TEXT DEFAULT '1Tesla' || md5(random()::text)
            );
        `);
        console.log("✅ Database Ready");
    } catch (err) {
        console.error("❌ DB Error:", err.message);
    }
};
initDb();

// Login API
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) res.json({ success: true, email: email });
        else res.status(401).json({ error: "Invalid credentials" });
    } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

// Register API
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Registration failed" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on ${PORT}`));
