const request = require('supertest');
const app = require('../app');
const { makePatient, makeDoctor, makeAppointment, bearer } = require('./helpers');

async function createRx(token, { appointmentId, patientId, doctorId }) {
  return request(app)
    .post('/api/prescriptions')
    .set(bearer(token))
    .send({
      appointment_id: appointmentId,
      patient_id: patientId,
      doctor_id: doctorId,
      patient_name: 'Pat One',
      patient_age: 34,
      patient_gender: 'male',
      diagnosis: 'Common cold',
      medicines: [{ medicine_name: 'Paracetamol', dosage: '500mg', duration: '3 days', notes: 'after food' }],
    });
}

describe('Prescription RBAC + ownership', () => {
  test('a patient cannot create a prescription (403, wrong role)', async () => {
    const patient = await makePatient();
    const doc = await makeDoctor();
    const appt = await makeAppointment(patient.doc._id, doc.doc._id);
    const res = await createRx(patient.token, {
      appointmentId: appt._id, patientId: patient.doc._id, doctorId: doc.doc._id,
    });
    expect(res.status).toBe(403);
  });

  test('a doctor cannot prescribe for a patient they have no appointment with (403)', async () => {
    const stranger = await makePatient();
    const doc = await makeDoctor();
    const res = await createRx(doc.token, {
      appointmentId: undefined, patientId: stranger.doc._id, doctorId: doc.doc._id,
    });
    expect(res.status).toBe(403);
  });

  test('a doctor can prescribe for their own patient, but not twice for one appointment (409)', async () => {
    const patient = await makePatient();
    const doc = await makeDoctor();
    const appt = await makeAppointment(patient.doc._id, doc.doc._id);

    const first = await createRx(doc.token, {
      appointmentId: appt._id, patientId: patient.doc._id, doctorId: doc.doc._id,
    });
    expect([200, 201]).toContain(first.status);

    const dup = await createRx(doc.token, {
      appointmentId: appt._id, patientId: patient.doc._id, doctorId: doc.doc._id,
    });
    expect(dup.status).toBe(409);
  });

  test('doctor_id is bound to the caller (cannot impersonate another doctor)', async () => {
    const patient = await makePatient();
    const realDoc = await makeDoctor();
    const otherDoc = await makeDoctor();
    const appt = await makeAppointment(patient.doc._id, realDoc.doc._id);

    const res = await createRx(realDoc.token, {
      appointmentId: appt._id, patientId: patient.doc._id, doctorId: otherDoc.doc._id, // attempt impersonation
    });
    expect([200, 201]).toContain(res.status);

    const Prescription = require('../models/Prescription');
    const rx = await Prescription.findOne({ appointment_id: appt._id });
    expect(String(rx.doctor_id)).toBe(String(realDoc.doc._id)); // forced to caller
  });

  test('an unrelated patient cannot read someone else’s prescription (403)', async () => {
    const patient = await makePatient();
    const other = await makePatient();
    const doc = await makeDoctor();
    const appt = await makeAppointment(patient.doc._id, doc.doc._id);
    await createRx(doc.token, { appointmentId: appt._id, patientId: patient.doc._id, doctorId: doc.doc._id });

    const Prescription = require('../models/Prescription');
    const rx = await Prescription.findOne({ appointment_id: appt._id });

    const asOther = await request(app).get(`/api/prescriptions/${rx._id}`).set(bearer(other.token));
    expect(asOther.status).toBe(403);

    const asOwner = await request(app).get(`/api/prescriptions/${rx._id}`).set(bearer(patient.token));
    expect(asOwner.status).toBe(200);
  });
});

describe('Secure file serving', () => {
  test('file access requires authentication (401)', async () => {
    const res = await request(app).get('/api/files/whatever.pdf');
    expect(res.status).toBe(401);
  });

  test('authenticated request for a missing file is 404, not a server crash', async () => {
    const { token } = await makePatient();
    const res = await request(app).get('/api/files/does-not-exist.pdf').set(bearer(token));
    expect([400, 404]).toContain(res.status);
  });
});
