import * as THREE from 'three';
import type { AvatarConfig } from '../types/cad';

// Torso cross-sections measured from public/models/femaleMannequin.glb by analyze-mannequin-final.mjs.
// [y, halfWidthX, halfDepthZ, zCenter] on a uniform 0.02 grid. Table is authored with front = -Z;
// getBodyCrossSection mirrors zCenter so +Z faces the camera.
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

const PROFILE_MIN_Y = BODY_PROFILE[0][0];
const PROFILE_MAX_Y = BODY_PROFILE[BODY_PROFILE.length - 1][0];
const PROFILE_STEP = 0.02;

/** Bust girth of the raw profile (cm), Ramanujan ellipse perimeter at y=1.22. Reference for girth scaling. */
const REF_BUST_CM = 78.9;
/** Body height (cm) the raw profile stands for: its shoulder crest (y=1.36) sits at 0.824 of total height. */
const REF_HEIGHT_CM = 165;
/** Neck base in raw profile units — garments hang from here. */
const NECK_Y = 1.43;

export interface BodyScale {
  x: number;
  y: number;
  z: number;
  waist: number;
  hips: number;
  shoulder: number;
}

export interface BodyCross {
  halfWidth: number;
  halfDepth: number;
  zCenter: number;
}

export interface Capsule {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

// A-pose arm centerline from the same GLB dump: [y, x, humanRadius]. Radii are human upper-arm to
// wrist values (bicep 30cm down to wrist 19cm circumference), not the GLB's own inflated capsule
// radii, which are ~35% wider than any pattern sleeve in PATTERN presets.
const ARM_PATH: [number, number, number][] = [
  [1.253, 0.250, 0.048],
  [1.185, 0.340, 0.045],
  [1.100, 0.440, 0.040],
  [1.015, 0.520, 0.035],
  [0.948, 0.570, 0.030],
];

const ARM_Z = -0.04; // mirrored: arms sit slightly behind the body's center plane
const REF_CHEST_CM = 92; // default AvatarConfig chest; arm girth scales off this

function girthCm(halfWidth: number, halfDepth: number): number {
  const h = ((halfWidth - halfDepth) / (halfWidth + halfDepth)) ** 2;
  return Math.PI * (halfWidth + halfDepth) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h))) * 100;
}

const REF_WAIST_CM = girthCm(0.112, 0.080);
const REF_HIPS_CM = girthCm(0.170, 0.107);

function blendGirth(y: number, lo: number, hi: number, start: number, end: number): number {
  return THREE.MathUtils.lerp(start, end, THREE.MathUtils.clamp((y - lo) / (hi - lo), 0, 1));
}

/** Independent girths shape each body zone; shoulders also set the arm roots. */
export function getBodyScale(avatar: AvatarConfig): BodyScale {
  const measured = (value: number | undefined, fallback: number) => Number.isFinite(value) ? value! : fallback;
  const girth = THREE.MathUtils.clamp(measured(avatar.chestCircumference, 92) / REF_BUST_CM, 0.35, 2.8);
  const height = THREE.MathUtils.clamp(measured(avatar.height, 175) / REF_HEIGHT_CM, 0.6, 1.4);
  return { x: girth, y: height, z: girth,
    waist: THREE.MathUtils.clamp(measured(avatar.waistCircumference, 68) / REF_WAIST_CM, 0.4, 3.6),
    hips: THREE.MathUtils.clamp(measured(avatar.hipsCircumference, 96) / REF_HIPS_CM, 0.35, 2.6),
    shoulder: THREE.MathUtils.clamp(measured(avatar.shoulderWidth, 40) / 42, 0.5, 1.8) };
}

export function getBodyBounds(s: BodyScale): { minY: number; maxY: number } {
  return { minY: PROFILE_MIN_Y * s.y, maxY: PROFILE_MAX_Y * s.y };
}

/** World Y of the neck base, where the topmost pattern point is anchored. */
export function getNeckY(s: BodyScale): number {
  return NECK_Y * s.y;
}

/** Cross-section of the scaled body at a world height. +Z is the front. */
export function getBodyCrossSection(worldY: number, s: BodyScale): BodyCross {
  const y = worldY / s.y;
  const raw = (y - PROFILE_MIN_Y) / PROFILE_STEP;
  const i = Math.floor(THREE.MathUtils.clamp(raw, 0, BODY_PROFILE.length - 2));
  const t = THREE.MathUtils.clamp(raw - i, 0, 1);
  const a = BODY_PROFILE[i];
  const b = BODY_PROFILE[i + 1];
  const girth = y < 1.1 ? blendGirth(y, 0.9, 1.1, s.hips, s.waist)
    : y < 1.22 ? blendGirth(y, 1.1, 1.22, s.waist, s.x)
    : y < 1.36 ? blendGirth(y, 1.22, 1.36, s.x, s.shoulder)
    : blendGirth(y, 1.36, 1.44, s.shoulder, s.x);
  return {
    halfWidth: THREE.MathUtils.lerp(a[1], b[1], t) * girth,
    halfDepth: THREE.MathUtils.lerp(a[2], b[2], t) * girth,
    zCenter: -THREE.MathUtils.lerp(a[3], b[3], t) * girth,
  };
}

/** Both arms as capsule chains, plus the neck. `side` is +1 for the wearer's left (+X on screen). */
export function getLimbColliders(avatar: AvatarConfig, s: BodyScale, includeHead = false): Capsule[] {
  const armGirth = getArmGirth(avatar);
  const capsules: Capsule[] = [];

  for (const side of [1, -1]) {
    for (let i = 0; i < ARM_PATH.length - 1; i++) {
      const [y1, x1, r1] = ARM_PATH[i];
      const [y2, x2, r2] = ARM_PATH[i + 1];
      capsules.push({
        start: new THREE.Vector3(side * (0.21 * s.shoulder + (x1 - 0.21) * s.y), y1 * s.y, ARM_Z * s.z),
        end: new THREE.Vector3(side * (0.21 * s.shoulder + (x2 - 0.21) * s.y), y2 * s.y, ARM_Z * s.z),
        radius: ((r1 + r2) / 2) * armGirth,
      });
    }
  }

  capsules.push({
    start: new THREE.Vector3(0, 1.35 * s.y, -0.057 * s.z),
    end: new THREE.Vector3(0, 1.52 * s.y, -0.058 * s.z),
    radius: 0.058 * s.x,
  });
  if (includeHead) capsules.push({
    start: new THREE.Vector3(0, 1.55 * s.y, -0.055 * s.z),
    end: new THREE.Vector3(0, 1.64 * s.y, -0.055 * s.z),
    radius: 0.105 * s.y,
  });

  return capsules;
}

/** Shoulder tip: where the torso ends and a sleeve cap starts, from the profile's widest row. */
const SHOULDER_TIP: [number, number, number] = [1.36, 0.210, 0.052];

/**
 * Arm centerline used to hang sleeve panels. It starts at the shoulder tip rather than the deltoid
 * so a sleeve cap lands on the armhole instead of 16 cm outboard of it.
 */
export function getArmAxis(side: number, s: BodyScale, armGirth: number) {
  const last = ARM_PATH[ARM_PATH.length - 1];
  const start = new THREE.Vector3(side * SHOULDER_TIP[1] * s.shoulder, SHOULDER_TIP[0] * s.y, ARM_Z * s.z);
  const end = new THREE.Vector3(side * (SHOULDER_TIP[1] * s.shoulder + (last[1] - SHOULDER_TIP[1]) * s.y), last[0] * s.y, ARM_Z * s.z);
  return {
    start,
    end,
    radiusAt: (t: number) =>
      THREE.MathUtils.lerp(SHOULDER_TIP[2], last[2], THREE.MathUtils.clamp(t, 0, 1)) * armGirth,
  };
}

export function getArmGirth(avatar: AvatarConfig): number {
  return THREE.MathUtils.clamp((Number.isFinite(avatar.chestCircumference) ? avatar.chestCircumference : 92) / REF_CHEST_CM, 0.5, 2);
}
