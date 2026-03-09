// Tab switching
document.getElementById('loginTab').addEventListener('click', () => {
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('signupTab').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');
    clearMessages();
});

document.getElementById('signupTab').addEventListener('click', () => {
    document.getElementById('signupTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    clearMessages();
});

function clearMessages() {
    document.getElementById('loginMessage').innerHTML = '';
    document.getElementById('signupMessage').innerHTML = '';
    document.getElementById('loginMessage').className = 'message';
    document.getElementById('signupMessage').className = 'message';
}

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const loading = document.getElementById('loginLoading');
    const messageDiv = document.getElementById('loginMessage');
    const resendLink = document.getElementById('resendVerificationLink');

    btn.disabled = true;
    loading.style.display = 'inline-flex';
    messageDiv.innerHTML = '';
    resendLink.style.display = 'none';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/dashboard.html';
        } else {
            messageDiv.textContent = data.error || 'Login failed';
            messageDiv.className = 'message error';
            if (data.error && data.error.includes('verify')) {
                resendLink.style.display = 'inline-block';
                resendLink.dataset.email = email;
            }
        }
    } catch (err) {
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'message error';
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
});

// Resend verification
document.getElementById('resendVerificationLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = e.target.dataset.email;
    if (!email) return;

    const messageDiv = document.getElementById('loginMessage');
    messageDiv.innerHTML = 'Sending...';
    messageDiv.className = 'message';

    try {
        const res = await fetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
            messageDiv.textContent = 'Verification email sent. Check your inbox.';
            messageDiv.className = 'message success';
        } else {
            messageDiv.textContent = data.error || 'Failed to resend.';
            messageDiv.className = 'message error';
        }
    } catch {
        messageDiv.textContent = 'Network error.';
        messageDiv.className = 'message error';
    }
});

// Signup
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value.trim();
    const displayName = document.getElementById('signupName').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const btn = document.getElementById('signupBtn');
    const loading = document.getElementById('signupLoading');
    const messageDiv = document.getElementById('signupMessage');

    if (password !== confirm) {
        messageDiv.textContent = 'Passwords do not match.';
        messageDiv.className = 'message error';
        return;
    }

    btn.disabled = true;
    loading.style.display = 'inline-flex';
    messageDiv.innerHTML = '';

    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName })
        });
        const data = await res.json();

        if (res.ok) {
            messageDiv.textContent = 'Account created! Please check your email to verify.';
            messageDiv.className = 'message success';
            document.getElementById('signupForm').reset();
            setTimeout(() => {
                document.getElementById('loginTab').click();
            }, 3000);
        } else {
            messageDiv.textContent = data.error || 'Signup failed';
            messageDiv.className = 'message error';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'message error';
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
});

// Check for verified query param on login page
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('verified') === 'true') {
    const msg = document.getElementById('loginMessage');
    msg.textContent = 'Email verified! You can now log in.';
    msg.className = 'message success';
}