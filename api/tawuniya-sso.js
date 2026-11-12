const unavailable = '/sign-in.html#sso-unavailable';

export default function startTawuniyaSignIn(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.writeHead(405).end();
    return;
  }

  // This endpoint delegates authentication to the configured Tawuniya gateway.
  // Request parameters cannot override the destination.
  let destination = unavailable;
  try {
    const gateway = new URL(process.env.TAWUNIYA_SSO_START_URL);
    if (gateway.protocol === 'https:' && !gateway.username && !gateway.password) {
      destination = gateway.href;
    }
  } catch {
    // The demo still provides a useful signed-out screen without a gateway.
  }
  const params = new URL(request.url, 'http://localhost').searchParams;
  if (params.get('availability') === '1') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      .end(JSON.stringify({ available: destination !== unavailable }));
    return;
  }
  response.writeHead(302, { Location: params.get('embedded') === '1' ? unavailable : destination }).end();
}
