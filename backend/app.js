const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const bookingsRoutes = require('./routes/bookings');
const roomsRoutes = require('./routes/rooms');
const tenantsRoutes = require('./routes/tenants');

const app = express();

// Security: General rate limiter (15 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Security: Stricter rate limiter for login/register (5 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

// Security: Helmet - sets various HTTP headers to protect against common vulnerabilities
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// Security: CORS - restrict origins and allow credentials
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Rate limiting
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Cookie parser
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));

// Security: Session configuration with secure cookies
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: new session.MemoryStore(), // Use MemoryStore for development; use RedisStore for production
  cookie: {
    httpOnly: true, // Prevents client-side JS from accessing the cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'ms_session' // Custom session name to avoid detection
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security: Add security headers middleware
app.use((req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Disable iframe embedding
  res.setHeader('X-Frame-Options', 'DENY');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server healthy' });
});

// Authentication routes (apply stricter rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes
app.use('/api/bookings', bookingsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/tenants', tenantsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't expose sensitive error details to clients
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    message: message
  });
});

module.exports = app;
