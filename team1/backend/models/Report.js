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

module.exports = mongoose.model('Report', reportSchema);