import * as THREE from 'three';
import type { AvatarConfig, FabricMaterial, PatternPiece, SeamConnection } from '../types/cad';
import { buildGarmentMesh, type ConstraintSet, type GarmentMesh } from './patternMesh';
import {
  getBodyBounds,
  getBodyCrossSection,
  getBodyScale,
  getLimbColliders,
  type BodyScale,
  type Capsule,
} from './avatarBody';

// Small substeps beat many iterations for stiffness at equal cost (Macklin et al., "Small Steps in
// Physics Simulation"): with 2 substeps a t-shirt's neckline stretched over the shoulders and fell off.
const SUBSTEPS = 8;
const SOLVER_ITERATIONS = 2;
const SKIN_OFFSET = 0.006;
const MAX_DT = 1 / 50;
const REST_ENERGY = 4e-6;

/**
 * Position-based cloth solver over a mesh triangulated from the 2D pattern.
 * Verlet integration, Gauss-Seidel projection of stretch / bend / seam constraints,
 * then analytic collision against the avatar torso and limbs.
 */
export class ClothSimulator {
  readonly mesh: GarmentMesh;
  readonly scale: BodyScale;

  private pos: Float32Array;
  private prev: Float32Array;
  private frameStart: Float32Array;
  private frames = 0;
  private restingFrames = 0;
  private colliders: Capsule[];
  private bodyMinY: number;
  private bodyMaxY: number;
  private friction: number;
  private damping: number;
  private gravity = -9.81;
  private assembled = false;

  static create(
    pieces: PatternPiece[],
    seams: SeamConnection[],
    material: FabricMaterial,
    avatar: AvatarConfig,
  ): ClothSimulator | null {
    const stretch = THREE.MathUtils.clamp(Number.isFinite(material.stretchStiffness) ? material.stretchStiffness : 0.8, 0.15, 1);
    const bend = THREE.MathUtils.clamp(Number.isFinite(material.bendingStiffness) ? material.bendingStiffness : 0.1, 0.01, 0.9);
    const mesh = buildGarmentMesh(pieces, seams, avatar, stretch, bend);
    if (!mesh) return null;
    return new ClothSimulator(mesh, material, avatar);
  }

  constructor(mesh: GarmentMesh, material: FabricMaterial, avatar: AvatarConfig) {
    this.mesh = mesh;
    this.pos = Float32Array.from(mesh.positions);
    this.prev = Float32Array.from(mesh.positions);
    this.frameStart = Float32Array.from(mesh.positions);
    this.scale = getBodyScale(avatar);
    this.colliders = getLimbColliders(avatar, this.scale, mesh.groups.some((group) => group.zone === 'hood'));

    const bounds = getBodyBounds(this.scale);
    this.bodyMinY = bounds.minY;
    this.bodyMaxY = bounds.maxY;

    this.friction = THREE.MathUtils.clamp(Number.isFinite(material.friction) ? material.friction : 0.5, 0.1, 0.95);
    // Heavier fabric loses swing faster; 220 g/m2 jersey sits mid-range.
    const density = Number.isFinite(material.density) ? material.density : 220;
    this.damping = THREE.MathUtils.clamp(0.995 - density / 12000, 0.955, 0.992);
  }

  get positions(): Float32Array {
    return this.pos;
  }

  /** Stitch the panels together before gravity is switched on: seams at full strength, no falling. */
  assemble(iterations = 260) {
    for (const _ of this.assembleBatches(12, iterations)) { void _; }
  }

  /** Yield assembly batches so a worker can accept a replacement pattern between solver passes. */
  *assembleBatches(batchSize = 12, iterations = 260): Generator<void> {
    const pinned = this.mesh.invMass.slice();
    this.mesh.invMass.fill(1);
    const batch = Math.max(1, Math.floor(batchSize));
    for (let i = 0; i < iterations; i++) {
      const gain = Math.min(1, 0.15 + i / 40);
      this.solveSet(this.mesh.structural, 1);
      this.solveSet(this.mesh.bending, 0.35);
      this.solveSet(this.mesh.seams, gain);
      if (i % 4 === 0) this.collide();
      if ((i + 1) % batch === 0) yield;
    }
    this.collide();
    this.mesh.invMass.set(pinned);
    this.prev.set(this.pos);
    this.frameStart.set(this.pos);
    this.frames = 0;
    this.restingFrames = 0;
    this.assembled = true;
  }

  step(dt: number) {
    if (!this.assembled) this.assemble();
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.frameStart.set(this.pos);
    const clamped = Math.min(dt, MAX_DT);
    const h = clamped / SUBSTEPS;

    for (let s = 0; s < SUBSTEPS; s++) {
      this.integrate(h);
      for (let i = 0; i < SOLVER_ITERATIONS; i++) {
        this.solveSet(this.mesh.structural, 1);
        this.solveSet(this.mesh.seams, 1);
        this.solveSet(this.mesh.bending, 0.5);
        // Collide inside the loop: a seam pull can otherwise drag a sleeve straight through an arm,
        // and the next push-out then ejects it on the wrong side.
        this.collide();
      }
    }
    this.frames++;
    this.restingFrames = this.kineticEnergy() < REST_ENERGY ? this.restingFrames + 1 : 0;
  }

  /** Mean squared vertex displacement per frame — used to stop stepping once the drape settles. */
  kineticEnergy(): number {
    const n = this.mesh.vertexCount;
    let energy = 0;
    for (let i = 0; i < n * 3; i += 3) {
      const dx = this.pos[i] - this.frameStart[i];
      const dy = this.pos[i + 1] - this.frameStart[i + 1];
      const dz = this.pos[i + 2] - this.frameStart[i + 2];
      energy += dx * dx + dy * dy + dz * dz;
    }
    return energy / Math.max(1, n);
  }

  isSettled(): boolean {
    return this.assembled && this.frames >= 120 && this.restingFrames >= 24;
  }

  private integrate(h: number) {
    const gh = this.gravity * h * h;
    const im = this.mesh.invMass;
    for (let v = 0, i = 0; v < this.mesh.vertexCount; v++, i += 3) {
      if (im[v] === 0) continue;
      const vx = (this.pos[i] - this.prev[i]) * this.damping;
      const vy = (this.pos[i + 1] - this.prev[i + 1]) * this.damping;
      const vz = (this.pos[i + 2] - this.prev[i + 2]) * this.damping;
      this.prev[i] = this.pos[i];
      this.prev[i + 1] = this.pos[i + 1];
      this.prev[i + 2] = this.pos[i + 2];
      this.pos[i] += vx;
      this.pos[i + 1] += vy + gh;
      this.pos[i + 2] += vz;
    }
  }

  private solveSet(set: ConstraintSet, gain: number) {
    const { a, b, rest, stiffness } = set;
    const pos = this.pos;
    const im = this.mesh.invMass;

    for (let c = 0; c < a.length; c++) {
      const va = a[c];
      const vb = b[c];
      const wa = im[va];
      const wb = im[vb];
      const wsum = wa + wb;
      if (wsum === 0) continue;

      const ia = va * 3;
      const ib = vb * 3;
      const dx = pos[ib] - pos[ia];
      const dy = pos[ib + 1] - pos[ia + 1];
      const dz = pos[ib + 2] - pos[ia + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 1e-9) continue;

      const corr = ((dist - rest[c]) / dist) * stiffness[c] * gain / wsum;
      pos[ia] += dx * corr * wa;
      pos[ia + 1] += dy * corr * wa;
      pos[ia + 2] += dz * corr * wa;
      pos[ib] -= dx * corr * wb;
      pos[ib + 1] -= dy * corr * wb;
      pos[ib + 2] -= dz * corr * wb;
    }
  }

  // ponytail: no cloth-vs-cloth collision, so deep folds can pass through each other.
  // Add a spatial hash pass here if layered garments become a requirement.
  private collide() {
    const pos = this.pos;
    const prev = this.prev;
    const im = this.mesh.invMass;
    const grip = this.friction;

    for (let v = 0, i = 0; v < this.mesh.vertexCount; v++, i += 3) {
      if (im[v] === 0) continue;
      let hit = false;
      if (pos[i + 1] < SKIN_OFFSET) {
        pos[i + 1] = SKIN_OFFSET;
        hit = true;
      }

      const y = pos[i + 1];
      if (y > this.bodyMinY && y < this.bodyMaxY) {
        const cross = getBodyCrossSection(y, this.scale);
        const hw = cross.halfWidth + SKIN_OFFSET;
        const hd = cross.halfDepth + SKIN_OFFSET;
        const dx = pos[i];
        const dz = pos[i + 2] - cross.zCenter;
        const e = Math.sqrt((dx / hw) ** 2 + (dz / hd) ** 2);
        if (e < 1) {
          const radial = Math.sqrt(dx * dx + dz * dz);
          const ux = radial > 1e-6 ? dx / radial : 1;
          const uz = radial > 1e-6 ? dz / radial : 0;
          const surfaceR = e > 1e-6 ? radial / e : Math.hypot(ux * hw, uz * hd);

          // Body slope along the same ray: without it the collider is a vertical prism and the
          // shoulders never hold a garment up, so everything slides to the floor.
          const yUp = Math.min(this.bodyMaxY - 1e-4, y + 0.02);
          const up = getBodyCrossSection(yUp, this.scale);
          const eUp = Math.sqrt(
            (ux / (up.halfWidth + SKIN_OFFSET)) ** 2 + (uz / (up.halfDepth + SKIN_OFFSET)) ** 2,
          );
          const slope = THREE.MathUtils.clamp((1 / eUp - surfaceR) / (yUp - y), -3, 3);
          const inv = 1 / Math.sqrt(1 + slope * slope);
          const depth = surfaceR - radial;

          pos[i] += ux * inv * depth;
          pos[i + 1] += -slope * inv * depth;
          pos[i + 2] += uz * inv * depth;
          hit = true;
        }
      }

      for (let c = 0; c < this.colliders.length; c++) {
        const cap = this.colliders[c];
        const ax = cap.start.x;
        const ay = cap.start.y;
        const az = cap.start.z;
        const bx = cap.end.x - ax;
        const by = cap.end.y - ay;
        const bz = cap.end.z - az;
        const lenSq = bx * bx + by * by + bz * bz;
        let t = lenSq > 0 ? ((pos[i] - ax) * bx + (pos[i + 1] - ay) * by + (pos[i + 2] - az) * bz) / lenSq : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = pos[i] - (ax + bx * t);
        const cy = pos[i + 1] - (ay + by * t);
        const cz = pos[i + 2] - (az + bz * t);
        const d = Math.sqrt(cx * cx + cy * cy + cz * cz);
        const r = cap.radius + SKIN_OFFSET;
        if (d < r) {
          if (d > 1e-6) {
            const push = (r - d) / d;
            pos[i] += cx * push;
            pos[i + 1] += cy * push;
            pos[i + 2] += cz * push;
          } else {
            pos[i] += r;
          }
          hit = true;
        }
      }

      if (hit) {
        // Contact friction: bleed off the tangential slide so the garment grips the body.
        prev[i] += (pos[i] - prev[i]) * grip;
        prev[i + 1] += (pos[i + 1] - prev[i + 1]) * grip;
        prev[i + 2] += (pos[i + 2] - prev[i + 2]) * grip;
      }
    }
  }

  /** Push current particle positions into a BufferGeometry and refresh shading normals. */
  applyTo(geometry: THREE.BufferGeometry) {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    (attr.array as Float32Array).set(this.pos);
    attr.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  buildGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(this.pos), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from(this.mesh.uvs), 2));
    geometry.setIndex(new THREE.BufferAttribute(this.mesh.indices, 1));
    for (const group of this.mesh.groups) {
      geometry.addGroup(group.start, group.count, group.materialIndex);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
}
