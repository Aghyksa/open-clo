import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
try {
  const { exportPatternsToSvg } = await server.ssrLoadModule('/src/utils/patternPresets.ts');
  const piece = {
    id: 'front', name: 'Front <panel>', rotation: Math.PI / 2, position: { x: 100, y: 50 },
    placement: { origin3D: [0, 0, 0], rotation3D: [0, 0, 0] },
    points: [{ id: 'a', x: -60, y: -90 }, { id: 'b', x: 60, y: -90 },
      { id: 'c', x: 60, y: 90 }, { id: 'd', x: -60, y: 90 }],
    cutting: { quantity: 2, onFold: false, grainlineAngle: 0, seamAllowanceMm: 10,
      notches: [{ edgeIndex: 0, param: .25, count: 1 }] },
  };
  const svg = exportPatternsToSvg([piece]);
  assert.match(svg, /data-calibration="true"[^>]*data-calibration-mm="100"[^>]*width="60"[^>]*height="60"/,
    'export includes a physical 100 mm calibration square');
  assert.match(svg, /Print at 100%/, 'printer scaling is explicit');
  const [boxX, boxY, boxWidth, boxHeight] = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const physicalWidth = Number(svg.match(/width="([\d.]+)mm"/)[1]);
  const physicalHeight = Number(svg.match(/height="([\d.]+)mm"/)[1]);
  assert.ok(Math.abs(physicalWidth / boxWidth - 10 / 6) < .00001);
  assert.ok(Math.abs(physicalHeight / boxHeight - 10 / 6) < .00001);
  const [, calibrationX, calibrationY] = svg.match(/data-calibration="true" data-calibration-mm="100" x="([^"]+)" y="([^"]+)"/).map(Number);
  assert.ok(calibrationX >= boxX && calibrationY >= boxY && calibrationX + 60 <= boxX + boxWidth
    && calibrationY + 60 <= boxY + boxHeight, 'calibration is fully inside the printable viewBox');
  assert.match(svg, /translate\(100 50\) rotate\(90\)/, 'rotation and translation retain their physical dimensions');
  assert.match(svg, /Front &lt;panel&gt;/, 'names cannot inject SVG markup');
  assert.match(svg, /Cut 2/, 'cut quantity is exported');
  assert.match(svg, /data-grainline/, 'grainline is included only when explicitly recorded');
  assert.match(svg, /data-notch/, 'explicit registration notches are exported');
  assert.match(svg, /data-cut-outline/, 'straight convex panels get a genuine allowance outline');
  const legacySvg = exportPatternsToSvg([{ ...piece, cutting: undefined }]);
  assert.doesNotMatch(legacySvg, /data-grainline|data-notch|data-cut-outline/,
    'legacy pieces never acquire invented cutting instructions');
  assert.match(legacySvg, /Cutting details not set/, 'legacy export asks for missing cutting instructions');

  const { getPieceCuttingGeometry } = await server.ssrLoadModule('/src/utils/cuttingGeometry.ts');
  const geometry = getPieceCuttingGeometry(piece);
  assert.deepEqual(geometry.cutOutline, [{ x: -66, y: -96 }, { x: 66, y: -96 },
    { x: 66, y: 96 }, { x: -66, y: 96 }], '10 mm allowance expands every rectangle edge by exactly 6 units');
  assert.deepEqual(geometry.grainline, { start: { x: 0, y: 63 }, end: { x: 0, y: -63 } },
    'zero degrees follows the local vertical rather than page vertical');
  assert.deepEqual(geometry.notches[0], { start: { x: -30, y: -90 }, end: { x: -30, y: -91.8 } },
    'registration notch belongs to the recorded outline edge parameter');
  const horizontal = getPieceCuttingGeometry({ ...piece, cutting: { ...piece.cutting, grainlineAngle: 90 } });
  assert.ok(Math.abs(horizontal.grainline.start.x + 42) < 1e-8 && Math.abs(horizontal.grainline.end.x - 42) < 1e-8
    && Math.abs(horizontal.grainline.end.y) < 1e-8, '90 degrees rotates the grainline clockwise from vertical');
  const curved = { ...piece, edgeCurvatures: { 0: { cpx: 0, cpy: -30 } },
    cutting: { ...piece.cutting, notches: [{ edgeIndex: 0, param: .5, count: 1 }] } };
  const curveGeometry = getPieceCuttingGeometry(curved);
  assert.equal(curveGeometry.cutOutline, undefined, 'curved offsets are never replaced with a false straight cutting line');
  assert.match(curveGeometry.allowanceMessage, /recorded only.*not added/i);
  assert.deepEqual(curveGeometry.notches[0], { start: { x: 0, y: -105 }, end: { x: 0, y: -106.8 } },
    'notch follows the real quadratic neckline instead of its chord');
  assert.match(exportPatternsToSvg([curved]), /Q 0 -120 60 -90/, 'sewing outline retains exact quadratic geometry');
  const fold = getPieceCuttingGeometry({ ...piece, cutting: { ...piece.cutting, onFold: true } });
  assert.equal(fold.cutOutline, undefined, 'an unknown fold edge does not receive a made-up allowance');
  assert.ok(fold.labels.some((label) => label.includes('on fold')));
  const concave = { ...piece, points: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 60, y: 0 },
    { id: 'c', x: 20, y: 20 }, { id: 'd', x: 60, y: 60 }, { id: 'e', x: 0, y: 60 }] };
  assert.equal(getPieceCuttingGeometry(concave).cutOutline, undefined, 'concave cutting offsets are explicitly unsupported');
  const reverse = getPieceCuttingGeometry({ ...piece, points: [...piece.points].reverse() });
  assert.deepEqual(reverse.cutOutline, [{ x: -66, y: 96 }, { x: 66, y: 96 },
    { x: 66, y: -96 }, { x: -66, y: -96 }], 'allowance remains outward for either winding');
  const star = { ...piece, points: [{ id: 'a', x: 0, y: -60 }, { id: 'b', x: 35, y: 49 },
    { id: 'c', x: -57, y: -19 }, { id: 'd', x: 57, y: -19 }, { id: 'e', x: -35, y: 49 }] };
  assert.equal(getPieceCuttingGeometry(star).cutOutline, undefined,
    'self-crossing polygons cannot masquerade as safe convex cutting outlines');
  const repeated = { ...piece, points: [piece.points[0], piece.points[0], ...piece.points.slice(1)] };
  assert.equal(getPieceCuttingGeometry(repeated).cutOutline, undefined, 'zero-length edges do not generate invalid offsets');
  const double = getPieceCuttingGeometry({ ...piece, cutting: { ...piece.cutting,
    notches: [{ edgeIndex: 1, param: .5, count: 2 }] } });
  assert.equal(double.notches.length, 2);
  assert.ok(double.notches.every((line, i) => line.start.x === 60 && Math.abs(line.start.y - (i === 0 ? -.9 : .9)) < 1e-8),
    'double notches stay 3 mm apart on the designated edge');
  assert.ok(double.notches.every((line) => line.end.x === 61.8), 'notches point outward regardless of edge direction');
  const large = { ...piece, points: Array.from({ length: 512 }, (_, i) => ({ id: `p${i}`,
    x: Math.cos(i * Math.PI * 2 / 512) * 600, y: Math.sin(i * Math.PI * 2 / 512) * 600 })) };
  assert.equal(getPieceCuttingGeometry(large).cutOutline.length, 512, 'maximum supported vertex count remains bounded');
  const snapshot = JSON.stringify(curved);
  exportPatternsToSvg([curved]);
  assert.equal(JSON.stringify(curved), snapshot, 'export leaves the editable design untouched');
  const placementModule = await server.ssrLoadModule('/src/utils/panelPlacement.ts').catch(() => ({}));
  assert.equal(typeof placementModule.getPanelPlacement, 'function', 'explicit roles have a shared 3D placement contract');
  const avatar = { gender: 'female', height: 165, chestCircumference: 92,
    waistCircumference: 68, hipsCircumference: 96, shoulderWidth: 40, showSkin: true };
  const frontPlacement = placementModule.getPanelPlacement(piece, 'front', avatar);
  const backPlacement = placementModule.getPanelPlacement(piece, 'back', avatar);
  assert.ok(frontPlacement.origin3D[2] > 0 && backPlacement.origin3D[2] < 0, 'front and back face opposite body sides');
  assert.equal(frontPlacement.anchorY, undefined, 'torso roles are not accidentally pinned as waist panels');
  const kids = { ...avatar, height: 110, chestCircumference: 55, shoulderWidth: 27 };
  assert.ok(placementModule.getPanelPlacement(piece, 'leftSleeve', kids).origin3D[0] >= .3
    && placementModule.getPanelPlacement(piece, 'rightSleeve', kids).origin3D[0] <= -.3,
  'small child sleeves still route to the two arm meshes');
  const waistPlacement = placementModule.getPanelPlacement(piece, 'waistFront', kids);
  assert.ok(Math.abs(waistPlacement.anchorY - 1.06) < 1e-8, 'waist anchor is stored in reference units, without double height scaling');
  assert.equal(placementModule.getPanelPlacement(piece, 'hood', avatar).surface, 'hood', 'hood uses the head surface instead of the torso');
  assert.equal(placementModule.getPanelPlacement(piece, 'other', avatar), piece.placement, 'unassigned roles preserve original placement');
  const { normalizePatternPiece } = await server.ssrLoadModule('/src/utils/projectData.ts');
  const { buildGarmentMesh } = await server.ssrLoadModule('/src/utils/patternMesh.ts');
  const rolePanels = ['front', 'back', 'leftSleeve', 'rightSleeve'].map((role, i) => normalizePatternPiece({
    ...piece, id: `svg-import-${i}`, name: `Imported ${i}`, role,
    placement: placementModule.getPanelPlacement(piece, role, kids),
  }));
  assert.ok(rolePanels.every((panel) => panel.cutting.quantity === 2 && panel.cutting.notches[0].param === .25),
    'normalization preserves user-authored cutting instructions on imported role panels');
  const roleMesh = buildGarmentMesh(rolePanels, [], kids, .8, .3);
  assert.ok(roleMesh && roleMesh.positions.every(Number.isFinite), 'imported IDs build a finite garment mesh');
  assert.deepEqual(roleMesh.groups.map((group) => group.zone), ['body', 'body', 'leftSleeve', 'rightSleeve'],
    'material and artwork routing honor explicit roles rather than file-generated IDs');
  const ranges = roleMesh.groups.map(() => ({ minY: Infinity, maxY: -Infinity, minU: Infinity,
    maxU: -Infinity, x: 0, z: 0, count: 0 }));
  for (let vertex = 0; vertex < roleMesh.vertexCount; vertex++) {
    const range = ranges[roleMesh.pieceOfVertex[vertex]], p = vertex * 3, uv = vertex * 2;
    range.x += roleMesh.positions[p]; range.z += roleMesh.positions[p + 2]; range.count++;
    range.minY = Math.min(range.minY, roleMesh.positions[p + 1]); range.maxY = Math.max(range.maxY, roleMesh.positions[p + 1]);
    range.minU = Math.min(range.minU, roleMesh.uvs[uv]); range.maxU = Math.max(range.maxU, roleMesh.uvs[uv]);
  }
  assert.ok(ranges[0].z / ranges[0].count > 0 && ranges[1].z / ranges[1].count < 0,
    'random-ID front and back actually wrap opposite body sides');
  assert.ok(ranges[0].maxU <= .5 && ranges[1].minU >= .5,
    'front and back use distinct texture atlas halves');
  assert.ok(ranges[2].x / ranges[2].count > .1 && ranges[3].x / ranges[3].count < -.1,
    'child sleeves wrap the corresponding arm rather than the torso');
  assert.ok(ranges[2].minU === 0 && ranges[2].maxU === 1 && ranges[3].minU === 0 && ranges[3].maxU === 1,
    'role-based child sleeves use their full artwork texture');
  const raisedOther = normalizePatternPiece({ ...piece, id: 'svg-import-high', role: 'other',
    placement: { origin3D: [0, 2, .2], rotation3D: [0, 0, 0] } });
  const expandedMesh = buildGarmentMesh([...rolePanels, raisedOther], [], kids, .8, .3);
  let expandedFrontTop = -Infinity;
  for (let vertex = 0; vertex < expandedMesh.vertexCount; vertex++) {
    if (expandedMesh.pieceOfVertex[vertex] === 0) expandedFrontTop = Math.max(expandedFrontTop, expandedMesh.positions[vertex * 3 + 1]);
  }
  assert.ok(Math.abs(expandedFrontTop - ranges[0].maxY) < 1e-6,
    'adding another imported panel does not pull explicit front/back panels away from the neck');
  console.log('Cutting metadata and true-scale SVG checks passed');
} finally {
  await server.close();
}
