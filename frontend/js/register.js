const API_BASE = 'http://localhost:5000/api/auth';

const form = document.getElementById('registerForm');
const message = document.getElementById('message');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm_password');
const fullNameInput = document.getElementById('full_name');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone_number');

// Password strength meter
function getPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  return strength;
}

function getPasswordStrengthColor(strength) {
  if (strength <= 2) return '#d32f2f';
  if (strength <= 3) return '#f57c00';
  if (strength <= 4) return '#fbc02d';
  return '#388e3c';
}

function validateForm() {
  const errors = [];
  
  if (!fullNameInput.value.trim() || fullNameInput.value.trim().length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }
  if (fullNameInput.value.trim().length > 120) {
    errors.push('Full name must not exceed 120 characters.');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailInput.value.trim())) {
    errors.push('Please enter a valid email address.');
  }
  
  const allowedDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', '.co.ke'];
  const domain = emailInput.value.trim().split('@')[1];
  if (!allowedDomains.some(d => domain.includes(d))) {
    errors.push('Please use a valid email domain (Gmail, Hotmail, Yahoo, Outlook, or .co.ke).');
  }
  
  if (phoneInput.value.trim()) {
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(phoneInput.value.trim())) {
      errors.push('Phone number must be 9-15 digits (may start with +).');
    }
  }
  
  const password = passwordInput.value;
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*).');
  }
  
  if (password !== confirmPasswordInput.value) {
    errors.push('Passwords do not match.');
  }
  
  return errors;
}

function setStatus(text, type = 'notice') {
  message.className = type;
  message.innerHTML = '';
  
  if (Array.isArray(text)) {
    text.forEach(msg => {
      const div = document.createElement('div');
      div.textContent = '• ' + msg;
      message.appendChild(div);
    });
  } else {
    message.textContent = text;
  }
}

if (passwordInput) {
  passwordInput.addEventListener('input', () => {
    const strength = getPasswordStrength(passwordInput.value);
    const color = getPasswordStrengthColor(strength);
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    
    const strengthMeter = document.getElementById('strength-meter');
    const strengthLabel = document.getElementById('strength-label');
    if (strengthMeter) {
      strengthMeter.style.backgroundColor = color;
      strengthMeter.style.width = ((strength / 6) * 100) + '%';
    }
    if (strengthLabel) {
      strengthLabel.textContent = strengthLabels[strength] || 'Very Weak';
      strengthLabel.style.color = color;
    }
  });
}

function togglePasswordVisibility(fieldId, checkbox) {
  const field = document.getElementById(fieldId);
  const type = checkbox.checked ? 'text' : 'password';
  field.type = type;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const validationErrors = validateForm();
  if (validationErrors.length > 0) {
    setStatus(validationErrors, 'error');
    return;
  }
  
  setStatus('Creating account...');

  const payload = {
    full_name: fullNameInput.value.trim(),
    email: emailInput.value.trim(),
    phone_number: phoneInput.value.trim(),
    password: passwordInput.value,
    confirm_password: confirmPasswordInput.value
  };

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      let errors = [];
      if (data.errors && Array.isArray(data.errors)) {
        errors = data.errors.map(e => e.msg);
      } else if (data.message) {
        errors = [data.message];
      } else {
        errors = ['Registration failed. Please try again.'];
      }
      throw new Error(JSON.stringify(errors));
    }

    setStatus(data.message || 'Registration successful. Redirecting to login...', 'success');
    form.reset();

    setTimeout(() => {
      window.location.href = '../index.html';
    }, 1500);
  } catch (error) {
    try {
      const errors = JSON.parse(error.message);
      setStatus(errors, 'error');
    } catch {
      setStatus(error.message, 'error');
    }
  }
});
