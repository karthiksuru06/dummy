const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// Get all notifications for a doctor (using new receiver-based approach)
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { limit = 50, start_date, end_date } = req.query;

    // Base query for doctor notifications (new and legacy)
    const baseQuery = {
      $or: [
        { receiver_id: doctorId, receiver_type: 'Doctor' },
        { doctor_id: doctorId, receiver_type: { $exists: false } } // Legacy notifications
      ]
    };

    // Add date range filter if provided
    if (start_date || end_date) {
      baseQuery.created_at = {};
      if (start_date) baseQuery.created_at.$gte = new Date(start_date);
      if (end_date) baseQuery.created_at.$lte = new Date(end_date);
    }

    const notifications = await Notification.find(baseQuery)
      .populate('sender_id', 'full_name last_name email')
      .populate('patient_id', 'full_name last_name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// Get unread notification count for doctor
router.get('/unread/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;

    const count = await Notification.countDocuments({
      $or: [
        { receiver_id: doctorId, receiver_type: 'Doctor', is_read: false },
        { doctor_id: doctorId, receiver_type: { $exists: false }, is_read: false }
      ]
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
});

// Mark all notifications as read for a doctor
router.put('/mark-all-read/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;

    await Notification.updateMany(
      {
        $or: [
          { receiver_id: doctorId, receiver_type: 'Doctor', is_read: false },
          { doctor_id: doctorId, receiver_type: { $exists: false }, is_read: false }
        ]
      },
      { is_read: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
});

// Create a notification (using new receiver-based approach)
router.post('/', async (req, res) => {
  try {
    const {
      receiver_id,
      receiver_type,
      sender_id,
      sender_type,
      sender_name,
      message,
      title,
      type,
      appointment_id,
      action_link,
      // Legacy fields for backward compatibility
      doctor_id,
      patient_id,
      patient_name
    } = req.body;

    const notification = new Notification({
      receiver_id: receiver_id || (receiver_type === 'Doctor' ? doctor_id : patient_id),
      receiver_type,
      sender_id,
      sender_type,
      sender_name,
      message,
      title: title || 'Notification',
      type,
      appointment_id,
      action_link,
      // Legacy fields
      doctor_id,
      patient_id,
      patient_name
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
});

// Get all notifications for a patient (using new receiver-based approach)
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 50 } = req.query;

    // Query using new receiver_id field (for new notifications)
    // Also include legacy patient_id field (for backward compatibility)
    const notifications = await Notification.find({
      $or: [
        { receiver_id: patientId, receiver_type: 'Patient' },
        { patient_id: patientId, receiver_type: { $exists: false } } // Legacy notifications
      ]
    })
      .populate('sender_id', 'full_name last_name email')
      .populate('doctor_id', 'full_name last_name specialization')
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching patient notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient notifications',
      error: error.message
    });
  }
});

// Get unread notification count for patient
router.get('/patient/unread/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const count = await Notification.countDocuments({
      $or: [
        { receiver_id: patientId, receiver_type: 'Patient', is_read: false },
        { patient_id: patientId, receiver_type: { $exists: false }, is_read: false }
      ]
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching unread count for patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
});

// Mark all notifications as read for a patient
router.put('/patient/:patientId/read-all', async (req, res) => {
  try {
    const { patientId } = req.params;

    await Notification.updateMany(
      {
        $or: [
          { receiver_id: patientId, receiver_type: 'Patient', is_read: false },
          { patient_id: patientId, receiver_type: { $exists: false }, is_read: false }
        ]
      },
      { is_read: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
});

// Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
});

module.exports = router;
