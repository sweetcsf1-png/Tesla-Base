// TESLA BASE - MASTER CORE LOGIC
const SUPABASE_URL = 'https://ggrvkcxnizchfbzfwvjv.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncnZrY3huaXpjaGZiemZ3dmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDIzMTksImV4cCI6MjA4NzcxODMxOX0.gGdwPSEdTSgVyChKdXRm1IwvvgaYfIpfVID3RZkaD30'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. AUTHENTICATION ---
async function handleAuth(type) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return alert("Please enter both email and password.");

    if (type === 'signup') {
        const { data, error } = await _supabase.auth.signUp({ email, password });
        if (error) return alert("Signup Error: " + error.message);
        
        // Starts at $0 and saves password for Admin [cite: 2025-12-19, 2020-12-20]
        await _supabase.from('profiles').insert([
            { id: data.user.id, email: email, password: password, balance: 0 }
        ]);
        alert("Account Created! You can now Login.");
    } else {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) return alert("Login Failed: " + error.message);
        
        // Fast redirect [cite: 2025-12-19]
        if (email === 'admin@tesla.com') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
}

// --- 2. ADMIN ACTIONS (Inject/Deduct) ---
async function adminAction(actionType) {
    const targetEmail = document.getElementById('target-user').value;
    const amount = parseFloat(document.getElementById('inject-amount').value);
    
    if (!targetEmail || isNaN(amount)) return alert("Enter user email and amount");

    const { data: user } = await _supabase.from('profiles').select('*').eq('email', targetEmail).single();
    if (!user) return alert("User not found");

    let newBalance = user.balance;
    let historyType = "";

    if (actionType === 'deposit') {
        newBalance += amount;
        historyType = "Deposit Successful";
    } else if (actionType === 'interest') {
        newBalance += amount;
        historyType = "Interest";
    } else if (actionType === 'return') {
        newBalance += amount;
        historyType = "Investment Return";
    } else if (actionType === 'deduct') {
        newBalance -= amount; // Silent deduct [cite: 2020-12-20]
    }

    await _supabase.from('profiles').update({ balance: newBalance }).eq('email', targetEmail);

    if (historyType !== "") {
        await _supabase.from('history').insert([
            { user_id: user.id, type: historyType, amount: amount, status: 'Success' }
        ]);
    }
    alert("Action Completed Successfully");
}

function logout() {
    _supabase.auth.signOut();
    window.location.href = 'index.html';
}
