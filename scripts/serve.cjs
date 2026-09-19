'use strict';
// Development/QA server only. This is not a production server or Cloudflare config.
const http = require('node:http');
const path = require('node:path');
const { files, guideFiles, readAllowedFile, root } = require('./build.cjs');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};

function createServer(base, allowedFiles = files) {
  const allowed = new Set(allowedFiles);
  return http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!allowed.has(file)) { res.writeHead(404); res.end(); return; }
      const body = readAllowedFile(base, file);
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      const status = error instanceof URIError ? 400 : 404;
      res.writeHead(status); res.end();
    }
  });
}

async function listen(server, port = 0) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  return `http://127.0.0.1:${server.address().port}`;
}
function close(server) {
  return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

if (require.main === module) {
  const dist = process.argv.includes('--dist');
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be 0–65535');
  const server = createServer(dist ? path.join(root, 'dist') : root, dist ? files : [...files, ...guideFiles]);
  listen(server, port).then(url => console.log(`${dist ? 'Built site' : 'Source + styleguide'} preview: ${url}`)).catch(error => {
    console.error(error.message); process.exitCode = 1;
  });
}
module.exports = { createServer, listen, close };
