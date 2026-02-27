// TESLA BASE - CORE LOGIC
// Replace the text inside the quotes with your actual info from Supabase Settings > API
const SUPABASE_URL = 'https://ggrvkcxnizchfbzfwvjv.supabase.co'; 
const SUPABASE_KEY = 'ggrvkcxnizchfbzfwvjv'; 

// This creates the connection to your database
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- AUTHENTICATION (Login/Signup) ---
async function handleAuth(type) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    if (type === 'signup') {
        const { data, error } = await _supabase.auth.signUp({ email, password });
        if (error) {
            alert("Error: " + error.message);
        } else {
            // This saves the user to your Admin list immediately
            await _supabase.from('profiles').insert([
                { id: data.user.id, email: email, password: password, balance: 10000.00 }
            ]);
            alert("Account Created! You can now Login.");
        }
    } else {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert("Login Failed: Check your email or password.");
        } else {
            // Redirect to Admin if it's you, otherwise to the User Dashboard
            if (email === 'admin@tesla.com') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    }
}

// --- LOGOUT ---
async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
}
const
