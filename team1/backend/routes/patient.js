const express = require('express');
const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Report = require('../models/Report');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = path.join(__dirname, '..', 'uploads');
    // Ensure directory exists
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const allowedExtensions = /\.(pdf|jpg|jpeg|png)$/i;

    if (allowedTypes.includes(file.mimetype) && allowedExtensions.test(file.originalname)) {
      return cb(null, true);
    } else {
      return cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get patient appointments (placeholder - returns mock data)
router.get('/appointments', async (req, res) => {
  try {
    // For now, return mock appointments data
    // In a real app, this would fetch from database based on authenticated user
    const mockAppointments = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@medviz.com',
        date: '2024-08-25',
        time: '10:00 AM - 11:00 AM'
      },
      {
        name: 'Dr. Michael Chen',
        email: 'michael.chen@medviz.com',
        date: '2024-08-28',
        time: '2:00 PM - 3:00 PM'
      }
    ];
    res.json(mockAppointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get patient profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        tokenExpired: false
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        tokenExpired: false
      });
    }

    // Verify token with proper error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          tokenExpired: true
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          tokenExpired: false
        });
      }
      throw jwtError;
    }

    if (decoded.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        tokenExpired: false
      });
    }

    const patient = await Patient.findById(decoded.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Calculate age
    const age = patient.dob ?
      Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    // Map patient data to expected profile format
    const profileData = {
      _id: patient._id,
      id: patient._id.toString(),
      name: `${patient.full_name} ${patient.last_name}`,
      full_name: patient.full_name,
      last_name: patient.last_name,
      contact: patient.phone,
      phone: patient.phone,
      emergency: patient.emergency_contact,
      emergency_contact: patient.emergency_contact,
      mail: patient.email,
      email: patient.email,
      address: patient.address,
      blood: patient.blood_group,
      blood_group: patient.blood_group,
      height: patient.height || '',
      weight: patient.weight || '',
      bpm: patient.bpm || '',
      dob: patient.dob,
      age: age,
      gender: patient.gender,
      medical_history: patient.medical_history,
      current_medications: patient.current_medications,
      medications: patient.current_medications ? patient.current_medications.split(';').map(med => med.trim()).filter(Boolean) : []
    };

    res.json({
      success: true,
      profile: profileData
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update patient profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        tokenExpired: false
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        tokenExpired: false
      });
    }

    // Verify token with proper error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          tokenExpired: true
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          tokenExpired: false
        });
      }
      throw jwtError;
    }

    if (decoded.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.password;
    delete updates.email;
    delete updates._id;
    delete updates.created_at;

    // Find and update patient
    const patient = await Patient.findById(decoded.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'full_name',
      'last_name',
      'phone',
      'address',
      'emergency_contact',
      'blood_group',
      'medical_history',
      'current_medications',
      'height',
      'weight',
      'bpm',
      'dob',
      'gender'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        patient[field] = updates[field];
      }
    });

    await patient.save();

    // Calculate age
    const age = patient.dob ?
      Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    // Return updated profile
    const profileData = {
      _id: patient._id,
      id: patient._id.toString(),
      name: `${patient.full_name} ${patient.last_name}`,
      full_name: patient.full_name,
      last_name: patient.last_name,
      contact: patient.phone,
      phone: patient.phone,
      emergency: patient.emergency_contact,
      emergency_contact: patient.emergency_contact,
      mail: patient.email,
      email: patient.email,
      address: patient.address,
      blood: patient.blood_group,
      blood_group: patient.blood_group,
      height: patient.height || '',
      weight: patient.weight || '',
      bpm: patient.bpm || '',
      dob: patient.dob,
      age: age,
      gender: patient.gender,
      medical_history: patient.medical_history,
      current_medications: patient.current_medications,
      medications: patient.current_medications ? patient.current_medications.split(';').map(med => med.trim()).filter(Boolean) : []
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: profileData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get patient reports
router.get('/reports', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const patient = await Patient.findById(decoded.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const reports = [];

    // Get report from registration
    if (patient.medical_reports) {
      const filePath = path.resolve(__dirname, '..', patient.medical_reports);
      // Prevent path traversal
      if (!filePath.startsWith(path.resolve(__dirname, '..'))) {
        return res.status(400).json({ message: 'Invalid file path' });
      }

      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const fileName = path.basename(patient.medical_reports);

        reports.push({
          id: 'reg_' + patient._id.toString(),
          fileName: fileName,
          uploadedDate: patient.created_at || new Date(),
          fileSize: `${(stats.size / 1024).toFixed(2)} KB`,
          fileType: path.extname(fileName).substring(1).toUpperCase(),
          reportType: 'Medical Report',
          description: 'Uploaded during registration',
          filePath: patient.medical_reports,
          isRegistration: true
        });
      }
    }

    // Get additional uploaded reports
    const additionalReports = await Report.find({ patient_id: decoded.id });
    additionalReports.forEach(report => {
      reports.push({
        id: report._id.toString(),
        fileName: report.fileName,
        uploadedDate: report.uploadedDate,
        fileSize: report.fileSize,
        fileType: report.fileType,
        reportType: report.reportType,
        description: report.description,
        filePath: report.filePath,
        isRegistration: false
      });
    });

    // Sort by upload date (most recent first)
    reports.sort((a, b) => new Date(b.uploadedDate) - new Date(a.uploadedDate));

    res.json({ reports });
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Download report file
router.get('/reports/download/:reportId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { reportId } = req.params;
    let filePath;
    let fileName;

    // Check if it's a registration report (starts with 'reg_')
    const uploadsBase = path.resolve(__dirname, '..');
    if (reportId.startsWith('reg_')) {
      const patient = await Patient.findById(decoded.id);
      if (!patient || !patient.medical_reports) {
        return res.status(404).json({ message: 'Report not found' });
      }
      filePath = path.resolve(__dirname, '..', patient.medical_reports);
      fileName = `medical_report_${patient.full_name}_${patient.last_name}.pdf`;
    } else {
      // It's an additional report
      const report = await Report.findOne({ _id: reportId, patient_id: decoded.id });
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      filePath = path.resolve(__dirname, '..', report.filePath);
      fileName = report.fileName;
    }

    // Prevent path traversal
    if (!filePath.startsWith(uploadsBase)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    if (fs.existsSync(filePath)) {
      res.download(filePath, fileName);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// View report file (serve file for viewing)
router.get('/reports/view/:reportId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { reportId } = req.params;
    let filePath;
    const uploadsBase = path.resolve(__dirname, '..');

    // Check if it's a registration report (starts with 'reg_')
    if (reportId.startsWith('reg_')) {
      const patient = await Patient.findById(decoded.id);
      if (!patient || !patient.medical_reports) {
        return res.status(404).json({ message: 'Report not found' });
      }
      filePath = path.resolve(__dirname, '..', patient.medical_reports);
    } else {
      // It's an additional report
      const report = await Report.findOne({ _id: reportId, patient_id: decoded.id });
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      filePath = path.resolve(__dirname, '..', report.filePath);
    }

    // Prevent path traversal
    if (!filePath.startsWith(uploadsBase)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();

      // Set appropriate content type
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');

      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error reading file' });
        }
      });
      fileStream.pipe(res);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload new report
router.post('/reports/upload', (req, res) => {
  // Handle upload with custom error handling
  upload.single('report')(req, res, async (err) => {
    try {
      // Check for multer errors
      if (err) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size exceeds 10MB limit' });
        }
        return res.status(400).json({ message: err.message || 'File upload failed' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'patient') {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('File uploaded:', req.file);
      console.log('Request body:', req.body);

      const { reportType, description } = req.body;

      // Create new report record
      const newReport = new Report({
        patient_id: decoded.id,
        fileName: req.file.originalname,
        filePath: `uploads/${req.file.filename}`,
        fileType: path.extname(req.file.originalname).substring(1).toUpperCase(),
        fileSize: `${(req.file.size / 1024).toFixed(2)} KB`,
        reportType: reportType || 'Medical Report',
        description: description || 'Patient uploaded report'
      });

      await newReport.save();
      console.log('Report saved to database:', newReport);

      res.status(201).json({
        message: 'Report uploaded successfully',
        report: {
          id: newReport._id.toString(),
          fileName: newReport.fileName,
          uploadedDate: newReport.uploadedDate,
          fileSize: newReport.fileSize,
          fileType: newReport.fileType,
          reportType: newReport.reportType,
          description: newReport.description,
          filePath: newReport.filePath
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      res.status(500).json({ message: error.message || 'Server error' });
    }
  });
});

module.exports = router;
