const token = localStorage.getItem('token');
if (!token) window.location.href = '/';

// Get session ID from URL
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('id');
if (!sessionId) window.location.href = '/dashboard.html';

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/';
});

// Load session details and history
let sessionData = null;

async function loadSession() {
    try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
        }
        if (!res.ok) {
            window.location.href = '/dashboard.html';
            return;
        }
        sessionData = await res.json();
        document.getElementById('sessionName').textContent = sessionData.session_name;
        document.getElementById('sentCount').textContent = sessionData.sent_count;
        document.getElementById('maxEmails').textContent = sessionData.max_emails;
    } catch (err) {
        console.error(err);
    }
}

async function loadHistory() {
    const container = document.getElementById('historyList');
    const loading = document.getElementById('loadingHistory');
    loading.style.display = 'inline-flex';
    container.innerHTML = '';

    try {
        const res = await fetch(`/api/email/history/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed');
        const history = await res.json();

        if (history.length === 0) {
            container.innerHTML = '<p>No emails sent yet.</p>';
        } else {
            container.innerHTML = history.map(h => `
                <div class="history-item ${h.status}" data-id="${h.id}">
                    <div class="recipient">To: ${escapeHtml(h.recipient)}</div>
                    <div class="subject">Subject: ${escapeHtml(h.subject)}</div>
                    <div class="date">${new Date(h.sent_at).toLocaleString()}</div>
                    ${h.status === 'failed' ? `<div class="error">Error: ${escapeHtml(h.error_message || 'Unknown')}</div>` : ''}
                    ${h.status === 'failed' ? `
                        <div class="history-actions">
                            <button class="resend-btn" data-id="${h.id}">Resend</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');

            // Attach resend handlers
            document.querySelectorAll('.resend-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const historyId = e.target.dataset.id;
                    resendEmail(historyId);
                });
            });
        }
    } catch (err) {
        container.innerHTML = '<p class="error">Failed to load history.</p>';
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

loadSession();
loadHistory();

// HTML example insertion
document.getElementById('insertPromo').addEventListener('click', () => {
    const promoHtml = `<div style="background:#f0f0f0; padding:20px; text-align:center;">
        <p style="color:#333;">This email was sent using <a href="https://businessemailsender.com" style="color:#ff4d4d;">BusinessEmailSender</a></p>
    </div>`;
    const bodyField = document.getElementById('body');
    bodyField.value += (bodyField.value ? '\n\n' : '') + promoHtml;
});

// Toggle HTML example visibility
document.querySelectorAll('input[name="bodyType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const exampleDiv = document.getElementById('htmlExample');
        exampleDiv.style.display = e.target.value === 'html' ? 'block' : 'none';
    });
});

// Preview
document.getElementById('previewBtn').addEventListener('click', () => {
    const subject = document.getElementById('subject').value.trim();
    const body = document.getElementById('body').value;
    const isHtml = document.querySelector('input[name="bodyType"]:checked').value === 'html';
    const previewDiv = document.getElementById('previewContent');

    const footer = `<br><hr><small>This email was sent using <a href="https://businessemailsender.com">BusinessEmailSender</a></small>`;
    let previewBody = isHtml ? body + footer : body.replace(/\n/g, '<br>') + footer;

    previewDiv.innerHTML = `
        <strong>Subject:</strong> ${escapeHtml(subject)}<br><br>
        <strong>Body:</strong><br>${previewBody}
    `;
    document.getElementById('previewModal').style.display = 'block';
});

// Close modal
document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').style.display = 'none';
    });
});

// Send email
document.getElementById('sendEmailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const recipient = document.getElementById('recipient').value.trim();
    const recipientConfirm = document.getElementById('recipientConfirm').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const body = document.getElementById('body').value;
    const isHtml = document.querySelector('input[name="bodyType"]:checked').value === 'html';
    const btn = document.getElementById('sendBtn');
    const loading = document.getElementById('sendLoading');
    const messageDiv = document.getElementById('sendMessage');

    if (recipient !== recipientConfirm) {
        messageDiv.textContent = 'Recipient emails do not match.';
        messageDiv.className = 'message error';
        return;
    }

    btn.disabled = true;
    loading.style.display = 'inline-flex';
    messageDiv.innerHTML = '';

    try {
        const res = await fetch('/api/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sessionId, recipient, subject, body, isHtml })
        });
        const data = await res.json();

        if (res.ok) {
            messageDiv.textContent = 'Email sent successfully!';
            messageDiv.className = 'message success';
            document.getElementById('sendEmailForm').reset();
            loadHistory(); // refresh history
            loadSession(); // refresh sent count
        } else {
            messageDiv.textContent = data.error || 'Failed to send.';
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

// Resend email
async function resendEmail(historyId) {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<span></span><div class="loading-dots" style="display:inline-flex"><span></span><span></span><span></span></div>';

    try {
        const res = await fetch(`/api/email/resend/${historyId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            loadHistory();
            loadSession();
        } else {
            alert(data.error || 'Resend failed');
        }
    } catch (err) {
        alert('Network error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Resend';
    }
}