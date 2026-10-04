import assert from 'node:assert/strict';
import { createServer } from 'vite';

const values = new Map();
let storageFails = false;
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => { if (storageFails) throw new Error('QuotaExceededError'); values.set(key, value); },
  removeItem: (key) => values.delete(key),
};
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { useCloStore: store } = await server.ssrLoadModule('/src/store/useCloStore.ts');
  const data = await server.ssrLoadModule('/src/utils/projectData.ts');
  const presets = await server.ssrLoadModule('/src/utils/patternPresets.ts');
  for (const template of presets.GARMENT_TEMPLATES) assert.doesNotThrow(() => data.normalizeProject(data.createDefaultProject(template.id)), `${template.id} can be saved and reopened`);
  const original = store.getState();
  const reset = () => { storageFails = false; store.getState().endEdit?.(); store.setState({ ...original, undoStack: [], redoStack: [] }); };
  const artwork = { type: 'text', content: 'Studio', name: 'Studio', position: { x: 0, y: 0 }, scale: 1,
    rotation: 0, viewTarget: 'front', blendMode: 'normal', opacity: 1, width: 80, height: 24 };

  reset();
  store.getState().setColorZone('body', '#d97706');
  store.getState().undo();
  assert.equal(store.getState().colorZones.body, original.colorZones.body, 'undo restores garment colors');
  store.getState().redo();
  assert.equal(store.getState().colorZones.body, '#d97706', 'redo restores garment colors');

  reset();
  const id = store.getState().addDecal(artwork);
  store.getState().undo();
  assert.ok(!store.getState().decals.some((item) => item.id === id), 'undo removes added artwork');
  store.getState().redo();
  store.getState().beginEdit();
  for (const x of [10, 20, 30]) store.getState().updateDecal(id, { position: { x, y: 12 } });
  store.getState().endEdit();
  store.getState().undo();
  assert.deepEqual(store.getState().decals.find((item) => item.id === id).position, { x: 0, y: 0 }, 'a drag is one undo step');
  store.getState().beginEdit();
  store.getState().updateDecal(id, { scale: 2 });
  store.getState().cancelEdit();
  assert.equal(store.getState().decals.find((item) => item.id === id).scale, 1, 'cancel restores the gesture without adding history');

  reset();
  store.getState().loadPreset('heavyweight-hoodie');
  store.getState().undo();
  assert.equal(store.getState().activeTemplateId, original.activeTemplateId, 'undo restores the template together with its geometry');
  assert.equal(store.getState().currentMaterial.id, original.currentMaterial.id, 'undo restores the fabric');
  assert.deepEqual(store.getState().pieces, original.pieces, 'undo restores the pattern');

  reset();
  store.getState().setColorZone('body', '#be123c');
  assert.equal(store.getState().isSaved, false, 'pending storage writes are not shown as saved');
  store.getState().saveActiveProject();
  assert.equal(store.getState().isSaved, true, 'successful storage write marks saved');
  assert.equal(JSON.parse(values.get('openclo_projects_v2'))[0].colorZones.body, '#be123c', 'manual save contains the current colorway');
  storageFails = true;
  store.getState().setColorZone('body', '#2563eb');
  store.getState().saveActiveProject();
  assert.equal(store.getState().isSaved, false, 'quota failure never claims that the project was saved');
  assert.ok(store.getState().saveError, 'storage failure has an actionable message');
  assert.equal(store.getState().colorZones.body, '#2563eb', 'storage failure preserves the in-memory design');
  storageFails = false;
  store.getState().saveActiveProject();
  assert.equal(store.getState().saveError, null, 'retry clears the storage failure');

  reset();
  const projectId = store.getState().activeProjectId;
  store.getState().scalePiece(store.getState().pieces[0].id, 1.1);
  store.getState().createNewProject('Other design');
  const secondId = store.getState().activeProjectId;
  store.getState().setColorZone('body', '#dc2626');
  store.getState().deleteProject(secondId);
  assert.equal(store.getState().activeProjectId, projectId, 'deleting the active project selects an existing project');
  store.getState().undo();
  assert.equal(store.getState().colorZones.body, original.colorZones.body, 'project history never crosses project boundaries');

  reset();
  const beforeImport = store.getState().projects;
  assert.throws(() => store.getState().importProjectData({ pieces: [{ points: [{ x: 'bad', y: 0 }] }] }), /pattern|point|project/i,
    'invalid imports fail before reaching the editor');
  assert.deepEqual(store.getState().projects, beforeImport, 'invalid imports are atomic');
  store.getState().importProjectData({ name: 'Legacy design', pieces: original.pieces, seams: original.seams });
  assert.equal(store.getState().projects[0].name, 'Legacy design', 'legacy pattern exports remain importable');
  assert.ok(store.getState().avatar.height > 0 && store.getState().currentMaterial.density > 0, 'legacy imports receive safe complete defaults');
  assert.equal(store.getState().undoStack.length, 0, 'import starts a new project history');

  reset();
  store.getState().saveActiveProject();
  console.log('project check OK: full-design undo, gestures, template restore, durable save, quota retry, isolation and import validation');
} finally { await server.close(); }
