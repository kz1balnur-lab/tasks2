/*
 * PHYSICS LAB backend: сайтты тарату + қауіпсіз API прокси.
 * Іске қосу (жоба түбірінде):  npm install  →  npm start  →  http://localhost:3000
 * Тәуелділік: Node.js 18+ және @anthropic-ai/sdk (Anthropic таңдалса).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

// ── backend/.env файлын оқу (кітапханасыз) ──
(function loadEnv() {
  const file = path.join(here, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
})();

const { health, handleChat, handleHandwriting, handleTranslate, handleGrade, getConfig } = await import('./providers.js');

const PORT = +(process.env.PORT || 3000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || ''; // бөлек доменнен шақырылса (мыс. https://school.kz)

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2'
};
// Сырттан ашуға тыйым салынған жолдар
const BLOCKED = [/^\/backend(\/|$)/, /^\/node_modules(\/|$)/, /^\/tools(\/|$)/, /^\/api(\/|$)/, /(^|\/)\./, /^\/package(-lock)?\.json$/];

// ── Қарапайым жылдамдық шектеуі (IP бойынша) ──
const buckets = new Map();
function rateLimited(ip, key, limit, windowMs) {
  const k = ip + '|' + key, now = Date.now();
  const arr = (buckets.get(k) || []).filter(t => now - t < windowMs);
  if (arr.length >= limit) { buckets.set(k, arr); return true; }
  arr.push(now); buckets.set(k, arr);
  return false;
}

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'object' && !Buffer.isBuffer(body) ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers
  });
  res.end(data);
}

function readJSON(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > maxBytes) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(Object.assign(new Error('bad json'), { code: 400 })); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath);
  if (p === '/') p = '/index.html';
  if (BLOCKED.some(re => re.test(p))) return send(res, 404, 'Not found');
  const file = path.resolve(ROOT, '.' + p);
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const cors = ALLOWED_ORIGIN ? { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', Vary: 'Origin' } : {};
  if (req.method === 'OPTIONS') return send(res, 204, '', cors);
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') {
      const h = health(); return send(res, h.status, h.body, cors);
    }
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      if (rateLimited(ip, 'chat', 30, 5 * 60 * 1000)) return send(res, 429, { error: 'Сұрақтар тым жиі. Бірнеше минуттан кейін қайталап көріңіз.' }, cors);
      const body = await readJSON(req, 200 * 1024);
      const out = await handleChat(body); return send(res, out.status, out.body, cors);
    }
    if (url.pathname === '/api/translate' && req.method === 'POST') {
      if (rateLimited(ip, 'tr', 60, 5 * 60 * 1000)) return send(res, 429, { error: 'Сұраныстар тым жиі' }, cors);
      const body = await readJSON(req, 300 * 1024);
      const out = await handleTranslate(body); return send(res, out.status, out.body, cors);
    }
    if (url.pathname === '/api/grade' && req.method === 'POST') {
      if (rateLimited(ip, 'grade', 30, 5 * 60 * 1000)) return send(res, 429, { error: 'Сұраныстар тым жиі. Бірнеше минуттан кейін қайталап көріңіз.' }, cors);
      const body = await readJSON(req, 10 * 1024 * 1024);
      const out = await handleGrade(body); return send(res, out.status, out.body, cors);
    }
    if (url.pathname === '/api/handwriting' && req.method === 'POST') {
      if (rateLimited(ip, 'ocr', 15, 5 * 60 * 1000)) return send(res, 429, { error: 'Тану сұраныстары тым жиі. Кейінірек қайталап көріңіз.' }, cors);
      const body = await readJSON(req, 10 * 1024 * 1024);
      const out = await handleHandwriting(body); return send(res, out.status, out.body, cors);
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' }, cors);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    serveStatic(req, res, url.pathname);
  } catch (e) {
    send(res, e.code === 413 ? 413 : e.code === 400 ? 400 : 500, { error: e.code === 413 ? 'Сұраныс тым үлкен' : 'Сервер қатесі' }, cors);
  }
});

server.listen(PORT, () => {
  const c = getConfig();
  console.log(`\n  PHYSICS LAB | 7-СЫНЫП  →  http://localhost:${PORT}`);
  console.log(`  AI көмекші:        ${c.ai.enabled ? 'қосулы (' + c.ai.provider + ')' : 'ӨШІРУЛІ — backend/.env ішіне API кілтін жазыңыз'}`);
  console.log(`  Қолжазбаны тану:   ${c.ocr.enabled ? 'қосулы (' + c.ocr.provider + ')' : 'ӨШІРУЛІ — backend/.env ішіне OCR баптауын жазыңыз'}\n`);
});
