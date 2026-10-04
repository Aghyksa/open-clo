import * as THREE from 'three';
import Delaunator from 'delaunator';
import type { AvatarConfig, PatternPiece, SeamConnection } from '../types/cad';
import { PATTERN_UNITS_PER_METER, getPatternColorZone, getPatternBounds } from './patternGeometry';
import {
  getArmAxis,
  getArmGirth,
  getBodyCrossSection,
  getBodyScale,
  getNeckY,
  type BodyScale,
} from './avatarBody';

export { PATTERN_UNITS_PER_METER } from './patternGeometry';

const TARGET_VERTICES = 4200;
const MIN_SPACING = 0.010;
const MAX_VERTICES = 8000;
const MAX_OUTLINE_POINTS = 2048;
const MAX_PATTERN_COORDINATE = PATTERN_UNITS_PER_METER * 100;
const BODY_CLEARANCE = 0.025;
/** |placement.origin3D.x| above this means the panel wraps an arm instead of the torso. */
const ARM_MOUNT_X = 0.25;

export interface ConstraintSet {
  a: Int32Array;
  b: Int32Array;
  rest: Float32Array;
  stiffness: Float32Array;
}

export interface MeshGroup {
  start: number;
  count: number;
  materialIndex: number;
  pieceId: string;
  zone: string;
}

export interface GarmentMesh {
  vertexCount: number;
  positions: Float32Array;
  uvs: Float32Array;
  invMass: Float32Array;
  /** Index into the piece list each vertex came from; handy for inspection and per-piece tooling. */
  pieceOfVertex: Int32Array;
  indices: Uint32Array;
  groups: MeshGroup[];
  structural: ConstraintSet;
  bending: ConstraintSet;
  seams: ConstraintSet;
  spacing: number;
}

interface Sample {
  x: number;
  y: number;
  edge: number;
  t: number;
}

interface PieceMesh {
  piece: PatternPiece;
  points: { x: number; y: number }[];
  boundaryCount: number;
  edgeSamples: Map<number | string, { t: number; local: number }[]>;
  tris: number[];
  base: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  isArm: boolean;
}

function quadPoint(p1: Vec2, cp: Vec2, p2: Vec2, t: number): Vec2 {
  const m = 1 - t;
  return {
    x: m * m * p1.x + 2 * m * t * cp.x + t * t * p2.x,
    y: m * m * p1.y + 2 * m * t * cp.y + t * t * p2.y,
  };
}

interface Vec2 {
  x: number;
  y: number;
}

function quadLength(p1: Vec2, cp: Vec2, p2: Vec2): number {
  let len = 0;
  let prev = p1;
  for (let i = 1; i <= 8; i++) {
    const pt = quadPoint(p1, cp, p2, i / 8);
    len += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    prev = pt;
  }
  return len;
}

/** Walk the closed outline, honouring per-edge quadratic curvature, emitting samples every `step` units. */
function sampleOutline(piece: PatternPiece, step: number): Sample[] {
  const pts = piece.points;
  const curves = piece.edgeCurvatures || {};
  const out: Sample[] = [];

  for (let e = 0; e < pts.length; e++) {
    const p1 = pts[e];
    const p2 = pts[(e + 1) % pts.length];
    const curv = curves[e];
    const cp = curv
      ? { x: (p1.x + p2.x) / 2 + curv.cpx, y: (p1.y + p2.y) / 2 + curv.cpy }
      : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const len = curv ? quadLength(p1, cp, p2) : Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const n = Math.max(1, Math.ceil(len / step));

    for (let i = 0; i < n; i++) {
      const t = i / n;
      const pt = curv
        ? quadPoint(p1, cp, p2, t)
        : { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
      out.push({ x: pt.x, y: pt.y, edge: e, t });
    }
  }
  return out;
}

function pointInPolygon(x: number, y: number, poly: Sample[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToOutline(x: number, y: number, poly: Sample[]): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x;
    const ay = poly[j].y;
    const bx = poly[i].x;
    const by = poly[i].y;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lenSq)) : 0;
    const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
    if (d < best) best = d;
  }
  return best;
}

/** Boundary samples plus interior fill, Delaunay-triangulated and clipped back to the polygon. */
function triangulatePiece(piece: PatternPiece, step: number): PieceMesh | null {
  if (piece.points.length < 3) return null;
  if (piece.visible === false) return null;

  const outline = sampleOutline(piece, step);
  if (outline.length < 3) return null;

  const points: { x: number; y: number }[] = outline.map((s) => ({ x: s.x, y: s.y }));
  const edgeSamples = new Map<number | string, { t: number; local: number }[]>();
  outline.forEach((s, i) => {
    const list = edgeSamples.get(s.edge) || [];
    list.push({ t: s.t, local: i });
    edgeSamples.set(s.edge, list);
  });
  let boundaryIndex = 0;
  for (let edge = 0; edge < piece.points.length; edge++) {
    const list = edgeSamples.get(edge)!;
    boundaryIndex += list.length;
    list.push({ t: 1, local: boundaryIndex % outline.length });
  }
  for (const list of edgeSamples.values()) list.sort((a, b) => a.t - b.t);

  const xs = outline.map((s) => s.x);
  const ys = outline.map((s) => s.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const pointIds = new Map(points.map((point, index) => [`${point.x.toFixed(5)},${point.y.toFixed(5)}`, index]));
  for (const line of piece.internalLines || []) {
    for (let edge = 0; edge + 1 < line.points.length; edge++) {
      const a = line.points[edge], b = line.points[edge + 1];
      const samples: { t: number; local: number }[] = [];
      const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
      for (let i = 0; i <= count; i++) {
        const t = i / count, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (!pointInPolygon(x, y, outline) && distToOutline(x, y, outline) > step * 0.01) continue;
        const key = `${x.toFixed(5)},${y.toFixed(5)}`;
        let local = pointIds.get(key);
        if (local == null) { local = points.length; pointIds.set(key, local); points.push({ x, y }); }
        samples.push({ t, local });
      }
      edgeSamples.set(`${line.id}:${edge}`, samples);
    }
  }

  const rowStep = step * 0.866;
  let row = 0;
  for (let y = minY + rowStep * 0.5; y < maxY; y += rowStep, row++) {
    const offset = (row % 2) * step * 0.5;
    for (let x = minX + offset; x < maxX; x += step) {
      if (!pointInPolygon(x, y, outline)) continue;
      if (distToOutline(x, y, outline) < step * 0.55) continue;
      points.push({ x, y });
    }
  }

  const coords = new Float64Array(points.length * 2);
  points.forEach((p, i) => {
    coords[i * 2] = p.x;
    coords[i * 2 + 1] = p.y;
  });

  const delaunay = new Delaunator(coords);
  const raw = delaunay.triangles;
  const tris: number[] = [];
  const maxEdge = step * 2.6;

  for (let i = 0; i < raw.length; i += 3) {
    const a = raw[i];
    const b = raw[i + 1];
    const c = raw[i + 2];
    const cx = (points[a].x + points[b].x + points[c].x) / 3;
    const cy = (points[a].y + points[b].y + points[c].y) / 3;
    if (!pointInPolygon(cx, cy, outline)) continue;
    const eab = Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
    const ebc = Math.hypot(points[b].x - points[c].x, points[b].y - points[c].y);
    const eca = Math.hypot(points[c].x - points[a].x, points[c].y - points[a].y);
    if (eab > maxEdge || ebc > maxEdge || eca > maxEdge) continue;
    tris.push(a, b, c);
  }

  if (tris.length === 0) return null;

  const originX = piece.placement?.origin3D?.[0] ?? 0;
  return {
    piece,
    points,
    boundaryCount: outline.length,
    edgeSamples,
    tris,
    base: 0,
    minX,
    maxX,
    minY,
    maxY,
    isArm: piece.role ? piece.role === 'leftSleeve' || piece.role === 'rightSleeve' : Math.abs(originX) >= ARM_MOUNT_X,
  };
}

/** Wrap a piece's flat coordinates onto the body (or an arm) so seams start close to their partners. */
function placeVertices(
  pm: PieceMesh,
  topY: number,
  scale: BodyScale,
  armGirth: number,
  out: Float32Array,
  uvs: Float32Array,
) {
  const upm = PATTERN_UNITS_PER_METER;
  const cx = (pm.minX + pm.maxX) / 2;
  const width = Math.max(1e-6, (pm.maxX - pm.minX) / upm);
  const height = Math.max(1e-6, (pm.maxY - pm.minY) / upm);
  const origin = pm.piece.placement?.origin3D ?? [0, 0, 0];
  const azimuth = Math.atan2(origin[0], origin[2]);

  if (pm.piece.placement?.surface === 'hood') {
    const side = Math.sign(origin[0]) || 1;
    for (let i = 0; i < pm.points.length; i++) {
      const p = pm.points[i], v = (pm.base + i) * 3, u = (pm.base + i) * 2;
      out[v] = side * 0.11 * scale.y;
      out[v + 1] = getNeckY(scale) + (pm.maxY - p.y) / upm - 0.025;
      out[v + 2] = -p.x / upm - 0.04 * scale.z;
      uvs[u] = (p.x - pm.minX) / upm / width;
      uvs[u + 1] = 1 - (p.y - pm.minY) / upm / height;
    }
    return;
  }

  if (pm.isArm) {
    const side = Math.sign(origin[0]) || 1;
    const axis = getArmAxis(side, scale, armGirth);
    const tangent = new THREE.Vector3().subVectors(axis.end, axis.start).normalize();
    // perp1 carries `side` so the two sleeves are true mirrors; without it one tube ends up rolled
    // 180 degrees and its cap seam faces away from the armhole.
    // -side keeps the cap crown (local x = 0) on top of the arm and the underarm edges below it;
    // the sign also makes the two sleeves true mirrors instead of one rolled 180 degrees.
    const perp1 = new THREE.Vector3()
      .crossVectors(tangent, new THREE.Vector3(0, 0, 1))
      .normalize()
      .multiplyScalar(-side);
    const perp2 = new THREE.Vector3().crossVectors(tangent, perp1).normalize();
    const axisLen = axis.start.distanceTo(axis.end);
    const tubeRadius = width / (2 * Math.PI);

    for (let i = 0; i < pm.points.length; i++) {
      const p = pm.points[i];
      const along = (p.y - pm.minY) / upm;
      const t = axisLen > 0 ? along / axisLen : 0;
      const radius = Math.max(tubeRadius, axis.radiusAt(t) + 0.006);
      const theta = ((p.x - cx) / upm / radius) * side;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const v = (pm.base + i) * 3;
      out[v] = axis.start.x + tangent.x * along + (perp1.x * cos + perp2.x * sin) * radius;
      out[v + 1] = axis.start.y + tangent.y * along + (perp1.y * cos + perp2.y * sin) * radius;
      out[v + 2] = axis.start.z + tangent.z * along + (perp1.z * cos + perp2.z * sin) * radius;

      const u = (pm.base + i) * 2;
      uvs[u] = (p.x - pm.minX) / upm / width;
      uvs[u + 1] = 1 - (p.y - pm.minY) / upm / height;
    }
    return;
  }

  const facesFront = Math.cos(azimuth) >= 0;
  // Pattern pieces are all drawn from the front, so a rear panel wraps the other way round the body;
  // without the flip a front panel's left side seam meets the back panel's right one.
  const wrap = facesFront ? 1 : -1;
  for (let i = 0; i < pm.points.length; i++) {
    const p = pm.points[i];
    const y = topY - (p.y - pm.minY) / upm;
    const cross = getBodyCrossSection(y, scale);
    const radius = Math.max(Math.max(cross.halfWidth, cross.halfDepth) + BODY_CLEARANCE, width / Math.PI);
    const theta = azimuth + (wrap * (p.x - cx)) / upm / radius;
    const v = (pm.base + i) * 3;
    out[v] = radius * Math.sin(theta);
    out[v + 1] = y;
    out[v + 2] = radius * Math.cos(theta) + cross.zCenter;

    // Texture atlas: front panels on the left half, back panels on the right half.
    const local = (p.x - pm.minX) / upm / width;
    const u = (pm.base + i) * 2;
    uvs[u] = facesFront ? local * 0.5 : 0.5 + local * 0.5;
    uvs[u + 1] = 1 - (p.y - pm.minY) / upm / height;
  }
}

function buildConstraintSet(
  pairs: { a: number; b: number; stiffness: number }[],
  positions: Float32Array,
  restOverride?: number,
): ConstraintSet {
  const a = new Int32Array(pairs.length);
  const b = new Int32Array(pairs.length);
  const rest = new Float32Array(pairs.length);
  const stiffness = new Float32Array(pairs.length);

  pairs.forEach((pair, i) => {
    a[i] = pair.a;
    b[i] = pair.b;
    stiffness[i] = pair.stiffness;
    if (restOverride !== undefined) {
      rest[i] = restOverride;
    } else {
      const ia = pair.a * 3;
      const ib = pair.b * 3;
      rest[i] = Math.hypot(
        positions[ib] - positions[ia],
        positions[ib + 1] - positions[ia + 1],
        positions[ib + 2] - positions[ia + 2],
      );
    }
  });

  return { a, b, rest, stiffness };
}

function edgeSamplesFor(
  pm: PieceMesh,
  edgeIndex: number,
  paramStart?: number,
  paramEnd?: number,
  internalLineId?: string,
): number[] {
  const list = pm.edgeSamples.get(internalLineId ? `${internalLineId}:${edgeIndex}` : edgeIndex);
  if (!list || list.length === 0) return [];
  const lo = Math.min(paramStart ?? 0, paramEnd ?? 1);
  const hi = Math.max(paramStart ?? 0, paramEnd ?? 1);
  const picked = list.filter((s) => s.t >= lo - 1e-6 && s.t <= hi + 1e-6);
  if (picked.length > 0) return picked.map((s) => pm.base + s.local);

  // Sub-range shorter than one sample step: take the nearest sample instead of the whole edge.
  const mid = (lo + hi) / 2;
  let best = list[0];
  for (const s of list) if (Math.abs(s.t - mid) < Math.abs(best.t - mid)) best = s;
  return [pm.base + best.local];
}

function pairCost(a: number[], b: number[], positions: Float32Array, flip: boolean): number {
  const n = Math.min(a.length, b.length);
  let cost = 0;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1);
    const ia = a[Math.round(u * (a.length - 1))] * 3;
    const ib = b[Math.round((flip ? 1 - u : u) * (b.length - 1))] * 3;
    cost += Math.hypot(
      positions[ib] - positions[ia],
      positions[ib + 1] - positions[ia + 1],
      positions[ib + 2] - positions[ia + 2],
    );
  }
  return cost;
}

/**
 * Triangulate every pattern piece, wrap the panels around the body, and turn the seam list into
 * vertex pairs. This is the only place 2D pattern data becomes 3D cloth.
 */
export function buildGarmentMesh(
  pieces: PatternPiece[],
  seams: SeamConnection[],
  avatar: AvatarConfig,
  stretchStiffness: number,
  bendingStiffness: number,
): GarmentMesh | null {
  const usable = pieces.filter((p) => p.points.length >= 3 && p.visible !== false);
  if (usable.length === 0) return null;
  const pointCount = usable.reduce((sum, piece) => sum + piece.points.length
    + (piece.internalLines || []).reduce((count, line) => count + line.points.length, 0), 0);
  if (pointCount > MAX_OUTLINE_POINTS) return null;
  for (const piece of usable) {
    if ([...piece.points, ...(piece.internalLines || []).flatMap((line) => line.points)]
      .some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)
        || Math.abs(point.x) > MAX_PATTERN_COORDINATE || Math.abs(point.y) > MAX_PATTERN_COORDINATE)) return null;
    if (Object.values(piece.edgeCurvatures || {}).some((curve) => !Number.isFinite(curve.cpx) || !Number.isFinite(curve.cpy)
      || Math.abs(curve.cpx) > MAX_PATTERN_COORDINATE || Math.abs(curve.cpy) > MAX_PATTERN_COORDINATE)) return null;
    if (piece.placement?.origin3D?.some((coordinate) => !Number.isFinite(coordinate))
      || (piece.placement?.anchorY != null && !Number.isFinite(piece.placement.anchorY))) return null;
  }

  // Bounding rectangles bound the grid work even for long, thin or highly concave outlines.
  let totalArea = 0, totalPerimeter = 0;
  for (const piece of usable) {
    const bounds = getPatternBounds(piece);
    totalArea += bounds.width * bounds.height / (PATTERN_UNITS_PER_METER * PATTERN_UNITS_PER_METER);
    for (let edge = 0; edge < piece.points.length; edge++) {
      const a = piece.points[edge], b = piece.points[(edge + 1) % piece.points.length], curve = piece.edgeCurvatures?.[edge];
      totalPerimeter += (curve ? quadLength(a, { x: (a.x + b.x) / 2 + curve.cpx, y: (a.y + b.y) / 2 + curve.cpy }, b)
        : Math.hypot(b.x - a.x, b.y - a.y)) / PATTERN_UNITS_PER_METER;
    }
    for (const line of piece.internalLines || []) {
      for (let edge = 0; edge + 1 < line.points.length; edge++) {
        totalPerimeter += Math.hypot(line.points[edge + 1].x - line.points[edge].x, line.points[edge + 1].y - line.points[edge].y) / PATTERN_UNITS_PER_METER;
      }
    }
  }
  if (!Number.isFinite(totalArea) || !Number.isFinite(totalPerimeter)) return null;
  const spacing = Math.max(Math.sqrt(totalArea / TARGET_VERTICES), totalPerimeter / (MAX_VERTICES * 0.35), MIN_SPACING);
  const step2D = spacing * PATTERN_UNITS_PER_METER;

  const meshes: PieceMesh[] = [];
  let vertexCount = 0;
  for (const piece of usable) {
    const pm = triangulatePiece(piece, step2D);
    if (!pm) continue;
    pm.base = vertexCount;
    vertexCount += pm.points.length;
    if (vertexCount > MAX_VERTICES) return null;
    meshes.push(pm);
  }
  if (meshes.length === 0) return null;

  const scale = getBodyScale(avatar);
  const armGirth = getArmGirth(avatar);
  const neckY = getNeckY(scale);

  // Auto-anchor: the highest point of the whole garment hangs at the neck, unless a piece pins
  // itself with placement.anchorY (skirts and anything else that hangs from the waist).
  let anchorOffset = 0;
  let highest = -Infinity;
  const mainPanels = meshes.filter((pm) => !pm.isArm && (pm.piece.role ? pm.piece.role === 'front' || pm.piece.role === 'back' : /front|back/.test(pm.piece.id)));
  for (const pm of mainPanels.length ? mainPanels : meshes) {
    if (pm.piece.placement?.anchorY != null) continue;
    const originY = pm.piece.placement?.origin3D?.[1] ?? 0;
    const halfUp = (pm.maxY - pm.minY) / 2 / PATTERN_UNITS_PER_METER;
    highest = Math.max(highest, originY + halfUp);
  }
  if (highest > -Infinity) anchorOffset = neckY - highest;

  const positions = new Float32Array(vertexCount * 3);
  const flatPositions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const invMass = new Float32Array(vertexCount).fill(1);
  const pieceOfVertex = new Int32Array(vertexCount);

  meshes.forEach((pm, index) => {
    for (let i = 0; i < pm.points.length; i++) {
      pieceOfVertex[pm.base + i] = index;
      flatPositions[(pm.base + i) * 3] = pm.points[i].x / PATTERN_UNITS_PER_METER;
      flatPositions[(pm.base + i) * 3 + 1] = pm.points[i].y / PATTERN_UNITS_PER_METER;
    }
  });

  for (const pm of meshes) {
    const anchor = pm.piece.placement?.anchorY;
    const originY = pm.piece.placement?.origin3D?.[1] ?? 0;
    const halfUp = (pm.maxY - pm.minY) / 2 / PATTERN_UNITS_PER_METER;
    const topY = anchor != null ? anchor * scale.y : originY + anchorOffset + halfUp;
    placeVertices(pm, topY, scale, armGirth, positions, uvs);

    // A worn hood rests at the head crown; a small support patch keeps its opening over the face.
    if (pm.piece.placement?.surface === 'hood') {
      const band = spacing * PATTERN_UNITS_PER_METER * 0.6;
      for (let i = 0; i < pm.points.length; i++) {
        if (pm.points[i].y <= pm.minY + band && Math.abs(pm.points[i].x) <= band) invMass[pm.base + i] = 0;
      }
    }

    // An explicit anchor means the piece hangs from a waistband: pin its top edge, otherwise it just
    // slides down the body, which has no hip shelf to catch a skirt.
    if (anchor != null) {
      const band = pm.minY + spacing * PATTERN_UNITS_PER_METER * 0.6;
      for (let i = 0; i < pm.points.length; i++) {
        if (pm.points[i].y <= band) invMass[pm.base + i] = 0;
      }
    }
  }

  // Triangles, torso group first so the viewport can give sleeves their own material.
  const triangleIndices: number[] = [];
  const groups: MeshGroup[] = [];
  const edgeMap = new Map<number, number[]>();
  const structural: { a: number; b: number; stiffness: number }[] = [];
  const seen = new Set<number>();

  const addEdge = (a: number, b: number, opposite: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = lo * vertexCount + hi;
    if (!seen.has(key)) {
      seen.add(key);
      structural.push({ a: lo, b: hi, stiffness: stretchStiffness });
    }
    const list = edgeMap.get(key);
    if (list) list.push(opposite);
    else edgeMap.set(key, [opposite]);
  };

  for (const pm of meshes) {
    const start = triangleIndices.length;
    const sink = triangleIndices;
    for (let i = 0; i < pm.tris.length; i += 3) {
      const a = pm.base + pm.tris[i];
      const b = pm.base + pm.tris[i + 1];
      const c = pm.base + pm.tris[i + 2];
      sink.push(a, b, c);
      addEdge(a, b, c);
      addEdge(b, c, a);
      addEdge(c, a, b);
    }
    const id = pm.piece.id;
    const zone = getPatternColorZone(pm.piece);
    groups.push({ start, count: triangleIndices.length - start, materialIndex: groups.length, pieceId: id, zone });
  }

  const bending: { a: number; b: number; stiffness: number }[] = [];
  for (const opposites of edgeMap.values()) {
    for (let i = 0; i + 1 < opposites.length; i++) {
      bending.push({ a: opposites[i], b: opposites[i + 1], stiffness: bendingStiffness });
    }
  }

  // Seams: sample both edges, pair by normalised position, keep whichever direction is shorter in 3D.
  const byId = new Map<string, PieceMesh>();
  for (const pm of meshes) byId.set(pm.piece.id, pm);
  const seamPairs: { a: number; b: number; stiffness: number }[] = [];

  for (const seam of seams) {
    const pa = byId.get(seam.edgeA.pieceId);
    const pb = byId.get(seam.edgeB.pieceId);
    if (!pa || !pb) continue;
    const listA = edgeSamplesFor(pa, seam.edgeA.edgeIndex, seam.edgeA.paramStart, seam.edgeA.paramEnd, seam.edgeA.internalLineId);
    const listB = edgeSamplesFor(pb, seam.edgeB.edgeIndex, seam.edgeB.paramStart, seam.edgeB.paramEnd, seam.edgeB.internalLineId);
    if (listA.length === 0 || listB.length === 0) continue;

    const flip = pairCost(listA, listB, positions, true) < pairCost(listA, listB, positions, false);
    // Stitch at the density of the finer edge so a long edge eased into a short one stays closed.
    const n = Math.max(2, listA.length, listB.length);
    const strength = THREE.MathUtils.clamp(Number.isFinite(seam.strength) ? seam.strength : 1, 0.1, 1);

    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const ia = listA[Math.round(u * (listA.length - 1))];
      const ib = listB[Math.round((flip ? 1 - u : u) * (listB.length - 1))];
      if (ia !== ib) seamPairs.push({ a: ia, b: ib, stiffness: strength });
    }
  }

  const indices = new Uint32Array(triangleIndices);
  if (!positions.every(Number.isFinite) || !flatPositions.every(Number.isFinite) || !uvs.every(Number.isFinite)) return null;

  return {
    vertexCount,
    positions,
    uvs,
    invMass,
    pieceOfVertex,
    indices,
    groups,
    structural: buildConstraintSet(structural, flatPositions),
    bending: buildConstraintSet(bending, flatPositions),
    seams: buildConstraintSet(seamPairs, positions, 0),
    spacing,
  };
}
