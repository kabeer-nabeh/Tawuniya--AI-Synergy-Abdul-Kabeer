import http from 'node:http';
import { Readable } from 'node:stream';
import { demoGate } from './server/demo-gate.js';
import startTawuniyaSignIn from './api/tawuniya-sso.js';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (process.env.AI_SYNERGY_DEMO_PASSCODE !== undefined || pathname === '/demo-access') {
      const body = req.method === 'POST' ? { body: Readable.toWeb(req), duplex: 'half' } : {};
      const result = await demoGate(new Request(url, { method: req.method, headers: req.headers, ...body }), { secure: false });
      if (result) {
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end();
        return;
      }
    }
    if (pathname === '/api/tawuniya-sso') {
      startTawuniyaSignIn(req, res);
      return;
    }
    const path = resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
    if (!path.startsWith(root + sep) || !['/index.html', '/demo.html', '/demo.css', '/sign-in.html', '/src/sign-in.js', '/src/app.js', '/src/project-hold.js', '/src/project-hold-ui.js', '/src/artifact-review.js', '/src/document-validator.js', '/src/document-upload.js', '/src/demo-access.js', '/src/foundation-views.js', '/src/platform-shell.js', '/src/assistance-chat.js', '/src/forecast-model.js', '/src/forecast-data.js', '/src/forecast-view.js', '/src/document-create.js', '/src/document-create-view.js', '/src/forecast-insights.js', '/src/quality-rules.js', '/src/quality-data.js', '/src/quality-engine.js', '/src/quality-view.js', '/src/styles.css'].includes(pathname === '/' ? '/index.html' : pathname) && !pathname.startsWith('/public/')) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Synergy Assistant is running at http://localhost:${port}`));
