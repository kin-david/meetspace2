/* ════════════════════════════════════════════
   MeetSpace — Admin Login Page
   admin-login.js
   Handles: form validation, password toggle,
            remember me, loading state,
            rate limiting (max 5 attempts),
            session lock after failed attempts
════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Element references ── */
  const form        = document.querySelector('.login-form');
  const emailInput  = document.getElementById('email');
  const pwInput     = document.getElementById('password');
  const rememberChk = document.getElementById('remember');
  const submitBtn   = document.querySelector('.btn-login');

  /* ── Constants ── */
  const MAX_ATTEMPTS   = 5;    /* lock after 5 failed attempts  */
  const LOCKOUT_MS     = 30000; /* 30-second lockout             */
  const ATTEMPT_KEY    = 'ms_admin_attempts';
  const LOCKOUT_KEY    = 'ms_admin_lockout';
  const REMEMBER_KEY   = 'ms_admin_email';

  /* ════════════════════════════════════════
     1. INJECT DYNAMIC UI ELEMENTS
        (password toggle + banners)
        since admin HTML has no JS hooks yet
  ════════════════════════════════════════ */
  injectPasswordToggle();
  injectBanner();
  injectFieldErrors();

  /* ════════════════════════════════════════
     2. PRE-FILL remembered email
  ════════════════════════════════════════ */
  const savedEmail = localStorage.getItem(REMEMBER_KEY);
  if (savedEmail && emailInput) {
    emailInput.value = savedEmail;
    if (rememberChk) rememberChk.checked = true;
  }

  /* ════════════════════════════════════════
     3. CHECK LOCKOUT ON PAGE LOAD
  ════════════════════════════════════════ */
  checkLockout();

  /* ════════════════════════════════════════
     4. INJECT HELPERS
  ════════════════════════════════════════ */

  /** Add show/hide toggle button to password field */
  function injectPasswordToggle() {
    const pwWrap = pwInput ? pwInput.closest('.field-wrap') : null;
    if (!pwWrap) return;

    pwWrap.style.position = 'relative';
    pwInput.style.paddingRight = '48px';

    let btn = pwWrap.querySelector('.toggle-password');
    if (btn) {
      btn.id = 'toggle-pw';
      btn.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Show password');
      btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') || 'false');
      const icon = btn.querySelector('i');
      if (icon) icon.id = 'eye-icon';
    } else {
      btn = document.createElement('button');
      btn.type        = 'button';
      btn.id          = 'toggle-pw';
      btn.className   = 'toggle-password';
      btn.setAttribute('aria-label',  'Show password');
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML   = '<i class="ti ti-eye" id="eye-icon"></i>';
      btn.style.cssText = `
        position:absolute; right:14px; top:50%; transform:translateY(-50%);
        background:none; border:none; cursor:pointer;
        color:#94A3B8; font-size:18px; display:flex;
        align-items:center; padding:4px; border-radius:4px;
        transition:color 0.2s ease;
      `;
      pwWrap.appendChild(btn);
    }

    btn.addEventListener('click', togglePassword);
    btn.addEventListener('mouseover', () => btn.style.color = '#D4AF37');
    btn.addEventListener('mouseout',  () => btn.style.color = '#94A3B8');
  }

  /** Add error spans below each input */
  function injectFieldErrors() {
    ['email', 'password'].forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      const group = input.closest('.field-group');
      if (!group || group.querySelector(`#${id}-err`)) return;

      const span = document.createElement('span');
      span.id        = `${id}-err`;
      span.className = 'field-error-admin';
      span.setAttribute('role', 'alert');
      span.style.cssText = `
        display:block; font-size:12px; color:#EF4444;
        margin-top:5px; min-height:16px; padding-left:2px;
        font-family:'Poppins',sans-serif;
      `;
      group.appendChild(span);
    });
  }

  /** Add a message banner above the submit button */
  function injectBanner() {
    if (!submitBtn || document.getElementById('admin-banner')) return;

    const banner = document.createElement('div');
    banner.id          = 'admin-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.style.cssText = `
      display:none; padding:12px 16px; border-radius:10px;
      font-size:13px; font-family:'Poppins',sans-serif;
      margin-bottom:1rem; border:1px solid;
      line-height:1.5;
    `;
    submitBtn.parentNode.insertBefore(banner, submitBtn);
  }

  /* ════════════════════════════════════════
     5. BANNER HELPER
  ════════════════════════════════════════ */
  function showBanner(message, type = 'error') {
    const banner = document.getElementById('admin-banner');
    if (!banner) return;

    banner.textContent = message;
    banner.style.display = 'block';

    if (type === 'error') {
      banner.style.background   = 'rgba(239,68,68,0.10)';
      banner.style.borderColor  = 'rgba(239,68,68,0.30)';
      banner.style.color        = '#FCA5A5';
    } else if (type === 'success') {
      banner.style.background   = 'rgba(212,175,55,0.12)';
      banner.style.borderColor  = 'rgba(212,175,55,0.35)';
      banner.style.color        = '#D4AF37';
      setTimeout(() => { banner.style.display = 'none'; }, 4000);
    } else if (type === 'warning') {
      banner.style.background   = 'rgba(251,146,60,0.10)';
      banner.style.borderColor  = 'rgba(251,146,60,0.30)';
      banner.style.color        = '#FDB96D';
    }
  }

  function hideBanner() {
    const banner = document.getElementById('admin-banner');
    if (banner) banner.style.display = 'none';
  }

  /* ════════════════════════════════════════
     6. FIELD ERROR HELPERS
  ════════════════════════════════════════ */
  function setFieldError(id, message) {
    const input = document.getElementById(id);
    const errEl = document.getElementById(`${id}-err`);
    if (input) {
      input.style.borderColor = message ? '#EF4444' : '';
      input.style.boxShadow   = message ? '0 0 0 3px rgba(239,68,68,0.12)' : '';
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    if (errEl) errEl.textContent = message;
  }

  function clearAllErrors() {
    ['email', 'password'].forEach(id => setFieldError(id, ''));
  }

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  /* ── Blur validation ── */
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      const val = emailInput.value.trim();
      if (!val) setFieldError('email', 'Email address is required.');
      else if (!isValidEmail(val)) setFieldError('email', 'Please enter a valid email address.');
      else setFieldError('email', '');
    });
    emailInput.addEventListener('input', () => setFieldError('email', ''));
  }

  if (pwInput) {
    pwInput.addEventListener('blur', () => {
      const val = pwInput.value;
      if (!val) setFieldError('password', 'Password is required.');
      else if (val.length < 6) setFieldError('password', 'Password must be at least 6 characters.');
      else setFieldError('password', '');
    });
    pwInput.addEventListener('input', () => setFieldError('password', ''));
  }

  /* ════════════════════════════════════════
     7. PASSWORD TOGGLE
  ════════════════════════════════════════ */
  function togglePassword() {
    const btn     = document.getElementById('toggle-pw');
    const icon    = document.getElementById('eye-icon');
    const isHidden = pwInput.type === 'password';

    pwInput.type = isHidden ? 'text' : 'password';
    if (icon) icon.className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
    if (btn) {
      btn.setAttribute('aria-label',   isHidden ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed',  isHidden ? 'true' : 'false');
    }
    pwInput.focus();
  }

  /* ════════════════════════════════════════
     8. RATE LIMITING — attempt counter
  ════════════════════════════════════════ */
  function getAttempts() {
    return parseInt(localStorage.getItem(ATTEMPT_KEY) || '0', 10);
  }

  function incrementAttempts() {
    const attempts = getAttempts() + 1;
    localStorage.setItem(ATTEMPT_KEY, attempts);
    return attempts;
  }

  function resetAttempts() {
    localStorage.removeItem(ATTEMPT_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
  }

  function setLockout() {
    localStorage.setItem(LOCKOUT_KEY, Date.now() + LOCKOUT_MS);
  }

  function checkLockout() {
    const lockUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
    if (!lockUntil) return false;

    const remaining = lockUntil - Date.now();
    if (remaining <= 0) {
      resetAttempts();
      return false;
    }

    /* Still locked — disable form + start countdown */
    lockForm(Math.ceil(remaining / 1000));
    return true;
  }

  function lockForm(seconds) {
    if (submitBtn) submitBtn.disabled = true;
    if (emailInput) emailInput.disabled = true;
    if (pwInput)    pwInput.disabled    = true;

    let remaining = seconds;
    showBanner(
      `⛔ Too many failed attempts. Try again in ${remaining}s.`,
      'warning'
    );

    const timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        resetAttempts();
        unlockForm();
        hideBanner();
      } else {
        showBanner(`⛔ Too many failed attempts. Try again in ${remaining}s.`, 'warning');
      }
    }, 1000);
  }

  function unlockForm() {
    if (submitBtn)  submitBtn.disabled  = false;
    if (emailInput) emailInput.disabled = false;
    if (pwInput)    pwInput.disabled    = false;
  }

  /* ════════════════════════════════════════
     9. LOADING STATE
  ════════════════════════════════════════ */
  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn._originalHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5"
          style="animation:adminSpin 0.85s linear infinite">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83
                   M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        Signing in…
      `;
    } else if (submitBtn._originalHTML) {
      submitBtn.innerHTML = submitBtn._originalHTML;
    }
  }

  /* Inject spinner keyframes */
  const spinStyle = document.createElement('style');
  spinStyle.textContent = `@keyframes adminSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }`;
  document.head.appendChild(spinStyle);

  /* ════════════════════════════════════════
     10. FORM SUBMIT
  ════════════════════════════════════════ */
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      /* Block if locked out */
      if (checkLockout()) return;

      hideBanner();
      clearAllErrors();

      const email    = emailInput ? emailInput.value.trim() : '';
      const password = pwInput    ? pwInput.value           : '';
      let   valid    = true;

      /* ── Validate ── */
      if (!email) {
        setFieldError('email', 'Email address is required.');
        valid = false;
      } else if (!isValidEmail(email)) {
        setFieldError('email', 'Please enter a valid email address.');
        valid = false;
      }

      if (!password) {
        setFieldError('password', 'Password is required.');
        valid = false;
      } else if (password.length < 6) {
        setFieldError('password', 'Password must be at least 6 characters.');
        valid = false;
      }

      if (!valid) return;

      /* ── Loading ON ── */
      setLoading(true);

      try {
        var adminApiBase = window.API_CONFIG ? window.API_CONFIG.AUTH_BASE : 'http://localhost:5000/api/auth';
        const response = await fetch(adminApiBase + '/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Login failed.');

        /* Store JWT + user info */
        localStorage.setItem('ms_token', data.token);
        localStorage.setItem('ms_role',  data.user.role);
        localStorage.setItem('ms_name',  data.user.name);
        localStorage.setItem('ms_email', data.user.email);

        /* ── Remember Me ── */
        if (rememberChk && rememberChk.checked) {
          localStorage.setItem(REMEMBER_KEY, email);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }

        /* ── Success — reset attempts ── */
        resetAttempts();
        showBanner('✓ Access granted! Redirecting to admin dashboard…', 'success');

        /* Redirect — actual admin dashboard path */
        setTimeout(() => {
          window.location.href = 'admindashboard.html';
        }, 1500);

      } catch (error) {
        setLoading(false);

        /* ── Track failed attempt ── */
        const attempts = incrementAttempts();
        const remaining = MAX_ATTEMPTS - attempts;

        if (attempts >= MAX_ATTEMPTS) {
          setLockout();
          lockForm(Math.ceil(LOCKOUT_MS / 1000));
        } else {
          const hint = email.toLowerCase() === 'admin@meetspace.com'
            ? 'Use admin@meetspace.co.ke for the seeded admin account.'
            : '';
          showBanner(
            `${error.message || 'Invalid credentials.'} ${hint ? hint + ' ' : ''}${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
            'error'
          );
        }

        /* Shake animation on card */
        const card = document.querySelector('.login-card');
        if (card) {
          card.style.animation = 'none';
          card.offsetHeight; /* reflow */
          card.style.animation = 'adminShake 0.4s ease';
        }
      }
    });
  }

  /* Shake keyframe for wrong password feedback */
  const shakeStyle = document.createElement('style');
  shakeStyle.textContent = `@keyframes adminShake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-8px); }
    40%      { transform: translateX(8px); }
    60%      { transform: translateX(-5px); }
    80%      { transform: translateX(5px); }
  }`;
  document.head.appendChild(shakeStyle);

  /* ════════════════════════════════════════
     11. KEYBOARD — Enter on forgot link
  ════════════════════════════════════════ */
  const forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') forgotLink.click();
    });
  }

}); /* end DOMContentLoaded */