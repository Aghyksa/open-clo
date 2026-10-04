import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApplication } from './server/app.mjs';
import { normalizeProject } from './dist-server/projectData.mjs';
const app = createApplication({ databasePath: ':memory:', normalizeProject, secureCookies: true,
  publicOrigin: 'https://studio.example.test', staticDirectory: resolve('dist') });
await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${app.server.address().port}`;
try {
  const html = await readFile('dist/index.html','utf8');
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  for (const [path, expected] of [['/',200],['/healthz',200],['/design/my-design',200],[asset,200],['/assets/missing.js',404],['/models/missing.glb',404],['/.env',404],['/%2eenv',404]]) {
    const response = await fetch(base + path, { method: 'HEAD' });
    assert.equal(response.status, expected, path);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN');
    assert.ok(response.headers.get('strict-transport-security'));
    assert.equal(response.headers.get('cache-control'), path === asset ? 'public, max-age=31536000, immutable' : 'no-cache');
  }
  const compressed = await fetch(base + asset, { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(compressed.headers.get('content-encoding'),'gzip'); assert.ok((await compressed.text()).length > 1000);
  const account = await fetch(base + '/api/auth/register', { method: 'POST', headers: { Origin: 'https://studio.example.test', 'Content-Type':'application/json' },
    body: JSON.stringify({name:'Production smoke',email:'smoke@example.test',password:'production-smoke-phrase'}) });
  assert.equal(account.status,201); assert.match(account.headers.get('set-cookie'), /__Host-openclo_session=.*; Secure/);
  assert.equal(account.headers.get('cache-control'),'no-store');
  assert.ok((await fetch(base + '/')).headers.get('content-security-policy').includes("worker-src 'self' blob:"));
  assert.equal((await fetch(base + '/api/projects')).status,401);
  console.log('production check OK: compiled validator, security headers, secure cookies, SPA routes, gzip and asset cache');
} finally { await new Promise((resolve) => app.server.close(resolve)); app.close(); }
