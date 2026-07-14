// controllers/bookingsController.js
// CRUD for bookings — tenants manage their own, admins manage all

const Booking = require('../models/Booking');
const Room    = require('../models/Room');

exports.getBookings = async (req, res) => {
  try {
    let bookings;

    if (req.user.role === 'admin') {
      const { status, roomId, date } = req.query;
      bookings = await Booking.getAll({ status, roomId, date });
    } else {
      bookings = await Booking.getByTenant(req.user.id);
    }

    res.json({ success: true, data: bookings });
  } catch (err) {
    console.error('getBookings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const summary = await Booking.getSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ success: false, message: 'Failed to get summary.' });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (req.user.role === 'tenant' && booking.tenant_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    console.error('getBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch booking.' });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { title, roomId, date, startTime, endTime, attendees, purpose, paymentMethod, paymentContact } = req.body;
    const normalizedPaymentMethod = String(paymentMethod || '').toLowerCase();

    if (!title || !roomId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, room, date, start time, and end time are required.'
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.status(400).json({ success: false, message: 'Cannot book a date in the past.' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (attendees && parseInt(attendees) > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Attendee count (${attendees}) exceeds room capacity (${room.capacity}).`
      });
    }

    if (!paymentMethod || !['card', 'bank', 'mpesa', 'airtel_money', 'tcash'].includes(normalizedPaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Please choose a valid payment method: bank, M-Pesa, Airtel Money, or T-Cash.'
      });
    }

    if (normalizedPaymentMethod === 'bank' && !paymentContact) {
      return res.status(400).json({
        success: false,
        message: 'Enter bank card details to continue.'
      });
    }

    if (['mpesa', 'airtel_money', 'tcash'].includes(normalizedPaymentMethod) && !paymentContact) {
      return res.status(400).json({
        success: false,
        message: 'Choose mobile confirmation mode and provide number if required.'
      });
    }

    const conflict = await Room.hasConflict(roomId, date, startTime, endTime);
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'This room is already booked for the selected time slot.'
      });
    }

    const tenantId = (req.user.role === 'admin' && req.body.tenantId)
      ? req.body.tenantId
      : req.user.id;

    const id      = await Booking.create({
      title,
      tenantId,
      roomId,
      date,
      startTime,
      endTime,
      attendees,
      purpose,
      paymentMethod: normalizedPaymentMethod,
      paymentContact: paymentContact || null,
      paymentStatus: 'pending'
    });
    const created = await Booking.findById(id);

    res.status(201).json({ success: true, message: 'Booking created successfully.', data: created });
  } catch (err) {
    console.error('createBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to create booking.' });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const id      = parseInt(req.params.id);
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (req.user.role === 'tenant' && booking.tenant_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot edit a cancelled booking.' });
    }

    const { title, roomId, date, startTime, endTime, attendees, purpose, paymentMethod, paymentContact, paymentStatus } = req.body;

    const newRoomId    = roomId    || booking.room_id;
    const newDate      = date      || booking.date;
    const newStartTime = startTime || booking.start_time;
    const newEndTime   = endTime   || booking.end_time;

    if (newStartTime >= newEndTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    const conflict = await Room.hasConflict(newRoomId, newDate, newStartTime, newEndTime, id);
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'This room is already booked for the selected time slot.'
      });
    }

    await Booking.update(id, {
      title:     title     || booking.title,
      roomId:    newRoomId,
      date:      newDate,
      startTime: newStartTime,
      endTime:   newEndTime,
      attendees: attendees || booking.attendees,
      purpose:   purpose   !== undefined ? purpose : booking.purpose,
      paymentMethod: paymentMethod || booking.payment_method,
      paymentContact: paymentContact !== undefined ? paymentContact : booking.payment_contact,
      paymentStatus: paymentStatus || booking.payment_status || 'pending'
    });

    const updated = await Booking.findById(id);
    res.json({ success: true, message: 'Booking updated successfully.', data: updated });
  } catch (err) {
    console.error('updateBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to update booking.' });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const id      = parseInt(req.params.id);
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (req.user.role === 'tenant' && booking.tenant_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    if (req.user.role === 'admin' && req.query.hard === 'true') {
      await Booking.delete(id);
      return res.json({ success: true, message: 'Booking deleted permanently.' });
    }

    await Booking.cancel(id);
    res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error('cancelBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  }
};