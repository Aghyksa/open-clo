import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const helpers = await server.ssrLoadModule('/src/utils/canvasInteraction.ts').catch(() => ({}));
  assert.equal(typeof helpers.findPatternEdge, 'function', 'curve-aware hit testing is available');
  const piece = {
    id: 'front', position: { x: 30, y: 40 }, rotation: Math.PI / 2,
    points: [{ id: 'a', x: -100, y: 0 }, { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 100, y: 200 }, { id: 'd', x: -100, y: 200 }],
    edgeCurvatures: { 0: { cpx: 0, cpy: -120 } },
  };
  const hit = helpers.findPatternEdge(piece, { x: 90, y: 40 }, 2);
  assert.equal(hit?.edgeIndex, 0, 'the rendered curve can be sewn at its midpoint');
  assert.ok(Math.abs(hit.param - 0.5) < 0.001);
  assert.equal(helpers.isPointInPattern(piece, { x: 70, y: 40 }), true, 'selection includes the curved area');
  assert.equal(helpers.findPatternEdge(piece, { x: 30, y: 40 }, 2), null, 'the invisible chord is not selectable');
  const internalPiece = { ...piece, internalLines: [{ id: 'pocket', type: 'pocket',
    points: [{ id: 'p0', x: 5, y: 20 }, { id: 'p1', x: 65, y: 20 }] }] };
  assert.deepEqual(helpers.seamLocalPoints(internalPiece, { pieceId: piece.id, edgeIndex: 0, internalLineId: 'pocket' }),
    [{ x: 5, y: 20 }, { x: 65, y: 20 }], 'pocket seams attach inside the panel');
  const partial = helpers.seamLocalPoints(piece, { pieceId: piece.id, edgeIndex: 0, paramStart: 0.25, paramEnd: 0.75 });
  assert.deepEqual(partial[0], { x: -50, y: -45 }, 'partial curved seam starts at the actual curve parameter');
  assert.deepEqual(partial.at(-1), { x: 50, y: -45 });

  const shape = helpers.scalePatternShape(internalPiece, 2, 0.5, { x: 100, y: 200 });
  assert.deepEqual(shape.points[2], piece.points[2], 'the opposite scaling anchor stays in place');
  assert.deepEqual(shape.edgeCurvatures[0], { cpx: 0, cpy: -60 }, 'curved outlines scale with the panel');
  assert.deepEqual(shape.internalLines[0].points[0], { id: 'p0', x: -90, y: 110 }, 'internal seam attachments scale with the panel');
  assert.deepEqual(helpers.dragCurvature({ cpx: 5, cpy: -120 }, { x: 0, y: 0 }, 0, 0.5),
    { cpx: 5, cpy: -120 }, 'starting on a curved edge does not move its control point');
  const bent = helpers.dragCurvature({ cpx: 0, cpy: -120 }, { x: 10, y: 0 }, Math.PI / 2, 0.5);
  assert.ok(Math.abs(bent.cpx) < 1e-9 && Math.abs(bent.cpy + 140) < 1e-9,
    'dragging a rotated curve follows the pointer while preserving its existing bend');

  const decal = { position: { x: 10, y: 20 }, width: 160, height: 40, scale: 2, rotation: 90 };
  const center = { x: 100, y: 100 };
  assert.equal(helpers.isPointInDecal(decal, center, { x: 110, y: 260 }), true, 'rotated scaled artwork remains selectable');
  assert.equal(helpers.isPointInDecal(decal, center, { x: 240, y: 120 }), false, 'empty space beside rotated artwork is not selected');
  assert.equal(helpers.findDecalHandle(decal, center, { x: 150, y: -40 }, 1), 'nw', 'visible scaled rotation-aware handle matches hit target');
  assert.equal(helpers.findDecalHandle(decal, center, { x: 170, y: 120 }, 1), 'rot', 'rotation handle is reachable');

  const view = helpers.getPinchView({ scale: 1, offsetX: 0, offsetY: 0 },
    [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 20, y: 40 }, { x: 220, y: 40 }], 0.1, 3);
  assert.deepEqual(view, { scale: 2, offsetX: 20, offsetY: 40 }, 'pinch preserves the midpoint anchor and pans');
  assert.ok(Math.abs(helpers.rotationDelta(-Math.PI + 0.1, Math.PI - 0.1) - 0.2) < 1e-9, 'rotation does not jump at 180 degrees');
  const { splitPatternEdge, splitEdgeSeams, deleteVertexSeams } = await server.ssrLoadModule('/src/utils/patternTopology.ts');
  const { cutPattern } = await server.ssrLoadModule('/src/utils/patternCut.ts');
  const split = splitPatternEdge(piece, 0, { id: 'middle', x: 0, y: -60 }, .5);
  assert.deepEqual(split.points[1], { id: 'middle', x: 0, y: -60 }, 'splitting inserts the exact curve point');
  const seam = { id: 'shoulder', edgeA: { pieceId: 'front', edgeIndex: 0 }, edgeB: { pieceId: 'back', edgeIndex: 3 }, strength: 1 };
  const splitSeams = splitEdgeSeams([seam], 'front', 0, .5);
  assert.equal(splitSeams.length, 2);
  assert.deepEqual(splitSeams.map((s) => [s.edgeA.edgeIndex, s.edgeB.paramStart, s.edgeB.paramEnd]), [[0,0,.5],[1,.5,1]], 'splitting preserves matching seam ranges');
  const retained = deleteVertexSeams([{ ...seam, edgeA: { pieceId: 'front', edgeIndex: 2 } }], piece, 1);
  assert.equal(retained[0].edgeA.edgeIndex, 1, 'unaffected seams follow their original edges after deletion');
  const cut = cutPattern(piece, [], { id: '', x: -200, y: 80 }, { id: '', x: 200, y: 80 });
  assert.equal(cut.pieces.length, 2);
  assert.ok(cut.pieces.some((p) => Object.keys(p.edgeCurvatures).length), 'cutting preserves curved outlines');
  assert.equal(cut.seams.length, 1, 'cut panels are connected along their new cut edges');
  console.log('Editor interaction checks passed');
} finally {
  await server.close();
}
