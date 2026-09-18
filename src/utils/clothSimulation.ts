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

export class ClothSimulator {
  particles: ClothParticle[] = [];
  constraints: DistanceConstraint[] = [];
  seamConstraints: SeamConstraint[] = [];
  colliders: AvatarCollider[] = [];
  indices: number[] = [];
  stressMap: Float32Array = new Float32Array(0);

  gravity: THREE.Vector3 = new THREE.Vector3(0, -9.8, 0);
  damping: number = 0.982;
  iterations: number = 7;
  simTime: number = 0;

  constructor() {
    this.setupAvatarColliders();
  }

  setupAvatarColliders() {
    // Exact anatomical colliders calibrated to the 3D female mannequin avatar
    this.colliders = [
      // 1. Neck (prevents garment from slipping over head)
      {
        type: 'capsule',
        start: new THREE.Vector3(0, 1.42, 0.02),
        end: new THREE.Vector3(0, 1.58, 0.02),
        radius: 0.065,
      },
      // 2. Head
      {
        type: 'sphere',
        start: new THREE.Vector3(0, 1.63, 0.03),
        end: new THREE.Vector3(0, 1.63, 0.03),
        radius: 0.11,
      },
      // 3. Clavicle & Shoulders (Primary load-bearing shelf for garments)
      {
        type: 'capsule',
        start: new THREE.Vector3(-0.04, 1.415, 0.02),
        end: new THREE.Vector3(-0.22, 1.38, 0.01),
        radius: 0.072,
      },
      {
        type: 'capsule',
        start: new THREE.Vector3(0.04, 1.415, 0.02),
        end: new THREE.Vector3(0.22, 1.38, 0.01),
        radius: 0.072,
      },
      // 4. Chest & Upper Torso
      {
        type: 'capsule',
        start: new THREE.Vector3(0, 1.18, 0.03),
        end: new THREE.Vector3(0, 1.38, 0.03),
        radius: 0.145,
      },
      // 5. Bust Cushion (Front projection)
      {
        type: 'sphere',
        start: new THREE.Vector3(0, 1.22, 0.07),
        end: new THREE.Vector3(0, 1.22, 0.07),
        radius: 0.135,
      },
      // 6. Waist & Midriff
      {
        type: 'capsule',
        start: new THREE.Vector3(0, 0.98, 0.03),
        end: new THREE.Vector3(0, 1.18, 0.03),
        radius: 0.125,
      },
      // 7. Pelvis & Hips
      {
        type: 'capsule',
        start: new THREE.Vector3(0, 0.80, 0.02),
        end: new THREE.Vector3(0, 0.98, 0.02),
        radius: 0.165,
      },
      // 8. Left Upper Arm
      {
        type: 'capsule',
        start: new THREE.Vector3(-0.22, 1.38, 0.01),
        end: new THREE.Vector3(-0.38, 1.08, 0.01),
        radius: 0.065,
      },
      // 9. Right Upper Arm
      {
        type: 'capsule',
        start: new THREE.Vector3(0.22, 1.38, 0.01),
        end: new THREE.Vector3(0.38, 1.08, 0.01),
        radius: 0.065,
      },
      // 10. Left Leg / Thigh
      {
        type: 'capsule',
        start: new THREE.Vector3(-0.10, 0.80, 0),
        end: new THREE.Vector3(-0.10, 0.15, 0),
        radius: 0.088,
      },
      // 11. Right Leg / Thigh
      {
        type: 'capsule',
        start: new THREE.Vector3(0.10, 0.80, 0),
        end: new THREE.Vector3(0.10, 0.15, 0),
        radius: 0.088,
      },
    ];
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

    // Filter to active pieces in 3D (pieces that have at least one seam connection or are front/back)
    const activePieces = pieces.filter(
      (p) =>
        p.id === 'piece-front' ||
        p.id === 'piece-back' ||
        seams.some((s) => s.edgeA.pieceId === p.id || s.edgeB.pieceId === p.id)
    );

    const cols = 20;
    const rows = 24;

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

      for (let r = 0; r < rows; r++) {
        gridIndices[r] = [];
        for (let c = 0; c < cols; c++) {
          const lx = minX + c * stepX;
          const ly = minY + r * stepY;

          if (this.isPointInPolygon(lx, ly, piece.points)) {
            const pIdx = this.particles.length;
            gridIndices[r][c] = pIdx;

            let px = 0;
            let py = 0;
            let pz = 0;

            if (isFront) {
              // Front Bodice: positioned slightly in front of chest & draped over shoulders
              px = lx * 0.00135;
              py = 1.46 - (ly - (-220)) * 0.00115;
              const curve = 1.0 - Math.min(1.0, Math.abs(lx / 140));
              pz = 0.16 + curve * 0.045;
              // Shoulder curve meeting back shoulder
              if (ly < -160) {
                const shoulderBlend = Math.min(1.0, (-ly - 160) / 90);
                pz = THREE.MathUtils.lerp(pz, 0.03, shoulderBlend);
              }
            } else if (isBack) {
              // Back Bodice: positioned behind back & over shoulders
              px = lx * 0.00135;
              py = 1.46 - (ly - (-220)) * 0.00115;
              const curve = 1.0 - Math.min(1.0, Math.abs(lx / 140));
              pz = -0.10 - curve * 0.035;
              if (ly < -160) {
                const shoulderBlend = Math.min(1.0, (-ly - 160) / 90);
                pz = THREE.MathUtils.lerp(pz, -0.01, shoulderBlend);
              }
            } else {
              px = piece.placement.origin3D[0] + lx * 0.0012;
              py = 1.35 + piece.placement.origin3D[1] - ly * 0.0012;
              pz = piece.placement.origin3D[2];
            }

            const pos = new THREE.Vector3(px, py, pz);
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

          // Shear cross
          if (r + 1 < rows && c + 1 < cols && gridIndices[r + 1][c + 1] !== null) {
            this.addConstraint(iCurrent, gridIndices[r + 1][c + 1]!, material.stretchStiffness * 0.85);
          }
          if (r + 1 < rows && c - 1 >= 0 && gridIndices[r + 1][c - 1] !== null) {
            this.addConstraint(iCurrent, gridIndices[r + 1][c - 1]!, material.stretchStiffness * 0.85);
          }

          // Bending (2 hops)
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

    // Virtual Seams
    seams.forEach((seam) => {
      const pA = pieces.find((p) => p.id === seam.edgeA.pieceId);
      const pB = pieces.find((p) => p.id === seam.edgeB.pieceId);
      if (!pA || !pB) return;

      const particlesA = this.getOrderedEdgeParticles(pA, seam.edgeA.edgeIndex);
      const particlesB = this.getOrderedEdgeParticles(pB, seam.edgeB.edgeIndex);

      if (particlesA.length === 0 || particlesB.length === 0) return;

      const pairCount = Math.max(particlesA.length, particlesB.length);
      for (let k = 0; k < pairCount; k++) {
        const tau = pairCount > 1 ? k / (pairCount - 1) : 0.5;
        const idxA = this.sampleParticleAtTau(particlesA, tau);
        const idxB = this.sampleParticleAtTau(particlesB, tau);

        if (idxA !== null && idxB !== null && idxA !== idxB) {
          this.seamConstraints.push({
            p1: idxA,
            p2: idxB,
            restLength: 0.015,
            strength: seam.strength * 1.8,
          });
        }
      }
    });

    this.stressMap = new Float32Array(this.particles.length);
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

    const threshold = 24; // mm
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
    const subDt = Math.min(dt, 0.033) / this.iterations;

    for (let iter = 0; iter < this.iterations; iter++) {
      // 1. Verlet integration
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;

        const vel = p.pos.clone().sub(p.prevPos).multiplyScalar(this.damping);
        p.prevPos.copy(p.pos);

        const accel = this.gravity.clone().multiplyScalar(subDt * subDt);
        p.pos.add(vel).add(accel);
      }

      // 2. Virtual Sewing Constraints (Stable PBD correction, max 0.5 displacement per particle)
      for (let s = 0; s < this.seamConstraints.length; s++) {
        const sc = this.seamConstraints[s];
        const p1 = this.particles[sc.p1];
        const p2 = this.particles[sc.p2];

        const delta = p2.pos.clone().sub(p1.pos);
        const dist = delta.length();
        if (dist > sc.restLength && dist > 0.0005) {
          const diff = (dist - sc.restLength) / dist;
          // Scale factor: strictly clamped <= 0.5 per particle to guarantee unconditional stability
          const pull = Math.min(diff, 0.9) * 0.45 * Math.min(1.0, sc.strength);
          const correction = delta.multiplyScalar(pull);

          if (!p1.pinned) p1.pos.add(correction);
          if (!p2.pinned) p2.pos.sub(correction);
        }
      }

      // 3. Stretch & Bending Constraints
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

          const strain = Math.abs(dist - cons.restLength) / cons.restLength;
          this.stressMap[cons.p1] = Math.max(this.stressMap[cons.p1], strain);
          this.stressMap[cons.p2] = Math.max(this.stressMap[cons.p2], strain);
        }
      }

      // 4. Avatar Collision Detection & Surface Friction
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;

        for (let c = 0; c < this.colliders.length; c++) {
          const col = this.colliders[c];
          this.resolveCollider(p, col);
        }

        // Floor collision
        if (p.pos.y < 0.02) {
          p.pos.y = 0.02;
          p.prevPos.x = p.pos.x;
          p.prevPos.z = p.pos.z;
        }
      }
    }
  }

  private resolveCollider(p: ClothParticle, col: AvatarCollider) {
    if (col.type === 'sphere') {
      const distVec = p.pos.clone().sub(col.start);
      const dist = distVec.length();
      const skinOffset = col.radius + 0.012;
      if (dist < skinOffset && dist > 0.0001) {
        const normal = distVec.normalize();
        p.pos.copy(col.start.clone().add(normal.multiplyScalar(skinOffset)));
        const v = p.pos.clone().sub(p.prevPos);
        v.multiplyScalar(0.4);
        p.prevPos.copy(p.pos.clone().sub(v));
      }
      return;
    }

    // Capsule collision
    const ab = col.end.clone().sub(col.start);
    const ap = p.pos.clone().sub(col.start);

    const abLenSq = ab.lengthSq();
    let t = ap.dot(ab) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const closestPoint = col.start.clone().add(ab.multiplyScalar(t));
    const distVector = p.pos.clone().sub(closestPoint);
    const dist = distVector.length();

    const skinOffset = col.radius + 0.012;
    if (dist < skinOffset && dist > 0.0001) {
      const normal = distVector.normalize();
      p.pos.copy(closestPoint.add(normal.multiplyScalar(skinOffset)));

      // If normal faces upward (resting on top of shoulder/clavicle), apply high static friction
      if (normal.y > 0.45) {
        // Firmly hold cloth on top of shoulders
        p.prevPos.x = p.pos.x;
        p.prevPos.z = p.pos.z;
        p.prevPos.y = p.pos.y;
      } else {
        const v = p.pos.clone().sub(p.prevPos);
        const vNormal = normal.clone().multiplyScalar(v.dot(normal));
        const vTangent = v.clone().sub(vNormal).multiplyScalar(0.25);
        p.prevPos.copy(p.pos.clone().sub(vTangent));
      }
    }
  }
}
