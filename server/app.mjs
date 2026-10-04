import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, createReadStream, statSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { createGzip } from 'node:zlib';
import { Worker } from 'node:worker_threads';

const derive = promisify(scrypt);
const hashToken = (value) => createHash('sha256').update(value).digest('hex');
const sessionAge = 30 * 86400;
const scryptOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  const key = await derive(password, salt, 32, scryptOptions);
  return `${salt}:${key.toString('hex')}`;
}
async function passwordMatches(password, encoded) {
  const [salt, stored] = encoded.split(':');
  const computed = (await passwordHash(password, salt)).split(':')[1];
  return timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(computed, 'hex'));
}
function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw new HttpError(422, 'Use a password with 12 to 128 characters.');
  return value;
}
function email(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new HttpError(422, 'Enter a valid email address.');
  return value.trim().toLowerCase();
}
async function body(request, maxBytes = 24 * 1024 * 1024) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Send project data as JSON.');
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'This request exceeds the size limit.');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value;
  } catch { throw new HttpError(422, 'The request contains invalid JSON.'); }
}
async function binaryBody(request, maxBytes) {
  if (request.headers['content-type'] !== 'application/octet-stream') throw new HttpError(415, 'Send the CorelDRAW file directly.');
  if (Number(request.headers['content-length']) > maxBytes) throw new HttpError(413, 'Choose a CorelDRAW file smaller than 32 MB.');
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'Choose a CorelDRAW file smaller than 32 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function convertPattern(source) {
  const worker = new Worker(new URL('./cdrWorker.mjs', import.meta.url), { resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 } });
  let timer;
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new HttpError(422, 'Pattern conversion took too long. Export fewer plain outlines as SVG.')), 10000);
      worker.once('message', (message) => message.error ? reject(new HttpError(422, message.error)) : resolve(message.result));
      worker.once('error', () => reject(new HttpError(422, 'Pattern conversion exceeded its limits. Export fewer plain outlines as SVG.')));
      worker.once('exit', () => reject(new HttpError(422, 'Pattern conversion stopped. Export plain outlines as SVG.')));
      const transferred = Uint8Array.from(source);
      worker.postMessage(transferred.buffer, [transferred.buffer]);
    });
  } finally { clearTimeout(timer); await worker.terminate(); }
}
function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

export function createApplication({ databasePath, normalizeProject, secureCookies = true, publicOrigin, staticDirectory } = {}) {
  if (!databasePath || !normalizeProject) throw new Error('Database path and project validator are required.');
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(databasePath, { timeout: 3000 });
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS projects(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, id TEXT NOT NULL, version INTEGER NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,id));
    CREATE INDEX IF NOT EXISTS projects_updated ON projects(user_id, updated_at DESC, id);
    CREATE TABLE IF NOT EXISTS recovery_codes(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, code_hash TEXT NOT NULL);`);
  const prepare = (sql) => db.prepare(sql);
  const statements = {
    userEmail: prepare('SELECT * FROM users WHERE email = ?'),
    addUser: prepare('INSERT INTO users VALUES(?,?,?,?,?)'),
    addSession: prepare('INSERT INTO sessions VALUES(?,?,?)'),
    session: prepare('SELECT u.id,u.email,u.name,s.token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?'),
    removeSession: prepare('DELETE FROM sessions WHERE token=?'),
    expired: prepare('DELETE FROM sessions WHERE expires_at<=?'),
    list: prepare("SELECT id,version,updated_at,json_extract(data,'$.name') AS name,json_extract(data,'$.templateId') AS templateId,json_extract(data,'$.customColor') AS color FROM projects WHERE user_id=? ORDER BY updated_at DESC,id LIMIT ? OFFSET ?"),
    count: prepare('SELECT COUNT(*) AS count, COALESCE(SUM(length(data)),0) AS bytes FROM projects WHERE user_id=?'),
    project: prepare('SELECT version,data FROM projects WHERE user_id=? AND id=?'),
    conflicts: prepare(`SELECT json_extract(j.value,'$.id') AS id FROM json_each(?) j LEFT JOIN projects p ON p.user_id=? AND p.id=json_extract(j.value,'$.id')
      WHERE COALESCE(p.version,0) != json_extract(j.value,'$.version')`),
    deleteConflicts: prepare(`SELECT json_extract(j.value,'$.id') AS id FROM json_each(?) j LEFT JOIN projects p ON p.user_id=? AND p.id=json_extract(j.value,'$.id')
      WHERE p.version IS NULL OR p.version != json_extract(j.value,'$.version')`),
    upsert: prepare(`INSERT INTO projects(user_id,id,version,data,updated_at)
      SELECT ?,json_extract(value,'$.id'),json_extract(value,'$.version')+1,json_extract(value,'$.data'),? FROM json_each(?) WHERE true
      ON CONFLICT(user_id,id) DO UPDATE SET version=excluded.version,data=excluded.data,updated_at=excluded.updated_at`),
    deleteProjects: prepare("DELETE FROM projects WHERE user_id=? AND id IN(SELECT json_extract(value,'$.id') FROM json_each(?))"),
    updatePassword: prepare('UPDATE users SET password_hash=? WHERE id=?'),
    revokeOther: prepare('DELETE FROM sessions WHERE user_id=? AND token!=?'),
    revokeAll: prepare('DELETE FROM sessions WHERE user_id=?'),
    addRecovery: prepare('INSERT INTO recovery_codes VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash'),
    recovery: prepare('SELECT code_hash FROM recovery_codes WHERE user_id=?'),
    deleteUser: prepare('DELETE FROM users WHERE id=?'),
  };
  const attempts = new Map();
  let activeHashes = 0;
  let activeImports = 0;
  const dummy = passwordHash('dummy-password-never-valid');
  const cleanup = setInterval(() => {
    const now = Date.now(); statements.expired.run(now);
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
  }, 60000); cleanup.unref();
  function rateLimit(request) {
    const key = request.socket.remoteAddress || 'unknown'; const now = Date.now();
    const entry = attempts.get(key);
    if (entry && entry.until > now && entry.count >= 25) throw new HttpError(429, 'Too many account attempts. Try again in 15 minutes.');
    if (!entry || entry.until <= now) {
      if (attempts.size >= 10000) throw new HttpError(503, 'Account service is busy. Try again shortly.');
      attempts.set(key, { count: 1, until: now + 900000 });
    } else entry.count++;
    if (activeHashes >= 4) throw new HttpError(503, 'Account service is busy. Try again shortly.');
  }
  function csrf(request) {
    const origin = request.headers.origin;
    const expected = publicOrigin || `http://${request.headers.host}`;
    if (!origin || origin !== expected) throw new HttpError(403, 'Open this action from your workspace.');
  }
  const cookieName = secureCookies ? '__Host-openclo_session' : 'openclo_session';
  function session(request) {
    const value = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!value || !/^[\da-f]{64}$/.test(value)) throw new HttpError(401, 'Sign in to open your workspace.');
    const user = statements.session.get(hashToken(value), Date.now());
    if (!user) throw new HttpError(401, 'Your session expired. Sign in again.');
    return user;
  }
  function issueSession(response, user) {
    const token = randomBytes(32).toString('hex');
    statements.addSession.run(hashToken(token), user.id, Date.now() + sessionAge * 1000);
    response.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionAge}${secureCookies ? '; Secure' : ''}`);
    return { id: user.id, name: user.name, email: user.email };
  }
  function recoveryCode(userId) {
    const code = randomBytes(24).toString('base64url');
    statements.addRecovery.run(userId, hashToken(code));
    return code;
  }
  async function handleApi(request, response, path) {
    const method = request.method;
    if (!['GET', 'HEAD'].includes(method)) csrf(request);
    if (path === '/api/auth/register' && method === 'POST') {
      rateLimit(request); const data = await body(request, 8192);
      const address = email(data.email), secret = password(data.password);
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name || name.length > 80) throw new HttpError(422, 'Enter a name with 1 to 80 characters.');
      if (statements.userEmail.get(address)) throw new HttpError(409, 'This email cannot be registered. Try signing in or recovering your account.');
      activeHashes++; let encoded;
      try { encoded = await passwordHash(secret); } finally { activeHashes--; }
      const user = { id: randomUUID(), email: address, name };
      try { statements.addUser.run(user.id, address, name, encoded, Date.now()); }
      catch { throw new HttpError(409, 'This email cannot be registered. Try signing in.'); }
      return json(response, 201, { user: issueSession(response, user), recoveryCode: recoveryCode(user.id) });
    }
    if (path === '/api/auth/login' && method === 'POST') {
      rateLimit(request); const data = await body(request, 8192);
      const user = statements.userEmail.get(email(data.email));
      const secret = password(data.password); activeHashes++;
      let valid; try { valid = await passwordMatches(secret, user?.password_hash || await dummy); } finally { activeHashes--; }
      if (!user || !valid) throw new HttpError(401, 'Email or password is incorrect.');
      return json(response, 200, { user: issueSession(response, user) });
    }
    if (path === '/api/auth/recover' && method === 'POST') {
      rateLimit(request); const data = await body(request, 8192);
      const user = statements.userEmail.get(email(data.email));
      const saved = user && statements.recovery.get(user.id);
      const code = typeof data.recoveryCode === 'string' ? data.recoveryCode : '';
      if (code.length > 128 || !saved || !timingSafeEqual(Buffer.from(saved.code_hash, 'hex'), Buffer.from(hashToken(code), 'hex'))) throw new HttpError(401, 'Email or recovery code is incorrect.');
      const secret = password(data.password); activeHashes++;
      let encoded; try { encoded = await passwordHash(secret); } finally { activeHashes--; }
      statements.updatePassword.run(encoded, user.id); statements.revokeAll.run(user.id);
      return json(response, 200, { user: issueSession(response, user), recoveryCode: recoveryCode(user.id) });
    }
    const user = session(request);
    const expectedAccount = request.headers['x-openclo-account'];
    if (expectedAccount && expectedAccount !== user.id) throw new HttpError(409, 'The account changed in another tab. Sign in to the original account to keep your edits private.');
    if (path === '/api/patterns/cdr' && method === 'POST') {
      if (activeImports >= 2) throw new HttpError(503, 'Two pattern imports are already running. Try again shortly.');
      activeImports++;
      try {
        const source = await binaryBody(request, 32 * 1024 * 1024);
        const result = await convertPattern(source);
        return json(response, 200, result);
      } finally { activeImports--; }
    }
    if (path === '/api/auth/me' && method === 'GET') return json(response, 200, { user: { id: user.id, name: user.name, email: user.email } });
    if (path === '/api/auth/logout' && method === 'POST') {
      statements.removeSession.run(user.token);
      response.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookies ? '; Secure' : ''}`);
      return json(response, 200, { ok: true });
    }
    if (path === '/api/auth/password' && method === 'POST') {
      rateLimit(request); const data = await body(request, 8192); const secret = password(data.password);
      activeHashes++;
      try {
        if (!await passwordMatches(password(data.currentPassword), statements.userEmail.get(user.email).password_hash)) throw new HttpError(401, 'The current password is incorrect.');
        statements.updatePassword.run(await passwordHash(secret), user.id); statements.revokeOther.run(user.id, user.token);
      } finally { activeHashes--; }
      return json(response, 200, { ok: true });
    }
    if (path === '/api/auth/account' && method === 'DELETE') {
      rateLimit(request); const data = await body(request, 8192); activeHashes++;
      try {
        if (!await passwordMatches(password(data.password), statements.userEmail.get(user.email).password_hash)) throw new HttpError(401, 'The password is incorrect.');
        statements.deleteUser.run(user.id);
      } finally { activeHashes--; }
      response.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookies ? '; Secure' : ''}`);
      return json(response, 200, { ok: true });
    }
    if (path === '/api/projects' && method === 'GET') {
      const query = new URL(request.url, 'http://localhost').searchParams;
      const offset = Math.max(0, Math.min(100, Number(query.get('offset')) || 0));
      const limit = Math.max(1, Math.min(50, Number(query.get('limit')) || 50));
      return json(response, 200, { items: statements.list.all(user.id, limit, offset), total: statements.count.get(user.id).count });
    }
    if (path.startsWith('/api/projects/') && method === 'GET') {
      const id = decodeURIComponent(path.slice('/api/projects/'.length));
      const found = statements.project.get(user.id, id);
      if (!found) throw new HttpError(404, 'This design could not be found in your workspace.');
      return json(response, 200, { project: JSON.parse(found.data), version: found.version });
    }
    if (path === '/api/projects/batch' && method === 'POST') {
      const data = await body(request);
      if (!Array.isArray(data.upserts) || !Array.isArray(data.deletes) || data.upserts.length + data.deletes.length > 100) throw new HttpError(422, 'Save at most 100 designs in one request.');
      const validVersion = (value) => Number.isSafeInteger(value) && value >= 0;
      let upserts;
      try { upserts = data.upserts.map((item) => {
        if (!validVersion(item.version)) throw new Error('Invalid design version.');
        const project = normalizeProject(item.project);
        const serialized = JSON.stringify(project);
        if (Buffer.byteLength(serialized) > 4 * 1024 * 1024) throw new Error('Each design must be smaller than 4 MB. Resize artwork or remove unused layers.');
        return { id: project.id, version: item.version, data: serialized };
      }); } catch (error) { throw new HttpError(422, error.message); }
      const deletes = data.deletes.map((item) => {
        if (typeof item.id !== 'string' || item.id.length > 120 || !validVersion(item.version) || !item.version) throw new HttpError(422, 'Invalid design deletion.');
        return { id: item.id, version: item.version };
      });
      if (new Set([...upserts, ...deletes].map((item) => item.id)).size !== upserts.length + deletes.length) throw new HttpError(422, 'A design can only appear once in a save request.');
      const upsertJson = JSON.stringify(upserts), deleteJson = JSON.stringify(deletes);
      db.exec('BEGIN IMMEDIATE');
      try {
        if (statements.conflicts.all(upsertJson, user.id).length || statements.deleteConflicts.all(deleteJson, user.id).length) throw new HttpError(409, 'This design changed in another tab or device. Download a backup of your edits, then reopen the saved design.');
        statements.deleteProjects.run(user.id, deleteJson);
        statements.upsert.run(user.id, Date.now(), upsertJson);
        const usage = statements.count.get(user.id);
        if (usage.count > 100 || usage.bytes > 128 * 1024 * 1024) throw new HttpError(422, 'Your workspace supports 100 designs and 128 MB of artwork. Export or remove older designs first.');
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return json(response, 200, { saved: upserts.map((item) => ({ id: item.id, version: item.version + 1 })) });
    }
    throw new HttpError(404, 'This action could not be found.');
  }
  const root = staticDirectory && resolve(staticDirectory);
  const server = createServer(async (request, response) => {
    response.setHeader('X-Frame-Options', 'SAMEORIGIN'); response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (secureCookies) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    const path = new URL(request.url, 'http://localhost').pathname;
    try {
      if (path.startsWith('/api/')) { response.setHeader('Cache-Control', 'no-store'); await handleApi(request, response, path); return; }
      if (path === '/healthz') { response.writeHead(200, { 'Content-Type': 'text/plain' }); response.end(request.method === 'HEAD' ? undefined : 'healthy'); return; }
      if (!root || !['GET', 'HEAD'].includes(request.method)) throw new HttpError(404, 'Not found.');
      const decoded = decodeURIComponent(path);
      if (decoded.split('/').some((part) => part.startsWith('.')) || decoded.includes('\\')) throw new HttpError(404, 'Not found.');
      let file = resolve(root, '.' + decoded);
      if (!file.startsWith(root + sep) && file !== root) throw new HttpError(404, 'Not found.');
      let stat;
      try { stat = statSync(file); } catch { /* SPA routes use the entry document. */ }
      if (!stat?.isFile()) {
        if (decoded.startsWith('/assets/') || decoded.startsWith('/models/') || extname(decoded)) throw new HttpError(404, 'Not found.');
        file = resolve(root, 'index.html'); stat = statSync(file);
      }
      const extension = extname(file);
      response.setHeader('Content-Type', mime[extension] || 'application/octet-stream');
      response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
      if (decoded.startsWith('/assets/')) response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (request.method === 'HEAD') { response.setHeader('Content-Length', stat.size); response.end(); return; }
      const stream = createReadStream(file);
      stream.on('error', () => response.destroy());
      if (/\bgzip\b/.test(request.headers['accept-encoding'] || '') && ['.html', '.js', '.css', '.svg'].includes(extension)) {
        response.setHeader('Content-Encoding', 'gzip'); response.setHeader('Vary', 'Accept-Encoding');
        const gzip = createGzip(); gzip.on('error', () => response.destroy()); stream.pipe(gzip).pipe(response);
      } else { response.setHeader('Content-Length', stat.size); stream.pipe(response); }
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      json(response, error instanceof HttpError ? error.status : 500, { error: { message: error instanceof HttpError ? error.message : 'The server could not complete this action. Try again.' } });
    }
  });
  server.requestTimeout = 30000; server.headersTimeout = 10000; server.maxHeadersCount = 50;
  let closed = false;
  return { server, close: () => { if (!closed) { closed = true; clearInterval(cleanup); db.close(); } } };
}
