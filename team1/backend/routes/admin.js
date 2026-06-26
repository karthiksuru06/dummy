const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const { audit } = require('../middleware/audit');

// Get dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    const Report = require('../models/Report');

    // Get today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Start of the 7-day weekly window (today - 6 days)
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    // Server-local IANA timezone so $dateToString buckets match local-day boundaries
    const serverTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // All independent aggregations in a single round-trip each, run in parallel
    const [
      patientFacet,
      doctorCount,
      prescriptionFacet,
      appointmentFacet,
      reportFacet,
      weeklyAgg
    ] = await Promise.all([
      Patient.aggregate([
        { $facet: { total: [{ $count: 'n' }] } }
      ]),
      Doctor.countDocuments({ status: 'approved' }),
      Prescription.aggregate([
        {
          $facet: {
            total: [{ $count: 'n' }],
            addedToday: [
              { $match: { created_at: { $gte: today, $lt: tomorrow } } },
              { $count: 'n' }
            ]
          }
        }
      ]),
      Appointment.aggregate([
        {
          $facet: {
            total: [{ $count: 'n' }],
            todayCases: [
              { $match: { appointment_date: { $gte: today, $lt: tomorrow }, status: 'completed' } },
              { $count: 'n' }
            ],
            todayScheduled: [
              { $match: { appointment_date: { $gte: today, $lt: tomorrow }, status: { $in: ['scheduled', 'rescheduled'] } } },
              { $count: 'n' }
            ]
          }
        }
      ]),
      Report.aggregate([
        {
          $facet: {
            total: [{ $count: 'n' }],
            updated: [
              { $match: { uploadedDate: { $gte: today, $lt: tomorrow } } },
              { $count: 'n' }
            ]
          }
        }
      ]),
      // One $group over the 7-day window, bucketed by calendar day
      Appointment.aggregate([
        { $match: { appointment_date: { $gte: weekStart, $lt: tomorrow }, status: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointment_date', timezone: serverTz } },
            cases: { $sum: 1 }
          }
        }
      ])
    ]);

    const facetVal = (arr) => (arr && arr[0] && arr[0].n) || 0;
    const totalPatients = facetVal(patientFacet[0].total);
    const totalDoctors = doctorCount;
    const totalPrescriptions = facetVal(prescriptionFacet[0].total);
    const todayPrescriptions = facetVal(prescriptionFacet[0].addedToday);
    const totalAppointments = facetVal(appointmentFacet[0].total);
    const todayCases = facetVal(appointmentFacet[0].todayCases);
    const todayScheduled = facetVal(appointmentFacet[0].todayScheduled);
    const totalReports = facetVal(reportFacet[0].total);
    const todayReports = facetVal(reportFacet[0].updated);

    // Weekly patient cases for chart (preserve Mon-indexed labels, oldest->newest)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyCounts = {};
    weeklyAgg.forEach(d => { weeklyCounts[d._id] = d.cases; });

    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const key = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;
      const dayIndex = dayStart.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      weeklyData.push({
        day: days[dayIndex === 0 ? 6 : dayIndex - 1],
        cases: weeklyCounts[key] || 0
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

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit);

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
      patients: patientsWithVisits,
      total,
      page,
      limit
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
router.get('/patients/:id', audit('admin.patient.read', 'Patient'), async (req, res) => {
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
router.put('/doctors/:id/approve', audit('admin.doctor.approve', 'Doctor'), async (req, res) => {
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
router.put('/doctors/:id/reject', audit('admin.doctor.reject', 'Doctor'), async (req, res) => {
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
router.put('/doctors/:id/deactivate', audit('admin.doctor.deactivate', 'Doctor'), async (req, res) => {
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
    const serverTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // Window start for monthly stats: first day of the month 11 months ago (local)
    const monthWindowStart = new Date();
    monthWindowStart.setMonth(monthWindowStart.getMonth() - 11);
    monthWindowStart.setDate(1);
    monthWindowStart.setHours(0, 0, 0, 0);

    const [specializationCounts, genderStats, ageBuckets, monthlyAgg] = await Promise.all([
      // Specialization counts
      Doctor.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$specialization', count: { $sum: 1 } } }
      ]),
      // Gender demographics
      Patient.aggregate([
        { $group: { _id: '$gender', count: { $sum: 1 } } }
      ]),
      // Age demographics via $bucket over age computed from dob.
      // Boundaries [0,19,36,51,66,Inf) reproduce <=18, <=35, <=50, <=65, 65+.
      Patient.aggregate([
        { $match: { dob: { $ne: null } } },
        {
          $project: {
            age: {
              $dateDiff: { startDate: '$dob', endDate: '$$NOW', unit: 'year' }
            }
          }
        },
        {
          $bucket: {
            groupBy: '$age',
            boundaries: [0, 19, 36, 51, 66],
            default: '65+',
            output: { count: { $sum: 1 } }
          }
        }
      ]),
      // Monthly case statistics grouped by year+month in one pass
      Appointment.aggregate([
        { $match: { appointment_date: { $gte: monthWindowStart } } },
        {
          $group: {
            _id: {
              year: { $year: { date: '$appointment_date', timezone: serverTz } },
              month: { $month: { date: '$appointment_date', timezone: serverTz } }
            },
            cases: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            appointments: { $sum: 1 }
          }
        }
      ])
    ]);

    const departmentStats = specializationCounts.map(spec => ({
      specialization: spec._id || 'General Medicine',
      count: spec.count
    }));

    // $dateDiff in years truncates toward zero like Math.floor for positive ages,
    // so boundary 19 == "19+" maps the original age<=18 group, etc.
    const ageGroups = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    };
    const bucketLabels = { 0: '0-18', 19: '19-35', 36: '36-50', 51: '51-65', '65+': '65+' };
    ageBuckets.forEach(b => {
      const label = bucketLabels[b._id];
      if (label) ageGroups[label] += b.count;
    });

    // Build the 12-month series oldest->newest, keyed off the grouped results
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};
    monthlyAgg.forEach(m => {
      monthlyMap[`${m._id.year}-${m._id.month}`] = { cases: m.cases, appointments: m.appointments };
    });

    const monthlyData = [];
    const currentYear = new Date().getFullYear();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const year = monthStart.getFullYear();
      const monthIdx = monthStart.getMonth();
      const entry = monthlyMap[`${year}-${monthIdx + 1}`] || { cases: 0, appointments: 0 };

      const monthLabel = year === currentYear
        ? monthNames[monthIdx]
        : `${monthNames[monthIdx]} '${String(year).slice(-2)}`;

      monthlyData.push({
        month: monthLabel,
        cases: entry.cases,
        appointments: entry.appointments
      });
    }

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

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const total = filteredPrescriptions.length;
    const skip = (page - 1) * limit;
    const paginated = filteredPrescriptions.slice(skip, skip + limit);

    res.json({
      success: true,
      prescriptions: paginated,
      total,
      page,
      limit
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
router.get('/prescriptions/:id', audit('admin.prescription.read', 'Prescription'), async (req, res) => {
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
router.delete('/prescriptions/:id', audit('admin.prescription.delete', 'Prescription'), async (req, res) => {
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
