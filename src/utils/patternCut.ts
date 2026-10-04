import type { PatternPiece, Point2D, SeamConnection, SeamEdge } from '../types/cad';
import { splitPatternEdge, splitEdgeSeams } from './patternTopology';

export function cutPattern(piece: PatternPiece, seams: SeamConnection[], from: Point2D, to: Point2D) {
  if (piece.locked || piece.internalLines?.length || Math.hypot(to.x - from.x, to.y - from.y) < 1) return null;
  const dx = to.x - from.x, dy = to.y - from.y;
  const cross = (p: { x: number; y: number }) => dx * (p.y - from.y) - dy * (p.x - from.x);
  const hits: { edge: number; t: number; point: Point2D }[] = [];
  piece.points.forEach((a, edge) => {
    const b = piece.points[(edge + 1) % piece.points.length], curve = piece.edgeCurvatures?.[edge];
    const c = { x: (a.x + b.x) / 2 + (curve?.cpx || 0), y: (a.y + b.y) / 2 + (curve?.cpy || 0) };
    const A = cross(a) - 2 * cross(c) + cross(b), B = 2 * (cross(c) - cross(a)), C = cross(a);
    const discriminant = B * B - 4 * A * C;
    const roots = Math.abs(A) < 1e-8 ? Math.abs(B) < 1e-8 ? [] : [-C / B] : discriminant < 0 ? [] : [(-B - Math.sqrt(discriminant)) / (2 * A), (-B + Math.sqrt(discriminant)) / (2 * A)];
    for (const t of roots) {
      if (t <= 1e-5 || t >= 1 - 1e-5) continue;
      const p = { id: crypto.randomUUID(), x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
        y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y };
      const along = ((p.x - from.x) * dx + (p.y - from.y) * dy) / (dx * dx + dy * dy);
      if (along >= 0 && along <= 1 && !hits.some((hit) => Math.hypot(hit.point.x - p.x, hit.point.y - p.y) < 1e-4)) hits.push({ edge, t, point: p });
    }
  });
  if (hits.length !== 2 || hits[0].edge === hits[1].edge) return null;
  hits.sort((a, b) => b.edge - a.edge);
  let expanded = piece, connected = seams;
  for (const hit of hits) {
    expanded = splitPatternEdge(expanded, hit.edge, hit.point, hit.t);
    connected = splitEdgeSeams(connected, piece.id, hit.edge, hit.t);
  }
  const indices = hits.map((hit) => expanded.points.findIndex((p) => p.id === hit.point.id)).sort((a, b) => a - b);
  const [first, last] = indices;
  const sets = [expanded.points.slice(first, last + 1), [...expanded.points.slice(last), ...expanded.points.slice(0, first + 1)]];
  const edgeMap = new Map<string, { pieceId: string; edgeIndex: number }>();
  const originalEdges = new Map(expanded.points.map((p, i) => [`${p.id}:${expanded.points[(i + 1) % expanded.points.length].id}`, i]));
  const notchesByEdge = new Map<number, NonNullable<PatternPiece['cutting']>['notches']>();
  for (const notch of expanded.cutting?.notches || []) {
    if (!notchesByEdge.has(notch.edgeIndex)) notchesByEdge.set(notch.edgeIndex, []);
    notchesByEdge.get(notch.edgeIndex)!.push(notch);
  }
  const pieces = sets.map((points, side) => {
    const id = side ? crypto.randomUUID() : piece.id;
    const curves: NonNullable<PatternPiece['edgeCurvatures']> = {};
    const notches: NonNullable<PatternPiece['cutting']>['notches'] = [];
    points.slice(0, -1).forEach((p, index) => {
      const key = `${p.id}:${points[index + 1].id}`, original = originalEdges.get(key)!;
      edgeMap.set(key, { pieceId: id, edgeIndex: index });
      if (expanded.edgeCurvatures?.[original]) curves[index] = expanded.edgeCurvatures[original];
      for (const notch of notchesByEdge.get(original) || []) notches.push({ ...notch, edgeIndex: index });
    });
    return { ...piece, id, points, edgeCurvatures: curves, ...(piece.cutting ? { cutting: { ...piece.cutting, notches } } : {}),
      name: `${piece.name} ${side ? 'B' : 'A'}`, position: { x: piece.position.x + side * 35, y: piece.position.y + side * 35 } };
  });
  const remap = (edge: SeamEdge) => {
    if (edge.pieceId !== piece.id) return edge;
    const a = expanded.points[edge.edgeIndex], b = expanded.points[(edge.edgeIndex + 1) % expanded.points.length];
    const mapped = edgeMap.get(`${a.id}:${b.id}`);
    return mapped ? { ...edge, ...mapped } : null;
  };
  const result = connected.flatMap((seam) => { const edgeA = remap(seam.edgeA), edgeB = remap(seam.edgeB); return edgeA && edgeB ? [{ ...seam, edgeA, edgeB }] : []; });
  result.push({ id: crypto.randomUUID(), edgeA: { pieceId: pieces[0].id, edgeIndex: pieces[0].points.length - 1 },
    edgeB: { pieceId: pieces[1].id, edgeIndex: pieces[1].points.length - 1 }, strength: 1, reversed: true, stitchType: 'single-needle' });
  return { pieces, seams: result };
}
