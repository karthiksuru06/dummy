const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const Doctor = require('../models/Doctor');

// Helper function to parse appointment time string
const parseAppointmentTime = (timeString) => {
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

// Function to send appointment alerts (24 hours before and 1 hour before)
const sendAppointmentAlerts = async () => {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Running appointment alert job...`);

    // Find all scheduled appointments
    const scheduledAppointments = await Appointment.find({
      status: 'scheduled'
    }).populate('doctor_id', 'full_name last_name');

    if (scheduledAppointments.length === 0) {
      console.log('No scheduled appointments found.');
      return 0;
    }

    let alertsSent = 0;

    for (const appointment of scheduledAppointments) {
      try {
        const appointmentDate = new Date(appointment.appointment_date);
        const timeParts = parseAppointmentTime(appointment.appointment_time);

        if (!timeParts) {
          console.log(`Warning: Could not parse time "${appointment.appointment_time}" for appointment ${appointment._id}`);
          continue;
        }

        // Set the full appointment date and time
        appointmentDate.setHours(timeParts.hours, timeParts.minutes, 0, 0);

        // Calculate time until appointment
        const timeUntilAppointment = appointmentDate - now;
        const hoursUntilAppointment = timeUntilAppointment / (1000 * 60 * 60);

        // Get doctor name
        const doctorName = appointment.doctor_id
          ? `Dr. ${appointment.doctor_id.full_name} ${appointment.doctor_id.last_name}`
          : 'Doctor';

        // Check if we need to send 24-hour alert (between 23.5 and 24.5 hours before)
        if (hoursUntilAppointment >= 23.5 && hoursUntilAppointment <= 24.5) {
          // Check if 24-hour alert already sent
          const existing24HourAlert = await Notification.findOne({
            appointment_id: appointment._id,
            type: 'alert',
            message: { $regex: '24 hours' }
          });

          if (!existing24HourAlert) {
            // Send alert to patient only
            const patientAlert = new Notification({
              doctor_id: appointment.doctor_id,
              patient_id: appointment.patient_id,
              patient_name: appointment.patient_name,
              appointment_id: appointment._id,
              message: `Reminder: Your appointment with ${doctorName} is in 24 hours on ${appointmentDate.toLocaleDateString()} at ${appointment.appointment_time}. Please prepare necessary documents.`,
              type: 'alert',
              status: 'pending'
            });
            await patientAlert.save();

            alertsSent += 1;
            console.log(`✓ Sent 24-hour alert to patient for appointment ${appointment._id}`);
          }
        }

        // Check if we need to send 1-hour alert (between 0.5 and 1.5 hours before)
        if (hoursUntilAppointment >= 0.5 && hoursUntilAppointment <= 1.5) {
          // Check if 1-hour alert already sent
          const existing1HourAlert = await Notification.findOne({
            appointment_id: appointment._id,
            type: 'alert',
            message: { $regex: '1 hour' }
          });

          if (!existing1HourAlert) {
            // Send alert to patient only
            const patientAlert = new Notification({
              doctor_id: appointment.doctor_id,
              patient_id: appointment.patient_id,
              patient_name: appointment.patient_name,
              appointment_id: appointment._id,
              message: `⚠️ Your appointment with ${doctorName} is starting in 1 hour at ${appointment.appointment_time}. Meeting link: ${appointment.meeting_link || 'Will be provided shortly'}`,
              type: 'alert',
              status: 'pending'
            });
            await patientAlert.save();

            alertsSent += 1;
            console.log(`✓ Sent 1-hour alert to patient for appointment ${appointment._id}`);
          }
        }

        // Check if we need to send 15-minute alert (between 10 and 20 minutes before)
        const minutesUntilAppointment = timeUntilAppointment / (1000 * 60);
        if (minutesUntilAppointment >= 10 && minutesUntilAppointment <= 20) {
          // Check if 15-minute alert already sent
          const existing15MinAlert = await Notification.findOne({
            appointment_id: appointment._id,
            type: 'alert',
            message: { $regex: '15 minutes' }
          });

          if (!existing15MinAlert) {
            // Send alert to patient only
            const patientAlert = new Notification({
              doctor_id: appointment.doctor_id,
              patient_id: appointment.patient_id,
              patient_name: appointment.patient_name,
              appointment_id: appointment._id,
              message: `🔔 URGENT: Your appointment is starting in 15 minutes! Join now: ${appointment.meeting_link || 'Check your appointment details'}`,
              type: 'alert',
              status: 'pending'
            });
            await patientAlert.save();

            alertsSent += 1;
            console.log(`✓ Sent 15-minute alert to patient for appointment ${appointment._id}`);
          }
        }
      } catch (error) {
        console.error(`✗ Error processing appointment ${appointment._id}:`, error.message);
      }
    }

    console.log(`Alert job finished. Sent ${alertsSent} alerts.`);
    return alertsSent;
  } catch (error) {
    console.error('Error in appointment alert job:', error);
    return 0;
  }
};

// Start the scheduled job (runs every 30 minutes)
let alertIntervalId = null;
const ALERT_INTERVAL_MS = parseInt(process.env.ALERT_INTERVAL_MS || '1800000', 10);

const startAppointmentAlertJob = () => {
  console.log('Starting appointment alert scheduler...');

  // Clear any existing interval to prevent duplicates
  if (alertIntervalId) {
    clearInterval(alertIntervalId);
  }

  // Run immediately on startup
  sendAppointmentAlerts();

  alertIntervalId = setInterval(() => {
    sendAppointmentAlerts();
  }, ALERT_INTERVAL_MS);

  console.log(`Appointment alert scheduler started (runs every ${ALERT_INTERVAL_MS / 60000} minutes)`);
};

const stopAppointmentAlertJob = () => {
  if (alertIntervalId) {
    clearInterval(alertIntervalId);
    alertIntervalId = null;
    console.log('Appointment alert scheduler stopped.');
  }
};

module.exports = {
  sendAppointmentAlerts,
  startAppointmentAlertJob,
  stopAppointmentAlertJob
};
