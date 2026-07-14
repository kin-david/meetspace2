const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const tenantModel = require('../models/tenantModel');
const emailService = require('../services/emailService');

function signJwt(tenant) {
  return jwt.sign(
    {
      id: tenant.id,
      email: tenant.email,
      is_email_verified: Boolean(tenant.is_email_verified)
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

function signAdminJwt(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: 'admin'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const admin = await Admin.findByEmail(String(email).toLowerCase().trim());
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = await Admin.comparePassword(password, admin.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signAdminJwt(admin);
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('adminLogin error:', error);
    return res.status(500).json({ success: false, message: 'Admin login failed.' });
  }
};

exports.register = async (req, res) => {
  try {
    const { full_name, email, phone_number, password } = req.body;
    const existing = await tenantModel.findByEmail(email);

    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already exists.' });
    }

    const result = await tenantModel.createTenant({
      full_name,
      email,
      phone_number,
      password,
      is_email_verified: !emailService.isEmailConfigured() // Auto-verify in dev mode (no email configured)
    });

    if (emailService.isEmailConfigured()) {
      await emailService.sendVerificationEmail(email, result.verificationToken);
      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. You can now login immediately!'
    });
  } catch (error) {
    console.error('register error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Missing verification token.' });
    }

    const updated = await tenantModel.setVerificationStatus(token);
    if (!updated) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    return res.status(200).json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    console.error('verifyEmail error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify email.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const tenant = await tenantModel.findByEmail(email);

    if (!tenant) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    const match = await tenantModel.comparePassword(password, tenant.password_hash);
    if (!match) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    if (!tenant.is_email_verified && emailService.isEmailConfigured()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email before login.' 
      });
    }

    const token = signJwt(tenant);
    
    // Security: Set HttpOnly cookie for Remember Me
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: process.env.NODE_ENV === 'production' // HTTPS only in production
    };

    if (rememberMe) {
      // Infinite expiration (99 years) - user stays logged in indefinitely
      cookieOptions.maxAge = 99 * 365 * 24 * 60 * 60 * 1000;
      res.cookie('ms_auth_token', token, cookieOptions);
      res.cookie('ms_tenant_id', String(tenant.id), cookieOptions);
    } else {
      // Session-only cookie (deleted when browser closes)
      res.cookie('ms_auth_token', token, cookieOptions);
      res.cookie('ms_tenant_id', String(tenant.id), cookieOptions);
    }

    return res.status(200).json({
      success: true,
      token,
      rememberMe: !!rememberMe,
      tenant: {
        id: tenant.id,
        full_name: tenant.full_name,
        email: tenant.email,
        phone_number: tenant.phone_number,
        profile_picture: tenant.profile_picture,
        auth_provider: tenant.auth_provider
      }
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const tenant = await tenantModel.findByEmail(email);

    if (!tenant) {
      return res.status(200).json({
        success: true,
        message: 'If this email exists, a reset link has been sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await tenantModel.setResetToken(email, resetToken);

    if (emailService.isEmailConfigured()) {
      await emailService.sendResetEmail(email, resetToken);
      return res.status(200).json({
        success: true,
        message: 'If this email exists, a reset link has been sent.'
      });
    }

    const response = {
      success: true,
      message: 'Reset token generated in local mode.'
    };
    if (process.env.NODE_ENV !== 'production') {
      response.reset_token = resetToken;
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error('forgotPassword error:', error);
    return res.status(500).json({ success: false, message: 'Could not process forgot password.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const changed = await tenantModel.resetPasswordByToken(token, password);

    if (!changed) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    return res.status(200).json({ success: true, message: 'Password reset successful.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({ success: false, message: 'Could not reset password.' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const tenant = await tenantModel.findById(req.user.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      tenant: {
        id: tenant.id,
        full_name: tenant.full_name,
        email: tenant.email,
        phone_number: tenant.phone_number,
        profile_picture: tenant.profile_picture,
        auth_provider: tenant.auth_provider,
        is_email_verified: Boolean(tenant.is_email_verified)
      }
    });
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
};

exports.logout = async (req, res) => {
  try {
    // Security: Clear authentication cookies
    res.clearCookie('ms_auth_token', { path: '/', httpOnly: true, sameSite: 'strict' });
    res.clearCookie('ms_tenant_id', { path: '/', httpOnly: true, sameSite: 'strict' });
    
    // Security: Destroy session if using sessions
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('logout error:', error);
    return res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};

exports.restoreSession = async (req, res) => {
  try {
    // Security: Restore session from Remember Me cookie
    const authToken = req.cookies.ms_auth_token;
    const tenantId = req.cookies.ms_tenant_id;

    if (!authToken || !tenantId) {
      return res.status(401).json({
        success: false,
        message: 'No saved session found.'
      });
    }

    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      
      // Security: Verify tenant ID matches
      if (String(decoded.id) !== String(tenantId)) {
        return res.status(401).json({
          success: false,
          message: 'Session mismatch. Please log in again.'
        });
      }

      const tenant = await tenantModel.findById(decoded.id);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please log in again.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Session restored successfully.',
        token: authToken,
        tenant: {
          id: tenant.id,
          full_name: tenant.full_name,
          email: tenant.email,
          phone_number: tenant.phone_number,
          profile_picture: tenant.profile_picture,
          auth_provider: tenant.auth_provider
        }
      });
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      // Clear invalid cookies
      res.clearCookie('ms_auth_token', { path: '/', httpOnly: true, sameSite: 'strict' });
      res.clearCookie('ms_tenant_id', { path: '/', httpOnly: true, sameSite: 'strict' });
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.'
      });
    }
  } catch (error) {
    console.error('restoreSession error:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore session.' });
  }
};