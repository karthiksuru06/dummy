const request = require('supertest');
const app = require('../app');
const { makePatient, makeDoctor, makeAdmin, makeAppointment, bearer } = require('./helpers');

describe('Authentication boundary', () => {
  test('protected route rejects no token (401)', async () => {
    const res = await request(app).get('/api/appointments/anything');
    expect(res.status).toBe(401);
  });

  test('protected route rejects garbage token (401)', async () => {
    const res = await request(app).get('/api/appointments/anything').set({ Authorization: 'Bearer not.a.jwt' });
    expect(res.status).toBe(401);
  });

  test('invalid ObjectId param returns 400, not 500', async () => {
    const { token } = await makePatient();
    const res = await request(app).get('/api/appointments/not-an-objectid').set(bearer(token));
    expect(res.status).toBe(400);
  });
});

describe('RBAC at the router boundary', () => {
  test('patient cannot reach admin API (403)', async () => {
    const { token } = await makePatient();
    const res = await request(app).get('/api/admin/metrics').set(bearer(token));
    expect(res.status).toBe(403);
  });

  test('admin can reach admin API (not 401/403)', async () => {
    const { token } = await makeAdmin();
    const res = await request(app).get('/api/admin/metrics').set(bearer(token));
    expect([200, 404, 500]).toContain(res.status); // reachable; handler may vary
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe('IDOR / ownership', () => {
  test('patient B cannot read patient A’s appointment (403)', async () => {
    const a = await makePatient();
    const b = await makePatient();
    const doc = await makeDoctor();
    const appt = await makeAppointment(a.doc._id, doc.doc._id);

    const asB = await request(app).get(`/api/appointments/${appt._id}`).set(bearer(b.token));
    expect(asB.status).toBe(403);

    const asA = await request(app).get(`/api/appointments/${appt._id}`).set(bearer(a.token));
    expect(asA.status).toBe(200);
  });

  test('a non-owner doctor cannot approve another doctor’s appointment (403)', async () => {
    const patient = await makePatient();
    const ownerDoc = await makeDoctor();
    const otherDoc = await makeDoctor();
    const appt = await makeAppointment(patient.doc._id, ownerDoc.doc._id);

    const res = await request(app).post(`/api/appointments/${appt._id}/approve`).set(bearer(otherDoc.token)).send({});
    expect(res.status).toBe(403);
  });

  test('a patient cannot approve an appointment (403, wrong role)', async () => {
    const patient = await makePatient();
    const doc = await makeDoctor();
    const appt = await makeAppointment(patient.doc._id, doc.doc._id);
    const res = await request(app).post(`/api/appointments/${appt._id}/approve`).set(bearer(patient.token)).send({});
    expect(res.status).toBe(403);
  });
});

describe('Identity binding on create (anti-impersonation)', () => {
  test('patient booking with someone else’s patient_id is forced to self', async () => {
    const me = await makePatient();
    const victim = await makePatient();
    const doc = await makeDoctor();

    const res = await request(app)
      .post('/api/appointments')
      .set(bearer(me.token))
      .send({
        patient_id: victim.doc._id.toString(), // attempt to impersonate
        doctor_id: doc.doc._id.toString(),
        patient_name: 'Victim',
        service_type: 'Video Consultation',
        appointment_date: new Date(Date.now() + 86400000).toISOString(),
        appointment_time: '11:00 AM',
      });

    expect([200, 201]).toContain(res.status);
    const Appointment = require('../models/Appointment');
    const created = await Appointment.findOne({ doctor_id: doc.doc._id });
    expect(String(created.patient_id)).toBe(String(me.doc._id)); // forced to caller
  });
});

describe('Admin registration lockdown', () => {
  test('admin register without bootstrap secret is rejected (403)', async () => {
    const res = await request(app)
      .post('/api/auth/admin/register')
      .send({ email: 'x@x.com', password: 'password123', full_name: 'X' });
    expect(res.status).toBe(403);
  });

  test('admin register WITH bootstrap secret succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/admin/register')
      .set({ 'x-admin-bootstrap': process.env.ADMIN_REGISTRATION_SECRET })
      .send({ email: 'admin@medviz.test', password: 'password123', full_name: 'Root Admin' });
    expect([200, 201]).toContain(res.status);
  });
});
