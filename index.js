/**
 * MeetSpace - Secure Login & Authentication
 * Handles tenant login, registration, password reset with Remember Me
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Form elements
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

  // Email validation regex
  const ALLOWED_EMAIL_REGEX = /(^[^\s@]+@(gmail\.com|hotmail\.com|yahoo\.com|outlook\.com)$)|(^[^\s@]+@[^\s@]+\.co\.ke$)/i;
  const API_BASE = sessionManager.getApiBase();

  // ════════════════════════════════════════════════════════════════
  // TRY TO RESTORE REMEMBER ME SESSION ON PAGE LOAD
  // ════════════════════════════════════════════════════════════════

  // Check if already authenticated
  if (sessionManager.isAuthenticated()) {
    const session = sessionManager.getSession();
    if (session) {
      // Verify session is still valid
      const verification = await sessionManager.verifySession();
      if (verification.valid) {
        // Redirect to dashboard
        redirectToDashboard(session);
        return;
      } else {
        // Session expired, clear it
        sessionManager.clearSession();
      }
    }
  } else {
    // Try to restore from Remember Me cookies
    const restored = await sessionManager.restoreSession();
    if (restored.success) {
      showBanner(`${restored.message}. Redirecting...`, 'success');
      setTimeout(() => {
        redirectToDashboard(sessionManager.getSession());
      }, 1000);
      return;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // PASSWORD TOGGLE
  // ════════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════════
  // VALIDATION UTILITIES
  // ════════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════════
  // UI UTILITIES
  // ════════════════════════════════════════════════════════════════

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

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (btnText) btnText.style.display = isLoading ? 'none' : '';
    if (btnSpinner) btnSpinner.style.display = isLoading ? '' : 'none';
  }

  function redirectToDashboard(session) {
    window.location.href = './tenantdashboard.html';
  }

  // ════════════════════════════════════════════════════════════════
  // FORM VALIDATION
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
    else if (!isAllowedTenantEmail(val)) setFieldError('email', 'email-err', 'Use gmail.com, hotmail.com, yahoo.com, outlook.com, or .co.ke.');
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

  // ════════════════════════════════════════════════════════════════
  // FORM SUBMISSION - LOGIN / REGISTER
  // ════════════════════════════════════════════════════════════════

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBanner();

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = pwInput.value;
    const rememberMe = true; // Always enabled - auto-remember users indefinitely (99 years)
    let valid = true;

    // Clear previous errors
    setFieldError('full-name', 'name-err', '');
    setFieldError('email', 'email-err', '');
    setFieldError('password', 'pw-err', '');

    // Validate inputs
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
      setFieldError('email', 'email-err', 'Use gmail.com, hotmail.com, yahoo.com, outlook.com, or .co.ke.');
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

    setLoading(true);

    try {
      // Step 1: Try to login
      let response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        credentials: 'include', // Send cookies for Remember Me
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });

      let data = await response.json();

      if (response.ok && data.success) {
        // Login successful
        sessionManager.saveSession(data, rememberMe);
        showBanner('Login successful. Redirecting...', 'success');
        setTimeout(() => {
          redirectToDashboard(sessionManager.getSession());
        }, 1000);
        return;
      }

      // Step 2: If login failed, check if account exists
      if (response.status === 401) {
        const errorMsg = data.message || 'Invalid email or password.';

        // If user didn't provide full name, we can't create an account
        if (!fullName) {
          showBanner(`${errorMsg}\n\nDon't have an account? Go to "Create one" to register.`, 'error');
          setLoading(false);
          return;
        }

        // Ask user if they want to create an account
        const shouldRegister = confirm(
          'No account found with this email.\n\nWould you like to create a new account with this email and full name?'
        );

        if (!shouldRegister) {
          showBanner(errorMsg, 'error');
          setLoading(false);
          return;
        }

        // Step 3: Create account
        const registerResponse = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone_number: '', // Optional
            password,
            confirm_password: password
          })
        });

        const registerData = await registerResponse.json();

        if (!registerResponse.ok) {
          const errorDetail = registerData.errors 
            ? registerData.errors.map(e => e.msg).join('\n')
            : registerData.message || 'Registration failed.';
          showBanner(errorDetail, 'error');
          setLoading(false);
          return;
        }

        showBanner(
          `Account created successfully!\n\n${registerData.message || 'Please verify your email and log in.'}`,
          'success'
        );

        // Clear form and wait for user to proceed
        form.reset();
        setTimeout(() => {
          setLoading(false);
        }, 2000);
        return;
      }

      // Handle other errors
      const errorDetail = data.errors 
        ? data.errors.map(e => e.msg).join('\n')
        : data.message || 'An error occurred.';
      showBanner(errorDetail, 'error');
    } catch (error) {
      console.error('Login error:', error);
      showBanner('Network error. Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // PASSWORD RESET MODAL
  // ════════════════════════════════════════════════════════════════

  const pwResetOverlay = document.getElementById('pw-reset-overlay');
  const pwResetClose = document.getElementById('pw-reset-close');
  const pwStep1 = document.getElementById('pw-step-1');
  const pwStep2 = document.getElementById('pw-step-2');
  const pwResetSubmit = document.getElementById('pw-reset-submit');
  const pwDoneBtn = document.getElementById('pw-done-btn');

  const prEmail = document.getElementById('pr-email');
  const prNewPw = document.getElementById('pr-new-pw');
  const prConfirmPw = document.getElementById('pr-confirm-pw');
  const prToggleNew = document.getElementById('pr-toggle-new');
  const prToggleConfirm = document.getElementById('pr-toggle-confirm');
  const prStrengthFill = document.getElementById('pr-strength-fill');
  const prStrengthLabel = document.getElementById('pr-strength-label');
  const pwResetBanner = document.getElementById('pw-reset-banner');

  function closeResetModal() {
    if (pwResetOverlay) pwResetOverlay.style.display = 'none';
    pwStep1.style.display = '';
    pwStep2.style.display = 'none';
  }

  if (createPasswordBtn) {
    createPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (pwResetOverlay) pwResetOverlay.style.display = '';
      prEmail.value = emailInput.value;
      prEmail.focus();
    });
  }

  if (pwResetClose) {
    pwResetClose.addEventListener('click', closeResetModal);
  }

  if (pwResetOverlay) {
    pwResetOverlay.addEventListener('click', (e) => {
      if (e.target === pwResetOverlay) closeResetModal();
    });
  }

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

  function getStrengthColor(strength) {
    if (strength <= 2) return '#d32f2f'; // red
    if (strength <= 3) return '#f57c00'; // orange
    if (strength <= 4) return '#fbc02d'; // yellow
    return '#388e3c'; // green
  }

  if (prNewPw) {
    prNewPw.addEventListener('input', () => {
      const strength = getPasswordStrength(prNewPw.value);
      const color = getStrengthColor(strength);
      const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
      if (prStrengthFill) {
        prStrengthFill.style.backgroundColor = color;
        prStrengthFill.style.width = ((strength / 6) * 100) + '%';
      }
      if (prStrengthLabel) {
        prStrengthLabel.textContent = labels[strength] || 'Very Weak';
        prStrengthLabel.style.color = color;
      }
    });
  }

  // Toggle password visibility in modal
  if (prToggleNew) {
    prToggleNew.addEventListener('click', () => {
      prNewPw.type = prNewPw.type === 'password' ? 'text' : 'password';
    });
  }

  if (prToggleConfirm) {
    prToggleConfirm.addEventListener('click', () => {
      prConfirmPw.type = prConfirmPw.type === 'password' ? 'text' : 'password';
    });
  }

  // Password reset submission
  if (pwResetSubmit) {
    pwResetSubmit.addEventListener('click', async () => {
      const email = prEmail.value.trim();
      const newPassword = prNewPw.value;
      const confirmPassword = prConfirmPw.value;

      if (!email) {
        pwResetBanner.textContent = 'Email is required.';
        pwResetBanner.style.display = '';
        pwResetBanner.className = 'pw-reset-banner error';
        return;
      }

      if (!newPassword) {
        pwResetBanner.textContent = 'New password is required.';
        pwResetBanner.style.display = '';
        pwResetBanner.className = 'pw-reset-banner error';
        return;
      }

      if (newPassword !== confirmPassword) {
        pwResetBanner.textContent = 'Passwords do not match.';
        pwResetBanner.style.display = '';
        pwResetBanner.className = 'pw-reset-banner error';
        return;
      }

      try {
        pwResetBanner.textContent = 'Sending reset email...';
        pwResetBanner.style.display = '';
        pwResetBanner.className = 'pw-reset-banner notice';

        // Step 1: Request password reset
        const forgotResponse = await fetch(`${API_BASE}/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const forgotData = await forgotResponse.json();

        if (!forgotResponse.ok) {
          pwResetBanner.textContent = forgotData.message || 'Failed to send reset email.';
          pwResetBanner.className = 'pw-reset-banner error';
          return;
        }

        // In development mode, we might get the token back
        let resetToken = forgotData.reset_token;

        if (!resetToken) {
          pwResetBanner.textContent = 'Check your email for the reset link.';
          pwResetBanner.className = 'pw-reset-banner success';
          setTimeout(() => {
            closeResetModal();
          }, 2000);
          return;
        }

        // Step 2: Reset password with token
        const resetResponse = await fetch(`${API_BASE}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: resetToken,
            password: newPassword
          })
        });

        const resetData = await resetResponse.json();

        if (!resetResponse.ok) {
          pwResetBanner.textContent = resetData.message || 'Failed to reset password.';
          pwResetBanner.className = 'pw-reset-banner error';
          return;
        }

        // Success
        pwStep1.style.display = 'none';
        pwStep2.style.display = '';
      } catch (error) {
        console.error('Password reset error:', error);
        pwResetBanner.textContent = 'An error occurred. Please try again.';
        pwResetBanner.className = 'pw-reset-banner error';
        pwResetBanner.style.display = '';
      }
    });
  }

  if (pwDoneBtn) {
    pwDoneBtn.addEventListener('click', closeResetModal);
  }
});
