import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const cookieName = 'synergy_demo';
const sessionSeconds = 8 * 60 * 60;
const maxFormBytes = 2048;
const passcodePattern = /^[0-9]{6}$/;
const publicFiles = new Set([
  '/demo.html',
  '/demo.css',
  '/public/tawuniya-logo.png',
  '/public/fonts/Tawuniya-Regular.woff2',
  '/public/fonts/Tawuniya-Bold.woff2'
]);

function redirect(location, cookie) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(null, { status: 303, headers });
}

function signature(expiry, passcode) {
  return createHmac('sha256', passcode).update('ai-synergy-demo:' + expiry).digest();
}

function validSession(cookieHeader, passcode) {
  const cookie = cookieHeader?.split(';').map(item => item.trim())
    .find(item => item.startsWith(cookieName + '='));
  const match = /^(\d{10,12})\.([A-Za-z0-9_-]{43})$/.exec(cookie?.slice(cookieName.length + 1) ?? '');
  if (!match || Number(match[1]) <= Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(signature(match[1], passcode), Buffer.from(match[2], 'base64url'));
}

async function readPasscode(request) {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded') || !request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxFormBytes) {
      await reader.cancel();
      return '';
    }
    body += decoder.decode(value, { stream: true });
  }
  return new URLSearchParams(body + decoder.decode()).get('passcode') ?? '';
}

function digest(value) {
  return createHash('sha256').update(value).digest();
}

// Returns a response when the gate handles the request, otherwise the app serves it.
export async function demoGate(request, { passcode = process.env.AI_SYNERGY_DEMO_PASSCODE, secure = true } = {}) {
  const { pathname } = new URL(request.url);
  const configured = typeof passcode === 'string' && passcodePattern.test(passcode);
  if (pathname === '/demo-access') {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
    }
    if (!configured) return redirect('/demo.html#passcode-unavailable');
    let entered;
    try {
      entered = await readPasscode(request);
    } catch {
      return redirect('/demo.html#passcode-error');
    }
    if (!passcodePattern.test(entered) || !timingSafeEqual(digest(entered), digest(passcode))) {
      return redirect('/demo.html#passcode-error');
    }

    const expiry = Math.floor(Date.now() / 1000) + sessionSeconds;
    const token = expiry + '.' + signature(expiry, passcode).toString('base64url');
    return redirect('/', cookieName + '=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + sessionSeconds + (secure ? '; Secure' : ''));
  }

  if (publicFiles.has(pathname)) return;
  if (configured && validSession(request.headers.get('cookie'), passcode)) return;
  return redirect('/demo.html');
}
