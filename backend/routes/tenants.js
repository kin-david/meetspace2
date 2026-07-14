// routes/tenants.js

const router     = require('express').Router();
const controller = require('../controllers/tenantsController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/',           controller.getTenants);
router.get('/:id',        controller.getTenant);
router.put('/:id/status', controller.updateStatus);
router.delete('/:id',     controller.deleteTenant);

module.exports = router;