// routes/bookings.js

const router     = require('express').Router();
const controller = require('../controllers/bookingsController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/summary', adminOnly, controller.getSummary);
router.get('/',        controller.getBookings);
router.get('/:id',     controller.getBooking);
router.post('/',       controller.createBooking);
router.put('/:id',     controller.updateBooking);
router.delete('/:id',  controller.cancelBooking);

module.exports = router;