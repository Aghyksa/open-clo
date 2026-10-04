import type { PatternPiece, SeamConnection, SeamEdge, Point2D, EdgeCurvature } from '../types/cad';

export function splitPatternEdge(piece: PatternPiece, edgeIndex: number, point: Point2D, t: number) {
  const a = piece.points[edgeIndex], b = piece.points[(edgeIndex + 1) % piece.points.length];
  const curves: Record<number, EdgeCurvature> = {};
  for (const [key, value] of Object.entries(piece.edgeCurvatures || {})) {
    const index = Number(key);
    if (index !== edgeIndex) curves[index > edgeIndex ? index + 1 : index] = value;
  }
  const curve = piece.edgeCurvatures?.[edgeIndex];
  let inserted = point;
  if (curve) {
    const c = { x: (a.x + b.x) / 2 + curve.cpx, y: (a.y + b.y) / 2 + curve.cpy };
    const left = { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t };
    const right = { x: c.x + (b.x - c.x) * t, y: c.y + (b.y - c.y) * t };
    inserted = { ...point, x: left.x + (right.x - left.x) * t, y: left.y + (right.y - left.y) * t };
    curves[edgeIndex] = { cpx: left.x - (a.x + inserted.x) / 2, cpy: left.y - (a.y + inserted.y) / 2 };
    curves[edgeIndex + 1] = { cpx: right.x - (inserted.x + b.x) / 2, cpy: right.y - (inserted.y + b.y) / 2 };
  }
  const points = [...piece.points];
  points.splice(edgeIndex + 1, 0, inserted);
  return { ...piece, points, edgeCurvatures: curves,
    ...(piece.cutting ? { cutting: { ...piece.cutting, notches: piece.cutting.notches.map((notch) => {
      if (notch.edgeIndex !== edgeIndex) return { ...notch, edgeIndex: notch.edgeIndex > edgeIndex ? notch.edgeIndex + 1 : notch.edgeIndex };
      const second = notch.param >= t;
      return { ...notch, edgeIndex: edgeIndex + Number(second), param: (notch.param - (second ? t : 0)) / (second ? 1 - t : t) };
    }) } } : {}) };
}

export function splitEdgeSeams(seams: SeamConnection[], pieceId: string, index: number, t: number) {
  const split = (edge: SeamEdge) => !edge.internalLineId && edge.pieceId === pieceId && edge.edgeIndex === index;
  const remap = (edge: SeamEdge, from: number, to: number, reversed = false) => {
    const start = edge.paramStart ?? 0, end = edge.paramEnd ?? 1;
    const x = start + (end - start) * (reversed ? 1 - to : from);
    const y = start + (end - start) * (reversed ? 1 - from : to);
    if (!split(edge)) return { ...edge, edgeIndex: edge.pieceId === pieceId && !edge.internalLineId && edge.edgeIndex > index ? edge.edgeIndex + 1 : edge.edgeIndex, paramStart: x, paramEnd: y };
    const second = (x + y) / 2 >= t;
    return { ...edge, edgeIndex: index + (second ? 1 : 0),
      paramStart: (x - (second ? t : 0)) / (second ? 1 - t : t),
      paramEnd: (y - (second ? t : 0)) / (second ? 1 - t : t) };
  };
  return seams.flatMap((seam) => {
    const cuts = [0, 1];
    for (const [edge, reversed] of [[seam.edgeA, false], [seam.edgeB, !!seam.reversed]] as const) {
      if (!split(edge)) continue;
      const start = edge.paramStart ?? 0, end = edge.paramEnd ?? 1;
      const fraction = (t - start) / (end - start);
      if (fraction > 0 && fraction < 1) cuts.push(reversed ? 1 - fraction : fraction);
    }
    const sorted = [...new Set(cuts)].sort((a, b) => a - b);
    return sorted.slice(1).map((end, i) => ({ ...seam, id: i ? `${seam.id}-split-${i}` : seam.id,
      edgeA: remap(seam.edgeA, sorted[i], end), edgeB: remap(seam.edgeB, sorted[i], end, !!seam.reversed) }));
  });
}

export function deleteVertexSeams(seams: SeamConnection[], piece: PatternPiece, index: number) {
  const previous = (index - 1 + piece.points.length) % piece.points.length;
  const touches = (edge: SeamEdge) => edge.pieceId === piece.id && !edge.internalLineId && (edge.edgeIndex === index || edge.edgeIndex === previous);
  const remap = (edge: SeamEdge) => edge.pieceId === piece.id && !edge.internalLineId && edge.edgeIndex > index ? { ...edge, edgeIndex: edge.edgeIndex - 1 } : edge;
  return seams.filter((seam) => !touches(seam.edgeA) && !touches(seam.edgeB))
    .map((seam) => ({ ...seam, edgeA: remap(seam.edgeA), edgeB: remap(seam.edgeB) }));
}
