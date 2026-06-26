const express = require('express');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Helper function to geocode address using OpenStreetMap Nominatim
async function geocodeAddress(address) {
  if (!address) return { latitude: null, longitude: null };
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return { latitude: null, longitude: null };
}

// A doctor may only access their own dashboard keyed by :doctorId (admins any).
function ensureDoctorParamSelfOrAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.user.id === String(req.params.doctorId)) return next();
  return res.status(403).json({ success: false, message: 'Forbidden: not your dashboard' });
}

// A doctor may only modify their own record (admins may modify any).
function ensureSelfOrAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.user.id === String(req.params.id)) return next();
  return res.status(403).json({ message: 'Forbidden: not your account' });
}
const doctorSelf = [authenticate, requireRole('doctor', 'admin'), ensureSelfOrAdmin];

// Get available doctors
router.get('/available', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Only fetch approved doctors
    const doctors = await Doctor.find({ status: 'approved' }, '-password')
      .skip(skip)
      .limit(limit);

    // Helper function to determine availability type
    const determineAvailability = (doctor) => {
      // Check if doctor has availability_schedule
      if (doctor.availability_schedule && doctor.availability_schedule.length > 0) {
        // Check if doctor has any available slots in the schedule
        const hasAvailableSlots = doctor.availability_schedule.some(slot => slot.is_available);
        if (hasAvailableSlots) {
          // For now, we'll mark doctors with availability_schedule as "online"
          return 'online';
        }
      }
      // Default to offline if no availability schedule or no available slots
      return 'offline';
    };

    // Helper function to extract location from address or clinic_address
    const extractLocation = (doctor) => {
      // Try to extract city from clinic_address or address
      const address = doctor.clinic_address || doctor.address || '';
      // Common city names
      const cities = ['new york', 'los angeles', 'chicago', 'houston', 'miami', 'boston'];
      const lowerAddress = address.toLowerCase();

      for (const city of cities) {
        if (lowerAddress.includes(city)) {
          return city.charAt(0).toUpperCase() + city.slice(1);
        }
      }

      // If no known city found, try to extract the last part of address
      const parts = address.split(',').map(p => p.trim());
      if (parts.length > 0) {
        return parts[parts.length - 1] || 'Unknown';
      }

      return 'Unknown';
    };

    // Map doctors to expected format with all details
    const availableDoctors = doctors.map(doctor => {
      const availability = determineAvailability(doctor);
      const location = extractLocation(doctor);

      return {
        id: doctor._id.toString(),
        _id: doctor._id.toString(),
        name: `Dr. ${doctor.full_name} ${doctor.last_name}`,
        full_name: doctor.full_name,
        last_name: doctor.last_name,
        age: doctor.dob ? Math.floor((new Date() - new Date(doctor.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization || 'General Medicine',
        experience: doctor.experience ? `${doctor.experience} years` : 'N/A',
        available_day: doctor.available_day || 'Monday-Friday',
        start_time: doctor.start_time || '9:00 AM',
        end_time: doctor.end_time || '5:00 PM',
        clinic_name: doctor.clinic_name || 'N/A',
        clinic_address: doctor.clinic_address || 'N/A',
        latitude: doctor.latitude,
        longitude: doctor.longitude,
        gender: doctor.gender,
        address: doctor.address,
        location: location,
        date: doctor.available_day ? `Available on ${doctor.available_day}` : 'Availability not specified',
        available: true,
        availability: availability,
        availability_schedule: doctor.availability_schedule || [],
        image: doctor.profile_picture && doctor.profile_picture !== 'null' ? `/uploads/${doctor.profile_picture}` : null,
        qualification: doctor.specialization ? `MBBS, ${doctor.specialization}` : 'MBBS',
        rating: 4.5,
        reviews: doctor.total_consultations || 0,
        cert_docs: doctor.cert_docs && doctor.cert_docs !== 'null' ? `/uploads/${doctor.cert_docs}` : null
      };
    });

    res.json(availableDoctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available slots for a doctor
router.get('/:id/slots', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, consultationType } = req.query;

    const doctor = await Doctor.findById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (doctor.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'This doctor is not currently accepting appointments'
      });
    }

    // Get the day of the week from the date
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    // Get doctor's availability for this day
    let doctorSlots = [];
    if (doctor.availability_schedule && Array.isArray(doctor.availability_schedule)) {
      // Filter slots for the specific day where is_available is true
      const dayAvailability = doctor.availability_schedule.filter(
        slot => slot.day === dayOfWeek && slot.is_available === true
      );

      // Convert time slot format (e.g., "9AM" to "9:00 AM")
      doctorSlots = dayAvailability.map(slot => {
        const time = slot.time_slot;
        // Convert "9AM" to "9:00 AM", "12PM" to "12:00 PM", etc.
        if (time.includes('AM') || time.includes('PM')) {
          const hour = time.replace(/[AP]M/, '');
          const period = time.includes('AM') ? 'AM' : 'PM';
          return `${hour}:00 ${period}`;
        }
        return time;
      });
    }

    // If no availability schedule or no slots for this day, return empty array
    if (doctorSlots.length === 0) {
      return res.json({
        success: true,
        slots: [],
        date,
        consultationType,
        message: 'Doctor has no availability for this day'
      });
    }

    // Get all appointments for the doctor on the specified date
    const existingAppointments = await Appointment.find({
      doctor_id: id,
      appointment_date: date,
      status: { $in: ['scheduled', 'pending', 'rescheduled'] }
    }).select('appointment_time');

    // Extract booked times
    const bookedTimes = existingAppointments.map(apt => apt.appointment_time);

    // Filter out booked slots
    const availableSlots = doctorSlots.filter(slot => !bookedTimes.includes(slot));

    res.json({
      success: true,
      slots: availableSlots,
      date,
      day: dayOfWeek,
      consultationType
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots',
      error: error.message
    });
  }
});

// Get doctor profile
router.get('/:id/profile', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Calculate age
    const age = doctor.dob ?
      Math.floor((new Date() - new Date(doctor.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    res.json({
      success: true,
      profile: {
        _id: doctor._id,
        name: `Dr. ${doctor.full_name} ${doctor.last_name}`,
        full_name: doctor.full_name,
        last_name: doctor.last_name,
        email: doctor.email,
        phone: doctor.phone,
        age,
        dob: doctor.dob,
        gender: doctor.gender,
        address: doctor.address,
        specialization: doctor.specialization,
        experience: doctor.experience,
        clinic_name: doctor.clinic_name,
        clinic_address: doctor.clinic_address,
        latitude: doctor.latitude,
        longitude: doctor.longitude,
        profile_picture: doctor.profile_picture,
        availability_schedule: doctor.availability_schedule || [],
        total_consultations: doctor.total_consultations || 0
      }
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor profile',
      error: error.message
    });
  }
});

// Update doctor profile
router.put('/:id/profile', doctorSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      last_name,
      email,
      phone,
      address,
      specialization,
      experience,
      clinic_name,
      clinic_address
    } = req.body;

    let latitude = null;
    let longitude = null;

    // Auto-geocode if clinic_address is provided or changed
    if (clinic_address) {
      const coords = await geocodeAddress(clinic_address);
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      {
        full_name,
        last_name,
        email,
        phone,
        address,
        specialization,
        experience,
        clinic_name,
        clinic_address,
        latitude,
        longitude
      },
      { new: true }
    ).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: doctor
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating doctor profile',
      error: error.message
    });
  }
});

// Update availability schedule
router.put('/:id/availability', doctorSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const { availability_schedule } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { availability_schedule },
      { new: true }
    ).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Availability updated successfully',
      availability_schedule: doctor.availability_schedule
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating availability',
      error: error.message
    });
  }
});

// Upload profile picture
router.post('/:id/profile-picture', doctorSelf, async (req, res) => {
  try {
    const { id } = req.params;
    const { profile_picture } = req.body; // File path after upload

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { profile_picture },
      { new: true }
    ).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profile_picture: doctor.profile_picture
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile picture',
      error: error.message
    });
  }
});

// Get dashboard data/metrics
router.get('/:doctorId/dashboard', authenticate, requireRole('doctor', 'admin'), ensureDoctorParamSelfOrAdmin, async (req, res) => {
  try {
    const { doctorId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get metrics
    const totalConsultations = await Appointment.countDocuments({
      doctor_id: doctorId,
      status: 'completed'
    });

    const monthConsultations = await Appointment.countDocuments({
      doctor_id: doctorId,
      status: 'completed',
      appointment_date: { $gte: firstDayOfMonth }
    });

    const todayAppointments = await Appointment.countDocuments({
      doctor_id: doctorId,
      appointment_date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'rescheduled'] }
    });

    const pendingApprovals = await Appointment.countDocuments({
      doctor_id: doctorId,
      status: 'pending'
    });

    // NOTE: a GET must not mutate. (Removed the findByIdAndUpdate that wrote
    // total_consultations on every dashboard read.)

    res.json({
      success: true,
      metrics: {
        totalConsultations,
        monthConsultations,
        todayAppointments,
        pendingApprovals
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard metrics',
      error: error.message
    });
  }
});

module.exports = router;