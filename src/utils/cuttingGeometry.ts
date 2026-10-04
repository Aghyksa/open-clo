import type { PatternPiece } from '../types/cad';
import { getPatternBounds, PATTERN_UNITS_PER_CM } from './patternGeometry';

type XY = { x: number; y: number };
export type CuttingSegment = { start: XY; end: XY };
export interface PieceCuttingGeometry {
  grainline?: CuttingSegment;
  notches: CuttingSegment[];
  cutOutline?: XY[];
  allowanceMessage: string;
  labels: string[];
}

const cross = (a: XY, b: XY) => a.x * b.y - a.y * b.x;
const subtract = (a: XY, b: XY): XY => ({ x: a.x - b.x, y: a.y - b.y });
const EPSILON = 1e-8;

function edgePoint(piece: PatternPiece, edge: number, t: number): XY {
  const a = piece.points[edge], b = piece.points[(edge + 1) % piece.points.length];
  const curve = piece.edgeCurvatures?.[edge];
  if (!curve) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const c = { x: (a.x + b.x) / 2 + curve.cpx, y: (a.y + b.y) / 2 + curve.cpy };
  return { x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
    y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y };
}

function edgeTangent(piece: PatternPiece, edge: number, t: number): XY {
  const a = piece.points[edge], b = piece.points[(edge + 1) % piece.points.length];
  const curve = piece.edgeCurvatures?.[edge];
  return curve ? { x: b.x - a.x + 2 * curve.cpx * (1 - 2 * t),
    y: b.y - a.y + 2 * curve.cpy * (1 - 2 * t) } : subtract(b, a);
}

function winding(piece: PatternPiece): number {
  let area = 0;
  for (let i = 0; i < piece.points.length; i++) {
    const a = piece.points[i], b = piece.points[(i + 1) % piece.points.length];
    const curve = piece.edgeCurvatures?.[i];
    const c = { x: (a.x + b.x) / 2 + (curve?.cpx || 0), y: (a.y + b.y) / 2 + (curve?.cpy || 0) };
    area += (cross(a, b) + 2 * cross(a, c) + 2 * cross(c, b)) / 3;
  }
  return Math.sign(area);
}

function roots(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < EPSILON) return Math.abs(b) < EPSILON ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant <= EPSILON) return [];
  const q = -.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(discriminant));
  return [q / a, c / q];
}

function grainline(piece: PatternPiece, degrees: number): CuttingSegment | undefined {
  const bounds = getPatternBounds(piece), angle = degrees * Math.PI / 180;
  const direction = { x: Math.sin(angle), y: -Math.cos(angle) };
  const origin = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const signed = (p: XY) => cross(direction, subtract(p, origin));
  const distances: number[] = [];
  for (let i = 0; i < piece.points.length; i++) {
    const a = piece.points[i], b = piece.points[(i + 1) % piece.points.length], curve = piece.edgeCurvatures?.[i];
    const c = { x: (a.x + b.x) / 2 + (curve?.cpx || 0), y: (a.y + b.y) / 2 + (curve?.cpy || 0) };
    const sA = signed(a), sB = signed(b), sC = signed(c);
    const candidates = roots(sA - 2 * sC + sB, 2 * (sC - sA), sA)
      .filter((t) => t > EPSILON && t < 1 - EPSILON);
    if (Math.abs(sA) < EPSILON) {
      const previous = edgePoint(piece, (i + piece.points.length - 1) % piece.points.length, 1 - .00001);
      const next = edgePoint(piece, i, .00001);
      if (signed(previous) * signed(next) < 0) candidates.push(0);
    }
    for (const t of candidates) {
      const p = edgePoint(piece, i, t);
      distances.push((p.x - origin.x) * direction.x + (p.y - origin.y) * direction.y);
    }
  }
  distances.sort((a, b) => a - b);
  const crossings = distances.filter((value, i) => i === 0 || Math.abs(value - distances[i - 1]) > EPSILON);
  if (crossings.length % 2 !== 0) return;
  let start = 0, end = 0;
  for (let i = 0; i < crossings.length; i += 2) {
    if (crossings[i + 1] - crossings[i] > end - start) [start, end] = [crossings[i], crossings[i + 1]];
  }
  if (end - start < 3) return;
  const inset = (end - start) * .15;
  const at = (distance: number): XY => ({ x: origin.x + direction.x * distance, y: origin.y + direction.y * distance });
  return { start: at(start + inset), end: at(end - inset) };
}

// Only simple convex straight outlines get an exact uniform miter offset; other shapes remain visibly uncut.
function convexAllowance(piece: PatternPiece, distance: number): XY[] | undefined {
  if (piece.cutting?.onFold || Object.values(piece.edgeCurvatures || {}).some((c) => c.cpx !== 0 || c.cpy !== 0)) return;
  const side = winding(piece);
  if (!side || piece.points.length < 3) return;
  const edges = piece.points.map((p, i) => subtract(piece.points[(i + 1) % piece.points.length], p));
  if (edges.some((v) => Math.hypot(v.x, v.y) < EPSILON)) return;
  const normals = edges.map((v) => ({ x: side * v.y / Math.hypot(v.x, v.y), y: -side * v.x / Math.hypot(v.x, v.y) }));
  let turn = 0;
  const outline: XY[] = [];
  for (let i = 0; i < edges.length; i++) {
    const previous = (i + edges.length - 1) % edges.length;
    const u = edges[previous], v = edges[i], determinant = cross(u, v);
    const angle = Math.atan2(determinant, u.x * v.x + u.y * v.y);
    if (angle * side < -EPSILON || Math.abs(angle) >= Math.PI - EPSILON) return;
    turn += angle;
    const p = { x: piece.points[i].x + normals[previous].x * distance,
      y: piece.points[i].y + normals[previous].y * distance };
    const q = { x: piece.points[i].x + normals[i].x * distance,
      y: piece.points[i].y + normals[i].y * distance };
    const t = Math.abs(determinant) < EPSILON ? 0 : cross(subtract(q, p), v) / determinant;
    const corner = { x: p.x + t * u.x, y: p.y + t * u.y };
    if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y)
      || Math.hypot(corner.x - piece.points[i].x, corner.y - piece.points[i].y) > distance * 20) return;
    outline.push(corner);
  }
  return Math.abs(turn - side * Math.PI * 2) < .00001 ? outline : undefined;
}

export function getPieceCuttingGeometry(piece: PatternPiece): PieceCuttingGeometry {
  const cutting = piece.cutting;
  if (!cutting || piece.points.length < 3) return { notches: [], allowanceMessage: 'Cutting details not set', labels: ['Cutting details not set'] };
  const side = winding(piece), notchDepth = 3 * PATTERN_UNITS_PER_CM / 10;
  const notches: CuttingSegment[] = [];
  for (const notch of cutting.notches) {
    if (!Number.isInteger(notch.edgeIndex) || !piece.points[notch.edgeIndex] || !Number.isFinite(notch.param)
      || notch.param < 0 || notch.param > 1 || !side) continue;
    const tangent = edgeTangent(piece, notch.edgeIndex, notch.param), speed = Math.hypot(tangent.x, tangent.y);
    if (speed < EPSILON) continue;
    const params = notch.count === 2 ? [Math.max(0, notch.param - notchDepth / speed / 2),
      Math.min(1, notch.param + notchDepth / speed / 2)] : [notch.param];
    for (const param of params) {
      const start = edgePoint(piece, notch.edgeIndex, param), direction = edgeTangent(piece, notch.edgeIndex, param);
      const length = Math.hypot(direction.x, direction.y);
      if (length < EPSILON) continue;
      notches.push({ start, end: { x: start.x + side * direction.y / length * notchDepth,
        y: start.y - side * direction.x / length * notchDepth } });
    }
  }
  const allowance = cutting.seamAllowanceMm;
  const cutOutline = allowance > 0 ? convexAllowance(piece, allowance * PATTERN_UNITS_PER_CM / 10) : undefined;
  const allowanceMessage = allowance === 0 ? '0 mm allowance; none added'
    : cutOutline ? `${allowance} mm allowance added; outer blue line is cut outline`
    : `${allowance} mm allowance recorded only; not added (${cutting.onFold ? 'fold edge must be specified' : 'unsupported curved, concave or degenerate outline'})`;
  return { grainline: grainline(piece, cutting.grainlineAngle), notches, cutOutline, allowanceMessage,
    labels: [`Cut ${cutting.quantity}${cutting.onFold ? ' on fold (verify fold edge)' : ''}`,
      allowance === 0 ? 'Allowance 0 mm; none added' : `Allowance ${allowance} mm ${cutOutline ? 'added' : 'recorded only; not added'}`] };
}

export function getGrainlineSegments(line: CuttingSegment): CuttingSegment[] {
  const delta = subtract(line.end, line.start), length = Math.hypot(delta.x, delta.y);
  if (length < EPSILON) return [];
  const x = delta.x / length, y = delta.y / length, size = Math.min(3, length / 5);
  return [line, ...[line.start, line.end].flatMap((tip, i) => [-1, 1].map((side) => ({ start: tip,
    end: { x: tip.x + x * size * (i === 0 ? 1 : -1) - y * size * .45 * side,
      y: tip.y + y * size * (i === 0 ? 1 : -1) + x * size * .45 * side } })))];
}
