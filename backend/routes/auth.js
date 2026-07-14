// routes/auth.js

const router     = require('express').Router();
const controller = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/admin/login',           controller.adminLogin);
router.post('/tenant/login',          controller.login);
router.post('/tenant/register',       controller.register);
router.post('/tenant/password/reset', controller.resetPassword);
router.get('/me',                     protect, controller.getCurrentUser);

module.exports = router;