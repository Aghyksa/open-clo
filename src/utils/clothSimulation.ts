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

// ─── Mannequin body profile accurately measured from femaleMannequin.glb (20,222 vertices) ───
// [Y-coordinate, half-width-X, half-depth-Z, z-center]
// Z convention from GLB: Z-min = front, Z-max = back
const BODY_PROFILE: [number, number, number, number][] = [
  [0.300, 0.234, 0.053, 0.009],
  [0.320, 0.237, 0.057, 0.006],
  [0.340, 0.237, 0.057, 0.006],
  [0.360, 0.236, 0.058, 0.005],
  [0.380, 0.233, 0.058, 0.004],
  [0.400, 0.233, 0.058, 0.003],
  [0.420, 0.227, 0.061, 0.008],
  [0.440, 0.221, 0.062, 0.013],
  [0.460, 0.215, 0.063, 0.022],
  [0.480, 0.209, 0.063, 0.031],
  [0.500, 0.206, 0.058, 0.037],
  [0.520, 0.202, 0.058, 0.041],
  [0.540, 0.198, 0.057, 0.042],
  [0.560, 0.193, 0.057, 0.042],
  [0.580, 0.192, 0.061, 0.044],
  [0.600, 0.193, 0.065, 0.043],
  [0.620, 0.194, 0.069, 0.042],
  [0.640, 0.195, 0.073, 0.041],
  [0.660, 0.195, 0.077, 0.039],
  [0.680, 0.195, 0.078, 0.039],
  [0.700, 0.194, 0.080, 0.037],
  [0.720, 0.194, 0.082, 0.035],
  [0.740, 0.193, 0.084, 0.033],
  [0.760, 0.193, 0.085, 0.032],
  [0.780, 0.194, 0.086, 0.032],
  [0.800, 0.194, 0.097, 0.021],
  [0.820, 0.192, 0.097, 0.021],
  [0.840, 0.185, 0.091, 0.025],
  [0.860, 0.180, 0.105, 0.009],
  [0.880, 0.174, 0.098, 0.016],
  [0.900, 0.170, 0.107, 0.012],
  [0.920, 0.164, 0.105, 0.022],
  [0.940, 0.162, 0.106, 0.021],
  [0.960, 0.159, 0.100, 0.031],
  [0.980, 0.154, 0.102, 0.034],
  [1.000, 0.149, 0.096, 0.041],
  [1.020, 0.147, 0.089, 0.048],
  [1.040, 0.141, 0.084, 0.050],
  [1.060, 0.124, 0.080, 0.054],
  [1.080, 0.117, 0.079, 0.056],
  [1.100, 0.112, 0.080, 0.057],
  [1.120, 0.112, 0.082, 0.057],
  [1.140, 0.114, 0.083, 0.057],
  [1.160, 0.118, 0.092, 0.064],
  [1.180, 0.131, 0.101, 0.071],
  [1.200, 0.141, 0.104, 0.071],
  [1.220, 0.141, 0.109, 0.067],
  [1.240, 0.137, 0.111, 0.063],
  [1.260, 0.142, 0.109, 0.052],
  [1.280, 0.179, 0.103, 0.041],
  [1.300, 0.188, 0.100, 0.035],
  [1.320, 0.188, 0.094, 0.029],
  [1.340, 0.187, 0.088, 0.022],
  [1.360, 0.210, 0.080, 0.017],
  [1.380, 0.207, 0.072, 0.016],
  [1.400, 0.184, 0.063, 0.012],
  [1.420, 0.146, 0.053, 0.011],
  [1.440, 0.067, 0.055, 0.020],
];

// ─── Garment template definitions ───
const TSHIRT_TOP_Y = 1.385;   // Top of shoulder line (covers entire torso)
const TSHIRT_HEM_Y = 0.72;    // Hips / upper pelvis
const DRESS_HEM_Y = 0.38;     // Knees

const TUBE_COLS = 36;          // Columns around circumference
const GARMENT_EASE = 1.08;     // 8% ease + explicit radial clearance prevents clipping

// No extra radial offsets needed — mesh collision resolution handles all body regions

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

  /**
   * Resolve cloth-body penetrations by sampling mannequin vertex positions directly.
   * Builds a radial distance map from mannequin vertices (no raycasting needed),
   * then pushes any cloth vertex that's too close to the body outward.
   */
  resolveCollisionsWithMesh(mannequinGroup: THREE.Group, skinOffset: number = 0.015) {
    // Collect all vertex world positions from the mannequin model
    const worldPos = new THREE.Vector3();
    const heightBands = 55;
    const angleSamples = 48;
    const minY = 0.30;
    const maxY = 1.46; // Covers up to top of neck/shoulders
    const bandHeight = (maxY - minY) / (heightBands - 1);
    const angleStep = (Math.PI * 2) / angleSamples;

    // surfaceDistMap[band][angle] = max distance from Y-axis center to surface
    const surfaceDistMap: number[][] = [];
    for (let hb = 0; hb < heightBands; hb++) {
      surfaceDistMap[hb] = new Array(angleSamples).fill(0);
    }

    mannequinGroup.updateMatrixWorld(true);

    // Scan all mannequin vertices and bin them into the distance map
    // Exclude arm vertices extending outward from the torso sides
    mannequinGroup.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry;
      const posAttr = geom.getAttribute('position');
      if (!posAttr) return;

      mesh.updateMatrixWorld(true);

      for (let vi = 0; vi < posAttr.count; vi++) {
        worldPos.set(
          posAttr.getX(vi),
          posAttr.getY(vi),
          posAttr.getZ(vi)
        );
        worldPos.applyMatrix4(mesh.matrixWorld);

        const y = worldPos.y;
        if (y < minY || y > maxY) continue;

        // Exclude arms outside torso width, but preserve shoulder line (y >= 1.34)
        const isArm = (y < 1.34 && Math.abs(worldPos.x) > 0.20) || (y >= 1.34 && Math.abs(worldPos.x) > 0.23);
        if (isArm) continue;

        const bandF = (y - minY) / bandHeight;
        const band = Math.round(bandF);
        if (band < 0 || band >= heightBands) continue;

        const cross = this.getBodyCrossSection(y);
        const dx = worldPos.x;
        const dz = -(worldPos.z - cross.zCenter);
        let angle = Math.atan2(dx, dz);
        if (angle < 0) angle += Math.PI * 2;

        const ai = Math.round(angle / angleStep) % angleSamples;
        const dist = Math.sqrt(dx * dx + (worldPos.z - cross.zCenter) ** 2);

        // Fill current bin and adjacent neighbor bins (3x3 kernel) to ensure convex curvature is preserved
        for (let db = -1; db <= 1; db++) {
          const bIdx = band + db;
          if (bIdx < 0 || bIdx >= heightBands) continue;
          for (let da = -1; da <= 1; da++) {
            const aIdx = (ai + da + angleSamples) % angleSamples;
            const weight = (da === 0 && db === 0) ? 1.0 : 0.98;
            const wDist = dist * weight;
            if (wDist > surfaceDistMap[bIdx][aIdx]) {
              surfaceDistMap[bIdx][aIdx] = wDist;
            }
          }
        }
      }
    });

    // Now check each cloth particle against the interpolated surface distance
    for (const particle of this.particles) {
      const p = particle.pos;

      const t = (p.y - minY) / (maxY - minY);
      if (t < 0 || t > 1) continue;
      const bandF = t * (heightBands - 1);
      const band0 = Math.floor(bandF);
      const band1 = Math.min(band0 + 1, heightBands - 1);
      const bandBlend = bandF - band0;

      const cross = this.getBodyCrossSection(p.y);
      const dx = p.x;
      const dz = -(p.z - cross.zCenter);
      let angle = Math.atan2(dx, dz);
      if (angle < 0) angle += Math.PI * 2;

      const angleF = (angle / angleStep);
      const ai0 = Math.floor(angleF) % angleSamples;
      const ai1 = (ai0 + 1) % angleSamples;
      const angleBlend = angleF - Math.floor(angleF);

      const d00 = surfaceDistMap[band0][ai0];
      const d01 = surfaceDistMap[band0][ai1];
      const d10 = surfaceDistMap[band1][ai0];
      const d11 = surfaceDistMap[band1][ai1];

      // If no mannequin samples detected in region, use cross section distance
      const fallbackDist = Math.sqrt((cross.halfWidth * Math.sin(angle)) ** 2 + (cross.halfDepth * Math.cos(angle)) ** 2);
      const v00 = d00 > 0.01 ? d00 : fallbackDist;
      const v01 = d01 > 0.01 ? d01 : fallbackDist;
      const v10 = d10 > 0.01 ? d10 : fallbackDist;
      const v11 = d11 > 0.01 ? d11 : fallbackDist;

      const dBot = v00 + (v01 - v00) * angleBlend;
      const dTop = v10 + (v11 - v10) * angleBlend;
      const surfaceDist = dBot + (dTop - dBot) * bandBlend;

      const origin_z = cross.zCenter;
      const vdx = p.x;
      const vdz = p.z - origin_z;
      const vertexDist = Math.sqrt(vdx * vdx + vdz * vdz);

      // Push cloth vertex out if it is inside or closer than skinOffset
      if (vertexDist < surfaceDist + skinOffset) {
        const newDist = surfaceDist + skinOffset;
        if (vertexDist > 0.001) {
          const scale = newDist / vertexDist;
          p.x = vdx * scale;
          p.z = origin_z + vdz * scale;
        } else {
          const safeAngle = angle > 0 ? angle : 0.1;
          p.x = newDist * Math.sin(safeAngle);
          p.z = origin_z - newDist * Math.cos(safeAngle);
        }
        particle.originalPos.x = p.x;
        particle.originalPos.z = p.z;
      }
    }

    this._recomputeAnimationCache();
    this.computeStaticStress();
  }

  /**
   * Recompute animation cache after collision resolution has moved vertices.
   */
  private _recomputeAnimationCache() {
    const n = this.particles.length;
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      this._wrinkleOffsets[i * 3] = p.pos.x - p.originalPos.x;
      this._wrinkleOffsets[i * 3 + 1] = p.pos.y - p.originalPos.y;
      this._wrinkleOffsets[i * 3 + 2] = p.pos.z - p.originalPos.z;
    }
  }

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
  private isInCutout(angle: number, y: number, topY: number, sY: number = 1.0): boolean {
    const depthFromTop = (topY - y) / sY;

    // ── Neckline ──
    const frontAngle = angle <= Math.PI ? angle : 2 * Math.PI - angle; // 0 = front, π = back
    const isFront = frontAngle < Math.PI / 2;
    const isBack = frontAngle > Math.PI / 2;

    if (depthFromTop < 0.12) {
      if (isFront) {
        // Front neckline: natural scoop 9.5cm down, 33° arc
        const neckWidth = 0.58;
        const neckDepth = 0.095;
        if (frontAngle < neckWidth) {
          const t = frontAngle / neckWidth;
          const cutDepth = neckDepth * (1 - t * t);
          if (depthFromTop < cutDepth) return true;
        }
      }
      if (isBack) {
        // Back neckline: shallow scoop 3.5cm down, 27° arc
        const backAngle = Math.PI - frontAngle;
        const neckWidth = 0.48;
        const neckDepth = 0.035;
        if (backAngle < neckWidth) {
          const t = backAngle / neckWidth;
          const cutDepth = neckDepth * (1 - t * t);
          if (depthFromTop < cutDepth) return true;
        }
      }
    }

    // ── Armholes ──
    // Starts 2.5cm down from shoulder line, extends down to 20.5cm (armpit level)
    const armholeStartDepth = 0.025;
    const armholeMaxDepth = 0.205;
    if (depthFromTop >= armholeStartDepth && depthFromTop < armholeMaxDepth) {
      const distFromRight = Math.abs(angle - Math.PI / 2);
      const distFromLeft = Math.abs(angle - 3 * Math.PI / 2);
      const armholeAngularWidth = 0.55; // radians (~31.5°)
      const totalDepth = armholeMaxDepth - armholeStartDepth;
      const localDepth = depthFromTop - armholeStartDepth;

      for (const dist of [distFromRight, distFromLeft]) {
        if (dist < armholeAngularWidth) {
          const t = dist / armholeAngularWidth;
          const cutDepth = totalDepth * (1 - t * t);
          if (localDepth < cutDepth) return true;
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
    material: FabricMaterial,
    avatarScale?: { scaleX: number; scaleY: number; scaleZ: number }
  ) {
    this.particles = [];
    this.constraints = [];
    this.seamConstraints = [];
    this.indices = [];
    this.simTime = 0;

    const sX = avatarScale?.scaleX ?? 1.0;
    const sY = avatarScale?.scaleY ?? 1.0;
    const sZ = avatarScale?.scaleZ ?? 1.0;

    // Determine garment type from pieces
    const isDress = pieces.some(p =>
      p.name.toLowerCase().includes('dress') ||
      p.name.toLowerCase().includes('skirt')
    );

    const topY = TSHIRT_TOP_Y * sY;
    const hemY = (isDress ? DRESS_HEM_Y : TSHIRT_HEM_Y) * sY;
    const garmentLength = topY - hemY;

    // Calculate rows: ~1.5cm per row for good resolution
    const rows = Math.max(12, Math.ceil(garmentLength / (0.015 * sY)));
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

      const unscaledY = y / sY;
      const cross = this.getBodyCrossSection(unscaledY);
      const hw = (cross.halfWidth * sX) * stiffnessEase + 0.012;
      const hd = (cross.halfDepth * sZ) * stiffnessEase + 0.012;
      const zCenter = cross.zCenter * sZ;

      // Slight flare at hem for dress
      const hemFlare = isDress ? Math.max(0, t - 0.6) * 0.08 * sX : Math.max(0, t - 0.8) * 0.02 * sX;

      for (let c = 0; c < cols; c++) {
        // Angle: 0 = front center (-Z), goes CW when viewed from top
        const angle = (c / cols) * Math.PI * 2;

        // Check for cutouts (neckline, armholes)
        if (this.isInCutout(angle, y, topY, sY)) {
          gridMap[r][c] = null;
          continue;
        }

        const easeHW = hw + hemFlare;
        const easeHD = hd + hemFlare * 0.6;

        const rawX = easeHW * Math.sin(angle);         // left-right
        const rawZ = -easeHD * Math.cos(angle) + zCenter; // front-back

        // Apply procedural wrinkle displacement
        const wrinkle = this.computeWrinkle(angle, y, topY, hemY, c, r);

        const normalAngle = Math.atan2(
          rawX / (easeHW * easeHW),
          -(rawZ - zCenter) / (easeHD * easeHD)
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

      // ── 1. Breathing: ONLY expands outward, never contracts into body ──
      const breathCycle = (Math.sin(t * 1.8) * 0.5 + 0.5) * 0.0025;
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
