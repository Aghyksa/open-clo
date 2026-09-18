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
  [0.000,  0.253,  0.121,  0.111],
  [0.083,  0.237,  0.054,  0.054],
  [0.168,  0.228,  0.050,  0.040],
  [0.253,  0.229,  0.052,  0.035],
  [0.371,  0.236,  0.057,  0.004],
  [0.490,  0.215,  0.065,  0.015],
  [0.592,  0.192,  0.065,  0.030],
  [0.676,  0.196,  0.077,  0.039],
  [0.710,  0.194,  0.083,  0.035],
  [0.744,  0.183,  0.085,  0.035],
  [0.795,  0.194,  0.089,  0.026],
  [0.846,  0.185,  0.091,  0.030],
  [0.897,  0.170,  0.106,  0.038],
  [0.948,  0.159,  0.104,  0.035],
  [0.981,  0.154,  0.096,  0.038],
  [1.015,  0.152,  0.090,  0.035],
  [1.066,  0.155,  0.080,  0.035],
  [1.134,  0.160,  0.075,  0.035],
  [1.202,  0.168,  0.104,  0.035],
  [1.253,  0.175,  0.110,  0.057],
  [1.303,  0.115,  0.093,  0.057],
  [1.354,  0.080,  0.080,  0.057],
  [1.405,  0.055,  0.072,  0.057],
  [1.473,  0.048,  0.077,  0.058],
];

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

  constructor() {
    this.setupAvatarColliders();
  }

  setupAvatarColliders() {
    this.colliders = [];

    // Arm capsule colliders (extend from torso outward)
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

      // Left arm
      this.colliders.push({
        type: 'capsule',
        start: new THREE.Vector3(x1, y1, 0.04),
        end: new THREE.Vector3(x2, y2, 0.04),
        radius: avgR,
      });
      // Right arm (mirrored)
      this.colliders.push({
        type: 'capsule',
        start: new THREE.Vector3(-x1, y1, 0.04),
        end: new THREE.Vector3(-x2, y2, 0.04),
        radius: avgR,
      });
    }

    // Neck collider
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

  buildFromPieces(
    pieces: PatternPiece[],
    seams: SeamConnection[],
    material: FabricMaterial
  ) {
    this.particles = [];
    this.constraints = [];
    this.seamConstraints = [];
    this.indices = [];
    this.simTime = 0;

    const activePieces = pieces.filter(
      (p) =>
        p.id === 'piece-front' ||
        p.id === 'piece-back' ||
        seams.some((s) => s.edgeA.pieceId === p.id || s.edgeB.pieceId === p.id)
    );

    const cols = 22;
    const rows = 28;

    activePieces.forEach((piece) => {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      piece.points.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      });

      const stepX = (maxX - minX) / (cols - 1);
      const stepY = (maxY - minY) / (rows - 1);

      const gridIndices: (number | null)[][] = [];
      const isBack = piece.id === 'piece-back';
      const isFront = piece.id === 'piece-front';
      const patternHeight = maxY - minY;

      const pieceStartIdx = this.particles.length;

      for (let r = 0; r < rows; r++) {
        gridIndices[r] = [];
        for (let c = 0; c < cols; c++) {
          const lx = minX + c * stepX;
          const ly = minY + r * stepY;

          if (this.isPointInPolygon(lx, ly, piece.points)) {
            const pIdx = this.particles.length;
            gridIndices[r][c] = pIdx;

            // Map 2D pattern to 3D body-hugging position
            const pos = this.mapPatternToBody(lx, ly, minX, maxX, minY, maxY, isFront, isBack, piece);

            this.particles.push({
              pos: pos.clone(),
              prevPos: pos.clone(),
              originalPos: pos.clone(),
              local2D: { x: lx, y: ly },
              invMass: 1.0 / Math.max(0.1, material.density / 140),
              normal: new THREE.Vector3(0, 0, isBack ? -1 : 1),
              uv: new THREE.Vector2(c / (cols - 1), 1 - r / (rows - 1)),
              pinned: false,
              pieceId: piece.id,
            });
          } else {
            gridIndices[r][c] = null;
          }
        }
      }

      // Pin shoulder particles for stable initial drape
      if (isFront || isBack) {
        for (let i = pieceStartIdx; i < this.particles.length; i++) {
          const p = this.particles[i];
          const ny = (p.local2D.y - minY) / patternHeight;
          if (ny < 0.10) {
            // Shoulder region: pin
            p.pinned = true;
            p.invMass = 0;
          } else if (ny < 0.18) {
            // Near-shoulder: heavy
            p.invMass *= 0.12;
          }
        }
      }

      // Constraints
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const iCurrent = gridIndices[r][c];
          if (iCurrent === null) continue;

          // Structural
          if (c + 1 < cols && gridIndices[r][c + 1] !== null) {
            this.addConstraint(iCurrent, gridIndices[r][c + 1]!, material.stretchStiffness);
          }
          if (r + 1 < rows && gridIndices[r + 1][c] !== null) {
            this.addConstraint(iCurrent, gridIndices[r + 1][c]!, material.stretchStiffness);
          }

          // Shear
          if (r + 1 < rows && c + 1 < cols && gridIndices[r + 1][c + 1] !== null) {
            this.addConstraint(iCurrent, gridIndices[r + 1][c + 1]!, material.stretchStiffness * 0.7);
          }
          if (r + 1 < rows && c - 1 >= 0 && gridIndices[r + 1][c - 1] !== null) {
            this.addConstraint(iCurrent, gridIndices[r + 1][c - 1]!, material.stretchStiffness * 0.7);
          }

          // Bending (2-hop)
          if (c + 2 < cols && gridIndices[r][c + 2] !== null) {
            this.addConstraint(iCurrent, gridIndices[r][c + 2]!, material.bendingStiffness);
          }
          if (r + 2 < rows && gridIndices[r + 2][c] !== null) {
            this.addConstraint(iCurrent, gridIndices[r + 2][c]!, material.bendingStiffness);
          }

          // Triangle Indices
          if (r + 1 < rows && c + 1 < cols) {
            const pTL = gridIndices[r][c];
            const pTR = gridIndices[r][c + 1];
            const pBL = gridIndices[r + 1][c];
            const pBR = gridIndices[r + 1][c + 1];

            if (pTL !== null && pTR !== null && pBL !== null) {
              if (isBack) {
                this.indices.push(pTL, pTR, pBL);
              } else {
                this.indices.push(pTL, pBL, pTR);
              }
            }
            if (pTR !== null && pBR !== null && pBL !== null) {
              if (isBack) {
                this.indices.push(pTR, pBR, pBL);
              } else {
                this.indices.push(pTR, pBL, pBR);
              }
            }
          }
        }
      }
    });

    // Virtual Seams — pre-stitch: move paired particles to shared midpoint
    seams.forEach((seam) => {
      const pA = pieces.find((p) => p.id === seam.edgeA.pieceId);
      const pB = pieces.find((p) => p.id === seam.edgeB.pieceId);
      if (!pA || !pB) return;

      const particlesA = this.getOrderedEdgeParticles(pA, seam.edgeA.edgeIndex);
      const particlesB = this.getOrderedEdgeParticles(pB, seam.edgeB.edgeIndex);

      if (particlesA.length === 0 || particlesB.length === 0) return;

      const pairCount = Math.min(particlesA.length, particlesB.length);
      for (let k = 0; k < pairCount; k++) {
        const tau = pairCount > 1 ? k / (pairCount - 1) : 0.5;
        const idxA = this.sampleParticleAtTau(particlesA, tau);
        const idxB = this.sampleParticleAtTau(particlesB, tau);

        if (idxA !== null && idxB !== null && idxA !== idxB) {
          // Pre-stitch: place both particles at their midpoint so garment starts sewn
          const midpoint = this.particles[idxA].pos.clone()
            .add(this.particles[idxB].pos).multiplyScalar(0.5);
          this.particles[idxA].pos.copy(midpoint);
          this.particles[idxA].prevPos.copy(midpoint);
          this.particles[idxB].pos.copy(midpoint);
          this.particles[idxB].prevPos.copy(midpoint);

          this.seamConstraints.push({
            p1: idxA,
            p2: idxB,
            restLength: 0.0,
            strength: seam.strength * 2.5,
          });
        }
      }
    });

    this.stressMap = new Float32Array(this.particles.length);
  }

  // ─── Map 2D pattern → 3D body-hugging positions ───
  private mapPatternToBody(
    lx: number, ly: number,
    minX: number, maxX: number,
    minY: number, maxY: number,
    isFront: boolean, isBack: boolean,
    piece: PatternPiece
  ): THREE.Vector3 {
    const patternWidth = maxX - minX;
    const patternHeight = maxY - minY;

    // Normalize: nx in [-1, 1] (left-right), ny in [0, 1] (top=shoulder, bottom=hem)
    const nx = ((lx - minX) / patternWidth) * 2 - 1;
    const ny = (ly - minY) / patternHeight;

    if (!isFront && !isBack) {
      const px = piece.placement.origin3D[0] + lx * 0.0012;
      const py = 1.35 + piece.placement.origin3D[1] - ly * 0.0012;
      const pz = piece.placement.origin3D[2];
      return new THREE.Vector3(px, py, pz);
    }

    // Map vertical: top (ny=0) → shoulders Y=1.25, bottom (ny=1) → hem Y=0.72
    const shoulderY = 1.25;
    const hemY = 0.72;
    const bodyY = shoulderY - ny * (shoulderY - hemY);

    // Get body shape at this height
    const cross = this.getBodyCrossSection(bodyY);

    // Map horizontal: wrap around body with slight garment ease
    const ease = 1.06;
    const bodyX = nx * cross.halfWidth * ease;

    // Z position: on front or back surface of the elliptical cross-section
    const skinOffset = 0.012;
    let bodyZ: number;

    if (isFront) {
      // Front: Z = zCenter - halfDepth - offset (Z-min is front)
      bodyZ = cross.zCenter - cross.halfDepth - skinOffset;
      // Subtle body curve (chest/belly protrusion at center)
      const curveFactor = (1.0 - nx * nx) * 0.010;
      bodyZ -= curveFactor;
    } else {
      // Back: Z = zCenter + halfDepth + offset
      bodyZ = cross.zCenter + cross.halfDepth + skinOffset;
      const curveFactor = (1.0 - nx * nx) * 0.006;
      bodyZ += curveFactor;
    }

    return new THREE.Vector3(bodyX, bodyY, bodyZ);
  }

  private getOrderedEdgeParticles(piece: PatternPiece, edgeIndex: number): { index: number; t: number }[] {
    const pts = piece.points;
    if (edgeIndex < 0 || edgeIndex >= pts.length) return [];

    const p1 = pts[edgeIndex];
    const p2 = pts[(edgeIndex + 1) % pts.length];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 0.0001) return [];

    const threshold = 28;
    const candidates: { index: number; t: number }[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.pieceId !== piece.id) continue;

      const px = p.local2D.x;
      const py = p.local2D.y;

      let t = ((px - p1.x) * dx + (py - p1.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;
      const dist = Math.hypot(px - projX, py - projY);

      if (dist <= threshold) {
        candidates.push({ index: i, t });
      }
    }

    candidates.sort((a, b) => a.t - b.t);
    return candidates;
  }

  private sampleParticleAtTau(candidates: { index: number; t: number }[], tau: number): number | null {
    if (candidates.length === 0) return null;
    let bestIdx = candidates[0].index;
    let bestDiff = Infinity;
    for (const c of candidates) {
      const diff = Math.abs(c.t - tau);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = c.index;
      }
    }
    return bestIdx;
  }

  private addConstraint(p1: number, p2: number, stiffness: number) {
    const d = this.particles[p1].pos.distanceTo(this.particles[p2].pos);
    this.constraints.push({ p1, p2, restLength: d, stiffness });
  }

  private isPointInPolygon(x: number, y: number, points: { x: number; y: number }[]) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x,
        yi = points[i].y;
      const xj = points[j].x,
        yj = points[j].y;
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  step(dt: number) {
    this.simTime += dt;
    const subSteps = 4;
    const subDt = Math.min(dt, 0.033) / subSteps;

    for (let sub = 0; sub < subSteps; sub++) {
      // 1. Verlet integration
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;

        const vel = p.pos.clone().sub(p.prevPos).multiplyScalar(this.damping);
        p.prevPos.copy(p.pos);

        // Ramp up gravity gradually so sewing has time to close before cloth falls
        const gravityScale = Math.min(1.0, this.simTime * 1.5);
        const accel = this.gravity.clone().multiplyScalar(subDt * subDt * gravityScale);
        p.pos.add(vel).add(accel);
      }

      // 2. Constraint solving
      for (let iter = 0; iter < this.iterations; iter++) {
        // Sewing constraints
        for (let s = 0; s < this.seamConstraints.length; s++) {
          const sc = this.seamConstraints[s];
          const p1 = this.particles[sc.p1];
          const p2 = this.particles[sc.p2];

          const delta = p2.pos.clone().sub(p1.pos);
          const dist = delta.length();

          if (dist > sc.restLength + 0.001) {
            const diff = (dist - sc.restLength) / dist;
            // Progressive sewing: ramp up over first second, then full strength
            const timeFactor = Math.min(1.0, this.simTime * 3.0);
            const pull = Math.min(diff * 0.65, 0.45) * timeFactor * Math.min(1.0, sc.strength);
            const correction = delta.clone().multiplyScalar(pull);

            if (!p1.pinned) p1.pos.add(correction);
            if (!p2.pinned) p2.pos.sub(correction);
          }
        }

        // Stretch & Bending
        for (let c = 0; c < this.constraints.length; c++) {
          const cons = this.constraints[c];
          const p1 = this.particles[cons.p1];
          const p2 = this.particles[cons.p2];

          const delta = p2.pos.clone().sub(p1.pos);
          const dist = delta.length();
          if (dist > 0.0001) {
            const diff = (dist - cons.restLength) / dist;
            const correction = delta.multiplyScalar(diff * 0.5 * cons.stiffness);

            if (!p1.pinned) p1.pos.add(correction);
            if (!p2.pinned) p2.pos.sub(correction);

            const strain = Math.abs(dist - cons.restLength) / Math.max(cons.restLength, 0.001);
            this.stressMap[cons.p1] = Math.max(this.stressMap[cons.p1], strain);
            this.stressMap[cons.p2] = Math.max(this.stressMap[cons.p2], strain);
          }
        }
      }

      // 3. Body collision (elliptical cross-section)
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;

        this.resolveBodyCollision(p);

        // Floor
        if (p.pos.y < 0.02) {
          p.pos.y = 0.02;
          p.prevPos.x = p.pos.x;
          p.prevPos.z = p.pos.z;
        }
      }
    }

    // Gradually unpin shoulder particles after settling
    if (this.simTime > 1.8) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned && p.invMass === 0) {
          p.pinned = false;
          p.invMass = 0.06;
          p.prevPos.copy(p.pos);
        }
      }
    }
  }

  private resolveBodyCollision(p: ClothParticle) {
    const y = p.pos.y;
    if (y < 0.0 || y > 1.50) return;

    const cross = this.getBodyCrossSection(y);
    const skinOffset = 0.016;

    const hw = cross.halfWidth + skinOffset;
    const hd = cross.halfDepth + skinOffset;
    const zc = cross.zCenter;

    const rx = p.pos.x;
    const rz = p.pos.z - zc;

    // Ellipse: (x/hw)^2 + (z/hd)^2 = 1
    const ellipseVal = (rx * rx) / (hw * hw) + (rz * rz) / (hd * hd);

    if (ellipseVal < 1.0) {
      // Inside body — push out to surface
      const angle = Math.atan2(rz / hd, rx / hw);
      const surfX = hw * Math.cos(angle);
      const surfZ = hd * Math.sin(angle) + zc;

      p.pos.x = surfX;
      p.pos.z = surfZ;

      // Surface friction
      const normal = new THREE.Vector3(
        surfX / (hw * hw),
        0,
        (surfZ - zc) / (hd * hd)
      ).normalize();

      if (normal.y > 0.3) {
        p.prevPos.copy(p.pos);
      } else {
        const vel = p.pos.clone().sub(p.prevPos);
        const vNormal = normal.clone().multiplyScalar(vel.dot(normal));
        const vTangent = vel.clone().sub(vNormal).multiplyScalar(0.3);
        p.prevPos.copy(p.pos.clone().sub(vTangent));
      }
    }

    // Arm capsule collision
    for (let c = 0; c < this.colliders.length; c++) {
      const col = this.colliders[c];
      this.resolveCapsuleCollision(p, col);
    }
  }

  private resolveCapsuleCollision(p: ClothParticle, col: AvatarCollider) {
    if (col.type === 'sphere') {
      const distVec = p.pos.clone().sub(col.start);
      const dist = distVec.length();
      const skinOffset = col.radius + 0.012;
      if (dist < skinOffset && dist > 0.0001) {
        const normal = distVec.normalize();
        p.pos.copy(col.start.clone().add(normal.multiplyScalar(skinOffset)));
        const v = p.pos.clone().sub(p.prevPos).multiplyScalar(0.3);
        p.prevPos.copy(p.pos.clone().sub(v));
      }
      return;
    }

    const ab = col.end.clone().sub(col.start);
    const ap = p.pos.clone().sub(col.start);
    const abLenSq = ab.lengthSq();
    if (abLenSq < 0.0001) return;

    let t = ap.dot(ab) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const closestPoint = col.start.clone().add(ab.clone().multiplyScalar(t));
    const distVector = p.pos.clone().sub(closestPoint);
    const dist = distVector.length();

    const skinOffset = col.radius + 0.012;
    if (dist < skinOffset && dist > 0.0001) {
      const normal = distVector.normalize();
      p.pos.copy(closestPoint.add(normal.multiplyScalar(skinOffset)));

      const vel = p.pos.clone().sub(p.prevPos);
      const vTangent = vel.clone().sub(normal.clone().multiplyScalar(vel.dot(normal))).multiplyScalar(0.3);
      p.prevPos.copy(p.pos.clone().sub(vTangent));
    }
  }
}
