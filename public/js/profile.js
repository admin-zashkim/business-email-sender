const token = localStorage.getItem('token');
if (!token) window.location.href = '/';

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
});

// Load profile
async function loadProfile() {
    try {
        const res = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
        }
        const data = await res.json();

        document.getElementById('profileEmail').textContent = data.email;
        document.getElementById('displayName').value = data.display_name || '';
        document.getElementById('memberSince').textContent = new Date(data.created_at).toLocaleDateString();
        document.getElementById('sessionCount').textContent = `${data.sessioncount} / 6`;
        const percent = (data.sessioncount / 6) * 100;
        document.getElementById('sessionProgress').style.width = percent + '%';
        if (data.avatar) {
            document.getElementById('avatar').src = data.avatar;
        }
    } catch (err) {
        console.error(err);
    }
}

loadProfile();

// Update display name
document.getElementById('updateNameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('displayName').value.trim();
    const btn = document.getElementById('updateNameBtn');
    const loading = document.getElementById('nameLoading');
    const messageDiv = document.getElementById('nameMessage');

    btn.disabled = true;
    loading.style.display = 'inline-flex';
    messageDiv.innerHTML = '';

    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ displayName })
        });
        const data = await res.json();

        if (res.ok) {
            messageDiv.textContent = 'Display name updated.';
            messageDiv.className = 'message success';
        } else {
            messageDiv.textContent = data.error || 'Update failed.';
            messageDiv.className = 'message error';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.className = 'message error';
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
});

// Change password
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('changePasswordBtn');
    const loading = document.getElementById('passwordLoading');
    const messageDiv = document.getElementById('passwordMessage');

    if (newPass !== confirm) {
        messageDiv.textContent = 'New passwords do not match.';
        messageDiv.className = 'message error';
        return;
    }

    btn.disabled = true;
    loading.style.display = 'inline-flex';
    messageDiv.innerHTML = '';

    try {
        const res = await fetch('/api/profile/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword: current, newPassword: newPass })
        });
        const data = await res.json();

        if (res.ok) {
            messageDiv.textContent = 'Password changed successfully.';
            messageDiv.className = 'message success';
            document.getElementById('changePasswordForm').reset();
        } else {
            messageDiv.textContent = data.error || 'Password change failed.';
            messageDiv.className = 'message error';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.className = 'message error';
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
});