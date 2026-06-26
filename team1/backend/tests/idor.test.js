const request = require('supertest');
const app = require('../app');
const { makePatient, makeDoctor, bearer } = require('./helpers');

// IDOR / broken-access-control regression tests.
//
// These lock in fixes for previously-exploitable holes: a caller must never be
// able to read or mutate another owner's resource by swapping the id in the URL.
// Each cross-owner request must NOT succeed (no data leak); the owner's own
// request still works. Tokens are minted exactly the way the app does
// (jwt.sign({ id, role }, JWT_SECRET) via the shared `sign` helper).

describe('IDOR / authorization regression', () => {
  // ---- /api/patient/:patientId (doctor-dashboard patient views) ----
  describe('GET /api/patient/:patientId', () => {
    test('patient A cannot read patient B (403)', async () => {
      const a = await makePatient();
      const b = await makePatient();
      const res = await request(app)
        .get(`/api/patient/${b.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(403);
    });

    test('patient A can read their own record (200)', async () => {
      const a = await makePatient();
      const res = await request(app)
        .get(`/api/patient/${a.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET/PUT /api/patient/:patientId/profile', () => {
    test('cross-patient GET profile is forbidden (403)', async () => {
      const a = await makePatient();
      const b = await makePatient();
      const res = await request(app)
        .get(`/api/patient/${b.doc._id}/profile`)
        .set(bearer(a.token));
      expect(res.status).toBe(403);
    });

    test('own GET profile succeeds (200)', async () => {
      const a = await makePatient();
      const res = await request(app)
        .get(`/api/patient/${a.doc._id}/profile`)
        .set(bearer(a.token));
      expect(res.status).toBe(200);
    });

    test('cross-patient PUT profile is forbidden and does not mutate (403)', async () => {
      const a = await makePatient();
      const b = await makePatient();
      const res = await request(app)
        .put(`/api/patient/${b.doc._id}/profile`)
        .set(bearer(a.token))
        .send({ phone: '9998887777' });
      expect(res.status).toBe(403);

      const Patient = require('../models/Patient');
      const fresh = await Patient.findById(b.doc._id);
      expect(fresh.phone).not.toBe('9998887777'); // B's data untouched
    });
  });

  // ---- /api/notifications/patient/:patientId ----
  describe('GET /api/notifications/patient/:patientId', () => {
    test('patient cannot read another patient inbox (403)', async () => {
      const a = await makePatient();
      const b = await makePatient();
      const res = await request(app)
        .get(`/api/notifications/patient/${b.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(403);
    });

    test('a doctor cannot read a patient inbox — admin-only (403)', async () => {
      const patient = await makePatient();
      const doctor = await makeDoctor();
      const res = await request(app)
        .get(`/api/notifications/patient/${patient.doc._id}`)
        .set(bearer(doctor.token));
      expect(res.status).toBe(403);
    });

    test('patient can read their own inbox (200)', async () => {
      const patient = await makePatient();
      const res = await request(app)
        .get(`/api/notifications/patient/${patient.doc._id}`)
        .set(bearer(patient.token));
      expect(res.status).toBe(200);
    });
  });

  // ---- /api/notifications/doctor/:doctorId ----
  describe('GET /api/notifications/doctor/:doctorId', () => {
    test('a doctor cannot read another doctor inbox (403)', async () => {
      const a = await makeDoctor();
      const b = await makeDoctor();
      const res = await request(app)
        .get(`/api/notifications/doctor/${b.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(403);
    });

    test('a doctor can read their own inbox (200)', async () => {
      const a = await makeDoctor();
      const res = await request(app)
        .get(`/api/notifications/doctor/${a.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(200);
    });
  });

  // ---- POST /api/notifications (create) ----
  describe('POST /api/notifications', () => {
    test('a patient cannot create a notification — staff only (403)', async () => {
      const patient = await makePatient();
      const res = await request(app)
        .post('/api/notifications')
        .set(bearer(patient.token))
        .send({ message: 'hi', receiver_type: 'Patient', receiver_id: patient.doc._id });
      expect(res.status).toBe(403);
    });
  });

  // ---- /api/doctor-settings/:doctorId ----
  describe('/api/doctor-settings/:doctorId', () => {
    test('doctor A cannot read doctor B settings (403)', async () => {
      const a = await makeDoctor();
      const b = await makeDoctor();
      const res = await request(app)
        .get(`/api/doctor-settings/${b.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(403);
    });

    test('doctor can read their own settings (200)', async () => {
      const a = await makeDoctor();
      const res = await request(app)
        .get(`/api/doctor-settings/${a.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(200);
    });

    test('a patient cannot reach doctor-settings at all — wrong role (403)', async () => {
      const patient = await makePatient();
      const doctor = await makeDoctor();
      const res = await request(app)
        .get(`/api/doctor-settings/${doctor.doc._id}`)
        .set(bearer(patient.token));
      expect(res.status).toBe(403);
    });

    test('doctor A cannot change doctor B password (403)', async () => {
      const a = await makeDoctor();
      const b = await makeDoctor();
      const res = await request(app)
        .post(`/api/doctor-settings/${b.doc._id}/change-password`)
        .set(bearer(a.token))
        .send({ current_password: 'pw', new_password: 'newpass123' });
      expect(res.status).toBe(403);
    });
  });

  // ---- /api/tasks ----
  describe('/api/tasks ownership', () => {
    test('doctor A cannot list doctor B tasks (403)', async () => {
      const a = await makeDoctor();
      const b = await makeDoctor();
      const res = await request(app)
        .get(`/api/tasks/doctor/${b.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(403);
    });

    test('patient A cannot list patient B tasks (403)', async () => {
      const a = await makePatient();
      const b = await makePatient();
      const res = await request(app)
        .get(`/api/tasks/patient/${b.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(403);
    });

    test('doctor can list their own tasks (200)', async () => {
      const a = await makeDoctor();
      const res = await request(app)
        .get(`/api/tasks/doctor/${a.doc._id}`)
        .set(bearer(a.token));
      expect(res.status).toBe(200);
    });
  });

  // ---- GET /api/doctors/:id/profile now requires authentication ----
  describe('GET /api/doctors/:id/profile', () => {
    test('no token is rejected (401)', async () => {
      const doctor = await makeDoctor();
      const res = await request(app).get(`/api/doctors/${doctor.doc._id}/profile`);
      expect(res.status).toBe(401);
    });
  });
});
