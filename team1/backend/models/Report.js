const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  // Cloudinary public_id, stored so the asset can be deleted from Cloudinary
  // later. Optional for backward compatibility with legacy disk-stored reports.
  cloudinaryPublicId: {
    type: String
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: String,
    required: true
  },
  reportType: {
    type: String,
    default: 'Medical Report'
  },
  description: {
    type: String,
    default: 'Patient uploaded report'
  },
  uploadedDate: {
    type: Date,
    default: Date.now
  }
});

reportSchema.index({ patient_id: 1 });

module.exports = mongoose.model('Report', reportSchema);