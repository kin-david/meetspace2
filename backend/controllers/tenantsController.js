// controllers/tenantsController.js
// Admin-only tenant management

const Tenant = require('../models/Tenant');

exports.getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.getAll();
    res.json({ success: true, data: tenants });
  } catch (err) {
    console.error('getTenants error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch tenants.' });
  }
};

exports.getTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found.' });
    }
    res.json({ success: true, data: tenant });
  } catch (err) {
    console.error('getTenant error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch tenant.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const id         = parseInt(req.params.id);

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be "active" or "inactive".' });
    }

    const existing = await Tenant.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tenant not found.' });
    }

    await Tenant.updateStatus(id, status);
    res.json({ success: true, message: `Tenant ${status === 'active' ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    console.error('updateStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to update tenant status.' });
  }
};

exports.deleteTenant = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await Tenant.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tenant not found.' });
    }

    await Tenant.delete(id);
    res.json({ success: true, message: 'Tenant removed successfully.' });
  } catch (err) {
    console.error('deleteTenant error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete tenant.' });
  }
};