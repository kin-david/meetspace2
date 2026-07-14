// routes/rooms.js

const router     = require('express').Router();
const controller = require('../controllers/roomsController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/',    protect, controller.getRooms);
router.get('/:id', protect, controller.getRoom);
router.post('/',    protect, adminOnly, controller.createRoom);
router.put('/:id',  protect, adminOnly, controller.updateRoom);
router.delete('/:id', protect, adminOnly, controller.deleteRoom);

module.exports = router;