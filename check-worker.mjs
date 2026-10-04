// Exercise the production worker with a real thread and transferable message channel.
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createServer, build as bundleWorker } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const presets = await server.ssrLoadModule('/src/utils/patternPresets.ts');
const pattern = presets.GARMENT_TEMPLATES.find((template) => template.id === 'tshirt').generator();
const material = presets.FABRIC_PRESETS[0];
await server.close();
let bundle;
try {
  const result = await bundleWorker({ configFile: false, logLevel: 'silent', build: { write: false, minify: false,
    lib: { entry: 'src/workers/cloth.worker.ts', formats: ['es'] } } });
  bundle = (Array.isArray(result) ? result[0] : result).output.find((output) => output.type === 'chunk').code;
} catch (error) {
  assert.fail(`Production worker could not be bundled: ${error.message}`);
}
const avatar = { gender: 'female', height: 175, chestCircumference: 92, waistCircumference: 68,
  hipsCircumference: 96, shoulderWidth: 40, showSkin: true };
const bootstrap = `
  import { parentPort } from 'node:worker_threads';
  globalThis.postMessage = (message, transfer) => parentPort.postMessage(message, transfer);
  parentPort.on('message', (data) => globalThis.onmessage?.({ data }));
  try {
    await import(${JSON.stringify(`data:text/javascript,${encodeURIComponent(bundle)}`)});
    parentPort.postMessage({ type: 'booted' });
  } catch (error) {
    parentPort.postMessage({ type: 'boot-error', message: error.message });
  }
`;
const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`));
const messages = [];
const waiting = new Set();
worker.on('message', (message) => {
  messages.push(message);
  for (const check of waiting) check();
});
function waitFor(predicate, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiting.delete(check); reject(new Error('Worker response timed out')); }, timeout);
    const check = () => {
      const result = messages.find(predicate);
      if (!result) return;
      clearTimeout(timer);
      waiting.delete(check);
      resolve(result);
    };
    waiting.add(check);
    check();
  });
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const build = (id, overrides = {}) => worker.postMessage({ type: 'build', id, ...pattern, material, avatar, paused: false, ...overrides });

try {
  const boot = await waitFor((message) => message.type === 'booted' || message.type === 'boot-error');
  assert.equal(boot.type, 'booted', boot.message);
  build(1, { pieces: [], seams: [] });
  assert.equal((await waitFor((message) => message.id === 1)).type, 'empty', 'empty patterns have no preview mesh');

  build(2, { paused: true });
  await pause(150);
  assert.equal(messages.some((message) => message.id === 2), false, 'hidden previews must defer expensive construction');
  worker.postMessage({ type: 'pause', id: 2, paused: false });
  const mesh = await waitFor((message) => message.id === 2);
  assert.equal(mesh.type, 'mesh', mesh.message);
  assert.ok(mesh.positions instanceof Float32Array, 'worker sends render positions in a typed buffer');
  assert.ok(mesh.positions.length > 3000 && mesh.positions.length < 36000, 'mesh remains within a practical vertex budget');
  assert.equal(mesh.uvs.length, mesh.positions.length / 3 * 2, 'UV coordinates cover every rendered vertex');
  assert.ok(mesh.indices.every((index) => index < mesh.positions.length / 3), 'all triangle indices refer to real vertices');
  assert.ok(mesh.groups.every((group) => pattern.pieces.some((piece) => piece.id === group.pieceId)), 'mesh groups retain pattern ownership');
  const finish = await waitFor((message) => message.id === 2 && message.type === 'frame' && message.finished);
  assert.ok(finish.positions.every(Number.isFinite), 'the completed drape stays finite');
  assert.equal(finish.positions.length, mesh.positions.length, 'frame buffers preserve mesh topology');
  assert.ok(finish.positions.some((value, index) => Math.abs(value - mesh.positions[index]) > 0.00001), 'physics moves the assembled pattern');
  const frames = messages.filter((message) => message.id === 2 && message.type === 'frame');
  assert.ok(frames.length < 100, 'bounded updates avoid flooding the renderer');
  const completedCount = messages.length;
  await pause(150);
  assert.equal(messages.length, completedCount, 'completed drapes stop computing and emitting frames');
  worker.postMessage({ type: 'recycle', id: 2, positions: finish.positions }, [finish.positions.buffer]);
  assert.equal(finish.positions.byteLength, 0, 'frame buffers transfer ownership instead of copying through the port');

  build(3);
  build(4, { pieces: [], seams: [] });
  assert.equal((await waitFor((message) => message.id === 4)).type, 'empty');
  await pause(100);
  assert.equal(messages.some((message) => message.id === 3), false, 'a newer edit cancels assembly before stale frames reach the UI');

  build(5, { paused: true });
  worker.postMessage({ type: 'cancel', id: 5 });
  worker.postMessage({ type: 'pause', id: 5, paused: false });
  await pause(100);
  assert.equal(messages.some((message) => message.id === 5), false, 'cancelled hidden jobs stay cancelled after resume');

  const invalid = structuredClone(pattern.pieces);
  invalid[0].points[0].x = NaN;
  build(6, { pieces: invalid });
  assert.equal((await waitFor((message) => message.id === 6)).type, 'error', 'invalid pattern data reports an error instead of a nonfinite mesh');
  console.log(`worker check OK · ${mesh.positions.length / 3} vertices · ${frames.length} bounded updates · pause, cancel, transfer and error guards`);
} finally {
  await worker.terminate();
}
