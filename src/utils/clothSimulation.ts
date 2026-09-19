import * as THREE from 'three';
import type { PatternPiece, SeamConnection, FabricMaterial } from '../types/cad';
import { useCloStore } from '../store/useCloStore';

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
  private isInCutout(angle: number, y: number, topY: number, sY: number = 1.0, hasSleeves: boolean = false): boolean {
    const depthFromTop = (topY - y) / sY;

    // ── Neckline ──
    const frontAngle = angle <= Math.PI ? angle : 2 * Math.PI - angle; // 0 = front, π = back
    const isFront = frontAngle < Math.PI / 2;
    const isBack = frontAngle > Math.PI / 2;

    if (depthFromTop < 0.12) {
      if (isFront) {
        // Front neckline: natural scoop
        const neckWidth = 0.54;
        const neckDepth = 0.090;
        if (frontAngle < neckWidth) {
          const t = frontAngle / neckWidth;
          const cutDepth = neckDepth * (1 - t * t);
          if (depthFromTop < cutDepth) return true;
        }
      }
      if (isBack) {
        // Back neckline: shallow scoop 3.2cm down
        const backAngle = Math.PI - frontAngle;
        const neckWidth = 0.46;
        const neckDepth = 0.032;
        if (backAngle < neckWidth) {
          const t = backAngle / neckWidth;
          const cutDepth = neckDepth * (1 - t * t);
          if (depthFromTop < cutDepth) return true;
        }
      }
    }

    // ── Armholes ──
    // If garment has sleeves, shoulder stays covered all the way to arm joint (~7.5cm down)
    const armholeStartDepth = hasSleeves ? 0.075 : 0.028;
    const armholeMaxDepth = 0.205;
    if (depthFromTop >= armholeStartDepth && depthFromTop < armholeMaxDepth) {
      const distFromRight = Math.abs(angle - Math.PI / 2);
      const distFromLeft = Math.abs(angle - 3 * Math.PI / 2);
      const armholeAngularWidth = hasSleeves ? 0.46 : 0.54; // radians
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

    // ── Realistic wrinkle zones ──
    // 1. Chest/bust tension — outward pull at bust apex creating horizontal tension folds
    const bustProximity = 1.0 - Math.abs(normalizedY - 0.22) * 4.0;
    const bustFactor = Math.max(0, bustProximity);

    // 2. Waist compression — fabric gathers where body narrows
    const waistProximity = 1.0 - Math.abs(normalizedY - 0.52) * 3.0;
    const waistFactor = Math.max(0, waistProximity);

    // 3. Hem drape — gravity gathering at bottom edge
    const hemProximity = Math.max(0, normalizedY - 0.7) / 0.3;

    // 4. Side seam tension — subtle pull along side seams
    const isSideAngle = Math.abs(Math.sin(angle)) > 0.85;
    const sideTension = isSideAngle ? 0.4 : 0.0;

    // ── Fold frequencies (matching real cotton jersey behavior) ──
    // High-freq micro wrinkles — tiny surface texture
    const microWrinkle = fbmNoise(col * 0.8, row * 0.6, 3) * 0.0015;

    // Medium vertical compression folds at waist (8-10 folds around)
    const waistFold = Math.sin(angle * 8.0 + fbmNoise(row * 0.3, 0, 2) * 2.0)
      * 0.0025 * waistFactor;

    // Bust tension radiating folds — horizontal lines under bust
    const bustFold = Math.sin(angle * 4.0 + 0.3) * 0.002 * bustFactor
      * (1.0 - sideTension); // reduced at sides

    // Broad drape folds — 3-4 major vertical fold lines
    const drapeFold = Math.sin(angle * 3.0 + 0.7)
      * 0.002 * (0.2 + normalizedY * 0.5);

    // Hem gathering — gentle outward flare
    const hemGather = Math.sin(angle * 5.0 + 1.3) * 0.003 * hemProximity;

    // Side seam pull — slight inward at side seams
    const seamPull = -0.001 * sideTension * (0.3 + normalizedY * 0.4);

    // Vertical displacement (fabric bunching)
    const verticalBunch = fbmNoise(col * 0.4 + 3.7, row * 0.3 + 1.2, 2)
      * 0.0015 * (waistFactor * 0.4 + hemProximity * 0.2);

    const radial = microWrinkle + waistFold + bustFold + drapeFold + hemGather + seamPull;
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
    const hasSleeves = pieces.some(p =>
      p.name.toLowerCase().includes('sleeve') ||
      p.name.toLowerCase().includes('lengan')
    );

    // Adapt 3D garment dimensions dynamically from 2D pattern piece bounds
    const frontPiece = pieces.find((p) => p.id === 'piece-front' || p.name.toLowerCase().includes('front'));
    let lengthFactor = 1.0;
    let widthFactor = 1.0;

    if (frontPiece && frontPiece.points.length >= 4) {
      const ys = frontPiece.points.map((p) => p.y);
      const xs = frontPiece.points.map((p) => p.x);
      const pHeight = Math.max(...ys) - Math.min(...ys);
      const pWidth = Math.max(...xs) - Math.min(...xs);

      // Reference front bodice: height ~400mm, width ~270mm
      lengthFactor = THREE.MathUtils.clamp(pHeight / 400, 0.45, 2.5);
      widthFactor = THREE.MathUtils.clamp(pWidth / 270, 0.65, 2.0);
    }

    const topY = TSHIRT_TOP_Y * sY;
    const standardHemY = (isDress ? DRESS_HEM_Y : TSHIRT_HEM_Y) * sY;
    const standardLength = topY - standardHemY;
    const garmentLength = standardLength * lengthFactor;
    const hemY = topY - garmentLength;

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
      const hw = ((cross.halfWidth * sX) * stiffnessEase + 0.012) * widthFactor;
      const hd = ((cross.halfDepth * sZ) * stiffnessEase + 0.012) * widthFactor;
      const zCenter = cross.zCenter * sZ;

      // Slight flare at hem for dress, minimal for T-shirt
      const hemFlare = isDress ? Math.max(0, t - 0.6) * 0.06 * sX : Math.max(0, t - 0.85) * 0.01 * sX;

      for (let c = 0; c < cols; c++) {
        // Angle: 0 = front center (-Z), goes CW when viewed from top
        const angle = (c / cols) * Math.PI * 2;

        // Check for cutouts (neckline, armholes)
        if (this.isInCutout(angle, y, topY, sY, hasSleeves)) {
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

    // ── Build Extra Pieces: Pockets, Patches, Sleeves, Collars, Custom Fabric Panels ──
    const extraPieces = pieces.filter(
      (p) => p.visible !== false && p.id !== 'piece-front' && p.id !== 'piece-back'
    );

    for (const piece of extraPieces) {
      const lowerName = piece.name.toLowerCase();

      // CASE 1: SLEEVES (Short or Long Sleeve)
      if (lowerName.includes('sleeve') || lowerName.includes('lengan')) {
        const isLeftOnly = lowerName.includes('left') || lowerName.includes('kiri');
        const isRightOnly = lowerName.includes('right') || lowerName.includes('kanan');
        const armSides = isLeftOnly ? [1] : isRightOnly ? [-1] : [-1, 1];

        const isLongSleeve =
          lowerName.includes('long') ||
          lowerName.includes('panjang') ||
          lowerName.includes('hoodie') ||
          lowerName.includes('bomber') ||
          lowerName.includes('jacket');

        for (const side of armSides) {
          const sleeveCols = 18;
          const sleeveRows = isLongSleeve ? 16 : 8;
          const sleeveBaseIdx = this.particles.length;

          // ── Natural sleeve drape geometry ──
          // On a mannequin without visible arms, sleeves hang straight down
          // from the shoulder point, close to the body sides.
          // Short sleeves: small tube curving slightly outward then ending at bicep level
          // Long sleeves: tube hanging down close to body, ending near waist

          const shoulderX = side * 0.198 * sX;
          const shoulderY = 1.34 * sY;
          const shoulderZ = 0.015 * sZ;

          // End point: sleeves hang nearly straight down, slightly away from body
          const sleeveEndX = side * (isLongSleeve ? 0.21 : 0.23) * sX;
          const sleeveEndY = (isLongSleeve ? 0.75 : 1.14) * sY;
          const sleeveEndZ = (isLongSleeve ? 0.03 : 0.02) * sZ;

          // Radius: shoulder cap wider, tapers to cuff
          const startR = 0.082 * sX;
          const endR = (isLongSleeve ? 0.048 : 0.062) * sX;

          for (let sr = 0; sr < sleeveRows; sr++) {
            const st = sr / (sleeveRows - 1);

            // Simple linear interpolation — straight tube from shoulder down
            const cx = THREE.MathUtils.lerp(shoulderX, sleeveEndX, st);
            const cy = THREE.MathUtils.lerp(shoulderY, sleeveEndY, st);
            const cz = THREE.MathUtils.lerp(shoulderZ, sleeveEndZ, st);

            // Sleeve axis direction (tangent)
            const tx = sleeveEndX - shoulderX;
            const ty = sleeveEndY - shoulderY;
            const tz = sleeveEndZ - shoulderZ;
            const tangent = new THREE.Vector3(tx, ty, tz).normalize();

            // Stable perpendicular frame — use world Z as reference to avoid flipping
            const refUp = new THREE.Vector3(0, 0, 1);
            const perp1 = new THREE.Vector3().crossVectors(tangent, refUp).normalize();
            // If tangent is parallel to refUp, fallback to X
            if (perp1.lengthSq() < 0.001) {
              perp1.crossVectors(tangent, new THREE.Vector3(1, 0, 0)).normalize();
            }
            const perp2 = new THREE.Vector3().crossVectors(tangent, perp1).normalize();

            const currR = THREE.MathUtils.lerp(startR, endR, st);

            // Add slight gravity sag at mid-sleeve for long sleeves
            const sagAmount = isLongSleeve ? Math.sin(st * Math.PI) * 0.008 * sY : 0;

            for (let sc = 0; sc < sleeveCols; sc++) {
              const sAngle = (sc / sleeveCols) * Math.PI * 2;
              const px = cx + (perp1.x * Math.cos(sAngle) + perp2.x * Math.sin(sAngle)) * currR;
              const py = cy + (perp1.y * Math.cos(sAngle) + perp2.y * Math.sin(sAngle)) * currR - sagAmount;
              const pz = cz + (perp1.z * Math.cos(sAngle) + perp2.z * Math.sin(sAngle)) * currR;

              const norm = new THREE.Vector3(
                perp1.x * Math.cos(sAngle) + perp2.x * Math.sin(sAngle),
                perp1.y * Math.cos(sAngle) + perp2.y * Math.sin(sAngle),
                perp1.z * Math.cos(sAngle) + perp2.z * Math.sin(sAngle)
              ).normalize();

              this.particles.push({
                pos: new THREE.Vector3(px, py, pz),
                prevPos: new THREE.Vector3(px, py, pz),
                originalPos: new THREE.Vector3(px, py, pz),
                local2D: { x: sc * 10, y: sr * 10 },
                invMass: THREE.MathUtils.lerp(0.3, 0.8, st) / Math.max(0.1, material.density / 140),
                normal: norm,
                uv: new THREE.Vector2(sc / sleeveCols, 1 - st),
                pinned: sr === 0, // Pin top row at shoulder for stability
                pieceId: piece.id,
              });
            }
          }

          for (let sr = 0; sr < sleeveRows - 1; sr++) {
            for (let sc = 0; sc < sleeveCols; sc++) {
              const scNext = (sc + 1) % sleeveCols;
              const tl = sleeveBaseIdx + sr * sleeveCols + sc;
              const tr = sleeveBaseIdx + sr * sleeveCols + scNext;
              const bl = sleeveBaseIdx + (sr + 1) * sleeveCols + sc;
              const br = sleeveBaseIdx + (sr + 1) * sleeveCols + scNext;
              if (side > 0) {
                this.indices.push(tl, bl, tr);
                this.indices.push(tr, bl, br);
              } else {
                this.indices.push(tl, tr, bl);
                this.indices.push(tr, br, bl);
              }
            }
          }
        }
        continue;
      }

      // CASE 2: COLLAR BAND
      if (lowerName.includes('collar') || lowerName.includes('kerah')) {
        const collarCols = 24;
        const collarBaseIdx = this.particles.length;
        const neckY1 = 1.37 * sY;
        const neckY2 = 1.40 * sY;

        for (const cy of [neckY1, neckY2]) {
          const cross = this.getBodyCrossSection(cy / sY);
          const chw = cross.halfWidth * sX * 1.08 + 0.015;
          const chd = cross.halfDepth * sZ * 1.08 + 0.015;
          for (let cc = 0; cc < collarCols; cc++) {
            const cAng = (cc / collarCols) * Math.PI * 2;
            const px = chw * Math.sin(cAng);
            const pz = -chd * Math.cos(cAng) + cross.zCenter * sZ;
            const norm = new THREE.Vector3(Math.sin(cAng), 0, -Math.cos(cAng));

            this.particles.push({
              pos: new THREE.Vector3(px, cy, pz),
              prevPos: new THREE.Vector3(px, cy, pz),
              originalPos: new THREE.Vector3(px, cy, pz),
              local2D: { x: cc * 10, y: (cy === neckY1 ? 0 : 20) },
              invMass: 0.3,
              normal: norm,
              uv: new THREE.Vector2(cc / collarCols, cy === neckY1 ? 0 : 1),
              pinned: true,
              pieceId: piece.id,
            });
          }
        }

        for (let cc = 0; cc < collarCols; cc++) {
          const ccNext = (cc + 1) % collarCols;
          const b0 = collarBaseIdx + cc;
          const b1 = collarBaseIdx + ccNext;
          const t0 = collarBaseIdx + collarCols + cc;
          const t1 = collarBaseIdx + collarCols + ccNext;
          this.indices.push(b0, t0, b1);
          this.indices.push(b1, t0, t1);
        }
        continue;
      }

      // CASE 3: PATCH / POCKET / APPLIQUE / CUSTOM FABRIC PANEL
      if (piece.points && piece.points.length >= 3) {
        const pts = piece.points;
        const patchBaseIdx = this.particles.length;

        const cx2d = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
        const cy2d = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;

        const frontRef = pieces.find(p => p.id === 'piece-front');
        const refPos = frontRef ? frontRef.position : { x: 170, y: 260 };
        const dxFromRef = (piece.position.x - refPos.x) / 300;
        const dyFromRef = (piece.position.y - refPos.y) / 400;

        const center3DX = dxFromRef * 0.18 * sX;
        const center3DY = THREE.MathUtils.clamp(1.18 * sY - dyFromRef * 0.35 * sY, 0.75 * sY, 1.34 * sY);
        const crossAtY = this.getBodyCrossSection(center3DY / sY);
        const center3DZ = -crossAtY.halfDepth * sZ * 1.08 + crossAtY.zCenter * sZ - 0.018;

        // Centroid particle
        this.particles.push({
          pos: new THREE.Vector3(center3DX, center3DY, center3DZ - 0.003),
          prevPos: new THREE.Vector3(center3DX, center3DY, center3DZ - 0.003),
          originalPos: new THREE.Vector3(center3DX, center3DY, center3DZ - 0.003),
          local2D: { x: cx2d, y: cy2d },
          invMass: 0.5,
          normal: new THREE.Vector3(0, 0, -1),
          uv: new THREE.Vector2(0.5, 0.5),
          pinned: false,
          pieceId: piece.id,
        });

        // Perimeter particles
        for (let pi = 0; pi < pts.length; pi++) {
          const pt = pts[pi];
          const px = center3DX + ((pt.x - cx2d) / 1000) * sX;
          const py = center3DY - ((pt.y - cy2d) / 1000) * sY;
          const pz = center3DZ;

          this.particles.push({
            pos: new THREE.Vector3(px, py, pz),
            prevPos: new THREE.Vector3(px, py, pz),
            originalPos: new THREE.Vector3(px, py, pz),
            local2D: { x: pt.x, y: pt.y },
            invMass: 0.5,
            normal: new THREE.Vector3(0, 0, -1),
            uv: new THREE.Vector2(
              0.5 + (pt.x - cx2d) / 200,
              0.5 + (pt.y - cy2d) / 200
            ),
            pinned: false,
            pieceId: piece.id,
          });
        }

        // Fan triangles around centroid
        for (let pi = 0; pi < pts.length; pi++) {
          const piNext = (pi + 1) % pts.length;
          const v0 = patchBaseIdx;
          const v1 = patchBaseIdx + 1 + pi;
          const v2 = patchBaseIdx + 1 + piNext;
          this.indices.push(v0, v1, v2);
          this.indices.push(v0, v2, v1);
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
    const dynamics = useCloStore.getState().simulationDynamics ?? 0.6;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const ox = p.originalPos.x;
      const oy = p.originalPos.y;
      const oz = p.originalPos.z;

      // ── 1. Breathing: ONLY expands outward, never contracts into body ──
      const breathAmp = 0.0025 + 0.004 * dynamics; // up to ~6.5mm
      const breathCycle = (Math.sin(t * 1.8) * 0.5 + 0.5) * breathAmp;
      const breathWeight = this._breathPhases[i];
      // Expand radially outward
      const bx = ox !== 0 ? Math.sign(ox) * breathCycle * breathWeight : 0;
      const bz = (oz > 0.04 ? 1 : -1) * breathCycle * breathWeight * 0.6;

      // ── 2. Natural Wind Waves & Hem Sway (CLO3D-Style Dynamic Draping) ──
      const swayPhase = this._swayPhases[i];
      const hemW = this._hemWeights[i];

      // Traveling sinusoidal wind waves across fabric
      const windSpeed = 2.8;
      const wavePhase = t * windSpeed - (oy * 4.5) + (ox * 2.5);
      const windWaveX = Math.sin(wavePhase) * (0.016 * dynamics) * hemW;
      const windWaveZ = Math.cos(wavePhase * 0.8 + oz * 3.0) * (0.012 * dynamics) * hemW;

      // Natural pendulum hem sway (creates lifelike fabric swing)
      const swayX = Math.sin(t * 1.2 + swayPhase * 6.28) * (0.005 + 0.022 * dynamics) * hemW;
      const swayZ = Math.sin(t * 0.9 + swayPhase * 4.0 + 1.5) * (0.004 + 0.018 * dynamics) * hemW;

      // ── 3. Micro wrinkle shimmer ──
      const shimmer = Math.sin(t * 3.0 + i * 0.37) * (0.15 + 0.25 * dynamics) + 0.85;
      const wx = this._wrinkleOffsets[i * 3] * shimmer;
      const wy = this._wrinkleOffsets[i * 3 + 1] * shimmer;
      const wz = this._wrinkleOffsets[i * 3 + 2] * shimmer;

      // ── Combine ──
      p.pos.x = ox + bx + swayX + windWaveX + (wx - this._wrinkleOffsets[i * 3]);
      p.pos.y = oy + (wy - this._wrinkleOffsets[i * 3 + 1]);
      p.pos.z = oz + bz + swayZ + windWaveZ + (wz - this._wrinkleOffsets[i * 3 + 2]);

      // Update prevPos for any external code that reads velocity
      p.prevPos.copy(p.pos);
    }

    // Modulate stress map for visual interest in heatmap mode
    for (let i = 0; i < this.stressMap.length; i++) {
      const base = this.stressMap[i];
      const flicker = Math.sin(t * 1.5 + i * 0.23) * (0.008 + 0.015 * dynamics);
      this.stressMap[i] = Math.max(0, Math.min(1, base + flicker));
    }
  }
}
