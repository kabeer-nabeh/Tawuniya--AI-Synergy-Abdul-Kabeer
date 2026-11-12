import assert from 'node:assert/strict';
import test from 'node:test';
import { demoGate } from '../server/demo-gate.js';

const origin = 'https://synergy.example.test';
const passcode = '024681';
const request = (path, options) => new Request(origin + path, options);
const submit = value => request('/demo-access', {
  method: 'POST',
  body: new URLSearchParams({ passcode: value })
});

test('overview assets stay public and direct workspace or module access requires a session', async () => {
  for (const path of ['/demo.html', '/demo.css', '/public/tawuniya-logo.png']) {
    assert.equal(await demoGate(request(path), { passcode }), undefined);
  }
  for (const path of ['/', '/index.html?embed=synergy', '/sign-in.html', '/src/app.js', '/api/tawuniya-sso']) {
    const response = await demoGate(request(path), { passcode });
    assert.equal(response.headers.get('location'), '/demo.html');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('the correct passcode unlocks the app, while modified and rotated sessions fail', async () => {
  const wrong = await demoGate(submit('024682'), { passcode });
  assert.equal(wrong.headers.get('location'), '/demo.html#passcode-error');
  assert.equal(wrong.headers.get('set-cookie'), null);
  const success = await demoGate(submit(passcode), { passcode });
  assert.equal(success.headers.get('location'), '/');
  const cookie = success.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=28800; Secure/);
  const session = cookie.split(';', 1)[0];
  const unlocked = request('/sign-in.html', { headers: { cookie: session } });
  assert.equal(await demoGate(unlocked, { passcode }), undefined);
  const changed = session.replace(/=\d+\./, '=9999999999.');
  assert.equal((await demoGate(request('/', { headers: { cookie: changed } }), { passcode })).headers.get('location'), '/demo.html');
  assert.equal((await demoGate(unlocked, { passcode: '135790' })).headers.get('location'), '/demo.html');
});

test('an unconfigured deployment remains locked and requests must use the passcode form', async () => {
  assert.equal((await demoGate(request('/'), { passcode: '' })).headers.get('location'), '/demo.html');
  assert.equal((await demoGate(submit(passcode), { passcode: '' })).headers.get('location'), '/demo.html#passcode-unavailable');
  assert.equal((await demoGate(request('/demo-access?passcode=' + passcode), { passcode })).status, 405);
});

test('the passcode must contain exactly six digits', async () => {
  for (const invalid of ['24681', '0246810', '02468a', '024681\n', ' 024681']) {
    assert.equal((await demoGate(submit(invalid), { passcode })).headers.get('location'), '/demo.html#passcode-error');
    assert.equal((await demoGate(submit(invalid), { passcode: invalid })).headers.get('location'), '/demo.html#passcode-unavailable');
  }
});
