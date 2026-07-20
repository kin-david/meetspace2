const API_BASE = window.API_CONFIG ? window.API_CONFIG.AUTH_BASE : 'http://localhost:5000/api/auth';

const form = document.getElementById('forgotForm');
const message = document.getElementById('message');

function setStatus(text, type = 'notice') {
  message.className = type;
  message.textContent = text;
}

function setStatusHtml(html, type = 'notice') {
  message.className = type;
  message.innerHTML = html;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Sending reset link...');

  const email = document.getElementById('email').value.trim();

  try {
    const response = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (!response.ok) {
      const detail = data.errors && data.errors[0] ? data.errors[0].msg : data.message;
      throw new Error(detail || 'Request failed');
    }

    if (data.reset_token) {
      const resetUrl = `./reset-password.html?token=${encodeURIComponent(data.reset_token)}`;
      setStatusHtml(`Local mode token generated. <a href="${resetUrl}">Open reset page</a>`, 'success');
      return;
    }

    setStatus(data.message || 'If this email exists, a reset link has been sent.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
});
