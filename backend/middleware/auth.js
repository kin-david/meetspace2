const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing authentication token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

// Authenticate from cookies (Remember Me)
function authenticateCookie(req, res, next) {
  const token = req.cookies.ms_auth_token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing authentication token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // Clear invalid cookies
    res.clearCookie('ms_auth_token', { path: '/', httpOnly: true, sameSite: 'strict' });
    res.clearCookie('ms_tenant_id', { path: '/', httpOnly: true, sameSite: 'strict' });
    return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }
}

// Accept both JWT header and cookie authentication
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.ms_auth_token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing authentication token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // Clear invalid cookies if they exist
    if (req.cookies.ms_auth_token) {
      res.clearCookie('ms_auth_token', { path: '/', httpOnly: true, sameSite: 'strict' });
      res.clearCookie('ms_tenant_id', { path: '/', httpOnly: true, sameSite: 'strict' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

// Security: Verify that the authenticated user owns the resource (tenant isolation)
function verifyTenantOwnership(req, res, next) {
  const paramId = parseInt(req.params.id || req.params.tenantId || 0);
  const userId = req.user ? parseInt(req.user.id) : null;

  if (!userId || paramId === 0) {
    return res.status(400).json({ success: false, message: 'Invalid request.' });
  }

  // Security: Prevent unauthorized access to other tenants' data
  if (userId !== paramId) {
    console.warn(`Unauthorized access attempt: User ${userId} tried to access resource for tenant ${paramId}`);
    return res.status(403).json({ success: false, message: 'You do not have permission to access this resource.' });
  }

  return next();
}

// Security: Verify that the authenticated user owns the booking
function verifyBookingTenancy(tenantId) {
  return (req, res, next) => {
    const reqTenantId = parseInt(req.body[tenantId] || req.query[tenantId] || 0);
    const userId = req.user ? parseInt(req.user.id) : null;

    if (!userId || reqTenantId === 0) {
      return res.status(400).json({ success: false, message: 'Invalid request.' });
    }

    if (userId !== reqTenantId) {
      console.warn(`Unauthorized access attempt: User ${userId} tried to perform action for tenant ${reqTenantId}`);
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }

    return next();
  };
}

function requireEmailVerified(req, res, next) {
  if (req.user && req.user.is_email_verified) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Email not verified. Please verify your account first.'
  });
}

// Backward-compatible alias used by bookings/rooms/tenants routes
function protect(req, res, next) {
  return authenticate(req, res, next);
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  console.warn(`Unauthorized admin access attempt: User ${req.user ? req.user.id : 'unknown'}`);
  return res.status(403).json({ success: false, message: 'Admin access required.' });
}

module.exports = {
  authenticateJWT,
  authenticateCookie,
  authenticate,
  verifyTenantOwnership,
  verifyBookingTenancy,
  requireEmailVerified,
  protect,
  adminOnly
};