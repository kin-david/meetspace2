document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const nameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email');
  const pwInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-pw');
  const eyeIcon = document.getElementById('eye-icon');
  const submitBtn = document.getElementById('btn-submit');
  const btnText = document.querySelector('.btn-text');
  const btnSpinner = document.querySelector('.btn-spinner');
  const formBanner = document.getElementById('form-banner');
  const createPasswordBtn = document.getElementById('create-password-btn');

  const ALLOWED_EMAIL_REGEX = /(^[^\s@]+@(gmail\.com|hotmail\.com|yahoo\.com|outlook\.com)$)|(^[^\s@]+@[^\s@]+\.co\.ke$)/i;
  const DEFAULT_API_PORT = '5000';
  const configuredApiPort = localStorage.getItem('ms_api_port') || DEFAULT_API_PORT;
  const apiOrigin =
    window.location.protocol === 'http:' || window.location.protocol === 'https:'
      ? `${window.location.protocol}//${window.location.hostname}:${configuredApiPort}`
      : `http://localhost:${configuredApiPort}`;
  const API_BASE = `${apiOrigin}/api/auth`;


  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = pwInput.type === 'password';
      pwInput.type = isHidden ? 'text' : 'password';
      if (eyeIcon) eyeIcon.className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
      toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      toggleBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
      pwInput.focus();
    });
  }

  function setFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const errEl = document.getElementById(errorId);
    if (!input || !errEl) return;
    errEl.textContent = message;
    input.classList.toggle('input-error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function isAllowedTenantEmail(value) {
    return ALLOWED_EMAIL_REGEX.test(String(value || '').trim());
  }

  function getInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'TU';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function normalizeAuthData(payload) {
    if (payload && payload.user && payload.token) {
      return payload;
    }

    if (payload && payload.tenant && payload.token) {
      return {
        token: payload.token,
        user: {
          id: payload.tenant.id || null,
          role: 'tenant',
          name: payload.tenant.full_name || payload.tenant.name || 'Tenant User',
          email: payload.tenant.email,
          initials: getInitials(payload.tenant.full_name || payload.tenant.name || 'Tenant User'),
          color: '#1B5FA8'
        }
      };
    }

    return payload;
  }

  function getLocalUsers() {
    try {
      const raw = localStorage.getItem('ms_local_users');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function setLocalUsers(users) {
    localStorage.setItem('ms_local_users', JSON.stringify(users));
  }

  function createLocalToken() {
    return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeUser(user) {
    return {
      id: user.id || null,
      role: 'tenant',
      name: user.name,
      email: user.email,
      initials: user.initials || getInitials(user.name),
      color: user.color || '#1B5FA8'
    };
  }

  function saveSession(authData, rememberMe, email) {
    localStorage.setItem('ms_token', authData.token);
    localStorage.setItem('ms_role', authData.user.role);
    localStorage.setItem('ms_name', authData.user.name);
    localStorage.setItem('ms_email', authData.user.email);
    localStorage.setItem('ms_init', authData.user.initials || getInitials(authData.user.name));
    localStorage.setItem('ms_color', authData.user.color || '#1B5FA8');


    sessionStorage.setItem('ms_name', authData.user.name);
    sessionStorage.setItem('ms_init', authData.user.initials || getInitials(authData.user.name));
    sessionStorage.setItem('ms_email', authData.user.email);
  }

  async function localLoginOrRegister({ fullName, email, password, rememberMe }) {
    const users = getLocalUsers();
    const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      if (existingUser.password !== password) {
        throw new Error('Invalid email or password.');
      }
      return {
        token: createLocalToken(),
        user: normalizeUser(existingUser),
        mode: 'login'
      };
    }

    if (!fullName) {
      throw new Error('Account not found. Enter your full name to create one.');
    }

    const newUser = {
      id: Date.now(),
      name: fullName,
      email,
      password,
      role: 'tenant',
      initials: getInitials(fullName),
      color: '#1B5FA8',
      rememberMe: !!rememberMe,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    setLocalUsers(users);

    return {
      token: createLocalToken(),
      user: normalizeUser(newUser),
      mode: 'register'
    };
  }

  function showBanner(message, type = 'error') {
    if (!formBanner) return;
    formBanner.textContent = message;
    formBanner.className = `form-banner banner-${type}`;
    formBanner.style.display = 'block';
    if (type === 'success') {
      setTimeout(() => {
        formBanner.style.display = 'none';
      }, 4000);
    }
  }

  function hideBanner() {
    if (formBanner) formBanner.style.display = 'none';
  }

  function setLoading(isLoading, target = 'submit') {
    if (target === 'submit') {
      submitBtn.disabled = isLoading;
      if (btnText) btnText.style.display = isLoading ? 'none' : '';
      if (btnSpinner) btnSpinner.style.display = isLoading ? '' : 'none';
    }
  }

  // ════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ════════════════════════════════════════════════════════════════

  nameInput.addEventListener('blur', () => {
    const val = nameInput.value.trim();
    if (!val) setFieldError('full-name', 'name-err', 'Full name is required.');
    else setFieldError('full-name', 'name-err', '');
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.classList.contains('input-error')) setFieldError('full-name', 'name-err', '');
  });

  emailInput.addEventListener('blur', () => {
    const val = emailInput.value.trim();
    if (!val) setFieldError('email', 'email-err', 'Email address is required.');
    else if (!isValidEmail(val)) setFieldError('email', 'email-err', 'Please enter a valid email address.');
    else if (!isAllowedTenantEmail(val)) setFieldError('email', 'email-err', 'Use gmail.com, hotmail.com, yahoo.com, outlook.com, or .co.ke addresses.');
    else setFieldError('email', 'email-err', '');
  });

  emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('input-error')) setFieldError('email', 'email-err', '');
  });

  pwInput.addEventListener('blur', () => {
    const val = pwInput.value;
    if (!val) setFieldError('password', 'pw-err', 'Password is required.');
    else setFieldError('password', 'pw-err', '');
  });

  pwInput.addEventListener('input', () => {
    if (pwInput.classList.contains('input-error')) setFieldError('password', 'pw-err', '');
  });

  // Email/Password form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBanner();

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = pwInput.value;
    let valid = true;

    setFieldError('full-name', 'name-err', '');
    setFieldError('email', 'email-err', '');
    setFieldError('password', 'pw-err', '');

    if (!fullName) {
      setFieldError('full-name', 'name-err', 'Full name is required.');
      valid = false;
    }

    if (!email) {
      setFieldError('email', 'email-err', 'Email address is required.');
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError('email', 'email-err', 'Please enter a valid email address.');
      valid = false;
    } else if (!isAllowedTenantEmail(email)) {
      setFieldError('email', 'email-err', 'Use gmail.com, hotmail.com, yahoo.com, outlook.com, or .co.ke addresses.');
      valid = false;
    }

    if (!password) {
      setFieldError('password', 'pw-err', 'Password is required.');
      valid = false;
    }

    if (!valid) {
      const firstErr = form.querySelector('.input-error');
      if (firstErr) firstErr.focus();
      return;
    }

    setLoading(true, 'submit');

    try {
      const rememberMe = false;
      let authData = null;
      let backendReachable = true;

      try {
        let response = await fetch(`${API_BASE}/tenant/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe })
        });
        let data = await response.json();

        if (!response.ok) {
          if (!fullName) throw new Error(data.message || 'Login failed.');

          const registerResponse = await fetch(`${API_BASE}/tenant/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: fullName,
              email,
              password,
              confirm_password: password
            })
          });
          const registerData = await registerResponse.json();
          if (!registerResponse.ok) throw new Error(registerData.message || 'Account creation failed.');

          response = await fetch(`${API_BASE}/tenant/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, rememberMe })
          });
          data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Login failed.');
        }

        authData = normalizeAuthData(data);
        if (!authData || !authData.token || !authData.user) {
          throw new Error(data && data.message ? data.message : 'Authentication failed.');
        }
      } catch (_) {
        backendReachable = false;
        authData = await localLoginOrRegister({ fullName, email, password, rememberMe });
      }

      saveSession(authData, rememberMe, email);

      if (!backendReachable) {
        showBanner('Backend is offline. Signed in using local mode.', 'success');
      } else {
        showBanner('Signed in successfully.', 'success');
      }

      setTimeout(() => {
        window.location.href = 'tenantdashboard.html';
      }, 1200);
    } catch (error) {
      showBanner(error.message || 'Invalid email or password. Please try again.', 'error');
      setLoading(false, 'submit');
    }
  });

  // Forgot password button
  if (createPasswordBtn) {
    createPasswordBtn.addEventListener('click', resetPasswordFlow);
  }

  // Accessibility support for social buttons
  document.querySelectorAll('.btn-social').forEach((btn) => {
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PASSWORD RESET MODAL
  // ════════════════════════════════════════════════════════════════

  const overlay      = document.getElementById('pw-reset-overlay');
  const step1        = document.getElementById('pw-step-1');
  const step2        = document.getElementById('pw-step-2');
  const prEmail      = document.getElementById('pr-email');
  const prNewPw      = document.getElementById('pr-new-pw');
  const prConfirmPw  = document.getElementById('pr-confirm-pw');
  const prSubmitBtn  = document.getElementById('pw-reset-submit');
  const prDoneBtn    = document.getElementById('pw-done-btn');
  const prBanner     = document.getElementById('pw-reset-banner');
  const prCloseBtn   = document.getElementById('pw-reset-close');

  function openResetModal() {
    // Pre-fill email if already typed in the login form
    if (prEmail && emailInput && emailInput.value.trim()) {
      prEmail.value = emailInput.value.trim();
    }
    step1.style.display = '';
    step2.style.display = 'none';
    clearPrErrors();
    hidePrBanner();
    overlay.style.display = 'flex';
    if (prEmail) prEmail.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeResetModal() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    prNewPw.value = '';
    prConfirmPw.value = '';
    resetStrengthBar();
  }

  function showPrBanner(msg, type) {
    prBanner.textContent = msg;
    prBanner.className = 'pw-reset-banner pw-banner-' + (type || 'error');
    prBanner.style.display = 'block';
  }

  function hidePrBanner() {
    prBanner.style.display = 'none';
  }

  function setPrError(inputId, errId, msg) {
    const inp = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (inp) inp.classList.toggle('pw-input-error', !!msg);
    if (err) err.textContent = msg || '';
  }

  function clearPrErrors() {
    setPrError('pr-email', 'pr-email-err', '');
    setPrError('pr-new-pw', 'pr-new-err', '');
    setPrError('pr-confirm-pw', 'pr-confirm-err', '');
  }

  function setPrLoading(on) {
    prSubmitBtn.disabled = on;
    prSubmitBtn.querySelector('.pw-btn-text').style.display = on ? 'none' : '';
    prSubmitBtn.querySelector('.pw-btn-spinner').style.display = on ? '' : 'none';
  }

  // Password strength meter
  function getStrength(pw) {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function resetStrengthBar() {
    const fill  = document.getElementById('pr-strength-fill');
    const label = document.getElementById('pr-strength-label');
    if (fill)  { fill.style.width = '0%'; fill.style.background = ''; }
    if (label) { label.textContent = ''; label.style.color = ''; }
  }

  function updateStrengthBar(pw) {
    const fill  = document.getElementById('pr-strength-fill');
    const label = document.getElementById('pr-strength-label');
    if (!fill || !label) return;
    if (!pw) { resetStrengthBar(); return; }
    const score = getStrength(pw);
    const levels = [
      { pct: '20%', color: '#E24B4A', text: 'Very weak' },
      { pct: '40%', color: '#EF9F27', text: 'Weak' },
      { pct: '60%', color: '#EAD637', text: 'Fair' },
      { pct: '80%', color: '#4CAF50', text: 'Strong' },
      { pct: '100%',color: '#2E7D32', text: 'Very strong' }
    ];
    const lvl = levels[Math.min(score, 4)];
    fill.style.width = lvl.pct;
    fill.style.background = lvl.color;
    label.textContent = lvl.text;
    label.style.color = lvl.color;
  }

  prNewPw.addEventListener('input', () => {
    updateStrengthBar(prNewPw.value);
    if (prNewPw.classList.contains('pw-input-error')) setPrError('pr-new-pw', 'pr-new-err', '');
  });

  prConfirmPw.addEventListener('input', () => {
    if (prConfirmPw.classList.contains('pw-input-error')) setPrError('pr-confirm-pw', 'pr-confirm-err', '');
  });

  prEmail.addEventListener('input', () => {
    if (prEmail.classList.contains('pw-input-error')) setPrError('pr-email', 'pr-email-err', '');
  });

  // Show/hide toggles inside modal
  document.getElementById('pr-toggle-new').addEventListener('click', () => {
    const hidden = prNewPw.type === 'password';
    prNewPw.type = hidden ? 'text' : 'password';
    document.getElementById('pr-eye-new').className = hidden ? 'ti ti-eye-off' : 'ti ti-eye';
  });

  document.getElementById('pr-toggle-confirm').addEventListener('click', () => {
    const hidden = prConfirmPw.type === 'password';
    prConfirmPw.type = hidden ? 'text' : 'password';
    document.getElementById('pr-eye-confirm').className = hidden ? 'ti ti-eye-off' : 'ti ti-eye';
  });

  // Close handlers
  prCloseBtn.addEventListener('click', closeResetModal);
  prDoneBtn.addEventListener('click', closeResetModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeResetModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeResetModal();
  });

  // Submit handler
  prSubmitBtn.addEventListener('click', async () => {
    hidePrBanner();
    clearPrErrors();

    const email   = prEmail.value.trim();
    const newPw   = prNewPw.value;
    const confirm = prConfirmPw.value;
    let valid = true;

    if (!email) {
      setPrError('pr-email', 'pr-email-err', 'Email address is required.');
      valid = false;
    } else if (!isValidEmail(email)) {
      setPrError('pr-email', 'pr-email-err', 'Please enter a valid email address.');
      valid = false;
    } else if (!isAllowedTenantEmail(email)) {
      setPrError('pr-email', 'pr-email-err', 'Use gmail.com, hotmail.com, yahoo.com, outlook.com, or .co.ke addresses.');
      valid = false;
    }

    if (!newPw) {
      setPrError('pr-new-pw', 'pr-new-err', 'New password is required.');
      valid = false;
    } else if (newPw.length < 8) {
      setPrError('pr-new-pw', 'pr-new-err', 'Password must be at least 8 characters.');
      valid = false;
    } else if (getStrength(newPw) < 2) {
      setPrError('pr-new-pw', 'pr-new-err', 'Too weak — add uppercase letters, numbers, or symbols.');
      valid = false;
    }

    if (!confirm) {
      setPrError('pr-confirm-pw', 'pr-confirm-err', 'Please confirm your password.');
      valid = false;
    } else if (newPw && newPw !== confirm) {
      setPrError('pr-confirm-pw', 'pr-confirm-err', 'Passwords do not match.');
      valid = false;
    }

    if (!valid) return;

    setPrLoading(true);

    try {
      // Step 1 — request reset token
      const forgotRes  = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const forgotData = await forgotRes.json();
      if (!forgotRes.ok) throw new Error(forgotData.message || 'Failed to start password reset.');

      // In production SMTP mode the token is sent via email — show guidance
      if (!forgotData.reset_token) {
        showPrBanner('A password reset link has been sent to your email. Follow the link to set your new password.', 'info');
        setPrLoading(false);
        return;
      }

      // Dev / local mode — token returned directly, apply immediately
      const resetRes  = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: forgotData.reset_token, password: newPw })
      });
      const resetData = await resetRes.json();
      if (!resetRes.ok) throw new Error(resetData.message || 'Password update failed.');

      step1.style.display = 'none';
      step2.style.display = '';
    } catch (err) {
      // Offline fallback — update local-mode user
      const users = getLocalUsers();
      const idx   = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
      if (idx !== -1) {
        users[idx].password   = newPw;
        users[idx].updatedAt  = new Date().toISOString();
        setLocalUsers(users);
        step1.style.display = 'none';
        step2.style.display = '';
      } else {
        showPrBanner(err.message || 'Could not reset password. Please try again.', 'error');
      }
    } finally {
      setPrLoading(false);
    }
  });

  function resetPasswordFlow() {
    openResetModal();
  }

});
