// controllers/roomsController.js
// CRUD operations for rooms (admin only for write ops)

const Room    = require('../models/Room');
const Booking = require('../models/Booking');

exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.getAll();
    res.json({ success: true, data: rooms });
  } catch (err) {
    console.error('getRooms error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }
    res.json({ success: true, data: room });
  } catch (err) {
    console.error('getRoom error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch room.' });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { name, capacity, floor } = req.body;

    if (!name || !capacity || !floor) {
      return res.status(400).json({ success: false, message: 'Name, capacity, and floor are required.' });
    }

    if (parseInt(capacity) < 1) {
      return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
    }

    const id   = await Room.create({ name, capacity, floor });
    const room = await Room.findById(id);

    res.status(201).json({ success: true, message: 'Room created successfully.', data: room });
  } catch (err) {
    console.error('createRoom error:', err);
    res.status(500).json({ success: false, message: 'Failed to create room.' });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { name, capacity, floor, status } = req.body;
    const id = parseInt(req.params.id);

    const existing = await Room.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const validStatuses = ['available', 'occupied', 'reserved', 'maintenance'];
    const newStatus = status || existing.status;
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    await Room.update(id, {
      name:     name     || existing.name,
      capacity: capacity || existing.capacity,
      floor:    floor    || existing.floor,
      status:   newStatus
    });

    const updated = await Room.findById(id);
    res.json({ success: true, message: 'Room updated successfully.', data: updated });
  } catch (err) {
    console.error('updateRoom error:', err);
    res.status(500).json({ success: false, message: 'Failed to update room.' });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await Room.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    await Room.delete(id);
    res.json({ success: true, message: 'Room deleted successfully.' });
  } catch (err) {
    console.error('deleteRoom error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete room.' });
  }
};