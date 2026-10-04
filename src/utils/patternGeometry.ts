import type { PatternPiece, Point2D, SeamEdge } from '../types/cad';

export const PATTERN_UNITS_PER_METER = 600;
export const PATTERN_UNITS_PER_CM = PATTERN_UNITS_PER_METER / 100;

export function getSeamSegment(piece: PatternPiece, edge: SeamEdge): readonly [Point2D, Point2D] | null {
  const line = edge.internalLineId ? piece.internalLines?.find((item) => item.id === edge.internalLineId) : null;
  const points = edge.internalLineId ? line?.points : piece.points;
  const a = points?.[edge.edgeIndex];
  const b = points?.[edge.internalLineId ? edge.edgeIndex + 1 : (edge.edgeIndex + 1) % points.length];
  return a && b ? [a, b] : null;
}

export function getPatternColorZone(piece: PatternPiece | string): string {
  const id = typeof piece === 'string' ? piece : piece.id;
  if (typeof piece !== 'string' && piece.role && piece.role !== 'other') {
    return piece.role === 'front' || piece.role === 'back' || piece.role === 'waistFront' || piece.role === 'waistBack' ? 'body' : piece.role;
  }
  return id.includes('sleeve-l') ? 'leftSleeve' : id.includes('sleeve-r') ? 'rightSleeve'
    : id.includes('collar') ? 'collar' : id.includes('hood') ? 'hood'
    : id.includes('cuff') ? 'cuffs' : id.includes('hem') || id.includes('waist') ? 'hem'
    : id.includes('pocket') ? 'pocket' : 'body';
}

export function getGarmentColorZones(pieces: PatternPiece[]) {
  const present = new Set(pieces.map((piece) => getPatternColorZone(piece)));
  if (present.has('leftSleeve') || present.has('rightSleeve')) present.add('sleeves');
  return Object.entries({ body: 'Body', collar: 'Collar', sleeves: 'Both sleeves',
    leftSleeve: 'Left sleeve', rightSleeve: 'Right sleeve', hood: 'Hood',
    pocket: 'Pocket', hem: 'Hem / waistband', cuffs: 'Cuffs' })
    .filter(([key]) => present.has(key)).map(([key, label]) => ({ key, label }));
}

export function getPatternBounds(piece: PatternPiece, world = false) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const cos = Math.cos(piece.rotation), sin = Math.sin(piece.rotation);
  const transform = (p: { x: number; y: number }) => world
    ? { x: piece.position.x + p.x * cos - p.y * sin, y: piece.position.y + p.x * sin + p.y * cos }
    : p;
  const include = (p: { x: number; y: number }) => {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  };
  for (let i = 0; i < piece.points.length; i++) {
    const first = piece.points[i], last = piece.points[(i + 1) % piece.points.length];
    const a = transform(first), b = transform(last);
    include(a);
    const curve = piece.edgeCurvatures?.[i];
    if (!curve) continue;
    const c = transform({ x: (first.x + last.x) / 2 + curve.cpx, y: (first.y + last.y) / 2 + curve.cpy });
    for (const axis of ['x', 'y'] as const) {
      const denominator = a[axis] - 2 * c[axis] + b[axis];
      const t = denominator === 0 ? -1 : (a[axis] - c[axis]) / denominator;
      if (t > 0 && t < 1) {
        const m = 1 - t;
        include({ x: m * m * a.x + 2 * m * t * c.x + t * t * b.x,
          y: m * m * a.y + 2 * m * t * c.y + t * t * b.y });
      }
    }
  }
  if (!piece.points.length) minX = minY = maxX = maxY = 0;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function getGarmentSketchScale(piece: PatternPiece): number {
  return Math.min(0.7, 245 / Math.max(1, getPatternBounds(piece).height));
}

export function getPatternEdgeLength(piece: PatternPiece, edge: number, start = 0, end = 1): number {
  const a = piece.points[edge], b = piece.points[(edge + 1) % piece.points.length];
  if (!a || !b) return 0;
  const from = Math.max(0, Math.min(1, start)), to = Math.max(0, Math.min(1, end));
  const curve = piece.edgeCurvatures?.[edge];
  if (!curve) return Math.hypot(b.x - a.x, b.y - a.y) * Math.abs(to - from) / PATTERN_UNITS_PER_CM;
  const cx = (a.x + b.x) / 2 + curve.cpx, cy = (a.y + b.y) / 2 + curve.cpy;
  const point = (t: number) => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t * t * b.x,
    y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t * t * b.y });
  let previous = point(from), length = 0;
  for (let i = 1; i <= 32; i++) {
    const next = point(from + (to - from) * i / 32);
    length += Math.hypot(next.x - previous.x, next.y - previous.y);
    previous = next;
  }
  return length / PATTERN_UNITS_PER_CM;
}

export function scaleGrainlineAngle(angle: number, x: number, y: number) {
  return Math.atan2(Math.sin(angle * Math.PI / 180) * x, Math.cos(angle * Math.PI / 180) * y) * 180 / Math.PI;
}

export function scalePatternPiece(piece: PatternPiece, x: number, y: number): PatternPiece {
  if (piece.locked || !Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) return piece;
  return { ...piece, points: piece.points.map((p: Point2D) => ({ ...p, x: p.x * x, y: p.y * y })),
    ...(piece.cutting ? { cutting: { ...piece.cutting, grainlineAngle: scaleGrainlineAngle(piece.cutting.grainlineAngle, x, y) } } : {}),
    internalLines: piece.internalLines?.map((line) => ({ ...line, points: line.points.map((p) => ({ ...p, x: p.x * x, y: p.y * y })) })),
    edgeCurvatures: piece.edgeCurvatures && Object.fromEntries(Object.entries(piece.edgeCurvatures)
      .map(([edge, curve]) => [edge, { cpx: curve.cpx * x, cpy: curve.cpy * y }])) };
}

export function arrangePatternPieces(pieces: PatternPiece[]): PatternPiece[] {
  const bounds = pieces.map((piece) => getPatternBounds(piece, true));
  const columnWidth = [0, 0];
  bounds.forEach((b, i) => { columnWidth[i % 2] = Math.max(columnWidth[i % 2], b.width); });
  let rowY = 80;
  return pieces.map((piece, i) => {
    if (i > 0 && i % 2 === 0) rowY += Math.max(bounds[i - 2].height, bounds[i - 1].height) + 100;
    const columnX = 80 + (i % 2 === 1 ? columnWidth[0] + 100 : 0);
    return { ...piece, position: { x: piece.position.x + columnX - bounds[i].minX,
      y: piece.position.y + rowY - bounds[i].minY } };
  });
}
