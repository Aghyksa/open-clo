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

const TUBE_COLS = 36;          // Columns around circumference
const GARMENT_EASE = 1.12;     // 12% ease prevents body clipping

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

  // Per-particle animation data
  private _breathPhases: Float32Array = new Float32Array(0);
  private _hemWeights: Float32Array = new Float32Array(0);

  // Drop animation state
  private _dropRestPositions: THREE.Vector3[] = [];
  _isPhysicsMode: boolean = false;

  /**
   * Resolve cloth-body penetrations smoothly using continuous body profile cross-sections.
   * Guarantees zero clipping while maintaining smooth, non-corrugated fabric drape.
   */
  resolveCollisionsWithMesh(_mannequinGroup: THREE.Group, skinOffset: number = 0.018) {
    for (const particle of this.particles) {
      if (particle.pieceId !== 'piece-front' && particle.pieceId !== 'piece-back') continue;
      const p = particle.pos;
      if (p.y < 0.30 || p.y > 1.45) continue;

      const cross = this.getBodyCrossSection(p.y);
      const hw = cross.halfWidth * 1.08 + skinOffset;
      const hd = cross.halfDepth * 1.08 + skinOffset;
      const dx = p.x;
      const dz = p.z - cross.zCenter;
      const edist = Math.sqrt((dx / hw) ** 2 + (dz / hd) ** 2);

      if (edist < 1.0 && edist > 1e-6) {
        p.x = (dx / edist) * hw;
        p.z = (dz / edist) * hd + cross.zCenter;
        particle.originalPos.x = p.x;
        particle.originalPos.z = p.z;
      }
    }

    this.computeStaticStress();
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

    const isDress = pieces.some(p =>
      p.name.toLowerCase().includes('dress') ||
      p.name.toLowerCase().includes('skirt')
    );

    const frontPiece = pieces.find((p) => p.id === 'piece-front' || p.name.toLowerCase().includes('front'));
    let lengthFactor = 1.0;
    let widthFactor = 1.0;

    if (frontPiece && frontPiece.points.length >= 4) {
      const ys = frontPiece.points.map((p) => p.y);
      const xs = frontPiece.points.map((p) => p.x);
      const pHeight = Math.max(...ys) - Math.min(...ys);
      const pWidth = Math.max(...xs) - Math.min(...xs);
      lengthFactor = THREE.MathUtils.clamp(pHeight / 400, 0.45, 2.5);
      widthFactor = THREE.MathUtils.clamp(pWidth / 270, 0.65, 2.0);
    }

    const hemY = (isDress ? 0.38 : 0.920) * sY * lengthFactor;
    const rows = 22;
    const cols = TUBE_COLS;

    const stiffnessEase = THREE.MathUtils.lerp(
      GARMENT_EASE + 0.02,
      GARMENT_EASE - 0.02,
      Math.min(1, material.stretchStiffness)
    );

    const gridMap: (number | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      gridMap[r] = [];
      const t = r / (rows - 1);

      for (let c = 0; c < cols; c++) {
        const angle = (c / cols) * Math.PI * 2;
        const frontAngle = angle <= Math.PI ? angle : 2 * Math.PI - angle;
        const isFront = frontAngle < Math.PI / 2;

        // Anatomical crewneck scoop and shoulder line:
        // Front center (angle = 0): 1.400 (clavicle notch scoop)
        // Shoulder tips (angle = ±π/2): 1.415 (crest of shoulders)
        // Back center (angle = π): 1.440 (base of neck)
        let topYAtAngle = 1.415;
        if (isFront) {
          const ratio = frontAngle / (Math.PI / 2);
          topYAtAngle = 1.400 + (1.415 - 1.400) * Math.sin(ratio * Math.PI / 2);
        } else {
          const backAngle = Math.PI - frontAngle;
          const ratio = backAngle / (Math.PI / 2);
          topYAtAngle = 1.440 + (1.415 - 1.440) * Math.sin(ratio * Math.PI / 2);
        }
        topYAtAngle *= sY;

        const y = THREE.MathUtils.lerp(topYAtAngle, hemY, t);
        const unscaledY = y / sY;
        const cross = this.getBodyCrossSection(unscaledY);

        const bustCross = this.getBodyCrossSection(1.22);
        const bustBlend = !isDress ? THREE.MathUtils.smoothstep(unscaledY, 1.15, 1.25) : 1;
        const effectiveHW = THREE.MathUtils.lerp(Math.max(cross.halfWidth, bustCross.halfWidth * 0.96), cross.halfWidth, bustBlend);
        const effectiveHD = THREE.MathUtils.lerp(Math.max(cross.halfDepth, bustCross.halfDepth * 0.96), cross.halfDepth, bustBlend);

        // Smooth shoulder-cap transition: snug shoulder crest, natural chest ease
        const shoulderBlend = Math.min(1, r / 3);
        const rawHW = ((effectiveHW * sX) * stiffnessEase + 0.016) * widthFactor;
        const snugHW = (cross.halfWidth * sX * 1.04 + 0.006) * widthFactor;
        const hw = THREE.MathUtils.lerp(snugHW, rawHW, shoulderBlend);
        const hd = ((effectiveHD * sZ) * stiffnessEase + 0.016) * widthFactor;
        const zCenter = cross.zCenter * sZ;

        const hemFlare = isDress ? Math.max(0, t - 0.6) * 0.06 * sX : 0;
        const easeHW = hw + hemFlare;
        const easeHD = hd + hemFlare * 0.6;

        const rawX = easeHW * Math.sin(angle);
        const rawZ = -easeHD * Math.cos(angle) + zCenter;

        const normalAngle = Math.atan2(
          rawX / (easeHW * easeHW),
          -(rawZ - zCenter) / (easeHD * easeHD)
        );
        const nx = Math.sin(normalAngle);
        const nz = -Math.cos(normalAngle);

        const pos = new THREE.Vector3(rawX, y, rawZ);
        const pIdx = this.particles.length;
        gridMap[r][c] = pIdx;

        const u = c / cols;
        const v = 1 - t;

        const isCollarRow = (r === 0);
        const isFrontHalf = (angle < Math.PI / 2 || angle > 3 * Math.PI / 2);
        const pieceId = isCollarRow ? 'piece-collar' : (isFrontHalf ? 'piece-front' : 'piece-back');

        const massScale = THREE.MathUtils.lerp(0.3, 1.0, t);

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
        });
      }
    }

    // Build outward CCW triangle indices and distance constraints
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const cNext = (c + 1) % cols;

        const tl = gridMap[r][c];
        const tr = gridMap[r][cNext];
        const bl = gridMap[r + 1][c];
        const br = gridMap[r + 1][cNext];

        if (tl !== null && tr !== null && bl !== null) {
          this.indices.push(tl, tr, bl);
        }
        if (tr !== null && bl !== null && br !== null) {
          this.indices.push(tr, br, bl);
        }

        if (tl !== null && tr !== null) {
          this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.35 });
        }
        if (tl !== null && bl !== null) {
          this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.35 });
        }
      }
    }

    // Build extra pieces (Sleeves, Patches)
    const extraPieces = pieces.filter(
      (p) => p.visible !== false && p.id !== 'piece-front' && p.id !== 'piece-back'
    );

    for (const piece of extraPieces) {
      const lowerName = piece.name.toLowerCase();

      // CASE 1: SLEEVES
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

          const shoulderX = side * 0.205 * sX;
          const shoulderY = 1.380 * sY;
          const shoulderZ = 0.018 * sZ;

          const sleeveEndX = side * (isLongSleeve ? 0.36 : 0.285) * sX;
          const sleeveEndY = (isLongSleeve ? 0.88 : 1.180) * sY;
          const sleeveEndZ = (isLongSleeve ? 0.04 : 0.026) * sZ;

          const startR = 0.058 * sX;
          const endR = (isLongSleeve ? 0.042 : 0.050) * sX;

          for (let sr = 0; sr < sleeveRows; sr++) {
            const st = sr / (sleeveRows - 1);

            const cx = THREE.MathUtils.lerp(shoulderX, sleeveEndX, st);
            const cy = THREE.MathUtils.lerp(shoulderY, sleeveEndY, st);
            const cz = THREE.MathUtils.lerp(shoulderZ, sleeveEndZ, st);

            const tx = sleeveEndX - shoulderX;
            const ty = sleeveEndY - shoulderY;
            const tz = sleeveEndZ - shoulderZ;
            const tangent = new THREE.Vector3(tx, ty, tz).normalize();

            const rawPerp = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
            const perp1 = rawPerp.multiplyScalar(-side);
            const perp2 = new THREE.Vector3().crossVectors(tangent, perp1).normalize().multiplyScalar(-side);

            const currR = THREE.MathUtils.lerp(startR, endR, st);
            const sagAmount = Math.sin(st * Math.PI * 0.8) * 0.006 * sY;

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
                pinned: false,
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

              if (side < 0) {
                this.indices.push(tl, tr, bl);
                this.indices.push(tr, br, bl);
              } else {
                this.indices.push(tl, bl, tr);
                this.indices.push(tr, bl, br);
              }

              this.constraints.push({ p1: tl, p2: tr, restLength: this.particles[tl].pos.distanceTo(this.particles[tr].pos), stiffness: 0.35 });
              this.constraints.push({ p1: tl, p2: bl, restLength: this.particles[tl].pos.distanceTo(this.particles[bl].pos), stiffness: 0.35 });
            }
          }
        }
        continue;
      }

      // CASE 2: COLLAR BAND — Seamlessly integrated into row 0 of the bodice tube
      if (lowerName.includes('collar') || lowerName.includes('kerah')) {
        continue;
      }

      // CASE 3: PATCH / POCKET / APPLIQUE
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
            uv: new THREE.Vector2(0.5 + (pt.x - cx2d) / 200, 0.5 + (pt.y - cy2d) / 200),
            pinned: false,
            pieceId: piece.id,
          });
        }

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

    // Cache animation data
    const n = this.particles.length;
    this._breathPhases = new Float32Array(n);
    this._hemWeights = new Float32Array(n);

    const topY = 1.365 * sY;
    const totalGarmentLength = topY - hemY;

    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const normalizedY = (topY - p.originalPos.y) / totalGarmentLength;
      const chestProximity = 1.0 - Math.min(1, Math.abs(normalizedY - 0.25) * 3);
      this._breathPhases[i] = Math.max(0, chestProximity);
      this._hemWeights[i] = Math.max(0, normalizedY - 0.3) * 1.2;
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

  /**
   * Subtle, coherent vertex animation: breathing expansion and gentle fluid hem sway.
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

      // Anti-clipping collision guard against mannequin body
      if ((p.pieceId === 'piece-front' || p.pieceId === 'piece-back') && oy >= 0.30 && oy <= 1.44) {
        const cross = this.getBodyCrossSection(oy);
        const minHW = cross.halfWidth * 1.08 + 0.018;
        const minHD = cross.halfDepth * 1.08 + 0.018;
        const dx = p.pos.x;
        const dz = p.pos.z - cross.zCenter;
        const edist = Math.sqrt((dx / minHW) ** 2 + (dz / minHD) ** 2);
        if (edist < 1.0 && edist > 1e-6) {
          p.pos.x = (dx / edist) * minHW;
          p.pos.z = (dz / edist) * minHD + cross.zCenter;
        }
      }

      p.prevPos.copy(p.pos);
    }

    for (let i = 0; i < this.stressMap.length; i++) {
      const base = this.stressMap[i];
      const flicker = Math.sin(t * 1.5 + i * 0.23) * (0.008 + 0.015 * dynamics);
      this.stressMap[i] = Math.max(0, Math.min(1, base + flicker));
    }
  }

  /**
   * Initialize PBD ragdoll cloth drop: lift garment 22cm above mannequin.
   */
  initDropAnimation() {
    const n = this.particles.length;
    this._dropRestPositions = [];
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const rest = p.originalPos.clone();
      this._dropRestPositions.push(rest);

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
   * Step ragdoll cloth physics: Verlet integration, distance constraints, and avatar surface collision.
   */
  stepPhysics(dt: number) {
    if (!this._isPhysicsMode) return;
    const n = this.particles.length;
    const damp = 0.92;
    const gy = -7.5;
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

    // 2. Soft distance constraints (4 iterations)
    for (let iter = 0; iter < 4; iter++) {
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

    // 3. Collision with avatar resting surface
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const rest = this._dropRestPositions[i];
      if (!rest) continue;
      if (p.pos.y <= rest.y) {
        p.pos.y = rest.y;
        p.prevPos.y = p.pos.y;
        p.pos.x += (rest.x - p.pos.x) * 0.25;
        p.pos.z += (rest.z - p.pos.z) * 0.25;
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
