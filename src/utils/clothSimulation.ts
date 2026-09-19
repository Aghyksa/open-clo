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
  color?: THREE.Color;
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
// Z convention from GLB: Z-min = front (-), Z-max = back (+)
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

const TUBE_COLS = 36;
const GARMENT_EASE = 1.12;

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

  private _breathPhases: Float32Array = new Float32Array(0);
  private _hemWeights: Float32Array = new Float32Array(0);
  private _dropRestPositions: THREE.Vector3[] = [];
  _isPhysicsMode: boolean = false;

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

  getBodyCrossSection(y: number): { halfWidth: number; halfDepth: number; zCenter: number } {
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

  resolveCollisionsWithMesh(_mannequinGroup: THREE.Group, skinOffset: number = 0.018) {
    for (const particle of this.particles) {
      const p = particle.pos;
      if (p.y < 0.30 || p.y > 1.48) continue;

      const cross = this.getBodyCrossSection(p.y);
      const hw = cross.halfWidth * 1.05 + skinOffset;
      const hd = cross.halfDepth * 1.05 + skinOffset;
      const dx = p.x;
      const dz = p.z - cross.zCenter;
      const edist = Math.sqrt((dx / hw) ** 2 + (dz / hd) ** 2);

      if (edist < 1.0 && edist > 1e-6) {
        const scale = 1.0 / edist;
        p.x = dx * scale;
        p.z = dz * scale + cross.zCenter;
        particle.originalPos.x = p.x;
        particle.originalPos.z = p.z;
      }
    }

    this.computeStaticStress();
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
    this._isPhysicsMode = false;

    const sX = avatarScale?.scaleX ?? 1.0;
    const sY = avatarScale?.scaleY ?? 1.0;
    const sZ = avatarScale?.scaleZ ?? 1.0;

    // Accurate Garment Category Detection
    const isSkirt = pieces.some(p => p.name.toLowerCase().includes('skirt') || p.id.includes('skirt'));
    const isDress = !isSkirt && pieces.some(p => p.name.toLowerCase().includes('dress') || p.id.includes('dress'));
    const isCropTop = pieces.some(p => p.name.toLowerCase().includes('crop') || p.id.includes('crop'));
    const isTankTop = pieces.some(p => p.name.toLowerCase().includes('tank') || p.id.includes('tank'));
    const isHoodie = pieces.some(p => p.name.toLowerCase().includes('hoodie') || p.id.includes('hoodie'));
    const isBomber = pieces.some(p => p.name.toLowerCase().includes('bomber') || p.id.includes('bomber'));
    const isPolo = pieces.some(p => p.name.toLowerCase().includes('polo') || p.id.includes('polo'));
    const isOversized = pieces.some(p => p.name.toLowerCase().includes('oversized') || p.id.includes('oversized'));

    // Compute lengthFactor and widthFactor from 2D piece dimensions
    const frontPiece = pieces.find(p =>
      p.id === 'piece-front' ||
      p.id === 'piece-front-l' ||
      p.id === 'piece-front-skirt' ||
      p.name.toLowerCase().includes('front')
    );
    let lengthFactor = 1.0;
    let widthFactor = 1.0;

    const hasSplitFront = pieces.some(p => p.id.includes('front-l') || p.name.toLowerCase().includes('left front'));

    if (frontPiece && frontPiece.points.length >= 4) {
      const ys = frontPiece.points.map(p => p.y);
      const xs = frontPiece.points.map(p => p.x);
      const pHeight = Math.max(...ys) - Math.min(...ys);
      let pWidth = Math.max(...xs) - Math.min(...xs);
      if (hasSplitFront) {
        pWidth *= 2; // Split left/right panels represent half the bodice each
      }
      const refHeight = isSkirt ? 320 : isCropTop ? 280 : isDress ? 580 : 400;
      const refWidth = 270;
      lengthFactor = THREE.MathUtils.clamp(pHeight / refHeight, 0.45, 2.5);
      widthFactor = THREE.MathUtils.clamp(pWidth / refWidth, 0.65, 2.0);
    }

    const easeFactor = isOversized ? 1.22 : isHoodie ? 1.18 : isTankTop ? 1.08 : GARMENT_EASE;
    const stiffnessEase = THREE.MathUtils.lerp(
      easeFactor + 0.02,
      easeFactor - 0.02,
      Math.min(1, material.stretchStiffness)
    );

    // ==========================================
    // CASE A: SKIRT (Lower body only: Waist to Knee)
    // ==========================================
    if (isSkirt) {
      const skirtRows = 18;
      const skirtCols = 32;
      const skirtTopY = 1.060 * sY; // Natural waistline
      const skirtHemY = (1.060 - 0.520 * lengthFactor) * sY; // Knee level (~0.54m)

      const skirtGrid: (number | null)[][] = [];

      for (let r = 0; r < skirtRows; r++) {
        skirtGrid[r] = [];
        const t = r / (skirtRows - 1);
        const y = THREE.MathUtils.lerp(skirtTopY, skirtHemY, t);
        const unscaledY = y / sY;
        const cross = this.getBodyCrossSection(unscaledY);

        // A-Line flare starting gently from waist, expanding towards hem
        const flare = Math.pow(t, 1.3) * 0.16 * sX * widthFactor;
        const hw = (cross.halfWidth * sX * 1.06 + 0.014) * widthFactor + flare;
        const hd = (cross.halfDepth * sZ * 1.06 + 0.014) * widthFactor + flare * 0.7;
        const zCenter = cross.zCenter * sZ;

        for (let c = 0; c < skirtCols; c++) {
          const angle = (c / skirtCols) * Math.PI * 2;
          const rawX = hw * Math.sin(angle);
          const rawZ = -hd * Math.cos(angle) + zCenter;

          const normalAngle = Math.atan2(rawX / (hw * hw), -(rawZ - zCenter) / (hd * hd));
          const nx = Math.sin(normalAngle);
          const nz = -Math.cos(normalAngle);

          const isFront = angle < Math.PI / 2 || angle > 3 * Math.PI / 2;
          const pieceId = isFront ? 'piece-front-skirt' : 'piece-back-skirt';
          const pIdx = this.particles.length;
          skirtGrid[r][c] = pIdx;

          this.particles.push({
            pos: new THREE.Vector3(rawX, y, rawZ),
            prevPos: new THREE.Vector3(rawX, y, rawZ),
            originalPos: new THREE.Vector3(rawX, y, rawZ),
            local2D: { x: c * 10, y: r * 10 },
            invMass: THREE.MathUtils.lerp(0.3, 1.0, t) / Math.max(0.1, material.density / 140),
            normal: new THREE.Vector3(nx, 0, nz),
            uv: new THREE.Vector2(c / skirtCols, 1 - t),
            pinned: false,
            pieceId,
          });
        }
      }

      // Build outward CCW triangles and distance constraints for skirt
      for (let r = 0; r < skirtRows - 1; r++) {
        for (let c = 0; c < skirtCols; c++) {
          const cNext = (c + 1) % skirtCols;
          const tl = skirtGrid[r][c]!;
          const tr = skirtGrid[r][cNext]!;
          const bl = skirtGrid[r + 1][c]!;
          const br = skirtGrid[r + 1][cNext]!;

          this.indices.push(tl, tr, bl);
          this.indices.push(tr, br, bl);

          this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.8 });
          this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.8 });
          this.constraints.push({ p1: tl, p2: br, restLength: this.particles[tl].pos.distanceTo(this.particles[br].pos), stiffness: 0.5 });
        }
      }

      this.finishMeshSetup();
      return;
    }

    // ==========================================
    // CASE B: BODICE (T-shirt, Dress, Crop Top, Tank Top, Hoodie, Bomber, Polo, Oversized)
    // ==========================================
    const cols = TUBE_COLS;
    const rows = isDress ? 26 : isCropTop ? 14 : 22;

    // Anatomical hem height calculation
    let hemY: number;
    if (isDress) {
      hemY = 0.580 * sY * lengthFactor; // Flared dress hem around knee
    } else if (isCropTop) {
      const garmentLength = 0.280 * sY * lengthFactor;
      hemY = 1.400 * sY - garmentLength; // Ends cleanly above navel (~1.12m)
    } else if (isTankTop) {
      hemY = 0.940 * sY * lengthFactor; // Hips
    } else if (isBomber) {
      hemY = 0.900 * sY * lengthFactor; // Waist rib
    } else if (isHoodie || isOversized) {
      hemY = 0.880 * sY * lengthFactor; // Relaxed below hips
    } else {
      hemY = 0.920 * sY * lengthFactor; // Standard crewneck tee hem
    }

    const gridMap: (number | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      gridMap[r] = [];
      const t = r / (rows - 1);

      for (let c = 0; c < cols; c++) {
        const angle = (c / cols) * Math.PI * 2;
        const frontAngle = angle <= Math.PI ? angle : 2 * Math.PI - angle;
        const isFront = frontAngle < Math.PI / 2;

        // Formulate neckline scoop and shoulder crest
        let topYAtAngle = 1.415;
        if (isTankTop) {
          // Athletic scoop neck and natural shoulder strap contour
          if (isFront) {
            const ratio = frontAngle / (Math.PI / 2);
            topYAtAngle = 1.375 + (1.415 - 1.375) * Math.sin(ratio * Math.PI / 2);
          } else {
            const backAngle = Math.PI - frontAngle;
            const ratio = backAngle / (Math.PI / 2);
            topYAtAngle = 1.410 + (1.415 - 1.410) * Math.sin(ratio * Math.PI / 2);
          }
        } else if (isDress) {
          // V-neck dip in front
          if (isFront) {
            const ratio = frontAngle / (Math.PI / 2);
            topYAtAngle = 1.385 + (1.415 - 1.385) * Math.sin(ratio * Math.PI / 2);
          } else {
            const backAngle = Math.PI - frontAngle;
            const ratio = backAngle / (Math.PI / 2);
            topYAtAngle = 1.430 + (1.415 - 1.430) * Math.sin(ratio * Math.PI / 2);
          }
        } else {
          // Classic / streetwear crewneck
          if (isFront) {
            const ratio = frontAngle / (Math.PI / 2);
            topYAtAngle = 1.400 + (1.415 - 1.400) * Math.sin(ratio * Math.PI / 2);
          } else {
            const backAngle = Math.PI - frontAngle;
            const ratio = backAngle / (Math.PI / 2);
            topYAtAngle = 1.440 + (1.415 - 1.440) * Math.sin(ratio * Math.PI / 2);
          }
        }
        topYAtAngle *= sY;

        const y = THREE.MathUtils.lerp(topYAtAngle, hemY, t);
        const unscaledY = y / sY;
        const cross = this.getBodyCrossSection(unscaledY);

        const bustCross = this.getBodyCrossSection(1.22);
        const bustBlend = !isDress ? THREE.MathUtils.smoothstep(unscaledY, 1.15, 1.25) : 1;
        const effectiveHW = THREE.MathUtils.lerp(Math.max(cross.halfWidth, bustCross.halfWidth * 0.96), cross.halfWidth, bustBlend);
        const effectiveHD = THREE.MathUtils.lerp(Math.max(cross.halfDepth, bustCross.halfDepth * 0.96), cross.halfDepth, bustBlend);

        const shoulderBlend = Math.min(1, r / 3);
        const minHW = cross.halfWidth * sX * 1.05 + 0.012;
        const rawHW = Math.max(minHW, ((effectiveHW * sX) * stiffnessEase + 0.016) * widthFactor);
        const snugHW = cross.halfWidth * sX * 1.04 + 0.008;
        let hw = THREE.MathUtils.lerp(snugHW, rawHW, shoulderBlend);
        // Tank top has narrow athletic straps resting squarely on shoulders (not wide cap sleeves)
        if (isTankTop && r <= 3) {
          hw = Math.min(hw, (0.130 + r * 0.015) * sX);
        }

        // Garment depth must maintain true anatomical clearance
        let hd = (effectiveHD * sZ) * stiffnessEase + 0.022;
        // Bust protrusion clearance prevents avatar chest peaks from clipping through fabric
        if (unscaledY >= 1.15 && unscaledY <= 1.25) {
          const bustProtrusion = Math.sin((unscaledY - 1.15) / 0.10 * Math.PI) * 0.032 * sX;
          hd += bustProtrusion;
        }
        const zCenter = cross.zCenter * sZ;

        // Dress A-line flare below waist
        if (isDress && unscaledY < 1.06) {
          const flareProgress = Math.max(0, (1.06 - unscaledY) / (1.06 - 0.58));
          const flare = Math.pow(flareProgress, 1.2) * 0.18 * sX * widthFactor;
          hw += flare;
          hd += flare * 0.7;
        }

        const rawX = hw * Math.sin(angle);
        const rawZ = -hd * Math.cos(angle) + zCenter;

        const normalAngle = Math.atan2(rawX / (hw * hw), -(rawZ - zCenter) / (hd * hd));
        const nx = Math.sin(normalAngle);
        const nz = -Math.cos(normalAngle);

        const pos = new THREE.Vector3(rawX, y, rawZ);
        const pIdx = this.particles.length;
        gridMap[r][c] = pIdx;

        const u = c / cols;
        const v = 1 - t;

        const isCollarRow = (r === 0);
        const isFrontHalf = (angle < Math.PI / 2 || angle > 3 * Math.PI / 2);

        let pieceId = isFrontHalf ? 'piece-front' : 'piece-back';
        if (isCollarRow && !isTankTop && !isDress) {
          pieceId = 'piece-collar';
        } else if (isBomber) {
          pieceId = isFrontHalf ? (angle <= Math.PI / 2 ? 'piece-bomber-front-l' : 'piece-bomber-front-r') : 'piece-bomber-back';
        }

        const massScale = THREE.MathUtils.lerp(0.3, 1.0, t);

        // Vertex Colors for distinct visual design
        const targetPiece = pieces.find(p => p.id === pieceId);
        const baseColor = targetPiece ? new THREE.Color(targetPiece.color) : new THREE.Color('#38bdf8');
        let vertexColor = baseColor.clone();

        if (isBomber && (c === 0 || c === cols - 1)) {
          // Center front metallic zipper track
          vertexColor = new THREE.Color('#fbbf24');
        } else if (isPolo && isCollarRow) {
          // Crisp white knit collar
          vertexColor = new THREE.Color('#f8fafc');
        } else if (isCollarRow && !isTankTop && !isDress) {
          vertexColor.offsetHSL(0, 0, 0.08);
        }

        this.particles.push({
          pos: pos.clone(),
          prevPos: pos.clone(),
          originalPos: pos.clone(),
          local2D: { x: c * 10, y: r * 10 },
          invMass: massScale / Math.max(0.1, material.density / 140),
          normal: new THREE.Vector3(nx, 0, nz),
          uv: new THREE.Vector2(u, v),
          pinned: false,
          pieceId,
          color: vertexColor,
        });
      }
    }

    // Build outward CCW triangle indices and distance constraints
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const cNext = (c + 1) % cols;
        const tl = gridMap[r][c]!;
        const tr = gridMap[r][cNext]!;
        const bl = gridMap[r + 1][c]!;
        const br = gridMap[r + 1][cNext]!;

        this.indices.push(tl, tr, bl);
        this.indices.push(tr, br, bl);

        this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.8 });
        this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.8 });
        this.constraints.push({ p1: tl, p2: br, restLength: this.particles[tl].pos.distanceTo(this.particles[br].pos), stiffness: 0.5 });
      }
    }

    // ==========================================
    // EXTRA 3D COMPONENTS: Sleeves, Hood, Pockets
    // ==========================================
    const hasSleeves = pieces.some(p => p.name.toLowerCase().includes('sleeve') || p.id.includes('sleeve')) || isBomber;
    const isLongSleeve = isHoodie || isBomber || pieces.some(p => p.name.toLowerCase().includes('long'));

    if (hasSleeves && !isTankTop && !isSkirt) {
      const armSides = [-1, 1]; // Left and Right sleeves

      for (const side of armSides) {
        const sleeveCols = 16;
        const sleeveRows = isLongSleeve ? 14 : 7;
        const sleeveBaseIdx = this.particles.length;

        const shoulderX = side * 0.205 * sX;
        const shoulderY = (isOversized ? 1.340 : 1.360) * sY;
        const shoulderZ = 0.040 * sZ;

        // Accurate A-pose arm trajectory (wrist at X=±0.48, Y=1.04; bicep at X=±0.33, Y=1.20)
        const sleeveEndX = side * (isLongSleeve ? 0.480 : isOversized ? 0.350 : 0.330) * sX;
        const sleeveEndY = (isLongSleeve ? 1.040 : 1.200) * sY;
        const sleeveEndZ = 0.040 * sZ;

        const startR = (isOversized ? 0.068 : 0.062) * sX;
        const endR = (isLongSleeve ? 0.046 : 0.054) * sX;

        const armholeCenter = new THREE.Vector3(shoulderX, shoulderY, shoulderZ);
        const cuffCenter = new THREE.Vector3(sleeveEndX, sleeveEndY, sleeveEndZ);
        const tangent = new THREE.Vector3().subVectors(cuffCenter, armholeCenter).normalize();

        const rawPerp = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
        const perp1 = rawPerp.multiplyScalar(-side);
        const perp2 = new THREE.Vector3().crossVectors(tangent, perp1).normalize().multiplyScalar(-side);

        let pieceId = side > 0 ? 'piece-sleeve-l' : 'piece-sleeve-r';
        if (isBomber) {
          pieceId = side > 0 ? 'piece-bomber-sleeve-l' : 'piece-bomber-sleeve-r';
        }
        const targetPiece = pieces.find(p => p.id === pieceId);
        const sleeveColor = targetPiece ? new THREE.Color(targetPiece.color) : new THREE.Color('#38bdf8');

        for (let sr = 0; sr < sleeveRows; sr++) {
          const st = sr / (sleeveRows - 1);
          const currR = THREE.MathUtils.lerp(startR, endR, st);
          const cx = THREE.MathUtils.lerp(shoulderX, sleeveEndX, st);
          const cy = THREE.MathUtils.lerp(shoulderY, sleeveEndY, st);
          const cz = THREE.MathUtils.lerp(shoulderZ, sleeveEndZ, st);

          for (let sc = 0; sc < sleeveCols; sc++) {
            const sAngle = (sc / sleeveCols) * Math.PI * 2;
            const px = cx + (perp1.x * Math.cos(sAngle) + perp2.x * Math.sin(sAngle)) * currR;
            const py = cy + (perp1.y * Math.cos(sAngle) + perp2.y * Math.sin(sAngle)) * currR;
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
              pinned: false,
              pieceId,
              color: sleeveColor,
            });
          }
        }

        // Triangles and constraints for sleeve tube
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

            this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.8 });
            this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.8 });
            this.constraints.push({ p1: tl, p2: br, restLength: this.particles[tl].pos.distanceTo(this.particles[br].pos), stiffness: 0.5 });
          }
        }
      }
    }

    // ==========================================
    // 3D HOOD (for Hoodie - natural cowl drape around neck and upper back)
    // ==========================================
    if (isHoodie) {
      const hoodRows = 8;
      const hoodCols = 12;
      const hoodBaseIdx = this.particles.length;

      for (let hr = 0; hr < hoodRows; hr++) {
        const ht = hr / (hoodRows - 1);
        const y = THREE.MathUtils.lerp(1.440 * sY, 1.340 * sY, ht);
        const cross = this.getBodyCrossSection(y / sY);

        for (let hc = 0; hc < hoodCols; hc++) {
          const hang = (hc / (hoodCols - 1)) * Math.PI; // Arch around back and sides
          const radiusX = (0.105 + ht * 0.035) * sX;
          const radiusZ = (0.080 + ht * 0.040) * sZ;

          const px = Math.cos(hang) * radiusX;
          const pz = Math.sin(hang) * radiusZ + cross.zCenter * sZ + 0.035 * sZ + ht * 0.045 * sZ;

          this.particles.push({
            pos: new THREE.Vector3(px, y, pz),
            prevPos: new THREE.Vector3(px, y, pz),
            originalPos: new THREE.Vector3(px, y, pz),
            local2D: { x: hc * 10, y: hr * 10 },
            invMass: 0.6 / Math.max(0.1, material.density / 140),
            normal: new THREE.Vector3(0, 0, 1),
            uv: new THREE.Vector2(hc / hoodCols, ht),
            pinned: false,
            pieceId: 'piece-hood',
            color: new THREE.Color('#334155'),
          });
        }
      }

      for (let hr = 0; hr < hoodRows - 1; hr++) {
        for (let hc = 0; hc < hoodCols - 1; hc++) {
          const tl = hoodBaseIdx + hr * hoodCols + hc;
          const tr = hoodBaseIdx + hr * hoodCols + (hc + 1);
          const bl = hoodBaseIdx + (hr + 1) * hoodCols + hc;
          const br = hoodBaseIdx + (hr + 1) * hoodCols + (hc + 1);

          this.indices.push(tl, tr, bl);
          this.indices.push(tr, br, bl);

          this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.8 });
          this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.8 });
        }
      }
    }

    // ==========================================
    // KANGAROO POCKET (for Hoodie)
    // ==========================================
    if (isHoodie) {
      const pocketPiece = pieces.find(p => p.id === 'piece-pocket' || p.name.toLowerCase().includes('pocket'));
      if (pocketPiece) {
        const pktRows = 5;
        const pktCols = 7;
        const pktBaseIdx = this.particles.length;

        for (let pr = 0; pr < pktRows; pr++) {
          const pt = pr / (pktRows - 1);
          const py = THREE.MathUtils.lerp(1.060 * sY, 0.940 * sY, pt);
          const cross = this.getBodyCrossSection(py / sY);
          const bodiceHD = (cross.halfDepth * sZ) * stiffnessEase + 0.022;

          for (let pc = 0; pc < pktCols; pc++) {
            const pct = pc / (pktCols - 1);
            const px = (pct - 0.5) * 0.220 * sX;
            // Cleanly placed 8mm in front of bodice front surface
            const pz = -bodiceHD - 0.008 + cross.zCenter * sZ;

            this.particles.push({
              pos: new THREE.Vector3(px, py, pz),
              prevPos: new THREE.Vector3(px, py, pz),
              originalPos: new THREE.Vector3(px, py, pz),
              local2D: { x: pc * 10, y: pr * 10 },
              invMass: 0.5,
              normal: new THREE.Vector3(0, 0, -1),
              uv: new THREE.Vector2(pct, pt),
              pinned: false,
              pieceId: 'piece-pocket',
              color: new THREE.Color('#475569'),
            });
          }
        }

        for (let pr = 0; pr < pktRows - 1; pr++) {
          for (let pc = 0; pc < pktCols - 1; pc++) {
            const tl = pktBaseIdx + pr * pktCols + pc;
            const tr = pktBaseIdx + pr * pktCols + (pc + 1);
            const bl = pktBaseIdx + (pr + 1) * pktCols + pc;
            const br = pktBaseIdx + (pr + 1) * pktCols + (pc + 1);

            this.indices.push(tl, tr, bl);
            this.indices.push(tr, br, bl);

            this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.8 });
            this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.8 });
          }
        }
      }
    }

    // ==========================================
    // POLO TURNOVER COLLAR & PLACKET
    // ==========================================
    if (isPolo) {
      const collarBaseIdx = this.particles.length;
      const collarCols = 16;
      const collarRows = 3;

      for (let cr = 0; cr < collarRows; cr++) {
        const ct = cr / (collarRows - 1);
        // Turnover collar arch: neck base (1.435) -> crest (1.468) -> folded leaf (1.405)
        const y = (cr === 0 ? 1.435 : cr === 1 ? 1.468 : 1.405) * sY;
        const hw = (cr === 0 ? 0.082 : cr === 1 ? 0.096 : 0.128) * sX;
        const hd = (cr === 0 ? 0.068 : cr === 1 ? 0.078 : 0.098) * sZ;

        for (let cc = 0; cc < collarCols; cc++) {
          const ang = (cc / (collarCols - 1)) * Math.PI * 1.6 - Math.PI * 0.8;

          const px = hw * Math.sin(ang);
          const pz = -hd * Math.cos(ang) + 0.022 * sZ;

          this.particles.push({
            pos: new THREE.Vector3(px, y, pz),
            prevPos: new THREE.Vector3(px, y, pz),
            originalPos: new THREE.Vector3(px, y, pz),
            local2D: { x: cc * 10, y: cr * 10 },
            invMass: 0.5,
            normal: new THREE.Vector3(0, cr === 2 ? -0.7 : 0.7, -0.7).normalize(),
            uv: new THREE.Vector2(cc / collarCols, ct),
            pinned: false,
            pieceId: 'piece-collar',
            color: new THREE.Color('#f8fafc'),
          });
        }
      }

      for (let cr = 0; cr < collarRows - 1; cr++) {
        for (let cc = 0; cc < collarCols - 1; cc++) {
          const tl = collarBaseIdx + cr * collarCols + cc;
          const tr = collarBaseIdx + cr * collarCols + (cc + 1);
          const bl = collarBaseIdx + (cr + 1) * collarCols + cc;
          const br = collarBaseIdx + (cr + 1) * collarCols + (cc + 1);

          this.indices.push(tl, tr, bl);
          this.indices.push(tr, br, bl);

          this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.8 });
          this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.8 });
        }
      }

      // Front Placket strip with buttons
      const placketBaseIdx = this.particles.length;
      const plkRows = 5;
      for (let pr = 0; pr < plkRows; pr++) {
        const pt = pr / (plkRows - 1);
        const py = THREE.MathUtils.lerp(1.410 * sY, 1.300 * sY, pt);
        const cross = this.getBodyCrossSection(py / sY);
        const bodiceHD = (cross.halfDepth * sZ) * stiffnessEase + 0.022;
        const pz = -bodiceHD - 0.004 + cross.zCenter * sZ;

        for (let pc = 0; pc < 2; pc++) {
          const px = (pc - 0.5) * 0.026 * sX;
          this.particles.push({
            pos: new THREE.Vector3(px, py, pz),
            prevPos: new THREE.Vector3(px, py, pz),
            originalPos: new THREE.Vector3(px, py, pz),
            local2D: { x: pc * 10, y: pr * 10 },
            invMass: 0.5,
            normal: new THREE.Vector3(0, 0, -1),
            uv: new THREE.Vector2(pc, pt),
            pinned: false,
            pieceId: 'piece-collar',
          });
        }
      }

      for (let pr = 0; pr < plkRows - 1; pr++) {
        const tl = placketBaseIdx + pr * 2;
        const tr = placketBaseIdx + pr * 2 + 1;
        const bl = placketBaseIdx + (pr + 1) * 2;
        const br = placketBaseIdx + (pr + 1) * 2 + 1;
        this.indices.push(tl, tr, bl);
        this.indices.push(tr, br, bl);
        this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.8 });
        this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.8 });
      }
    }

    this.finishMeshSetup();
  }

  private finishMeshSetup() {
    const n = this.particles.length;
    this._breathPhases = new Float32Array(n);
    this._hemWeights = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const oy = p.originalPos.y;
      const chestZone = Math.max(0, 1.0 - Math.abs(oy - 1.20) * 4.0);
      this._breathPhases[i] = chestZone;

      const hemZone = Math.max(0, 1.0 - (oy - 0.40) / 0.60);
      this._hemWeights[i] = Math.min(1.0, hemZone);
    }

    this.stressMap = new Float32Array(n);
    this.computeStaticStress();
  }

  private computeStaticStress() {
    const topY = 1.365;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cross = this.getBodyCrossSection(p.originalPos.y);
      const dx = p.originalPos.x;
      const dz = p.originalPos.z - cross.zCenter;
      const hw = cross.halfWidth;
      const hd = cross.halfDepth;
      const ellipseVal = (dx * dx) / (hw * hw) + (dz * dz) / (hd * hd);
      const radialDist = Math.sqrt(ellipseVal) - 1.0;
      const normalizedY = (topY - p.originalPos.y) / (topY - 0.37);
      const waistFactor = Math.max(0, 1.0 - Math.abs(normalizedY - 0.5) * 3);
      this.stressMap[i] = Math.min(1, radialDist * 0.8 + waistFactor * 0.06);
    }
  }

  step(dt: number) {
    this.simTime += dt;
    const t = this.simTime;
    const dynamics = useCloStore.getState().simulationDynamics ?? 0.6;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const ox = p.originalPos.x;
      const oy = p.originalPos.y;
      const oz = p.originalPos.z;

      const breathAmp = 0.0020 + 0.003 * dynamics;
      const breathCycle = (Math.sin(t * 1.8) * 0.5 + 0.5) * breathAmp;
      const breathWeight = this._breathPhases[i];
      const bx = ox !== 0 ? Math.sign(ox) * breathCycle * breathWeight : 0;
      const bz = (oz > 0.04 ? 1 : -1) * breathCycle * breathWeight * 0.6;

      const hemW = this._hemWeights[i];
      const windWaveX = Math.sin(t * 2.2 - oy * 2.5) * (0.003 * dynamics) * hemW;
      const windWaveZ = Math.cos(t * 1.8 - oy * 2.5) * (0.002 * dynamics) * hemW;
      const swayX = Math.sin(t * 1.2) * (0.002 + 0.005 * dynamics) * hemW;
      const swayZ = Math.cos(t * 0.9) * (0.001 + 0.004 * dynamics) * hemW;

      p.pos.x = ox + bx + swayX + windWaveX;
      p.pos.y = oy;
      p.pos.z = oz + bz + swayZ + windWaveZ;

      // Universal Anti-clipping collision guard against mannequin body
      if (oy >= 0.30 && oy <= 1.46) {
        const cross = this.getBodyCrossSection(oy);
        const minHW = cross.halfWidth * 1.05 + 0.015;
        const minHD = cross.halfDepth * 1.05 + 0.015;
        const dx = p.pos.x;
        const dz = p.pos.z - cross.zCenter;
        const edist = Math.sqrt((dx / minHW) ** 2 + (dz / minHD) ** 2);
        if (edist < 1.0 && edist > 1e-6) {
          const scale = 1.0 / edist;
          p.pos.x = dx * scale;
          p.pos.z = dz * scale + cross.zCenter;
        }
      }

      p.prevPos.copy(p.pos);
    }
  }

  /**
   * Initialize PBD ragdoll cloth drop: lifts garment 22cm above mannequin.
   */
  initDropAnimation() {
    const n = this.particles.length;
    this._dropRestPositions = [];
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const rest = p.originalPos.clone();
      this._dropRestPositions.push(rest);

      // Lift garment naturally above avatar with slight expansion so it drapes onto the body
      p.pos.set(
        rest.x * 1.03,
        rest.y + 0.22,
        rest.z * 1.03
      );
      p.prevPos.copy(p.pos);
      p.pinned = false;
    }
    this._isPhysicsMode = true;
  }

  /**
   * Step ragdoll cloth physics: Verlet integration, distance constraints, and true avatar surface collision.
   */
  stepPhysics(dt: number) {
    if (!this._isPhysicsMode) return;
    const n = this.particles.length;
    const damp = 0.94;
    const gy = -9.8;
    const dtSq = dt * dt;

    // 1. Verlet integration
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      if (p.pinned) continue;
      const vx = (p.pos.x - p.prevPos.x) * damp;
      const vy = (p.pos.y - p.prevPos.y) * damp;
      const vz = (p.pos.z - p.prevPos.z) * damp;
      p.prevPos.copy(p.pos);
      p.pos.x += vx;
      p.pos.y += vy + gy * dtSq;
      p.pos.z += vz;
    }

    // 2. Soft distance constraints (8 iterations for stability and cloth structure)
    for (let iter = 0; iter < 8; iter++) {
      for (let ci = 0; ci < this.constraints.length; ci++) {
        const c = this.constraints[ci];
        const p1 = this.particles[c.p1];
        const p2 = this.particles[c.p2];
        const dx = p2.pos.x - p1.pos.x;
        const dy = p2.pos.y - p1.pos.y;
        const dz = p2.pos.z - p1.pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 1e-6) continue;
        const diff = (dist - c.restLength) / dist;
        const corr = diff * c.stiffness * 0.5;
        p1.pos.x += dx * corr; p1.pos.y += dy * corr; p1.pos.z += dz * corr;
        p2.pos.x -= dx * corr; p2.pos.y -= dy * corr; p2.pos.z -= dz * corr;
      }
    }

    // 3. Avatar Surface Collision & Contact Friction
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const rest = this._dropRestPositions[i];
      if (!rest) continue;

      // Shoulder Catch for upper-body garment particles
      if (p.pos.y >= 1.30 && p.pos.y <= 1.46) {
        const absX = Math.abs(p.pos.x);
        if (absX < 0.22) {
          const shoulderSlopeY = 1.44 - 0.06 * Math.min(1.0, absX / 0.207);
          if (p.pos.y < shoulderSlopeY + 0.012 && Math.abs(p.pos.z - 0.02) < 0.09) {
            p.pos.y = shoulderSlopeY + 0.012;
            p.prevPos.y = p.pos.y;
            p.pos.x += (p.prevPos.x - p.pos.x) * 0.4;
            p.pos.z += (p.prevPos.z - p.pos.z) * 0.4;
          }
        }
      }

      // Torso & Pelvis Ellipse Collision
      if (p.pos.y >= 0.35 && p.pos.y <= 1.45) {
        const cross = this.getBodyCrossSection(p.pos.y);
        const minHW = cross.halfWidth * 1.05 + 0.015;
        const minHD = cross.halfDepth * 1.05 + 0.015;
        const dx = p.pos.x;
        const dz = p.pos.z - cross.zCenter;
        const edist = Math.sqrt((dx / minHW) ** 2 + (dz / minHD) ** 2);
        if (edist < 1.0 && edist > 1e-6) {
          const scale = 1.0 / edist;
          p.pos.x = dx * scale;
          p.pos.z = dz * scale + cross.zCenter;
          // Vertical friction against body surface prevents endless downward sliding
          p.pos.y += (p.prevPos.y - p.pos.y) * 0.25;
          p.prevPos.x = p.pos.x;
          p.prevPos.z = p.pos.z;
        }
      }

      // Solid resting surface contact: fabric catches on resting pose, decelerating into fitted rest shape
      if (p.pos.y <= rest.y) {
        p.pos.y = rest.y;
        p.prevPos.y = p.pos.y;
        p.pos.x += (rest.x - p.pos.x) * 0.20;
        p.pos.z += (rest.z - p.pos.z) * 0.20;
        p.prevPos.x = p.pos.x;
        p.prevPos.z = p.pos.z;
      }
    }
  }

  getKineticEnergy(): number {
    let energy = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.pinned) continue;
      const vx = p.pos.x - p.prevPos.x;
      const vy = p.pos.y - p.prevPos.y;
      const vz = p.pos.z - p.prevPos.z;
      energy += vx * vx + vy * vy + vz * vz;
    }
    return energy;
  }

  restoreFromPhysics() {
    if (!this._isPhysicsMode) return;
    const n = this.particles.length;
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const rest = this._dropRestPositions[i];
      if (rest) {
        p.pos.copy(rest);
        p.prevPos.copy(rest);
        p.originalPos.copy(rest);
      }
      p.pinned = false;
    }
    this._isPhysicsMode = false;
  }
}
