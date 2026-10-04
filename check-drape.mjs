// Self-check for the pattern -> 3D drape pipeline. Run: node check-drape.mjs
// Uses the project's own Vite resolution, so no extra tooling is needed.
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const presets = await server.ssrLoadModule('/src/utils/patternPresets.ts');
const { ClothSimulator } = await server.ssrLoadModule('/src/utils/clothSimulation.ts');
const { getBodyCrossSection, getBodyScale } = await server.ssrLoadModule('/src/utils/avatarBody.ts');

const AVATAR = {
  gender: 'female',
  height: 175,
  chestCircumference: 92,
  waistCircumference: 68,
  hipsCircumference: 96,
  shoulderWidth: 40,
  showSkin: true,
};
const SCALE = getBodyScale(AVATAR);
const STEPS = 320;

function bounds(sim) {
  const p = sim.positions;
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < sim.mesh.vertexCount * 3; i += 3) {
    b.minX = Math.min(b.minX, p[i]); b.maxX = Math.max(b.maxX, p[i]);
    b.minY = Math.min(b.minY, p[i + 1]); b.maxY = Math.max(b.maxY, p[i + 1]);
    b.minZ = Math.min(b.minZ, p[i + 2]); b.maxZ = Math.max(b.maxZ, p[i + 2]);
  }
  return b;
}

function meanSeamGap(sim) {
  const { a, b } = sim.mesh.seams;
  if (a.length === 0) return 0;
  const p = sim.positions;
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const ia = a[i] * 3;
    const ib = b[i] * 3;
    total += Math.hypot(p[ib] - p[ia], p[ib + 1] - p[ia + 1], p[ib + 2] - p[ia + 2]);
  }
  return total / a.length;
}

function hemCircumference(sim) {
  let length = 0;
  for (const piece of [0, 1]) {
    const vertices = [];
    for (let v = 0; v < sim.mesh.vertexCount; v++) {
      if (sim.mesh.pieceOfVertex[v] === piece && sim.mesh.uvs[v * 2 + 1] < 0.001) vertices.push(v);
    }
    vertices.sort((a, b) => sim.mesh.uvs[a * 2] - sim.mesh.uvs[b * 2]);
    for (let i = 1; i < vertices.length; i++) {
      const a = vertices[i - 1] * 3, b = vertices[i] * 3;
      length += Math.hypot(sim.positions[a] - sim.positions[b], sim.positions[a + 1] - sim.positions[b + 1], sim.positions[a + 2] - sim.positions[b + 2]);
    }
  }
  return length;
}

function worstPenetration(sim) {
  const p = sim.positions;
  let worst = 0;
  for (let i = 0; i < sim.mesh.vertexCount * 3; i += 3) {
    const y = p[i + 1];
    if (y < 0.32 * SCALE.y || y > 1.42 * SCALE.y) continue;
    const cross = getBodyCrossSection(y, SCALE);
    const e = Math.hypot(p[i] / cross.halfWidth, (p[i + 2] - cross.zCenter) / cross.halfDepth);
    if (e < 1) worst = Math.max(worst, 1 - e);
  }
  return worst;
}

function drape(pieces, seams, fabric, steps = STEPS) {
  const sim = ClothSimulator.create(pieces, seams, fabric, AVATAR);
  assert.ok(sim, 'simulator built');
  sim.assemble();
  assert.equal(sim.isSettled(), false, 'newly assembled cloth must run gravity before settling');
  const stitched = meanSeamGap(sim);
  const hung = bounds(sim).maxY;
  for (let i = 0; i < steps; i++) sim.step(1 / 60);
  return { sim, stitched, hung, box: bounds(sim) };
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const rows = [];

const curvedPiece = {
  id: 'test-panel', name: 'Front <panel>', rotation: Math.PI / 2,
  position: { x: 100, y: 100 }, placement: { origin3D: [0, 0, 0], rotation3D: [0, 0, 0] },
  points: [{ id: 'a', x: -30, y: -60 }, { id: 'b', x: 30, y: -60 },
    { id: 'c', x: 30, y: 60 }, { id: 'd', x: -30, y: 60 }],
  edgeCurvatures: { 0: { cpx: 0, cpy: -30 } },
};
const svg = presets.exportPatternsToSvg([curvedPiece]);
const physicalWidth = Number(/width="([\d.]+)mm"/.exec(svg)[1]);
const physicalHeight = Number(/height="([\d.]+)mm"/.exec(svg)[1]);
const viewBox = /viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number);
assert.ok(physicalWidth >= 225 && physicalHeight >= 200, 'SVG page contains the rotated curved panel');
assert.ok(Math.abs(physicalWidth / viewBox[2] - 10 / 6) < .00001, 'SVG horizontal scale is exactly 600 pattern units per meter');
assert.ok(Math.abs(physicalHeight / viewBox[3] - 10 / 6) < .00001, 'SVG vertical scale matches the drape units');
assert.match(svg, /data-calibration-mm="100"/, 'SVG includes a full-size print check');
assert.ok(svg.includes('Q 0 -90 30 -60'), 'SVG preserves the neckline curve');
assert.ok(svg.includes('Front &lt;panel&gt;'), 'SVG escapes pattern names');

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const { useCloStore } = await server.ssrLoadModule('/src/store/useCloStore.ts');
useCloStore.setState({ pieces: [clone(curvedPiece)], seams: [], undoStack: [], redoStack: [] });
useCloStore.getState().scalePiece('test-panel', 2, 1.5);
assert.equal(useCloStore.getState().pieces[0].edgeCurvatures[0].cpy, -45, 'resizing scales the curve with the outline');
useCloStore.getState().undo();
assert.deepEqual(useCloStore.getState().pieces[0], curvedPiece, 'undo restores the original curved pattern');

useCloStore.getState().setColorZone('sleeves', '#d97706');
assert.equal(useCloStore.getState().colorZones.leftSleeve, '#d97706', 'both sleeves updates the left sleeve override');
assert.equal(useCloStore.getState().colorZones.rightSleeve, '#d97706', 'both sleeves updates the right sleeve override');
useCloStore.getState().setCustomColor('#94a3b8');
assert.ok(Object.values(useCloStore.getState().colorZones).every((color) => color === '#94a3b8'), 'global fabric color reaches every garment panel');
const originalProjectId = useCloStore.getState().activeProjectId;
useCloStore.getState().createNewProject('Color isolation', 'heavyweight-hoodie');
useCloStore.getState().setColorZone('body', '#be123c');
assert.equal(useCloStore.getState().decals.length, 0, 'new designs start without someone else’s artwork');
useCloStore.getState().switchProject(originalProjectId);
assert.equal(useCloStore.getState().colorZones.body, '#94a3b8', 'switching projects restores the saved colorway');
assert.equal(useCloStore.getState().decals.length, 1, 'switching projects restores its artwork');
useCloStore.getState().loadPreset('pique-polo');
assert.equal(useCloStore.getState().projects.find((project) => project.id === originalProjectId).templateId, 'pique-polo',
  'saved project and exported JSON retain the selected garment template');

const flatPiece = { ...clone(curvedPiece), edgeCurvatures: undefined,
  placement: { origin3D: [0, 0.4, 0.17], rotation3D: [0, 0, 0] } };
const flatSim = ClothSimulator.create([flatPiece], [], presets.FABRIC_PRESETS[0], AVATAR);
const { structural, uvs } = flatSim.mesh;
for (let i = 0; i < structural.a.length; i++) {
  const a = structural.a[i] * 2, b = structural.b[i] * 2;
  const flatLength = Math.hypot((uvs[a] - uvs[b]) * 0.2, (uvs[a + 1] - uvs[b + 1]) * 0.2);
  assert.ok(Math.abs(structural.rest[i] - flatLength) < 0.000005,
    'placing a 10 x 20 cm panel on the body must preserve its flat fabric lengths');
}

for (const tmpl of presets.GARMENT_TEMPLATES) {
  const { pieces, seams } = tmpl.generator();
  const fabric = presets.FABRIC_PRESETS.find((f) => f.id === tmpl.recommendedFabric) || presets.FABRIC_PRESETS[0];
  const { sim, stitched, hung, box } = drape(pieces, seams, fabric);
  const tag = tmpl.id;

  // 1. The mesh is built from the pattern outlines, not a hard-coded shape
  assert.ok(sim.mesh.vertexCount > 1500, `${tag}: vertices ${sim.mesh.vertexCount} > 1500`);
  assert.ok(sim.mesh.indices.length / 3 > 2000, `${tag}: triangles ${sim.mesh.indices.length / 3} > 2000`);
  assert.ok(sim.mesh.seams.a.length > 50, `${tag}: seam pairs ${sim.mesh.seams.a.length} > 50`);

  // 2. Seams actually close
  assert.ok(stitched < 0.005, `${tag}: seam gap after stitching ${(stitched * 1000).toFixed(1)} mm < 5 mm`);

  // 3. Nothing exploded
  for (let i = 0; i < sim.mesh.vertexCount * 3; i++) {
    assert.ok(Number.isFinite(sim.positions[i]), `${tag}: finite positions`);
  }

  // 4. The garment hangs where it was put instead of sliding to the floor
  assert.ok(box.maxY > hung - 0.12, `${tag}: stayed on the body, top ${box.maxY.toFixed(3)} vs hung ${hung.toFixed(3)}`);

  // 5. Collision holds
  const pen = worstPenetration(sim);
  assert.ok(pen < 0.12, `${tag}: worst body penetration ${(pen * 100).toFixed(1)}% < 12%`);

  // 6. Plausible garment size
  const height = box.maxY - box.minY;
  const width = box.maxX - box.minX;
  assert.ok(height > 0.3 && height < 1.2, `${tag}: height ${height.toFixed(3)} m in 0.3..1.2`);
  assert.ok(width > 0.2 && width < 1.4, `${tag}: width ${width.toFixed(3)} m in 0.2..1.4`);

  let settlingSteps = STEPS;
  while (!sim.isSettled() && settlingSteps < 600) { sim.step(1 / 60); settlingSteps++; }
  assert.ok(sim.isSettled(), `${tag}: preview stops continuous physics after draping`);

  rows.push(
    `  ${tag.padEnd(22)} v${String(sim.mesh.vertexCount).padStart(5)} seams${String(sim.mesh.seams.a.length).padStart(4)}` +
    ` gap${(stitched * 1000).toFixed(1).padStart(5)}mm pen${(pen * 100).toFixed(1).padStart(5)}%` +
    ` ${width.toFixed(2)}w x ${height.toFixed(2)}h m`,
  );
}

// 7. The 3D result tracks 2D pattern edits — the whole point of the pipeline
const base = presets.createTshirtPreset();
const jersey = presets.FABRIC_PRESETS[0];
const plain = drape(base.pieces, base.seams, jersey);
const baseHeight = plain.box.maxY - plain.box.minY;

const wider = clone(base);
for (const piece of wider.pieces) {
  if (piece.id === 'piece-front' || piece.id === 'piece-back') for (const pt of piece.points) pt.x *= 1.45;
}
const widerResult = drape(wider.pieces, wider.seams, jersey);
const baseHem = hemCircumference(plain.sim), widerHem = hemCircumference(widerResult.sim);
assert.ok(widerHem > baseHem * 1.25, `wider pattern -> wider sewn hem: ${widerHem.toFixed(3)} vs ${baseHem.toFixed(3)}`);

const longer = clone(base);
for (const piece of longer.pieces) {
  if (piece.id === 'piece-front' || piece.id === 'piece-back') {
    for (const pt of piece.points) if (pt.y > 150) pt.y += 220;
  }
}
const longHeight = (() => { const r = drape(longer.pieces, longer.seams, jersey).box; return r.maxY - r.minY; })();
assert.ok(longHeight > baseHeight * 1.15, `longer pattern -> longer garment: ${longHeight.toFixed(3)} vs ${baseHeight.toFixed(3)}`);

console.log('drape check OK');
console.log(rows.join('\n'));
console.log(`  pattern edits: +45% panel width -> hem ${baseHem.toFixed(2)} to ${widerHem.toFixed(2)} m,` +
  ` +220u length -> height ${baseHeight.toFixed(2)} to ${longHeight.toFixed(2)} m`);

await server.close();
