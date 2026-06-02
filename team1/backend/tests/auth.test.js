const crypto = require('crypto');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const RefreshToken = require('../models/RefreshToken');
const { makePatient } = require('./helpers');

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

// Seeds a refresh-token row directly (like a prior login) and returns the raw token.
// Avoids extra HTTP calls so we stay under the /api/auth rate limit (10/window/file).
async function seedRefreshToken(userId, role = 'patient') {
  const token = crypto.randomBytes(40).toString('hex');
  await RefreshToken.create({
    user_id: userId,
    role,
    token_hash: hash(token),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return token;
}

describe('Refresh-token auth', () => {
  test('login returns both an access token and a refresh token', async () => {
    const password = 'secret-pw';
    const { doc } = await makePatient({ password: await bcrypt.hash(password, 10) });
    const res = await request(app)
      .post('/api/auth/patients/login')
      .send({ email: doc.email, password });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken.length).toBeGreaterThan(0);
    // The refresh token is persisted only as a sha256 hash.
    const stored = await RefreshToken.findOne({ token_hash: hash(res.body.refreshToken) });
    expect(stored).not.toBeNull();
    expect(stored.revoked).toBe(false);
  });

  test('/refresh with a valid refresh token returns a new access token (rotated)', async () => {
    const { doc } = await makePatient();
    const refreshToken = await seedRefreshToken(doc._id);

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  test('/refresh with a garbage token returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  test('rotation revokes the old refresh token (reuse fails)', async () => {
    const { doc } = await makePatient();
    const oldRefresh = await seedRefreshToken(doc._id);

    const first = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh });
    expect(first.status).toBe(200);

    // Reusing the rotated-out token must fail.
    const second = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh });
    expect(second.status).toBe(401);

    // The freshly issued one still works.
    const third = await request(app).post('/api/auth/refresh').send({ refreshToken: first.body.refreshToken });
    expect(third.status).toBe(200);
  });

  test('/logout revokes the refresh token and is idempotent', async () => {
    const { doc } = await makePatient();
    const refreshToken = await seedRefreshToken(doc._id);

    const out = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(out.status).toBe(200);

    // Token no longer usable after logout.
    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(401);

    // Logging out again (idempotent) still returns 200.
    const again = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(again.status).toBe(200);
  });
});
