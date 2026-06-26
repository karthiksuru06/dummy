const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Task = require('../models/Task');
const { redis, isRedisEnabled } = require('../utils/redis');

// Unique per-process id so we can tell which instance holds the leader lock.
const INSTANCE_ID = crypto.randomBytes(8).toString('hex');

// Try to acquire a short-lived leader lock so that with N instances running,
// only one actually performs the work each tick. Returns true when this
// instance may run (always true when Redis is disabled — single-instance
// assumption). The lock auto-expires (PX) so a crashed leader never blocks.
async function acquireLock(jobName, ttlMs) {
  if (!isRedisEnabled || !redis) return true;
  try {
    const res = await redis.set(`cron:lock:${jobName}`, INSTANCE_ID, 'NX', 'PX', ttlMs);
    return res === 'OK';
  } catch (_) {
    // If the lock check fails, skip this tick rather than risk double-processing.
    return false;
  }
}

// Helper function to parse appointment time string
const parseAppointmentTime = (timeString) => {
  // Handle formats like "9:00 AM", "2:30 PM", "14:00"
  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const meridiem = timeMatch[3];

  if (meridiem) {
    if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
  }

  return { hours, minutes };
};

// Function to auto-complete appointments that are 6+ hours past scheduled time
const autoCompleteOldAppointments = async () => {
  try {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - (6 * 60 * 60 * 1000));

    console.log(`[${new Date().toISOString()}] Running auto-complete job for appointments...`);

    // Find scheduled OR rescheduled appointments — 'rescheduled' is a distinct
    // status and was previously never auto-completed, so those lingered forever.
    const scheduledAppointments = await Appointment.find({
      status: { $in: ['scheduled', 'rescheduled'] }
    });

    if (scheduledAppointments.length === 0) {
      console.log('No scheduled appointments found.');
      return 0;
    }

    // Filter appointments that are more than 6 hours old
    const oldAppointments = scheduledAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      const timeParts = parseAppointmentTime(appointment.appointment_time);

      if (!timeParts) {
        console.log(`Warning: Could not parse time "${appointment.appointment_time}" for appointment ${appointment._id}`);
        return false;
      }

      // Set the appointment date and time
      appointmentDate.setHours(timeParts.hours, timeParts.minutes, 0, 0);

      // Check if appointment is more than 6 hours old
      return appointmentDate <= sixHoursAgo;
    });

    if (oldAppointments.length === 0) {
      console.log('No appointments to auto-complete.');
      return 0;
    }

    console.log(`Found ${oldAppointments.length} appointments to auto-complete.`);

    // Mark each old appointment as completed
    let completedCount = 0;
    for (const appointment of oldAppointments) {
      try {
        appointment.status = 'completed';
        await appointment.save();

        // Also mark related tasks as completed
        await Task.updateMany(
          {
            related_appointment_id: appointment._id,
            status: 'pending'
          },
          { status: 'completed' }
        );

        completedCount++;
        console.log(`✓ Auto-completed appointment ${appointment._id} - Patient: ${appointment.patient_name}, Date: ${appointment.appointment_date}, Time: ${appointment.appointment_time}`);
      } catch (error) {
        console.error(`✗ Error completing appointment ${appointment._id}:`, error.message);
      }
    }

    console.log(`Auto-complete job finished. Completed ${completedCount}/${oldAppointments.length} appointments.`);
    return completedCount;
  } catch (error) {
    console.error('Error in auto-complete job:', error);
    return 0;
  }
};

// Start the scheduled job (runs every hour)
let autoCompleteIntervalId = null;
const AUTO_COMPLETE_INTERVAL_MS = parseInt(process.env.AUTO_COMPLETE_INTERVAL_MS || '3600000', 10);

const startAutoCompleteJob = () => {
  console.log('Starting appointment auto-complete scheduler...');

  // Clear any existing interval to prevent duplicates
  if (autoCompleteIntervalId) {
    clearInterval(autoCompleteIntervalId);
  }

  // ~90% of the interval so the lock expires before the next tick.
  const LOCK_TTL_MS = Math.floor(AUTO_COMPLETE_INTERVAL_MS * 0.9);

  const tick = async () => {
    if (await acquireLock('appointmentAutoComplete', LOCK_TTL_MS)) {
      await autoCompleteOldAppointments();
    }
  };

  // Run immediately on startup
  tick();

  autoCompleteIntervalId = setInterval(() => {
    tick();
  }, AUTO_COMPLETE_INTERVAL_MS);

  console.log(`Appointment auto-complete scheduler started (runs every ${AUTO_COMPLETE_INTERVAL_MS / 60000} minutes)`);
};

const stopAutoCompleteJob = () => {
  if (autoCompleteIntervalId) {
    clearInterval(autoCompleteIntervalId);
    autoCompleteIntervalId = null;
    console.log('Appointment auto-complete scheduler stopped.');
  }
};

module.exports = {
  autoCompleteOldAppointments,
  startAutoCompleteJob,
  stopAutoCompleteJob
};
