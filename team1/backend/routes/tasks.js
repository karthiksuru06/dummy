const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Prescription = require('../models/Prescription');
const { requireOwnership } = require('../middleware/auth');

// This router is mounted with `authenticate` (see app.js), so req.user is set.
// /doctor/:doctorId routes: only the doctor themselves (or admin) may access.
const ownDoctor = requireOwnership((req) => req.params.doctorId, { allowRoles: ['admin'] });
// /patient/:patientId routes: the patient themselves, or a doctor/admin.
const ownPatient = requireOwnership((req) => req.params.patientId);

// Loads the task at :id and authorizes the caller: they must be the task's
// doctor, the task's patient, or an admin. 403 otherwise. Stashes req.task.
async function loadOwnTask(req, res, next) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (req.user.role !== 'admin') {
      const ownerIds = [task.doctor_id, task.patient_id]
        .filter(Boolean)
        .map((id) => String(id));
      if (!ownerIds.includes(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your task' });
      }
    }
    req.task = task;
    next();
  } catch (err) {
    next(err);
  }
}

// Get all tasks for a doctor with optional filters
router.get('/doctor/:doctorId', ownDoctor, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, priority, task_type } = req.query;

    const query = { doctor_id: doctorId };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (task_type) query.task_type = task_type;

    const tasks = await Task.find(query)
      .populate('patient_id', 'full_name last_name email phone')
      .populate('related_appointment_id')
      .sort({ priority: 1, created_at: -1 }); // High priority first, then by date

    // Custom sort to put high priority first
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({
      success: true,
      tasks: sortedTasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
});

// Get pending tasks for a doctor
router.get('/pending/doctor/:doctorId', ownDoctor, async (req, res) => {
  try {
    const { doctorId } = req.params;

    const tasks = await Task.find({
      doctor_id: doctorId,
      assigned_to: 'doctor',
      status: 'pending'
    })
      .populate('patient_id', 'full_name last_name email phone')
      .populate('related_appointment_id')
      .sort({ priority: 1, created_at: -1 });

    // Filter out tasks where prescription already exists
    const filteredTasks = await Promise.all(
      tasks.map(async (task) => {
        // If this is an upcoming_appointment task, check if prescription exists
        if (task.task_type === 'upcoming_appointment' && task.related_appointment_id) {
          const existingPrescription = await Prescription.findOne({
            appointment_id: task.related_appointment_id
          });

          // If prescription exists, don't include this task
          if (existingPrescription) {
            return null;
          }
        }
        return task;
      })
    );

    // Remove null values (tasks with existing prescriptions)
    const validTasks = filteredTasks.filter(task => task !== null);

    // Custom sort to put high priority first
    const sortedTasks = validTasks.sort((a, b) => {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({
      success: true,
      tasks: sortedTasks
    });
  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending tasks',
      error: error.message
    });
  }
});

// Get all tasks for a patient
router.get('/patient/:patientId', ownPatient, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, priority } = req.query;

    const query = {
      patient_id: patientId,
      assigned_to: 'patient'
    };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('doctor_id', 'full_name last_name specialization')
      .populate('related_appointment_id')
      .sort({ priority: 1, created_at: -1 });

    // Custom sort to put high priority first
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({
      success: true,
      tasks: sortedTasks
    });
  } catch (error) {
    console.error('Error fetching patient tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient tasks',
      error: error.message
    });
  }
});

// Get pending tasks for a patient
router.get('/pending/patient/:patientId', ownPatient, async (req, res) => {
  try {
    const { patientId } = req.params;

    const tasks = await Task.find({
      patient_id: patientId,
      assigned_to: 'patient',
      status: 'pending'
    })
      .populate('doctor_id', 'full_name last_name specialization')
      .populate('related_appointment_id')
      .sort({ priority: 1, created_at: -1 });

    // Custom sort to put high priority first
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({
      success: true,
      tasks: sortedTasks
    });
  } catch (error) {
    console.error('Error fetching pending patient tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending patient tasks',
      error: error.message
    });
  }
});

// Update task status (complete, start, etc.).
// loadOwnTask verifies the caller is the task's doctor/patient (or admin).
router.post('/:id/:action', loadOwnTask, async (req, res) => {
  try {
    const { action } = req.params;

    let newStatus;

    switch (action) {
      case 'complete':
        newStatus = 'completed';
        break;
      case 'start':
        newStatus = 'in_progress';
        break;
      case 'reopen':
        newStatus = 'pending';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    req.task.status = newStatus;
    await req.task.save();
    const task = await req.task.populate('patient_id', 'full_name last_name email phone');

    res.json({
      success: true,
      message: `Task ${action}d successfully`,
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
});

// Create a new task. Only staff (doctor/admin) may create tasks; a doctor can
// only create tasks owned by themselves (doctor_id is forced to req.user.id).
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: only staff may create tasks'
      });
    }

    const {
      doctor_id,
      patient_id,
      patient_name,
      doctor_name,
      assigned_to,
      task_type,
      title,
      description,
      priority,
      related_appointment_id
    } = req.body;

    // A doctor cannot create tasks under another doctor's id.
    const effectiveDoctorId = req.user.role === 'doctor' ? req.user.id : doctor_id;

    const task = new Task({
      doctor_id: effectiveDoctorId,
      patient_id,
      patient_name,
      doctor_name,
      assigned_to: assigned_to || 'doctor', // Default to doctor for backward compatibility
      task_type,
      title,
      description,
      priority: priority || 'medium',
      related_appointment_id
    });

    await task.save();

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
});

// Get task by ID. loadOwnTask verifies the caller owns this task (or is admin).
router.get('/:id', loadOwnTask, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('patient_id', 'full_name last_name email phone')
      .populate('doctor_id', 'full_name last_name specialization')
      .populate('related_appointment_id');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
});

module.exports = router;
