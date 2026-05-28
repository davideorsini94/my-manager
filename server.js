// Tiny zero-dependency Node server for MyManager.
// Serves static files and persists app state to data/state.json with rotating backups.

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PORT = Number(process.env.PORT) || 4321;
const MAX_BACKUPS = 30;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.map': 'application/json',
};

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUPS_DIR, { recursive: true });

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return raw || '{}';
  } catch (e) {
    if (e.code === 'ENOENT') return '{}';
    throw e;
  }
}

function writeState(json) {
  // Validate JSON before writing.
  JSON.parse(json);
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, STATE_FILE);
  rotateBackup(json);
}

function rotateBackup(json) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUPS_DIR, `state-${stamp}.json`);
  fs.writeFileSync(file, json, 'utf8');
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('state-') && f.endsWith('.json'))
    .sort();
  while (files.length > MAX_BACKUPS) {
    const old = files.shift();
    try { fs.unlinkSync(path.join(BACKUPS_DIR, old)); } catch {}
  }
}

function safeJoin(base, target) {
  const resolved = path.resolve(base, '.' + target);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = safeJoin(ROOT, urlPath);
  if (!file) { res.writeHead(403); res.end('forbidden'); return; }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/state' && req.method === 'GET') {
    try { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(readState()); }
    catch (e) { json(res, 500, { error: e.message }); }
    return;
  }

  if (url === '/api/state' && req.method === 'PUT') {
    try {
      const body = await readBody(req);
      writeState(body);
      json(res, 200, { ok: true, savedAt: new Date().toISOString() });
    } catch (e) { json(res, 400, { error: e.message }); }
    return;
  }

  if (url === '/api/backups' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('state-') && f.endsWith('.json'))
        .sort().reverse()
        .map(f => ({ name: f, size: fs.statSync(path.join(BACKUPS_DIR, f)).size }));
      json(res, 200, { backups: files });
    } catch (e) { json(res, 500, { error: e.message }); }
    return;
  }

  if (url.startsWith('/api/backups/') && req.method === 'GET') {
    const name = path.basename(url.slice('/api/backups/'.length));
    if (!/^state-[\w\-T:.Z]+\.json$/.test(name)) { json(res, 400, { error: 'invalid name' }); return; }
    const file = path.join(BACKUPS_DIR, name);
    if (!fs.existsSync(file)) { json(res, 404, { error: 'not found' }); return; }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    fs.createReadStream(file).pipe(res);
    return;
  }

  if (url === '/api/health' && req.method === 'GET') {
    json(res, 200, { ok: true, dataFile: STATE_FILE, backups: BACKUPS_DIR });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  ⚡ MyManager pronto su  http://localhost:${PORT}`);
  console.log(`  📦 Dati:    ${STATE_FILE}`);
  console.log(`  💾 Backup:  ${BACKUPS_DIR} (max ${MAX_BACKUPS})\n`);
});
