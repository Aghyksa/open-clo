import * as THREE from 'three';
import type { PatternPiece, SeamConnection, FabricMaterial } from '../types/cad';

export interface ClothParticle {
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  originalPos: THREE.Vector3;
  local2D: { x: number; y: number };
  invMass: number;
  normal: THREE.Vector3;
  uv: THREE.Vector2;
  pinned: boolean;
  pieceId: string;
}

export interface DistanceConstraint {
  p1: number;
  p2: number;
  restLength: number;
  stiffness: number;
}

export interface SeamConstraint {
  p1: number;
  p2: number;
  restLength: number;
  strength: number;
}

export interface AvatarCollider {
  type: 'capsule' | 'sphere';
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

// ─── Mannequin body profile measured from femaleMannequin.glb ───
// [Y-coordinate, half-width-X, half-depth-Z, z-center]
// Z convention from GLB: Z-min = front, Z-max = back
const BODY_PROFILE: [number, number, number, number][] = [
  [0.000, 0.253, 0.121, 0.111],
  [0.083, 0.237, 0.054, 0.054],
  [0.168, 0.228, 0.050, 0.040],
  [0.253, 0.229, 0.052, 0.035],
  [0.371, 0.236, 0.057, 0.004],
  [0.490, 0.215, 0.065, 0.015],
  [0.592, 0.192, 0.065, 0.030],
  [0.676, 0.196, 0.077, 0.039],
  [0.710, 0.194, 0.083, 0.035],
  [0.744, 0.183, 0.085, 0.035],
  [0.795, 0.194, 0.089, 0.026],
  [0.846, 0.185, 0.091, 0.030],
  [0.897, 0.170, 0.106, 0.038],
  [0.948, 0.159, 0.104, 0.035],
  [0.981, 0.154, 0.096, 0.038],
  [1.015, 0.152, 0.090, 0.035],
  [1.066, 0.155, 0.080, 0.035],
  [1.134, 0.160, 0.075, 0.035],
  [1.202, 0.168, 0.104, 0.035],
  [1.253, 0.175, 0.110, 0.057],
  [1.303, 0.115, 0.093, 0.057],
  [1.354, 0.080, 0.080, 0.057],
  [1.405, 0.055, 0.072, 0.057],
  [1.473, 0.048, 0.077, 0.058],
];

// ─── Garment template definitions ───
const TSHIRT_TOP_Y = 1.25;    // shoulders
const TSHIRT_HEM_Y = 0.72;    // hips
const DRESS_HEM_Y = 0.37;     // knees

const TUBE_COLS = 32;          // columns around circumference
const GARMENT_EASE = 1.07;     // 7% larger than body

// ─── Procedural wrinkle noise (value noise) ───
function hashNoise(x: number, y: number): number {
  // Simple hash-based noise for deterministic wrinkle patterns
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  // Smoothstep interpolation
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hashNoise(ix, iy);
  const n10 = hashNoise(ix + 1, iy);
  const n01 = hashNoise(ix, iy + 1);
  const n11 = hashNoise(ix + 1, iy + 1);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

function fbmNoise(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (smoothNoise(x * frequency, y * frequency) * 2 - 1);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

export class ClothSimulator {
  particles: ClothParticle[] = [];
  constraints: DistanceConstraint[] = [];
  seamConstraints: SeamConstraint[] = [];
  colliders: AvatarCollider[] = [];
  indices: number[] = [];
  stressMap: Float32Array = new Float32Array(0);

  gravity: THREE.Vector3 = new THREE.Vector3(0, -9.8, 0);
  damping: number = 0.988;
  iterations: number = 14;
  simTime: number = 0;

  // Per-particle animation data (cached for performance)
  private _wrinkleOffsets: Float32Array = new Float32Array(0);
  private _breathPhases: Float32Array = new Float32Array(0);
  private _swayPhases: Float32Array = new Float32Array(0);
  private _hemWeights: Float32Array = new Float32Array(0);

  constructor() {
    this.setupAvatarColliders();
  }

  setupAvatarColliders() {
    this.colliders = [];

    const armData: [number, number, number][] = [
      [1.253, -0.250, 0.060],
      [1.185, -0.340, 0.055],
      [1.100, -0.440, 0.048],
      [1.015, -0.520, 0.042],
      [0.948, -0.570, 0.038],
    ];

    for (let i = 0; i < armData.length - 1; i++) {
      const [y1, x1, r1] = armData[i];
      const [y2, x2, r2] = armData[i + 1];
      const avgR = (r1 + r2) / 2;

      this.colliders.push({
        type: 'capsule',
        start: new THREE.Vector3(x1, y1, 0.04),
        end: new THREE.Vector3(x2, y2, 0.04),
        radius: avgR,
      });
      this.colliders.push({
        type: 'capsule',
        start: new THREE.Vector3(-x1, y1, 0.04),
        end: new THREE.Vector3(-x2, y2, 0.04),
        radius: avgR,
      });
    }

    this.colliders.push({
      type: 'capsule',
      start: new THREE.Vector3(0, 1.35, 0.057),
      end: new THREE.Vector3(0, 1.48, 0.058),
      radius: 0.06,
    });
  }

  // Get body cross-section at Y height by interpolating BODY_PROFILE
  private getBodyCrossSection(y: number): { halfWidth: number; halfDepth: number; zCenter: number } {
    if (y <= BODY_PROFILE[0][0]) {
      return { halfWidth: BODY_PROFILE[0][1], halfDepth: BODY_PROFILE[0][2], zCenter: BODY_PROFILE[0][3] };
    }
    const last = BODY_PROFILE[BODY_PROFILE.length - 1];
    if (y >= last[0]) {
      return { halfWidth: last[1], halfDepth: last[2], zCenter: last[3] };
    }

    for (let i = 0; i < BODY_PROFILE.length - 1; i++) {
      if (y >= BODY_PROFILE[i][0] && y < BODY_PROFILE[i + 1][0]) {
        const t = (y - BODY_PROFILE[i][0]) / (BODY_PROFILE[i + 1][0] - BODY_PROFILE[i][0]);
        return {
          halfWidth: THREE.MathUtils.lerp(BODY_PROFILE[i][1], BODY_PROFILE[i + 1][1], t),
          halfDepth: THREE.MathUtils.lerp(BODY_PROFILE[i][2], BODY_PROFILE[i + 1][2], t),
          zCenter: THREE.MathUtils.lerp(BODY_PROFILE[i][3], BODY_PROFILE[i + 1][3], t),
        };
      }
    }
    return { halfWidth: 0.15, halfDepth: 0.09, zCenter: 0.04 };
  }

  /**
   * Determines if an angular position on the tube should be cut out for neckline or armholes.
   * Returns true if the vertex should be excluded.
   *
   * Angle convention: 0 = front center (-Z), π = back center (+Z).
   * Column wraps 0..TUBE_COLS around the full circle.
   */
  private isInCutout(angle: number, y: number, topY: number): boolean {
    // Normalized height from top (0 = shoulders, 1 = hem)
    const depthFromTop = topY - y;

    // ── Neckline ──
    // Front neckline: deeper scoop; Back neckline: shallow
    // angle near 0 or 2π = front center, angle near π = back center
    const frontAngle = angle <= Math.PI ? angle : 2 * Math.PI - angle; // 0 = front, π = back
    const isFront = frontAngle < Math.PI / 2;
    const isBack = frontAngle > Math.PI / 2;

    if (depthFromTop < 0.06) {
      // Top row region — cut neckline
      if (isFront) {
        // Front neckline: wider scoop ~120° arc centered on front
        const neckWidth = 0.80; // radians from center (about 46°)
        const neckDepth = 0.06; // how far down
        if (frontAngle < neckWidth) {
          const t = frontAngle / neckWidth; // 0 at center, 1 at edge
          const cutDepth = neckDepth * (1 - t * t); // parabolic scoop
          if (depthFromTop < cutDepth) return true;
        }
      }
      if (isBack) {
        // Back neckline: narrower, shallower
        const backAngle = Math.PI - frontAngle;
        const neckWidth = 0.55;
        const neckDepth = 0.03;
        if (backAngle < neckWidth) {
          const t = backAngle / neckWidth;
          const cutDepth = neckDepth * (1 - t * t);
          if (depthFromTop < cutDepth) return true;
        }
      }
    }

    // ── Armholes ──
    // Side regions: angle near π/2 (right side) and 3π/2 (left side)
    const armholeDepthMax = 0.12; // how far down from shoulder the armhole extends
    if (depthFromTop < armholeDepthMax) {
      // Right side armhole
      const distFromRight = Math.abs(angle - Math.PI / 2);
      // Left side armhole
      const distFromLeft = Math.abs(angle - 3 * Math.PI / 2);
      const armholeAngularWidth = 0.50; // radians (~29°)

      for (const dist of [distFromRight, distFromLeft]) {
        if (dist < armholeAngularWidth) {
          const t = dist / armholeAngularWidth; // 0 = center, 1 = edge
          const cutDepth = armholeDepthMax * (1 - t * t);
          if (depthFromTop < cutDepth) return true;
        }
      }
    }

    return false;
  }

  /**
   * Compute procedural wrinkle displacement for a vertex.
   * Returns a small radial offset and vertical offset.
   */
  private computeWrinkle(
    angle: number,
    y: number,
    topY: number,
    hemY: number,
    col: number,
    row: number
  ): { radial: number; vertical: number } {
    const garmentLength = topY - hemY;
    const normalizedY = (topY - y) / garmentLength; // 0=top, 1=hem

    // Base wrinkle frequency and amplitude
    // More wrinkles at waist (compression) and near hem (gravity gathering)
    const waistProximity = 1.0 - Math.abs(normalizedY - 0.55) * 3.0;
    const waistFactor = Math.max(0, waistProximity);

    const hemProximity = Math.max(0, normalizedY - 0.7) / 0.3;

    // Vertical fold lines (like real fabric compression)
    const foldFreqHigh = 8.0;
    const foldFreqLow = 3.0;

    // High-frequency micro wrinkles
    const microWrinkle = fbmNoise(col * 0.7, row * 0.5, 3) * 0.003;

    // Medium vertical compression folds at waist
    const waistFold = Math.sin(angle * foldFreqHigh + fbmNoise(row * 0.3, 0, 2) * 2.0)
      * 0.004 * waistFactor;

    // Broad drape folds
    const drapeFold = Math.sin(angle * foldFreqLow + 0.7)
      * 0.003 * (0.3 + normalizedY * 0.7);

    // Hem gathering - gentle flare
    const hemGather = Math.sin(angle * 5.0 + 1.3) * 0.005 * hemProximity;

    // Vertical displacement (fabric bunching)
    const verticalBunch = fbmNoise(col * 0.4 + 3.7, row * 0.3 + 1.2, 2)
      * 0.002 * (waistFactor * 0.5 + hemProximity * 0.3);

    const radial = microWrinkle + waistFold + drapeFold + hemGather;
    const vertical = verticalBunch;

    return { radial, vertical };
  }

  buildFromPieces(
    pieces: PatternPiece[],
    _seams: SeamConnection[],
    material: FabricMaterial
  ) {
    this.particles = [];
    this.constraints = [];
    this.seamConstraints = [];
    this.indices = [];
    this.simTime = 0;

    // Determine garment type from pieces
    const isDress = pieces.some(p =>
      p.name.toLowerCase().includes('dress') ||
      p.name.toLowerCase().includes('skirt')
    );

    const topY = TSHIRT_TOP_Y;
    const hemY = isDress ? DRESS_HEM_Y : TSHIRT_HEM_Y;
    const garmentLength = topY - hemY;

    // Calculate rows: ~1.5cm per row for good resolution
    const rows = Math.max(12, Math.ceil(garmentLength / 0.015));
    const cols = TUBE_COLS;

    // Ease factor — stiffer fabrics drape closer to body
    const stiffnessEase = THREE.MathUtils.lerp(
      GARMENT_EASE + 0.02,
      GARMENT_EASE - 0.02,
      Math.min(1, material.stretchStiffness)
    );

    // Grid for tracking which vertices exist (some will be cut out)
    const gridMap: (number | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      gridMap[r] = [];
      const t = r / (rows - 1); // 0=top, 1=hem
      const y = topY - t * garmentLength;

      const cross = this.getBodyCrossSection(y);
      const hw = cross.halfWidth * stiffnessEase;
      const hd = cross.halfDepth * stiffnessEase;

      // Slight flare at hem for dress
      const hemFlare = isDress ? Math.max(0, t - 0.6) * 0.08 : Math.max(0, t - 0.8) * 0.02;

      for (let c = 0; c < cols; c++) {
        // Angle: 0 = front center (-Z), goes CW when viewed from top
        const angle = (c / cols) * Math.PI * 2;

        // Check for cutouts (neckline, armholes)
        if (this.isInCutout(angle, y, topY)) {
          gridMap[r][c] = null;
          continue;
        }

        // Elliptical cross-section point
        // angle=0 → front (-Z direction), angle=π → back (+Z)
        const easeHW = hw + hemFlare;
        const easeHD = hd + hemFlare * 0.6;

        const rawX = easeHW * Math.sin(angle);         // left-right
        const rawZ = -easeHD * Math.cos(angle) + cross.zCenter; // front-back

        // Apply procedural wrinkle displacement
        const wrinkle = this.computeWrinkle(angle, y, topY, hemY, c, r);

        // Wrinkle radial pushes outward along the ellipse normal
        const normalAngle = Math.atan2(
          rawX / (easeHW * easeHW),
          -(rawZ - cross.zCenter) / (easeHD * easeHD)
        );
        const nx = Math.sin(normalAngle);
        const nz = -Math.cos(normalAngle);

        const px = rawX + wrinkle.radial * nx;
        const py = y + wrinkle.vertical;
        const pz = rawZ + wrinkle.radial * nz;

        const pos = new THREE.Vector3(px, py, pz);
        const pIdx = this.particles.length;
        gridMap[r][c] = pIdx;

        // UV: u wraps around [0,1], v goes top to bottom [0,1]
        const u = c / cols;
        const v = 1 - t;

        // Determine piece ID for compatibility
        const isFrontHalf = (angle < Math.PI / 2 || angle > 3 * Math.PI / 2);
        const pieceId = isFrontHalf ? 'piece-front' : 'piece-back';

        // Inverse mass: lighter at shoulders (more pinned feel), heavier at hem
        const massScale = THREE.MathUtils.lerp(0.3, 1.0, t);

        this.particles.push({
          pos: pos.clone(),
          prevPos: pos.clone(),
          originalPos: pos.clone(),
          local2D: { x: c * 10, y: r * 10 }, // synthetic 2D coords for compatibility
          invMass: massScale / Math.max(0.1, material.density / 140),
          normal: new THREE.Vector3(nx, 0, nz),
          uv: new THREE.Vector2(u, v),
          pinned: false,
          pieceId,
        });
      }
    }

    // ── Build triangle indices ──
    // Tube topology: columns wrap around (col TUBE_COLS connects back to col 0)
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const cNext = (c + 1) % cols;

        const tl = gridMap[r][c];
        const tr = gridMap[r][cNext];
        const bl = gridMap[r + 1][c];
        const br = gridMap[r + 1][cNext];

        // Two triangles per quad, consistent winding for outward-facing normals
        if (tl !== null && tr !== null && bl !== null) {
          this.indices.push(tl, bl, tr); // CCW from outside
        }
        if (tr !== null && bl !== null && br !== null) {
          this.indices.push(tr, bl, br);
        }
      }
    }

    // ── Cache animation data ──
    const n = this.particles.length;
    this._wrinkleOffsets = new Float32Array(n * 3); // pre-computed wrinkle offsets
    this._breathPhases = new Float32Array(n);
    this._swayPhases = new Float32Array(n);
    this._hemWeights = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const normalizedY = (topY - p.originalPos.y) / garmentLength; // 0=top, 1=hem

      // Breathing: strongest at chest level, zero at hem
      const chestProximity = 1.0 - Math.min(1, Math.abs(normalizedY - 0.25) * 3);
      this._breathPhases[i] = Math.max(0, chestProximity);

      // Sway: increases toward hem
      this._swayPhases[i] = hashNoise(i * 0.1, 0.5);
      this._hemWeights[i] = Math.max(0, normalizedY - 0.3) * 1.2;

      // Store wrinkle offsets for animation modulation
      this._wrinkleOffsets[i * 3] = p.pos.x - p.originalPos.x;
      this._wrinkleOffsets[i * 3 + 1] = p.pos.y - p.originalPos.y;
      this._wrinkleOffsets[i * 3 + 2] = p.pos.z - p.originalPos.z;
    }

    // ── Stress map initialization ──
    this.stressMap = new Float32Array(n);
    this.computeStaticStress();
  }

  /**
   * Compute a static stress map based on how much the garment deviates from
   * a perfect elliptical fit — areas with more wrinkles show higher stress.
   */
  private computeStaticStress() {
    const topY = TSHIRT_TOP_Y;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cross = this.getBodyCrossSection(p.originalPos.y);

      // Distance from body surface
      const dx = p.originalPos.x;
      const dz = p.originalPos.z - cross.zCenter;
      const hw = cross.halfWidth;
      const hd = cross.halfDepth;

      // How far outside the body ellipse
      const ellipseVal = (dx * dx) / (hw * hw) + (dz * dz) / (hd * hd);
      const radialDist = Math.sqrt(ellipseVal) - 1.0;

      // More stress at tighter areas (waist)
      const normalizedY = (topY - p.originalPos.y) / (topY - 0.37);
      const waistFactor = Math.max(0, 1.0 - Math.abs(normalizedY - 0.5) * 3);

      this.stressMap[i] = Math.min(1,
        radialDist * 0.8 + waistFactor * 0.06
        + Math.abs(this._wrinkleOffsets[i * 3]) * 5
      );
    }
  }

  /**
   * Subtle vertex animation: breathing expansion, gentle sway, wrinkle shimmer.
   * No PBD physics — just smooth procedural motion.
   */
  step(dt: number) {
    this.simTime += dt;
    const t = this.simTime;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const ox = p.originalPos.x;
      const oy = p.originalPos.y;
      const oz = p.originalPos.z;

      // ── 1. Breathing: radial chest expansion/contraction ──
      const breathCycle = Math.sin(t * 1.8) * 0.0025 + Math.sin(t * 3.6) * 0.0008;
      const breathWeight = this._breathPhases[i];
      // Expand radially outward
      const bx = ox !== 0 ? Math.sign(ox) * breathCycle * breathWeight : 0;
      const bz = (oz > 0.04 ? 1 : -1) * breathCycle * breathWeight * 0.6;

      // ── 2. Gentle sway: pendulum-like at hem ──
      const swayPhase = this._swayPhases[i];
      const hemW = this._hemWeights[i];
      const swayX = Math.sin(t * 0.9 + swayPhase * 6.28) * 0.003 * hemW;
      const swayZ = Math.sin(t * 0.7 + swayPhase * 4.0 + 1.5) * 0.002 * hemW;

      // ── 3. Micro wrinkle shimmer: subtle oscillation of wrinkle depth ──
      const shimmer = Math.sin(t * 2.5 + i * 0.37) * 0.15 + 0.85; // 0.7-1.0 modulation
      const wx = this._wrinkleOffsets[i * 3] * shimmer;
      const wy = this._wrinkleOffsets[i * 3 + 1] * shimmer;
      const wz = this._wrinkleOffsets[i * 3 + 2] * shimmer;

      // ── Combine ──
      p.pos.x = ox + bx + swayX + (wx - this._wrinkleOffsets[i * 3]);
      p.pos.y = oy + (wy - this._wrinkleOffsets[i * 3 + 1]);
      p.pos.z = oz + bz + swayZ + (wz - this._wrinkleOffsets[i * 3 + 2]);

      // Update prevPos for any external code that reads velocity
      p.prevPos.copy(p.pos);
    }

    // Slowly modulate stress map for visual interest in heatmap mode
    for (let i = 0; i < this.stressMap.length; i++) {
      const base = this.stressMap[i];
      const flicker = Math.sin(t * 1.2 + i * 0.23) * 0.008;
      this.stressMap[i] = Math.max(0, Math.min(1, base + flicker));
    }
  }
}
