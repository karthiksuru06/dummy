const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const Patient = require('../models/Patient');
const Task = require('../models/Task');
const { requireRole } = require('../middleware/auth');
const { validateObjectIdParam } = require('../middleware/validate');

// ---- Ownership guards (router is authenticated in server.js) ----
async function loadPrescription(req, res, next) {
  try {
    const rx = await Prescription.findById(req.params.id);
    if (!rx) return res.status(404).json({ message: 'Prescription not found' });
    req.prescription = rx;
    next();
  } catch (err) { next(err); }
}
// The prescription's patient, its prescribing doctor, or an admin.
function rxParticipantOrAdmin(req, res, next) {
  if (req.user.role === 'admin') return next();
  const uid = req.user.id;
  if (String(req.prescription.patient_id) === uid || String(req.prescription.doctor_id) === uid) return next();
  return res.status(403).json({ message: 'Forbidden: not your prescription' });
}
// A patient may only read their own prescriptions by patientId (doctors/admins any).
function patientParamSelfOrStaff(req, res, next) {
  if (req.user.role === 'doctor' || req.user.role === 'admin') return next();
  if (req.user.id === String(req.params.patientId)) return next();
  return res.status(403).json({ message: 'Forbidden' });
}
// Participant on the underlying appointment, or staff.
async function apptParamParticipantOrAdmin(req, res, next) {
  try {
    if (req.user.role === 'admin') return next();
    const appt = await Appointment.findById(req.params.appointmentId);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (String(appt.patient_id) === req.user.id || String(appt.doctor_id) === req.user.id) return next();
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) { next(err); }
}

// Create a new prescription
router.post('/', requireRole('doctor', 'admin'), async (req, res) => {
  try {
    let {
      appointment_id,
      patient_id,
      doctor_id,
      patient_name,
      patient_age,
      patient_gender,
      diagnosis,
      medicines,
      tests_recommended,
      additional_advice
    } = req.body;

    // Identity binding: a doctor always prescribes as themselves (no
    // impersonation via a body doctor_id). Admins may pass an explicit one.
    if (req.user.role === 'doctor') {
      doctor_id = req.user.id;
    }

    // If patient_id is not provided, try to get it from the appointment
    let finalPatientId = patient_id;
    if (!finalPatientId && appointment_id) {
      const appointment = await Appointment.findById(appointment_id);
      if (appointment) {
        finalPatientId = appointment.patient_id;
      }
    }

    // Validate required fields
    if (!finalPatientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    if (!doctor_id) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }

    // A doctor may only prescribe for a patient they have a real appointment
    // with (prevents writing prescriptions for arbitrary patients).
    if (req.user.role === 'doctor') {
      const link = await Appointment.findOne({ doctor_id: req.user.id, patient_id: finalPatientId });
      if (!link) {
        return res.status(403).json({ success: false, message: 'No appointment with this patient' });
      }
    }

    const prescription = new Prescription({
      appointment_id,
      patient_id: finalPatientId,
      doctor_id,
      patient_name,
      patient_age,
      patient_gender,
      diagnosis,
      medicines,
      tests_recommended: tests_recommended || '',
      additional_advice: additional_advice || ''
    });

    await prescription.save();

    // Update appointment status to completed
    if (appointment_id) {
      await Appointment.findByIdAndUpdate(appointment_id, {
        status: 'completed'
      });

      // Mark related tasks as completed
      await Task.updateMany(
        {
          related_appointment_id: appointment_id,
          task_type: 'upcoming_appointment',
          status: 'pending'
        },
        { status: 'completed' }
      );
    }

    // Create notification for patient only
    const notification = new Notification({
      doctor_id,
      patient_id: finalPatientId,
      patient_name,
      prescription_id: prescription._id,
      appointment_id,
      message: `Your prescription is ready. Diagnosis: ${diagnosis}`,
      type: 'prescription',
      status: 'pending'
    });
    await notification.save();

    // Create alert notification for patient
    const alertNotification = new Notification({
      doctor_id,
      patient_id: finalPatientId,
      patient_name,
      prescription_id: prescription._id,
      appointment_id,
      message: `💊 New Prescription Available! Your doctor has added a prescription. Diagnosis: ${diagnosis}`,
      type: 'alert',
      status: 'pending'
    });
    await alertNotification.save();

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating prescription',
      error: error.message
    });
  }
});

// Get prescription by ID
router.get('/:id', validateObjectIdParam('id'), loadPrescription, rxParticipantOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id)
      .populate('patient_id', 'full_name last_name email phone')
      .populate('doctor_id', 'full_name last_name specialization clinic_name clinic_address');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      prescription
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

// Get prescriptions for a patient
router.get('/patient/:patientId', validateObjectIdParam('patientId'), patientParamSelfOrStaff, async (req, res) => {
  try {
    const { patientId } = req.params;

    const prescriptions = await Prescription.find({ patient_id: patientId })
      .populate('doctor_id', 'full_name last_name specialization')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      prescriptions
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

// Get prescriptions for an appointment
router.get('/appointment/:appointmentId', validateObjectIdParam('appointmentId'), apptParamParticipantOrAdmin, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const prescription = await Prescription.findOne({ appointment_id: appointmentId })
      .populate('patient_id', 'full_name last_name email phone')
      .populate('doctor_id', 'full_name last_name specialization clinic_name clinic_address');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'No prescription found for this appointment'
      });
    }

    res.json({
      success: true,
      prescription
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

// Download prescription as a PDF document
router.get('/:id/download', validateObjectIdParam('id'), loadPrescription, rxParticipantOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id)
      .populate('patient_id', 'full_name last_name email phone blood_group')
      .populate('doctor_id', 'full_name last_name specialization clinic_name clinic_address phone');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    const doctorName = prescription.doctor_id
      ? `Dr. ${prescription.doctor_id.full_name} ${prescription.doctor_id.last_name}`
      : 'Unknown Doctor';
    const specialization = prescription.doctor_id?.specialization || 'N/A';
    const clinicName = prescription.doctor_id?.clinic_name || '';
    const clinicAddress = prescription.doctor_id?.clinic_address || '';

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescription._id}.pdf"`);
    doc.pipe(res);

    // Clinic header
    doc.fillColor('#1a73e8').fontSize(26).font('Helvetica-Bold').text('MEDviz', { align: 'center' });
    doc.fillColor('#000000').fontSize(10).font('Helvetica')
      .text('MEDviz Telemedicine', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a73e8').stroke();
    doc.moveDown(1);

    // Meta: prescription id + date
    const dateStr = new Date(prescription.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.fontSize(10).fillColor('#000000');
    doc.font('Helvetica-Bold').text('Prescription ID: ', { continued: true })
      .font('Helvetica').text(String(prescription._id));
    doc.font('Helvetica-Bold').text('Date: ', { continued: true })
      .font('Helvetica').text(dateStr);
    doc.moveDown(1);

    // Doctor block
    doc.font('Helvetica-Bold').fontSize(12).text(doctorName);
    doc.font('Helvetica').fontSize(10).text(specialization);
    if (clinicName) doc.text(clinicName);
    if (clinicAddress) doc.text(clinicAddress);
    doc.moveDown(1);

    // Patient block
    doc.font('Helvetica-Bold').fontSize(11).text('Patient');
    doc.font('Helvetica').fontSize(10);
    doc.text(`Name: ${prescription.patient_name || 'N/A'}`);
    doc.text(`Age: ${prescription.patient_age != null ? prescription.patient_age : 'N/A'}    Gender: ${prescription.patient_gender || 'N/A'}`);
    doc.moveDown(1);

    // Diagnosis
    doc.font('Helvetica-Bold').fontSize(11).text('Diagnosis');
    doc.font('Helvetica').fontSize(10).text(prescription.diagnosis || 'N/A');
    doc.moveDown(1);

    // Medicines table
    doc.font('Helvetica-Bold').fontSize(11).text('Medicines');
    doc.moveDown(0.3);
    const tableTop = doc.y;
    const cols = [50, 220, 320, 410]; // Medicine, Dosage, Duration, Notes
    const colWidths = [165, 95, 85, 135];
    const headers = ['Medicine', 'Dosage', 'Duration', 'Notes'];

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    doc.rect(50, tableTop, 495, 18).fill('#1a73e8');
    doc.fillColor('#ffffff');
    headers.forEach((h, i) => doc.text(h, cols[i] + 3, tableTop + 5, { width: colWidths[i] - 6 }));

    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    let rowY = tableTop + 18;
    const medicines = Array.isArray(prescription.medicines) ? prescription.medicines : [];
    if (medicines.length === 0) {
      doc.text('No medicines prescribed', cols[0] + 3, rowY + 5);
      rowY += 20;
    } else {
      medicines.forEach((m) => {
        const cells = [m.medicine_name || '', m.dosage || '', m.duration || '', m.notes || ''];
        const heights = cells.map((c, i) => doc.heightOfString(String(c), { width: colWidths[i] - 6 }));
        const rowH = Math.max(16, ...heights) + 6;
        if (rowY + rowH > doc.page.height - 80) {
          doc.addPage();
          rowY = 50;
        }
        cells.forEach((c, i) => doc.text(String(c), cols[i] + 3, rowY + 3, { width: colWidths[i] - 6 }));
        doc.rect(50, rowY, 495, rowH).strokeColor('#cccccc').stroke();
        rowY += rowH;
      });
    }
    doc.y = rowY;
    doc.moveDown(1.5);

    // Tests recommended
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Tests Recommended');
    doc.font('Helvetica').fontSize(10).text(prescription.tests_recommended || 'None');
    doc.moveDown(1);

    // Additional advice
    doc.font('Helvetica-Bold').fontSize(11).text('Additional Advice');
    doc.font('Helvetica').fontSize(10).text(prescription.additional_advice || 'None');
    doc.moveDown(3);

    // Signature line
    const sigY = doc.y;
    doc.moveTo(360, sigY).lineTo(545, sigY).strokeColor('#000000').stroke();
    doc.font('Helvetica').fontSize(10).text(doctorName, 360, sigY + 5, { width: 185, align: 'center' });
    doc.fontSize(8).fillColor('#666666').text('Signature', 360, sigY + 20, { width: 185, align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error downloading prescription:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error downloading prescription',
        error: error.message
      });
    } else {
      res.end();
    }
  }
});

module.exports = router;
