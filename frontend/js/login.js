const API_BASE = 'http://localhost:5000/api/auth';

const form = document.getElementById('loginForm');
const message = document.getElementById('message');
const remember = document.getElementById('remember');

function persistTenantSession(data) {
  localStorage.setItem('tenantToken', data.token);
  localStorage.setItem('ms_token', data.token);
  localStorage.setItem('ms_role', 'tenant');

  if (data.tenant) {
    localStorage.setItem('ms_name', data.tenant.full_name || 'Tenant User');
    localStorage.setItem('ms_email', data.tenant.email || '');
    const initials = (data.tenant.full_name || 'Tenant User')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
    localStorage.setItem('ms_init', initials || 'TU');
  }
}

function setStatus(text, type = 'notice') {
  message.className = type;
  message.textContent = text;
}

(function preloadRememberedEmail() {
  const saved = localStorage.getItem('rememberedTenantEmail');
  if (saved) {
    document.getElementById('email').value = saved;
    remember.checked = true;
  }
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Logging in...');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (remember.checked) {
      localStorage.setItem('rememberedTenantEmail', email);
    } else {
      localStorage.removeItem('rememberedTenantEmail');
    }

    persistTenantSession(data);
    setStatus('Login successful. Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = '../tenantdashboard.html';
    }, 900);
  } catch (error) {
    setStatus(error.message, 'error');
  }
});
