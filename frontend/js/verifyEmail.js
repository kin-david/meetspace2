const API_BASE = window.API_CONFIG ? window.API_CONFIG.AUTH_BASE : 'http://localhost:5000/api/auth';

const form = document.getElementById('verifyForm');
const message = document.getElementById('message');
const tokenInput = document.getElementById('token');

const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get('token');
if (tokenFromUrl) {
  tokenInput.value = tokenFromUrl;
}

function setStatus(text, type = 'notice') {
  message.className = type;
  message.textContent = text;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Verifying email...');

  const token = document.getElementById('token').value.trim();

  try {
    const response = await fetch(`${API_BASE}/verify-email?token=${encodeURIComponent(token)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Verification failed');
    }
    setStatus((data.message || 'Email verified successfully.') + ' Redirecting to login...', 'success');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 1000);
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

if (tokenFromUrl) {
  form.dispatchEvent(new Event('submit', { cancelable: true }));
}
