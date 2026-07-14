const { body, validationResult } = require('express-validator');

const allowedDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com'];

function hasValidDomain(value) {
  const email = String(value || '').toLowerCase().trim();
  const domain = email.split('@')[1] || '';
  return allowedDomains.includes(domain) || domain.endsWith('.co.ke');
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  return next();
}

const registerValidation = [
  body('full_name').trim().isLength({ min: 2, max: 120 }).withMessage('Full name must be 2-120 characters.'),
  body('email').isEmail().withMessage('A valid email is required.').bail().custom((value) => hasValidDomain(value)).withMessage('Use gmail.com, hotmail.com, yahoo.com, outlook.com, or a .co.ke domain.'),
  body('phone_number').optional({ nullable: true, checkFalsy: true }).matches(/^\+?[0-9]{9,15}$/).withMessage('Phone number must be 9-15 digits and may start with +.'),
  body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }).withMessage('Password must be at least 8 chars with uppercase, lowercase, number, and symbol.'),
  body('confirm_password')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match.'),
  handleValidation
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  handleValidation
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required.'),
  handleValidation
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password').isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 }).withMessage('Password must be at least 8 chars with uppercase, lowercase, number, and symbol.'),
  handleValidation
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation
};
