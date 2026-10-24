const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
process.env.JWT_SECRET = 'audit-test-secret-only-not-for-production';
process.env.COLLEGE_EMAIL_DOMAIN = '@sru.edu.in';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_EMAIL = 'admin@sru.edu.in';
process.env.CORS_ORIGINS = 'https://campus.example';
const Item = require('../models/Item');
const User = require('../models/User');
const mailer = require('../utils/mailer');
let delivered;
mailer.sendOtpEmail = async (email, otp) => { delivered = otp; };
const auth = require('../controllers/authController');
const { hashOtp } = require('../utils/otp');
const { findMatchesForUserItems } = require('../utils/matchService');
const app = require('../server');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

function fakeUserStore(initial = {}) {
  let user = { _id: 'test-user', email: 'student@sru.edu.in', otpAttempts: 0, ...initial };
  User.updateOne = async (query, update) => {
    if (query.otpHash !== undefined && query.otpHash !== user.otpHash) return { modifiedCount: 0 };
    if (query.otpExpiresAt && !(user.otpExpiresAt > query.otpExpiresAt.$gt)) return { modifiedCount: 0 };
    Object.assign(user, update.$set || {});
    return { modifiedCount: 1 };
  };
  User.findOneAndUpdate = async (query, update) => {
    if (query.otpHash && (!user.otpHash || !(user.otpExpiresAt > query.otpExpiresAt.$gt) || user.otpAttempts >= 5)) return null;
    if (!query.otpHash && user.otpLastSentAt && user.otpLastSentAt > query.$or[1].otpLastSentAt.$lte) return null;
    Object.assign(user, update.$set || {});
    if (update.$inc) user.otpAttempts += update.$inc.otpAttempts;
    return { ...user };
  };
  return () => user;
}

test('strict college email validation rejects address lists and misleading domains', () => {
  assert.equal(auth.normalizeEmail(' STUDENT@sru.edu.in '), 'student@sru.edu.in');
  for (const value of ['a@evil.test@sru.edu.in', 'a@evil.test (a@sru.edu.in)', 'a@sru.edu.in.evil.test', 'a@sru.edu.in,b@sru.edu.in', {}, null]) {
    assert.equal(auth.normalizeEmail(value), null);
  }
});

test('OTP send reserves cooldown atomically and emits six digits', async () => {
  fakeUserStore();
  const results = await Promise.all([response(), response()].map(async res => {
    await auth.sendOtp({ body: { email: 'student@sru.edu.in' } }, res); return res.code;
  }));
  assert.deepEqual(results.sort(), [200, 429]);
  assert.match(delivered, /^\d{6}$/);
});

test('OTP locks after five failed attempts', async () => {
  const state = fakeUserStore({ otpHash: await hashOtp('123456'), otpExpiresAt: new Date(Date.now() + 60000) });
  for (let i = 0; i < 5; i++) {
    const res = response(); await auth.verifyOtp({ body: { email: 'student@sru.edu.in', otp: '999999' } }, res);
    assert.equal(res.code, 400);
  }
  const res = response(); await auth.verifyOtp({ body: { email: 'student@sru.edu.in', otp: '123456' } }, res);
  assert.equal(res.code, 400); assert.equal(state().otpAttempts, 5);
});

test('OTP concurrent verification allows exactly one token and rejects replay', async () => {
  fakeUserStore({ otpHash: await hashOtp('123456'), otpExpiresAt: new Date(Date.now() + 60000) });
  const results = await Promise.all([response(), response()].map(async res => {
    await auth.verifyOtp({ body: { email: 'student@sru.edu.in', otp: '123456' } }, res); return res;
  }));
  assert.deepEqual(results.map(r => r.code).sort(), [200, 400]);
  assert.ok(results.find(r => r.code === 200).body.token);
  const replay = response(); await auth.verifyOtp({ body: { email: 'student@sru.edu.in', otp: '123456' } }, replay);
  assert.equal(replay.code, 400);
});

test('expired OTP cannot authenticate', async () => {
  fakeUserStore({ otpHash: await hashOtp('123456'), otpExpiresAt: new Date(0) });
  const res = response(); await auth.verifyOtp({ body: { email: 'student@sru.edu.in', otp: '123456' } }, res);
  assert.equal(res.code, 400);
});

test('HTTP public responses redact contact data; owner/admin endpoints stay protected; static hosting and CORS work', async () => {
  const item = { _id: '012345678901234567890123', type: 'found', itemName: 'Bag', description: 'Blue', reporterEmail: 'private@sru.edu.in', contactNumber: 'PRIVATE', internalNote: 'PRIVATE' };
  Item.find = () => ({ select() { return this; }, sort: async () => [item] });
  Item.findById = () => ({ select: async () => item });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/api/items/search', `/api/items/${item._id}`]) {
      const res = await fetch(base + route); assert.equal(res.status, 200);
      const text = await res.text(); assert.ok(!text.includes('PRIVATE')); assert.ok(!text.includes('private@sru'));
    }
    assert.equal((await fetch(base + '/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    for (const route of ['/api/items', '/api/items/mine', '/api/items/matches', '/api/items/dashboard-stats']) {
      assert.equal((await fetch(base + route)).status, 401);
    }
    const jwt = require('jsonwebtoken');
    const studentToken = jwt.sign({ email: 'student@sru.edu.in' }, process.env.JWT_SECRET);
    const adminToken = jwt.sign({ email: 'admin@sru.edu.in' }, process.env.JWT_SECRET);
    assert.equal((await fetch(base + '/api/items', { headers: { Authorization: `Bearer ${studentToken}` } })).status, 403);
    const admin = await fetch(base + '/api/items', { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(admin.status, 200); assert.match(await admin.text(), /PRIVATE/);
    const own = await fetch(base + '/api/items/mine', { headers: { Authorization: `Bearer ${studentToken}` } });
    assert.equal(own.status, 200); assert.match(await own.text(), /PRIVATE/);
    const home = await fetch(base); assert.match(await home.text(), /FindIt@Campus/);
    assert.equal((await fetch(base + '/config.js')).status, 200);
    const cors = await fetch(base + '/api/health', { headers: { Origin: 'https://campus.example' } });
    assert.equal(cors.headers.get('access-control-allow-origin'), 'https://campus.example');
    const denied = await fetch(base + '/api/health', { headers: { Origin: 'https://other.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    for (let i = 0; i < 10; i++) await fetch(base + '/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal((await fetch(base + '/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 429);
    for (let i = 0; i < 30; i++) await fetch(base + '/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal((await fetch(base + '/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 429);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('smart matches do not disclose another reporter contact details', () => {
  const common = { itemName: 'Bag', category: 'Bag', description: 'Blue', location: 'Library' };
  const matches = findMatchesForUserItems([{ ...common, type: 'lost', reporterEmail: 'owner@sru.edu.in' }], [{ ...common, type: 'found', reporterEmail: 'private@sru.edu.in', contactNumber: 'PRIVATE' }]);
  assert.equal(matches.length, 1); assert.equal(matches[0].matchedItem.reporterEmail, undefined); assert.equal(matches[0].matchedItem.contactNumber, undefined);
});

test('all three item views safely handle apostrophes and markup and open details', async () => {
  const { JSDOM } = require('jsdom');
  const root = path.join(__dirname, '../../findit-campus-frontend');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const hostile = { itemName: `Student's <img src=x onerror="alert(1)"> bag`, description: `' data-audit-marker='injected`, type: 'lost', category: 'Bag' };
  for (const page of ['search.html', 'my-reports.html', 'dashboard.html']) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, page), 'utf8'), { url: 'http://campus.test', runScripts: 'outside-only' });
    const w = dom.window;
    // Avoid initialization racing the explicit render under test.
    await new Promise(resolve => w.addEventListener('load', resolve));
    w.localStorage.setItem('token', 'fixture'); w.localStorage.setItem('userEmail', 'student@sru.edu.in');
    w.fetch = async () => ({ ok: true, json: async () => ({ items: [hostile], topMatches: [{ myItem: hostile, matchedItem: hostile, reasons: [], matchScore: 80 }] }) });
    w.eval(script);
    if (page === 'search.html') w.displaySearchResults([hostile]);
    if (page === 'my-reports.html') await w.loadMyReports();
    if (page === 'dashboard.html') await w.loadDashboardData();
    assert.equal(w.document.querySelector('[data-audit-marker]'), null);
    assert.equal(w.document.querySelector('img'), null);
    const button = w.document.querySelector('[data-item-details]'); assert.ok(button); assert.equal(button.getAttribute('onclick'), null);
    button.click(); assert.equal(w.document.getElementById('itemModal').style.display, 'flex');
    assert.equal(w.document.querySelector('#modalContent h2').textContent, hostile.itemName);
    dom.window.close();
  }
});
