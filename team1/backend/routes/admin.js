const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');

// Get dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    const Report = require('../models/Report');

    // Get total counts
    const totalPatients = await Patient.countDocuments();
    const totalDoctors = await Doctor.countDocuments({ status: 'approved' });
    const totalPrescriptions = await Prescription.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalReports = await Report.countDocuments();

    // Get today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCases = await Appointment.countDocuments({
      appointment_date: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });

    const todayScheduled = await Appointment.countDocuments({
      appointment_date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'rescheduled'] }
    });

    const todayPrescriptions = await Prescription.countDocuments({
      created_at: { $gte: today, $lt: tomorrow }
    });

    const todayReports = await Report.countDocuments({
      uploadedDate: { $gte: today, $lt: tomorrow }
    });

    // Weekly patient cases for chart
    const weeklyData = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const cases = await Appointment.countDocuments({
        appointment_date: { $gte: dayStart, $lt: dayEnd },
        status: 'completed'
      });

      const dayIndex = dayStart.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      weeklyData.push({
        day: days[dayIndex === 0 ? 6 : dayIndex - 1], // Convert Sunday=0 to index 6, Monday=1 to index 0, etc.
        cases
      });
    }

    // Get recent activity
    const recentPatients = await Patient.find().sort({ created_at: -1 }).limit(5).select('full_name last_name created_at');
    const recentDoctors = await Doctor.find().sort({ created_at: -1 }).limit(5).select('full_name last_name created_at status');
    const recentPrescriptions = await Prescription.find().sort({ created_at: -1 }).limit(5)
      .populate('patient_id', 'full_name last_name')
      .populate('doctor_id', 'full_name last_name');

    // Helper function to format time ago
    const getTimeAgo = (timestamp) => {
      const now = new Date();
      const then = new Date(timestamp);
      const diffInSeconds = Math.floor((now - then) / 1000);

      if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    };

    const recentActivity = [];

    // Add doctor registrations
    recentDoctors.forEach(doctor => {
      const status = doctor.status === 'approved' ? 'approved' : 'registered';
      recentActivity.push({
        type: doctor.status === 'approved' ? 'doctor_approved' : 'doctor_registered',
        title: `Dr. ${doctor.full_name} ${doctor.last_name} ${status}`,
        time: getTimeAgo(doctor.created_at),
        timestamp: doctor.created_at
      });
    });

    // Add patient registrations
    recentPatients.forEach(patient => {
      recentActivity.push({
        type: 'patient_registered',
        title: `New patient registered: ${patient.full_name} ${patient.last_name}`,
        time: getTimeAgo(patient.created_at),
        timestamp: patient.created_at
      });
    });

    // Add prescription generations
    recentPrescriptions.forEach(prescription => {
      const doctorName = prescription.doctor_id ?
        `Dr. ${prescription.doctor_id.full_name} ${prescription.doctor_id.last_name}` :
        'Unknown Doctor';
      const patientName = prescription.patient_id ?
        `${prescription.patient_id.full_name} ${prescription.patient_id.last_name}` :
        prescription.patient_name || 'Unknown Patient';

      recentActivity.push({
        type: 'prescription_added',
        title: `${doctorName} added prescription for ${patientName}`,
        time: getTimeAgo(prescription.created_at),
        timestamp: prescription.created_at
      });
    });

    // Sort by timestamp and limit to 10 most recent
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivity = recentActivity.slice(0, 10);

    res.json({
      success: true,
      metrics: {
        patients: { total: totalPatients, todayCases },
        doctors: { total: totalDoctors, scheduled: todayScheduled },
        prescriptions: { total: totalPrescriptions, addedToday: todayPrescriptions },
        reports: { total: totalReports, updated: todayReports },
        appointments: { total: totalAppointments }
      },
      weeklyData,
      recentActivity: limitedActivity
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin metrics',
      error: error.message
    });
  }
});

// Get all patients
router.get('/patients', async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query = {
        $or: [
          { full_name: { $regex: sanitizedSearch, $options: 'i' } },
          { last_name: { $regex: sanitizedSearch, $options: 'i' } },
          { email: { $regex: sanitizedSearch, $options: 'i' } },
          { phone: { $regex: sanitizedSearch, $options: 'i' } }
        ]
      };
    }

    const patients = await Patient.find(query).select('-password');

    // Get visit count for each patient
    const patientsWithVisits = await Promise.all(
      patients.map(async (patient) => {
        const visits = await Appointment.countDocuments({
          patient_id: patient._id,
          status: 'completed'
        });

        // Calculate age
        const age = patient.dob ?
          Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
          null;

        return {
          id: patient._id,
          name: `${patient.full_name} ${patient.last_name}`,
          age,
          email: patient.email,
          contact: patient.phone,
          visits,
          blood_group: patient.blood_group,
          created_at: patient.created_at
        };
      })
    );

    res.json({
      success: true,
      patients: patientsWithVisits
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: error.message
    });
  }
});

// Get single patient details by ID
router.get('/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id).select('-password');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get visit count
    const visits = await Appointment.countDocuments({
      patient_id: patient._id,
      status: 'completed'
    });

    // Calculate age
    const age = patient.dob ?
      Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    // Get recent appointments
    const recentAppointments = await Appointment.find({
      patient_id: patient._id
    })
      .sort({ appointment_date: -1 })
      .limit(5)
      .populate('doctor_id', 'full_name last_name specialization');

    const patientData = {
      id: patient._id,
      name: `${patient.full_name} ${patient.last_name}`,
      age,
      email: patient.email,
      contact: patient.phone,
      gender: patient.gender,
      dob: patient.dob,
      address: patient.address,
      emergency_contact: patient.emergency_contact,
      blood_group: patient.blood_group,
      medical_history: patient.medical_history,
      current_medications: patient.current_medications,
      height: patient.height,
      weight: patient.weight,
      bpm: patient.bpm,
      visits,
      created_at: patient.created_at,
      recentAppointments
    };

    res.json({
      success: true,
      patient: patientData
    });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient details',
      error: error.message
    });
  }
});

// Get all doctors
router.get('/doctors', async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search filter
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { full_name: { $regex: sanitizedSearch, $options: 'i' } },
        { last_name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { specialization: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const doctors = await Doctor.find(query).select('-password');

    const doctorsData = doctors.map(doctor => ({
      id: doctor._id,
      name: `Dr. ${doctor.full_name} ${doctor.last_name}`,
      email: doctor.email,
      phone: doctor.phone,
      specialization: doctor.specialization || 'General Medicine',
      status: doctor.status || 'pending',
      registration_date: doctor.registration_date || doctor.created_at,
      experience: doctor.experience,
      clinic_name: doctor.clinic_name,
      cert_docs: doctor.cert_docs
    }));

    res.json({
      success: true,
      doctors: doctorsData
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message
    });
  }
});

// Approve doctor
router.put('/doctors/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { status: 'approved' },
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
      message: 'Doctor approved successfully',
      doctor: {
        id: doctor._id,
        name: `Dr. ${doctor.full_name} ${doctor.last_name}`,
        status: doctor.status
      }
    });
  } catch (error) {
    console.error('Error approving doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving doctor',
      error: error.message
    });
  }
});

// Reject doctor
router.put('/doctors/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { status: 'rejected' },
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
      message: 'Doctor rejected successfully',
      doctor: {
        id: doctor._id,
        name: `Dr. ${doctor.full_name} ${doctor.last_name}`,
        status: doctor.status
      }
    });
  } catch (error) {
    console.error('Error rejecting doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting doctor',
      error: error.message
    });
  }
});

// Deactivate doctor
router.put('/doctors/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { status: 'deactivated' },
      { new: true }
    ).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // TODO: Send email notification to doctor about deactivation

    res.json({
      success: true,
      message: 'Doctor deactivated successfully',
      doctor: {
        id: doctor._id,
        name: `Dr. ${doctor.full_name} ${doctor.last_name}`,
        status: doctor.status
      }
    });
  } catch (error) {
    console.error('Error deactivating doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating doctor',
      error: error.message
    });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    // Get specialization counts
    const specializationCounts = await Doctor.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$specialization',
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentStats = specializationCounts.map(spec => ({
      specialization: spec._id || 'General Medicine',
      count: spec.count
    }));

    // Get gender demographics
    const genderStats = await Patient.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get age demographics
    const patients = await Patient.find().select('dob');
    const ageGroups = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    };

    patients.forEach(patient => {
      if (patient.dob) {
        const age = Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age <= 18) ageGroups['0-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 50) ageGroups['36-50']++;
        else if (age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      }
    });

    // Get monthly patient case statistics (last 12 months)
    const monthlyData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    console.log('Fetching monthly statistics...');

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const cases = await Appointment.countDocuments({
        appointment_date: { $gte: monthStart, $lt: monthEnd },
        status: 'completed'
      });

      const totalAppointments = await Appointment.countDocuments({
        appointment_date: { $gte: monthStart, $lt: monthEnd }
      });

      const year = monthStart.getFullYear();
      const currentYear = new Date().getFullYear();

      // Show only month name for current year, include year for other years
      const monthLabel = year === currentYear
        ? monthNames[monthStart.getMonth()]
        : `${monthNames[monthStart.getMonth()]} '${String(year).slice(-2)}`;

      monthlyData.push({
        month: monthLabel,
        cases,
        appointments: totalAppointments
      });

      if (cases > 0) {
        console.log(`${monthLabel}: ${cases} completed cases, ${totalAppointments} total appointments`);
      }
    }

    console.log('Total months with data:', monthlyData.length);
    console.log('Months with completed cases:', monthlyData.filter(m => m.cases > 0).length);

    res.json({
      success: true,
      analytics: {
        departmentStats,
        genderStats: genderStats.map(g => ({
          gender: g._id,
          count: g.count
        })),
        ageGroups,
        monthlyData
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

// Get all prescriptions
router.get('/prescriptions', async (req, res) => {
  try {
    const { search } = req.query;

    const prescriptions = await Prescription.find()
      .populate('patient_id', 'full_name last_name')
      .populate('doctor_id', 'full_name last_name')
      .sort({ created_at: -1 });

    let filteredPrescriptions = prescriptions.map(prescription => ({
      id: prescription._id.toString(),  // Convert ObjectId to string
      doctorName: prescription.doctor_id ?
        `Dr. ${prescription.doctor_id.full_name} ${prescription.doctor_id.last_name}` :
        'Unknown Doctor',
      patientName: prescription.patient_id ?
        `${prescription.patient_id.full_name} ${prescription.patient_id.last_name}` :
        prescription.patient_name || 'Unknown Patient',
      date: prescription.created_at,
      status: 'Verified', // You can add status field to Prescription model if needed
      diagnosis: prescription.diagnosis,
      medicines: prescription.medicines
    }));

    // Apply search filter
    if (search) {
      filteredPrescriptions = filteredPrescriptions.filter(p =>
        p.id.toString().includes(search) ||
        p.doctorName.toLowerCase().includes(search.toLowerCase()) ||
        p.patientName.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      prescriptions: filteredPrescriptions
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching prescriptions',
      error: error.message
    });
  }
});

// Get single prescription by ID with full details
router.get('/prescriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid prescription ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid prescription ID format'
      });
    }

    console.log('Fetching prescription with ID:', id);

    const prescription = await Prescription.findById(id)
      .populate('patient_id', 'full_name last_name email phone blood_group dob gender')
      .populate('doctor_id', 'full_name last_name specialization clinic_name clinic_address phone')
      .populate('appointment_id');

    console.log('Prescription found:', prescription ? 'Yes' : 'No');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      prescription: {
        id: prescription._id,
        prescriptionId: prescription._id.toString(),

        // Patient Information
        patientName: prescription.patient_name,
        patientAge: prescription.patient_age,
        patientGender: prescription.patient_gender,
        patientEmail: prescription.patient_id?.email,
        patientPhone: prescription.patient_id?.phone,
        patientBloodGroup: prescription.patient_id?.blood_group,

        // Doctor Information
        doctorName: prescription.doctor_id ?
          `Dr. ${prescription.doctor_id.full_name} ${prescription.doctor_id.last_name}` :
          'Unknown Doctor',
        doctorSpecialization: prescription.doctor_id?.specialization || 'General Physician',
        doctorClinic: prescription.doctor_id?.clinic_name,
        doctorClinicAddress: prescription.doctor_id?.clinic_address,
        doctorPhone: prescription.doctor_id?.phone,

        // Prescription Details
        diagnosis: prescription.diagnosis,
        medicines: prescription.medicines,
        testsRecommended: prescription.tests_recommended,
        additionalAdvice: prescription.additional_advice,

        // Metadata
        createdAt: prescription.created_at,
        date: prescription.created_at,
        appointmentId: prescription.appointment_id?._id
      }
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching prescription',
      error: error.message
    });
  }
});

// Delete prescription
router.delete('/prescriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findByIdAndDelete(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      message: 'Prescription deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting prescription',
      error: error.message
    });
  }
});

module.exports = router;
