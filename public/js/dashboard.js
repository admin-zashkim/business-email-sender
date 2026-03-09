const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
});

// Fetch sessions
async function loadSessions() {
    const container = document.getElementById('sessionsList');
    const loading = document.getElementById('loadingSessions');
    loading.style.display = 'inline-flex';
    container.innerHTML = '';

    try {
        const res = await fetch('/api/sessions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
        }
        const sessions = await res.json();

        if (sessions.length === 0) {
            container.innerHTML = '<p class="no-sessions">No sessions yet. Create one!</p>';
        } else {
            container.innerHTML = sessions.map(s => `
                <div class="session-card glass" data-id="${s.id}">
                    <h3>${escapeHtml(s.session_name)}</h3>
                    <p>${escapeHtml(s.email)}</p>
                    <div class="session-stats">
                        <span>Sent: ${s.sent_count} / ${s.max_emails}</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(s.sent_count / s.max_emails) * 100}%"></div>
                        </div>
                    </div>
                    <button class="btn-small open-session" data-id="${s.id}">Open</button>
                </div>
            `).join('');

            // Attach open handlers
            document.querySelectorAll('.open-session').forEach(btn => {
                btn.addEventListener('click', () => {
                    window.location.href = `/session.html?id=${btn.dataset.id}`;
                });
            });
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="error">Failed to load sessions.</p>';
    } finally {
        loading.style.display = 'none';
    }
}

function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"']/g, function(m) {
        if(m === '&') return '&amp;';
        if(m === '<') return '&lt;';
        if(m === '>') return '&gt;';
        if(m === '"') return '&quot;';
        if(m === "'") return '&#039;';
        return m;
    });
}

loadSessions();

// Modal handling
const modal = document.getElementById('sessionModal');
const createBtn = document.getElementById('createSessionBtn');
const closeBtn = document.querySelector('.close');

createBtn.onclick = () => {
    modal.style.display = 'block';
    document.getElementById('sessionForm').reset();
    document.getElementById('sessionMessage').innerHTML = '';
};

closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};

// Toggle password visibility
document.querySelector('.toggle-password').addEventListener('click', (e) => {
    const targetId = e.target.dataset.target;
    const input = document.getElementById(targetId);
    if (input.type === 'password') {
        input.type = 'text';
        e.target.textContent = '🙈';
    } else {
        input.type = 'password';
        e.target.textContent = '👁️';
    }
});

// Create session form
document.getElementById('sessionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sessionName = document.getElementById('sessionName').value.trim();
    const email = document.getElementById('sessionEmail').value.trim();
    const appPassword = document.getElementById('appPassword').value;
    const btn = document.getElementById('validateBtn');
    const loading = document.getElementById('sessionLoading');
    const messageDiv = document.getElementById('sessionMessage');

    btn.disabled = true;
    loading.style.display = 'inline-flex';
    messageDiv.innerHTML = '';

    try {
        const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sessionName, email, appPassword })
        });
        const data = await res.json();

        if (res.ok) {
            messageDiv.textContent = 'Session created successfully!';
            messageDiv.className = 'message success';
            setTimeout(() => {
                modal.style.display = 'none';
                loadSessions();
            }, 1500);
        } else {
            messageDiv.textContent = data.error || 'Validation failed.';
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