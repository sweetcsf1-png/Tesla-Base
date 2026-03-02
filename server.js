const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Your Render/Postgres URL
});

// GET USER DATA (Email, Password for Admin, and Balance)
app.get('/api/user/data', async (req, res) => {
    const { email } = req.query;
    try {
        const result = await pool.query('SELECT email, password, balance FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

// UPDATE BALANCE (For Trading/Injections)
app.post('/api/user/update-balance', async (req, res) => {
    const { email, newBalance } = req.body;
    try {
        await pool.query('UPDATE users SET balance = $1 WHERE email = $2', [newBalance, email]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to sync balance" });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));