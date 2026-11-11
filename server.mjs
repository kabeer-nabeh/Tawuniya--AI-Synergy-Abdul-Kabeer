import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
    if (!path.startsWith(root + sep) || !['/index.html', '/src/app.js', '/src/project-hold.js', '/src/project-hold-ui.js', '/src/artifact-review.js', '/src/document-validator.js', '/src/document-upload.js', '/src/demo-access.js', '/src/foundation-views.js', '/src/platform-shell.js', '/src/assistance-chat.js', '/src/forecast-model.js', '/src/forecast-data.js', '/src/forecast-view.js', '/src/forecast-insights.js', '/src/quality-rules.js', '/src/quality-data.js', '/src/quality-engine.js', '/src/quality-view.js', '/src/styles.css'].includes(pathname === '/' ? '/index.html' : pathname) && !pathname.startsWith('/public/')) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Synergy Assistant is running at http://localhost:${port}`));
