const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Prescription = require('../models/Prescription');

// Get all tasks for a doctor with optional filters
router.get('/doctor/:doctorId', async (req, res) => {
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
router.get('/pending/doctor/:doctorId', async (req, res) => {
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
router.get('/patient/:patientId', async (req, res) => {
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
router.get('/pending/patient/:patientId', async (req, res) => {
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

// Update task status (complete, start, etc.)
router.post('/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;

    let updateData = {};

    switch (action) {
      case 'complete':
        updateData = { status: 'completed' };
        break;
      case 'start':
        updateData = { status: 'in_progress' };
        break;
      case 'reopen':
        updateData = { status: 'pending' };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    const task = await Task.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('patient_id', 'full_name last_name email phone');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

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

// Create a new task
router.post('/', async (req, res) => {
  try {
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

    const task = new Task({
      doctor_id,
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

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
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
