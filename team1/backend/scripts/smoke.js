/* Boots the REAL app against an ephemeral MongoDB and exercises it over real
   HTTP — a live smoke test that the project actually runs and serves. */
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'smoke-test-secret-smoke-test-secret-0123456789';

const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

function req(port, method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      { host: '127.0.0.1', port, method, path,
        headers: { 'Content-Type': 'application/json', ...(data && { 'Content-Length': Buffer.byteLength(data) }), ...(token && { Authorization: `Bearer ${token}` }) } },
      (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ status: res.statusCode, body: b })); }
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name}  ${detail || ''}`); fail++; }
}

(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const app = require('../app');
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = server.address().port;
  console.log(`\nMEDviz booted on port ${port} (ephemeral Mongo). Probing...\n`);

  // 1. Liveness / readiness
  const h = await req(port, 'GET', '/healthz');
  check('GET /healthz -> 200 ok', h.status === 200 && /"status":"ok"/.test(h.body), `got ${h.status}`);
  const ready = await req(port, 'GET', '/readyz');
  check('GET /readyz -> 200 (db connected)', ready.status === 200 && /"db":true/.test(ready.body), `got ${ready.status} ${ready.body}`);

  // 2. Auth boundary
  const noAuth = await req(port, 'GET', '/api/appointments/whatever');
  check('protected route without token -> 401', noAuth.status === 401, `got ${noAuth.status}`);

  // 3. Seed real records + a real signed token, then an authenticated, owned read
  const patient = await Patient.create({ full_name: 'Smoke', last_name: 'Test', email: `smoke${Date.now()}@t.local`, phone: '5550001111', password: await bcrypt.hash('pw', 10), dob: new Date('1990-01-01'), gender: 'male', address: '1 St', emergency_contact: '5552223333', blood_group: 'O+' });
  const doctor = await Doctor.create({ full_name: 'Dr', last_name: 'Smoke', email: `docsmoke${Date.now()}@t.local`, phone: '5559990000', password: await bcrypt.hash('pw', 10), dob: new Date('1980-01-01'), gender: 'female', address: '2 Ave', status: 'approved' });
  const appt = await Appointment.create({ patient_id: patient._id, doctor_id: doctor._id, patient_name: 'Smoke Test', service_type: 'Video Consultation', appointment_date: new Date(Date.now() + 86400000), appointment_time: '10:00 AM', status: 'pending' });
  const token = jwt.sign({ id: String(patient._id), role: 'patient' }, process.env.JWT_SECRET);

  const owned = await req(port, 'GET', `/api/appointments/${appt._id}`, { token });
  check('authenticated owner reads own appointment -> 200', owned.status === 200, `got ${owned.status}`);

  // 4. IDOR: a different patient cannot read it
  const otherToken = jwt.sign({ id: String(new mongoose.Types.ObjectId()), role: 'patient' }, process.env.JWT_SECRET);
  const idor = await req(port, 'GET', `/api/appointments/${appt._id}`, { token: otherToken });
  check('different patient blocked from that appointment -> 403', idor.status === 403, `got ${idor.status}`);

  // 5. Public doctor browse works
  const browse = await req(port, 'GET', '/api/doctors/available', { token });
  check('GET /api/doctors/available -> 200 (returns array)', browse.status === 200 && browse.body.trim().startsWith('['), `got ${browse.status}`);

  console.log(`\nResult: ${pass} passed, ${fail} failed\n`);
  await mongoose.disconnect();
  await mongo.stop();
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('SMOKE BOOT FAILED:', e); process.exit(1); });
