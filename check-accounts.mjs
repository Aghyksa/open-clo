import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createApplication } from './server/app.mjs';

const directory = await mkdtemp(join(tmpdir(), 'openclo-accounts-'));
const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { normalizeProject, createDefaultProject } = await vite.ssrLoadModule('/src/utils/projectData.ts');
const app = createApplication({ databasePath: join(directory, 'test.sqlite'), normalizeProject, secureCookies: false });
await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${app.server.address().port}`;
const request = async (path, method = 'GET', body, cookie, origin = base) => {
  const response = await fetch(base + path, { method, headers: { Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
};
try {
  assert.equal((await request('/api/projects')).status, 401, 'private workspaces require authentication');
  assert.equal((await request('/api/auth/register', 'POST', { email: 'alice@example.test', name: 'Alice', password: 'safe-password-1234' }, undefined, 'https://attacker.test')).status, 403, 'foreign origins cannot create sessions');
  const alice = await request('/api/auth/register', 'POST', { email: 'alice@example.test', name: 'Alice', password: 'safe-password-1234' });
  assert.equal(alice.status, 201);
  assert.match(alice.headers.get('set-cookie'), /HttpOnly/);
  assert.match(alice.headers.get('set-cookie'), /SameSite=Lax/);
  const bob = await request('/api/auth/register', 'POST', { email: 'bob@example.test', name: 'Bob', password: 'another-password-1234' });
  assert.equal(bob.status, 201);
  const bobRecovery = bob.data.recoveryCode;
  const project = createDefaultProject('tshirt', 'Alice private design');
  let saved = await request('/api/projects/batch', 'POST', { upserts: [{ project, version: 0 }], deletes: [] }, alice.cookie);
  assert.equal(saved.status, 200);
  assert.equal((await request('/api/projects', 'GET', undefined, alice.cookie)).data.items.length, 1);
  assert.equal((await request('/api/projects', 'GET', undefined, bob.cookie)).data.items.length, 0, 'another account sees no private designs');
  assert.equal((await request(`/api/projects/${project.id}`, 'GET', undefined, bob.cookie)).status, 404, 'knowing an ID does not expose a design');
  assert.equal((await request('/api/projects/batch', 'POST', { upserts: [], deletes: [{ id: project.id, version: 1 }] }, bob.cookie)).status, 409);
  assert.equal((await request(`/api/projects/${project.id}`, 'GET', undefined, alice.cookie)).data.project.name, 'Alice private design');
  assert.equal((await request('/api/projects/batch', 'POST', { upserts: [{ project: { ...project, name: 'stale tab' }, version: 0 }], deletes: [] }, alice.cookie)).status, 409, 'stale tabs cannot silently overwrite newer work');
  assert.equal((await request('/api/projects/batch', 'POST', { upserts: [{ project: { pieces: [] }, version: 0 }], deletes: [] }, alice.cookie)).status, 422);
  assert.equal((await request('/api/auth/login', 'POST', { email: 'alice@example.test', password: 'wrong-password-123' })).status, 401);
  const login = await request('/api/auth/login', 'POST', { email: 'alice@example.test', password: 'safe-password-1234' });
  assert.equal(login.status, 200);
  assert.equal((await request('/api/auth/me', 'GET', undefined, login.cookie)).data.user.name, 'Alice');
  assert.equal((await request('/api/auth/password', 'POST', { currentPassword: 'safe-password-1234', password: 'changed-password-123' }, login.cookie)).status, 200);
  assert.equal((await request('/api/auth/me', 'GET', undefined, alice.cookie)).status, 401, 'password change revokes other sessions');
  assert.equal((await request('/api/auth/logout', 'POST', {}, login.cookie)).status, 200);
  assert.equal((await request('/api/auth/me', 'GET', undefined, login.cookie)).status, 401);
  const recovered = await request('/api/auth/recover', 'POST', { email: 'bob@example.test', recoveryCode: bobRecovery, password: 'recovered-password-123' });
  assert.equal(recovered.status, 200);
  assert.notEqual(recovered.data.recoveryCode, bobRecovery);
  assert.equal((await request('/api/auth/me', 'GET', undefined, bob.cookie)).status, 401, 'recovery revokes old sessions');
  assert.equal((await request('/api/auth/recover', 'POST', { email: 'bob@example.test', recoveryCode: bobRecovery, password: 'recovered-password-123' })).status, 401, 'recovery codes are single use');
  bob.cookie = recovered.cookie;
  await new Promise((resolve) => app.server.close(resolve));
  app.close();
  const restarted = createApplication({ databasePath: join(directory, 'test.sqlite'), normalizeProject, secureCookies: false });
  await new Promise((resolve) => restarted.server.listen(0, '127.0.0.1', resolve));
  const response = await fetch(`http://127.0.0.1:${restarted.server.address().port}/api/auth/me`, { headers: { Cookie: bob.cookie } });
  assert.equal(response.status, 200, 'sessions survive a server restart');
  await new Promise((resolve) => restarted.server.close(resolve)); restarted.close();
  console.log('account check OK: login, private workspace isolation, atomic validation, conflict protection, cookies, CSRF, password change, logout and persistence');
} finally {
  if (app.server.listening) await new Promise((resolve) => app.server.close(resolve));
  app.close();
  await vite.close(); await rm(directory, { recursive: true, force: true });
}
