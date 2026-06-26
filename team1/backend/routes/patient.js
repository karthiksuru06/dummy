const express = require('express');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const Patient = require('../models/Patient');
const Report = require('../models/Report');
const path = require('path');
const multer = require('multer');
const { audit } = require('../middleware/audit');

const router = express.Router();

// Configure Cloudinary (mirrors routes/auth.js). Files are stored on Cloudinary
// rather than local disk so uploads survive redeploys and work across instances.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a file buffer to Cloudinary, returning both the secure_url (stored as
// filePath) and the public_id (stored so the asset can be deleted later).
//
// PHI report files are uploaded with delivery type 'authenticated' (private):
// the asset is NOT served from its canonical public URL and can only be reached
// via a server-signed, time-limited delivery URL (see buildSignedUrl). This
// gives true per-request access control over patient medical reports.
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'medviz_uploads',
        resource_type: 'auto',
        type: 'authenticated',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(file.buffer);
  });
};

// Mint a short-lived SIGNED Cloudinary delivery URL for a stored asset.
//
// Why: the frontend loads previews via <iframe>/<img> tags, which cannot send
// an Authorization header. So instead of pointing those tags at our header-only
// /reports/view endpoint (which 401s on a bare tag load), the authenticated
// /reports list mints a signed, expiring Cloudinary URL server-side and hands
// it to the client. The tag then loads PHI directly from Cloudinary using a URL
// that is signed and time-limited rather than a permanent public link.
//
// resourceType: 'raw' for PDFs (how resource_type:'auto' stores them) and
// 'image' otherwise — must match the upload type or the signature won't verify.
//
// PHI-PRIVACY: newly-uploaded assets use delivery type 'authenticated' (private)
// — Cloudinary will NOT serve them from their canonical public URL, so a signed,
// short-lived delivery URL minted server-side is the ONLY way to view the file
// (true per-request access control). We sign with type:'authenticated' and a
// ~10 min expiry. Legacy assets uploaded with the old public 'upload' type are
// still signed with their detected delivery type so existing links keep working.
const SIGNED_URL_TTL_SECONDS = 10 * 60; // ~10 minutes

// deliveryType defaults to 'authenticated' (the new private default). For legacy
// public assets we detect 'upload' from the stored URL and pass it through.
const buildSignedUrl = (publicId, resourceType, deliveryType = 'authenticated') => {
  return cloudinary.url(publicId, {
    sign_url: true,
    secure: true,
    resource_type: resourceType,
    type: deliveryType,
    // Time-limited token: the URL stops resolving after this instant.
    expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
  });
};

// Best-effort extraction of a Cloudinary public_id (incl. folder), resource_type
// and delivery type from a stored secure_url. Used for registration reports,
// which only persist the URL (no separate public_id column). Handles both the
// new 'authenticated' (private) delivery type and any legacy public 'upload'.
const parseCloudinaryUrl = (url) => {
  try {
    // e.g. https://res.cloudinary.com/<cloud>/<resourceType>/<deliveryType>/v123/<folder>/<name>.<ext>
    const match = url.match(/\/(image|raw|video)\/(authenticated|upload|private)\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    const resourceType = match[1];
    const deliveryType = match[2];
    let publicId = match[3].split('?')[0];
    // For raw assets the extension is part of the public_id; for image assets
    // Cloudinary's public_id excludes the extension.
    if (resourceType === 'image') {
      publicId = publicId.replace(/\.[^/.]+$/, '');
    }
    return { publicId, resourceType, deliveryType };
  } catch (e) {
    return null;
  }
};

// Use memory storage so the buffer can be streamed straight to Cloudinary.
const storage = multer.memoryStorage();

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
router.get('/reports', audit('report.read', 'Report'), async (req, res) => {
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
    req.user = { id: String(decoded.id), role: decoded.role }; // for audit actor attribution
    if (decoded.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const patient = await Patient.findById(decoded.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const reports = [];

    // Get report from registration. medical_reports is now a Cloudinary
    // secure_url (uploaded at registration in routes/auth.js), not a disk path.
    if (patient.medical_reports) {
      const url = patient.medical_reports;
      // Derive a displayable filename/type from the Cloudinary URL.
      const urlPath = url.split('?')[0];
      const baseName = path.basename(urlPath) || 'medical_report';
      const ext = path.extname(baseName).substring(1).toUpperCase();

      // Registration reports only persist the secure_url, so derive the
      // public_id + resource_type from it and mint a short-lived signed URL.
      // Fall back to the raw secure_url if parsing/signing fails.
      let signedUrl = url;
      const parsed = parseCloudinaryUrl(url);
      if (parsed) {
        try {
          // Sign with the detected delivery type ('authenticated' for new PHI
          // uploads, 'upload' for any legacy public asset).
          signedUrl = buildSignedUrl(parsed.publicId, parsed.resourceType, parsed.deliveryType);
        } catch (signErr) {
          console.error('Signed URL error (registration report):', signErr.message);
          // Could not sign — fall back to the stored secure_url.
          signedUrl = url;
        }
      }

      reports.push({
        id: 'reg_' + patient._id.toString(),
        fileName: baseName,
        uploadedDate: patient.created_at || new Date(),
        fileSize: 'N/A',
        fileType: ext || 'FILE',
        reportType: 'Medical Report',
        description: 'Uploaded during registration',
        filePath: url,
        // Short-lived signed URL the frontend uses directly for <iframe>/<img>
        // previews and downloads (no Authorization header needed on tag loads).
        url: signedUrl,
        signedUrl,
        isRegistration: true
      });
    }

    // Get additional uploaded reports
    const additionalReports = await Report.find({ patient_id: decoded.id });
    additionalReports.forEach(report => {
      // Choose resource_type the way resource_type:'auto' stored it on upload:
      // PDFs land as 'raw', images as 'image'. Sign with the stored public_id.
      let signedUrl = report.filePath;
      if (report.cloudinaryPublicId) {
        const resourceType = report.fileType === 'PDF' ? 'raw' : 'image';
        // Detect the delivery type from the stored URL so legacy public 'upload'
        // assets keep working; new uploads are private 'authenticated'.
        const parsedStored = report.filePath ? parseCloudinaryUrl(report.filePath) : null;
        const deliveryType = parsedStored ? parsedStored.deliveryType : 'authenticated';
        try {
          signedUrl = buildSignedUrl(report.cloudinaryPublicId, resourceType, deliveryType);
        } catch (signErr) {
          console.error('Signed URL error (uploaded report):', signErr.message);
          // Could not sign — fall back to the stored secure_url.
          signedUrl = report.filePath;
        }
      }

      reports.push({
        id: report._id.toString(),
        fileName: report.fileName,
        uploadedDate: report.uploadedDate,
        fileSize: report.fileSize,
        fileType: report.fileType,
        reportType: report.reportType,
        description: report.description,
        filePath: report.filePath,
        url: signedUrl,
        signedUrl,
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
    req.user = { id: String(decoded.id), role: decoded.role }; // for audit actor attribution
    if (decoded.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { reportId } = req.params;
    let fileUrl;

    // Ownership is enforced by deriving the patient from the verified JWT
    // (decoded.id) — never from a client-supplied id — and only resolving
    // reports that belong to that patient.
    if (reportId.startsWith('reg_')) {
      const patient = await Patient.findById(decoded.id);
      if (!patient || !patient.medical_reports) {
        return res.status(404).json({ message: 'Report not found' });
      }
      fileUrl = patient.medical_reports;
    } else {
      // It's an additional report — scoped to the authenticated patient.
      const report = await Report.findOne({ _id: reportId, patient_id: decoded.id });
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      fileUrl = report.filePath;
    }

    // Files now live on Cloudinary; redirect the client to the secure URL.
    return res.redirect(fileUrl);
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
    req.user = { id: String(decoded.id), role: decoded.role }; // for audit actor attribution
    if (decoded.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { reportId } = req.params;
    let fileUrl;

    // Ownership enforced via the JWT-derived patient id (decoded.id), never a
    // client-supplied id.
    if (reportId.startsWith('reg_')) {
      const patient = await Patient.findById(decoded.id);
      if (!patient || !patient.medical_reports) {
        return res.status(404).json({ message: 'Report not found' });
      }
      fileUrl = patient.medical_reports;
    } else {
      // It's an additional report — scoped to the authenticated patient.
      const report = await Report.findOne({ _id: reportId, patient_id: decoded.id });
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      fileUrl = report.filePath;
    }

    // Files now live on Cloudinary; redirect the client to the secure URL so
    // the <iframe>/<img> in the frontend loads it directly.
    return res.redirect(fileUrl);
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload new report
router.post('/reports/upload', audit('report.upload', 'Report'), (req, res) => {
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
      req.user = { id: String(decoded.id), role: decoded.role }; // for audit actor attribution
      if (decoded.role !== 'patient') {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { reportType, description } = req.body;

      // Upload the buffer to Cloudinary (stateless — no local disk write).
      const { secure_url, public_id } = await uploadToCloudinary(req.file);

      // Create new report record. filePath holds the Cloudinary secure_url;
      // cloudinaryPublicId is kept so the asset can be deleted later.
      const newReport = new Report({
        patient_id: decoded.id,
        fileName: req.file.originalname,
        filePath: secure_url,
        cloudinaryPublicId: public_id,
        fileType: path.extname(req.file.originalname).substring(1).toUpperCase(),
        fileSize: `${(req.file.size / 1024).toFixed(2)} KB`,
        reportType: reportType || 'Medical Report',
        description: description || 'Patient uploaded report'
      });

      await newReport.save();

      // The asset is uploaded as 'authenticated' (private), so its bare
      // secure_url won't resolve. Hand back a short-lived signed delivery URL.
      let signedUrl = newReport.filePath;
      const resourceType = newReport.fileType === 'PDF' ? 'raw' : 'image';
      try {
        signedUrl = buildSignedUrl(newReport.cloudinaryPublicId, resourceType, 'authenticated');
      } catch (signErr) {
        console.error('Signed URL error (upload response):', signErr.message);
        signedUrl = newReport.filePath;
      }

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
          filePath: newReport.filePath,
          url: signedUrl,
          signedUrl
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

// Delete a report. Ownership is enforced server-side: the report must belong to
// the patient derived from the verified JWT. Registration reports (reg_*) cannot
// be deleted here. Removes the asset from Cloudinary using the stored public_id.
router.delete('/reports/:reportId', audit('report.delete', 'Report'), async (req, res) => {
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
    req.user = { id: String(decoded.id), role: decoded.role }; // for audit actor attribution
    if (decoded.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { reportId } = req.params;

    if (reportId.startsWith('reg_')) {
      return res.status(400).json({ message: 'Registration reports cannot be deleted' });
    }

    // Scoped to the authenticated patient — a patient may only delete their own.
    const report = await Report.findOne({ _id: reportId, patient_id: decoded.id });
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Best-effort removal of the underlying Cloudinary asset. The destroy API
    // does not accept resource_type 'auto', and PDFs are stored as 'raw' while
    // images are 'image', so try the relevant types.
    if (report.cloudinaryPublicId) {
      const resourceType = report.fileType === 'PDF' ? 'raw' : 'image';
      // Destroy must target the same delivery type the asset was stored under.
      const parsedStored = report.filePath ? parseCloudinaryUrl(report.filePath) : null;
      const deliveryType = parsedStored ? parsedStored.deliveryType : 'authenticated';
      try {
        await cloudinary.uploader.destroy(report.cloudinaryPublicId, { resource_type: resourceType, type: deliveryType });
      } catch (cloudErr) {
        console.error('Cloudinary delete error:', cloudErr.message);
        // Continue — we still remove the DB record so it disappears from the UI.
      }
    }

    await Report.deleteOne({ _id: report._id });

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
