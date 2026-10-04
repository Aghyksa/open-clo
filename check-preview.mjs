import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
try {
  const presets = await server.ssrLoadModule('/src/utils/patternPresets.ts');
  const { ClothSimulator } = await server.ssrLoadModule('/src/utils/clothSimulation.ts');
  const { buildGarmentMesh } = await server.ssrLoadModule('/src/utils/patternMesh.ts');
  const { getBodyCrossSection, getBodyScale } = await server.ssrLoadModule('/src/utils/avatarBody.ts');
  const avatar = { gender: 'female', height: 175, chestCircumference: 92, waistCircumference: 68,
    hipsCircumference: 96, shoulderWidth: 40, showSkin: true };
  const fabric = presets.FABRIC_PRESETS[0];
  const cross = (config, rawY) => {
    const scale = getBodyScale(config);
    return getBodyCrossSection(rawY * scale.y, scale);
  };
  assert.ok(cross({ ...avatar, waistCircumference: 100 }, 1.1).halfWidth > cross(avatar, 1.1).halfWidth * 1.35,
    'changing waist changes the waist collider');
  assert.ok(cross({ ...avatar, hipsCircumference: 140 }, 0.9).halfWidth > cross(avatar, 0.9).halfWidth * 1.35,
    'changing hips changes the hip collider');
  assert.ok(cross({ ...avatar, shoulderWidth: 50 }, 1.36).halfWidth > cross(avatar, 1.36).halfWidth * 1.2,
    'changing shoulder width changes the shoulder collider');

  const drape = (data) => {
    const sim = ClothSimulator.create(data.pieces, data.seams, fabric, avatar);
    assert.ok(sim);
    sim.assemble();
    for (let frame = 0; frame < 600 && !sim.isSettled(); frame++) sim.step(1 / 60);
    assert.ok(sim.isSettled(), 'preview finishes after draping');
    assert.ok(sim.positions.every(Number.isFinite), 'drape positions stay finite');
    return sim;
  };
  const skirt = drape(presets.createSkirtPreset());
  let worstGap = 0;
  for (let c = 0; c < skirt.mesh.seams.a.length; c++) {
    const a = skirt.mesh.seams.a[c] * 3, b = skirt.mesh.seams.b[c] * 3;
    worstGap = Math.max(worstGap, Math.hypot(...[0, 1, 2].map((d) => skirt.positions[a + d] - skirt.positions[b + d])));
  }
  assert.ok(worstGap < 0.015, `skirt waistband closes, worst seam gap ${worstGap.toFixed(4)} m`);

  const patch = { id: 'custom-panel', name: 'Unsewn panel', points: [{ id: 'a', x: -60, y: -60 },
    { id: 'b', x: 60, y: -60 }, { id: 'c', x: 60, y: 60 }, { id: 'd', x: -60, y: 60 }],
    rotation: 0, position: { x: 0, y: 0 }, placement: { origin3D: [0, 1.1, 0.15], rotation3D: [0, 0, 0] } };
  const unsewn = drape({ pieces: [patch], seams: [] });
  assert.ok(unsewn.positions.filter((_, i) => i % 3 === 1).every((y) => y >= 0), 'unsewn panels land on the floor');
  const direct = ClothSimulator.create([patch], [], fabric, avatar);
  const batched = ClothSimulator.create([patch], [], fabric, avatar);
  direct.assemble();
  for (const _ of batched.assembleBatches(7)) { void _; }
  assert.deepEqual(batched.positions, direct.positions, 'batched assembly produces the same cloth positions');
  const tee = presets.createTshirtPreset();
  const before = buildGarmentMesh(tee.pieces, tee.seams, avatar, 0.8, 0.3);
  const withPatch = buildGarmentMesh([...tee.pieces, patch], tee.seams, avatar, 0.8, 0.3);
  const top = (mesh) => Math.max(...mesh.positions.filter((_, i) => i % 3 === 1 && mesh.pieceOfVertex[Math.floor(i / 3)] === 0));
  assert.ok(Math.abs(top(before) - top(withPatch)) < 0.01, 'adding a panel does not reanchor the original garment');

  const hoodie = presets.createHoodiePreset();
  assert.equal(hoodie.pieces.filter((piece) => piece.id.includes('hood')).length, 2, 'hood uses two sewn side panels');
  assert.ok(presets.exportPatternsToSvg(hoodie.pieces).includes('data-line="pocket-placement"'), 'SVG includes the pocket sewing placement mark');
  const hoodSim = drape(hoodie);
  const range = (id, axis) => {
    const groupIndex = hoodSim.mesh.groups.findIndex((group) => group.pieceId === id);
    const values = hoodSim.positions.filter((_, i) => i % 3 === axis && hoodSim.mesh.pieceOfVertex[Math.floor(i / 3)] === groupIndex);
    return [Math.min(...values), Math.max(...values)];
  };
  const pocketY = range('piece-pocket', 1), frontY = range('piece-front', 1);
  assert.ok(pocketY[0] > frontY[0] + 0.01 && pocketY[1] < frontY[1] - 0.15, 'kangaroo pocket attaches inside the front torso');
  assert.ok(range('piece-hood-l', 1)[1] > frontY[1] + 0.15, 'hood encloses the head above the neckline');

  const huge = { ...patch, points: patch.points.map((point) => ({ ...point, x: point.x * 100, y: point.y * 100 })) };
  const mesh = buildGarmentMesh([huge], [], avatar, 0.8, 0.3);
  assert.ok(mesh && mesh.vertexCount <= 8000, 'large input keeps a bounded vertex budget');
  assert.equal(buildGarmentMesh([{ ...patch, points: [{ ...patch.points[0], x: NaN }, ...patch.points.slice(1)] }], [], avatar, 0.8, 0.3), null,
    'non-finite outline is rejected before sampling');
  console.log(`preview check OK; skirt worst gap ${(worstGap * 1000).toFixed(1)} mm, large panel ${mesh.vertexCount} vertices`);
} finally {
  await server.close();
}
