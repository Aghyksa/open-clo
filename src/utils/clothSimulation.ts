import * as THREE from 'three';
import type { PatternPiece, SeamConnection, FabricMaterial } from '../types/cad';

export interface ClothParticle {
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  originalPos: THREE.Vector3;
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
  type: 'capsule' | 'sphere' | 'cylinder';
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
  damping: number = 0.985;
  iterations: number = 5;

  constructor() {
    this.setupAvatarColliders();
  }

  setupAvatarColliders() {
    this.colliders = [
      // Torso / Chest
      {
        type: 'capsule',
        start: new THREE.Vector3(0, 0.95, 0),
        end: new THREE.Vector3(0, 1.45, 0),
        radius: 0.22,
      },
      // Hips / Pelvis
      {
        type: 'capsule',
        start: new THREE.Vector3(0, 0.65, 0),
        end: new THREE.Vector3(0, 0.95, 0),
        radius: 0.21,
      },
      // Neck & Head
      {
        type: 'capsule',
        start: new THREE.Vector3(0, 1.45, 0),
        end: new THREE.Vector3(0, 1.75, 0),
        radius: 0.12,
      },
      // Left Shoulder & Arm
      {
        type: 'capsule',
        start: new THREE.Vector3(-0.2, 1.35, 0),
        end: new THREE.Vector3(-0.45, 0.95, 0),
        radius: 0.08,
      },
      // Right Shoulder & Arm
      {
        type: 'capsule',
        start: new THREE.Vector3(0.2, 1.35, 0),
        end: new THREE.Vector3(0.45, 0.95, 0),
        radius: 0.08,
      },
      // Left Leg
      {
        type: 'capsule',
        start: new THREE.Vector3(-0.11, 0.65, 0),
        end: new THREE.Vector3(-0.11, 0.05, 0),
        radius: 0.09,
      },
      // Right Leg
      {
        type: 'capsule',
        start: new THREE.Vector3(0.11, 0.65, 0),
        end: new THREE.Vector3(0.11, 0.05, 0),
        radius: 0.09,
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

    const pieceVertexOffsets = new Map<string, number>();

    // For each pattern piece, generate a grid mesh in 3D around the avatar
    pieces.forEach((piece) => {
      const startIdx = this.particles.length;
      pieceVertexOffsets.set(piece.id, startIdx);

      // Determine bounding box in 2D
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

      const cols = 14;
      const rows = 16;
      const stepX = (maxX - minX) / (cols - 1);
      const stepY = (maxY - minY) / (rows - 1);

      const gridIndices: (number | null)[][] = [];

      const [originX, originY, originZ] = piece.placement.origin3D;
      const isBack = piece.id === 'piece-back';
      const isSleeve = piece.id.includes('sleeve');

      // Generate particles
      for (let r = 0; r < rows; r++) {
        gridIndices[r] = [];
        for (let c = 0; c < cols; c++) {
          const lx = minX + c * stepX;
          const ly = minY + r * stepY;

          // Check if point inside polygon
          if (this.isPointInPolygon(lx, ly, piece.points)) {
            const pIdx = this.particles.length;
            gridIndices[r][c] = pIdx;

            // Map 2D coordinate to initial 3D drape position
            const normX = (lx / 250); // Scale factor from mm to 3D meters
            const normY = (-ly / 300);

            let px = originX + normX;
            let py = 1.0 + originY + normY;
            let pz = originZ;

            if (isBack) {
              px = originX - normX;
            } else if (isSleeve) {
              pz = originZ + normX * 0.5;
            }

            const pos = new THREE.Vector3(px, py, pz);
            this.particles.push({
              pos: pos.clone(),
              prevPos: pos.clone(),
              originalPos: pos.clone(),
              invMass: 1.0 / (material.density / 100),
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

      // Generate structural, shear & bending constraints and triangle indices
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const iCurrent = gridIndices[r][c];
          if (iCurrent === null) continue;

          // Horizontal constraint
          if (c + 1 < cols && gridIndices[r][c + 1] !== null) {
            const iRight = gridIndices[r][c + 1]!;
            this.addConstraint(iCurrent, iRight, material.stretchStiffness);
          }
          // Vertical constraint
          if (r + 1 < rows && gridIndices[r + 1][c] !== null) {
            const iDown = gridIndices[r + 1][c]!;
            this.addConstraint(iCurrent, iDown, material.stretchStiffness);
          }
          // Diagonal shear constraints
          if (r + 1 < rows && c + 1 < cols && gridIndices[r + 1][c + 1] !== null) {
            const iDiag1 = gridIndices[r + 1][c + 1]!;
            this.addConstraint(iCurrent, iDiag1, material.stretchStiffness * 0.85);
          }
          if (r + 1 < rows && c - 1 >= 0 && gridIndices[r + 1][c - 1] !== null) {
            const iDiag2 = gridIndices[r + 1][c - 1]!;
            this.addConstraint(iCurrent, iDiag2, material.stretchStiffness * 0.85);
          }

          // Bending constraints (2 hops)
          if (c + 2 < cols && gridIndices[r][c + 2] !== null) {
            this.addConstraint(iCurrent, gridIndices[r][c + 2]!, material.bendingStiffness);
          }
          if (r + 2 < rows && gridIndices[r + 2][c] !== null) {
            this.addConstraint(iCurrent, gridIndices[r + 2][c]!, material.bendingStiffness);
          }

          // Generate Triangles
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

    // Build Seam Sewing Springs between connected edges
    seams.forEach((seam) => {
      const pA = pieces.find((p) => p.id === seam.edgeA.pieceId);
      const pB = pieces.find((p) => p.id === seam.edgeB.pieceId);
      if (!pA || !pB) return;

      const particlesA = this.getEdgeParticles(pA);
      const particlesB = this.getEdgeParticles(pB);

      const count = Math.min(particlesA.length, particlesB.length);
      for (let i = 0; i < count; i++) {
        const idxA = particlesA[i];
        const idxB = particlesB[count - 1 - i]; // Invert direction for matching seams
        if (idxA !== undefined && idxB !== undefined) {
          this.seamConstraints.push({
            p1: idxA,
            p2: idxB,
            restLength: 0.02, // Tight seam distance
            strength: seam.strength,
          });
        }
      }
    });

    this.stressMap = new Float32Array(this.particles.length);
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

  private getEdgeParticles(piece: PatternPiece): number[] {
    // Collect outer edge particles for this piece
    const result: number[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].pieceId === piece.id) {
        result.push(i);
      }
    }
    return result.slice(0, 10);
  }

  step(dt: number) {
    const subDt = Math.min(dt, 0.033) / this.iterations;

    for (let iter = 0; iter < this.iterations; iter++) {
      // 1. Verlet integration (External forces + inertia)
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;

        const vel = p.pos.clone().sub(p.prevPos).multiplyScalar(this.damping);
        p.prevPos.copy(p.pos);

        // Apply gravity & velocity
        const accel = this.gravity.clone().multiplyScalar(subDt * subDt);
        p.pos.add(vel).add(accel);
      }

      // 2. Virtual Sewing Constraints (Pulls stitched seams together)
      for (let s = 0; s < this.seamConstraints.length; s++) {
        const sc = this.seamConstraints[s];
        const p1 = this.particles[sc.p1];
        const p2 = this.particles[sc.p2];

        const delta = p2.pos.clone().sub(p1.pos);
        const dist = delta.length();
        if (dist > sc.restLength && dist > 0.001) {
          const diff = (dist - sc.restLength) / dist;
          const correction = delta.multiplyScalar(diff * 0.4 * sc.strength);
          if (!p1.pinned) p1.pos.add(correction);
          if (!p2.pinned) p2.pos.sub(correction);
        }
      }

      // 3. Distance & Bending Constraints (Fabric stretch resistance)
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

          // Update stress tracking
          const strain = Math.abs(dist - cons.restLength) / cons.restLength;
          this.stressMap[cons.p1] = Math.max(this.stressMap[cons.p1], strain);
          this.stressMap[cons.p2] = Math.max(this.stressMap[cons.p2], strain);
        }
      }

      // 4. Avatar Collision Detection & Resolution
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;

        for (let c = 0; c < this.colliders.length; c++) {
          const col = this.colliders[c];
          this.resolveCapsuleCollision(p, col);
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

  private resolveCapsuleCollision(p: ClothParticle, col: AvatarCollider) {
    const ab = col.end.clone().sub(col.start);
    const ap = p.pos.clone().sub(col.start);

    const abLenSq = ab.lengthSq();
    let t = ap.dot(ab) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const closestPoint = col.start.clone().add(ab.multiplyScalar(t));
    const distVector = p.pos.clone().sub(closestPoint);
    const dist = distVector.length();

    const skinOffset = col.radius + 0.015; // 1.5cm air cushion between body & cloth
    if (dist < skinOffset && dist > 0.0001) {
      const normal = distVector.normalize();
      p.pos.copy(closestPoint.add(normal.multiplyScalar(skinOffset)));

      // Surface friction damping
      const v = p.pos.clone().sub(p.prevPos);
      v.multiplyScalar(0.7);
      p.prevPos.copy(p.pos.clone().sub(v));
    }
  }
}
