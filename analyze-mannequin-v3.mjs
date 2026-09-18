// Polyfill browser globals needed by Three.js in Node
import { Blob as NodeBlob } from 'buffer';
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ style: {} }) };
globalThis.Blob = globalThis.Blob || NodeBlob;
globalThis.URL = globalThis.URL || URL;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close: () => {} });

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

const glbPath = path.resolve('public/models/femaleMannequin.glb');
const buffer = fs.readFileSync(glbPath);
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, '', (gltf) => {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);

  const overallBox = new THREE.Box3().setFromObject(scene);
  const overallSize = new THREE.Vector3();
  overallBox.getSize(overallSize);
  const overallCenter = new THREE.Vector3();
  overallBox.getCenter(overallCenter);

  const allVertices = [];
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const pos = child.geometry.attributes.position;
      if (!pos) return;
      const vertex = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        vertex.set(pos.getX(i), pos.getY(i), pos.getZ(i));
        child.localToWorld(vertex);
        allVertices.push({ x: vertex.x, y: vertex.y, z: vertex.z });
      }
    }
  });

  const yMin = overallBox.min.y;
  const yMax = overallBox.max.y;
  const totalHeight = yMax - yMin;
  const r = (v) => +v.toFixed(6);

  function getExtentsAtY(targetY, sliceThickness, maxAbsX = Infinity) {
    const halfSlice = sliceThickness / 2;
    let verts = allVertices.filter(v =>
      v.y >= targetY - halfSlice && v.y <= targetY + halfSlice
    );
    if (maxAbsX < Infinity) {
      verts = verts.filter(v => Math.abs(v.x) <= maxAbsX);
    }
    if (verts.length === 0) return null;
    const xVals = verts.map(v => v.x);
    const zVals = verts.map(v => v.z);
    return {
      xMin: Math.min(...xVals),
      xMax: Math.max(...xVals),
      zMin: Math.min(...zVals),
      zMax: Math.max(...zVals),
      halfWidth: (Math.max(...xVals) - Math.min(...xVals)) / 2,
      depth: Math.max(...zVals) - Math.min(...zVals),
      fullWidth: Math.max(...xVals) - Math.min(...xVals),
      vertexCount: verts.length
    };
  }

  const sliceH = totalHeight * 0.012;
  const sliceMeasure = totalHeight * 0.015;

  // Build scan with torso-only widths (arms clipped at |x|<0.20)
  const scan = [];
  for (let pct = 0; pct <= 100; pct++) {
    const y = yMin + (pct / 100) * totalHeight;
    const full = getExtentsAtY(y, sliceH);
    const torso = (pct >= 58 && pct <= 84) ? getExtentsAtY(y, sliceH, 0.20) : null;
    scan.push({
      percent: pct,
      y: r(y),
      fullWidth: full ? full.fullWidth : 0,
      fullDepth: full ? full.depth : 0,
      torsoWidth: torso ? torso.fullWidth : (full ? full.fullWidth : 0),
      torsoDepth: torso ? torso.depth : (full ? full.depth : 0),
    });
  }

  // Based on the scan data analysis:
  // 
  // ANATOMY OF THIS MANNEQUIN:
  // 0-3%   (y=-0.002 to 0.049): Feet/base platform - wide stance
  // 4-20%  (y=0.066 to 0.337): Lower legs (calves/shins) - two legs ~0.47 apart  
  // 22-30% (y=0.371 to 0.507): Knee region
  // 30-35% (y=0.507 to 0.592): Upper thigh
  // 37-46% (y=0.625 to 0.778): Hips/pelvis region - widest torso ~0.39
  // 42%    (y=0.710): Crotch/inseam - legs merge
  // 47-50% (y=0.795 to 0.846): Underbust / ribcage area - ~0.37-0.38
  // 52-58% (y=0.880 to 0.981): Waist - narrowing to 0.31
  // 59%    (y=0.998): Arms begin extending outward  
  // 59-65% (y=0.998 to 1.100): Upper waist / lower chest - arms emerge
  // 70-75% (y=1.185 to 1.270): Upper chest / shoulder area
  // 75-82% (y=1.270 to 1.388): Shoulders
  // 83%    (y=1.405): Base of neck
  // 84-88% (y=1.422 to 1.490): Neck
  // 89-100% (y=1.507 to 1.693): Head

  // ACTUAL LANDMARK DETECTION:
  
  // Hips: widest in 37-47% 
  const hipRange = scan.filter(s => s.percent >= 37 && s.percent <= 47);
  const hipScan = hipRange.reduce((m, s) => s.torsoWidth > m.torsoWidth ? s : m, hipRange[0]);
  
  // Waist: narrowest in 52-58% (below where arms start)
  const waistRange = scan.filter(s => s.percent >= 52 && s.percent <= 58);
  const waistScan = waistRange.reduce((m, s) => s.torsoWidth < m.torsoWidth ? s : m, waistRange[0]);
  
  // Bust/chest: this mannequin's bust is around 48-50% (fullWidth, no arms there yet)
  // The widest torso above the waist but below the arms region
  const bustRange = scan.filter(s => s.percent >= 47 && s.percent <= 56);
  const bustScan = bustRange.reduce((m, s) => s.torsoWidth > m.torsoWidth ? s : m, bustRange[0]);

  // Shoulders: widest full span at 75-83% (this is where shoulder joints are)
  const shldRange = scan.filter(s => s.percent >= 74 && s.percent <= 83);
  const shldScan = shldRange.reduce((m, s) => s.fullWidth > m.fullWidth ? s : m, shldRange[0]);

  // Knees: widest in 22-30%
  const kneeRange = scan.filter(s => s.percent >= 22 && s.percent <= 30);
  const kneeScan = kneeRange.reduce((m, s) => s.fullWidth > m.fullWidth ? s : m, kneeRange[0]);

  // Neck: narrowest in 84-90%
  const neckRange = scan.filter(s => s.percent >= 84 && s.percent <= 90);
  const neckScan = neckRange.reduce((m, s) => s.fullWidth < m.fullWidth ? s : m, neckRange[0]);

  // Crotch: where center gap appears going down
  let crotchY = null;
  for (let pct = 50; pct >= 38; pct--) {
    const y = yMin + (pct / 100) * totalHeight;
    const centerVerts = allVertices.filter(v =>
      v.y >= y - sliceH/2 && v.y <= y + sliceH/2 && Math.abs(v.x) < 0.03
    );
    if (centerVerts.length === 0) {
      crotchY = y;
      break;
    }
  }

  function measure(y) {
    const ext = getExtentsAtY(y, sliceMeasure);
    if (!ext) return null;
    return {
      y: r(y),
      heightPercent: r((y - yMin) / totalHeight * 100),
      xMin: r(ext.xMin),
      xMax: r(ext.xMax),
      zMin: r(ext.zMin),
      zMax: r(ext.zMax),
      halfWidth_X: r(ext.halfWidth),
      depth_Z: r(ext.depth),
      fullWidth_X: r(ext.fullWidth),
      verticesInSlice: ext.vertexCount
    };
  }

  function measureTorso(y, clip = 0.20) {
    const ext = getExtentsAtY(y, sliceMeasure, clip);
    if (!ext) return null;
    return {
      y: r(y),
      heightPercent: r((y - yMin) / totalHeight * 100),
      xMin: r(ext.xMin),
      xMax: r(ext.xMax),
      zMin: r(ext.zMin),
      zMax: r(ext.zMax),
      halfWidth_X: r(ext.halfWidth),
      depth_Z: r(ext.depth),
      fullWidth_X: r(ext.fullWidth),
      verticesInSlice: ext.vertexCount,
      note: `torso only (|x| < ${clip})`
    };
  }

  const bodyLandmarks = {
    feet_floor: measure(yMin),
    knees: measure(+kneeScan.y),
    hips_pelvis: measure(+hipScan.y),
    crotch_inseam: crotchY ? measure(crotchY) : null,
    bust_chest: measure(+bustScan.y),
    waist: measure(+waistScan.y),
    shoulders: {
      ...measure(+shldScan.y),
      note: "full width including upper arms at shoulder joint level"
    },
    neck: measure(+neckScan.y),
    head_top: measure(yMax)
  };

  const result = {
    file: glbPath,
    units: "meters",
    overallBoundingBox: {
      min: { x: r(overallBox.min.x), y: r(overallBox.min.y), z: r(overallBox.min.z) },
      max: { x: r(overallBox.max.x), y: r(overallBox.max.y), z: r(overallBox.max.z) },
      size: { x: r(overallSize.x), y: r(overallSize.y), z: r(overallSize.z) },
      center: { x: r(overallCenter.x), y: r(overallCenter.y), z: r(overallCenter.z) }
    },
    scale: {
      totalHeight_m: r(totalHeight),
      totalHeight_cm: r(totalHeight * 100),
      totalWidth_m: r(overallSize.x),
      totalDepth_m: r(overallSize.z)
    },
    totalVertices: allVertices.length,
    notes: {
      coordinate_system: "Y-up, X-right, Z-back. Model centered on X=0",
      model_height: "~169.5 cm (standard female mannequin)",
      arms: "Arms extend outward starting at y≈1.0 (59% height). Shoulder width includes upper arms.",
      z_axis: "Z-min = front of body, Z-max = back of body",
      bust_note: "Bust measured at 48% height (below arm attachment) where full torso width represents ribcage/chest"
    },
    bodyLandmarks,
    detectedLandmarkPositions: {
      feet_floor: { percent: 0, y: r(yMin) },
      knees: { percent: kneeScan.percent, y: kneeScan.y },
      crotch: { percent: crotchY ? r((crotchY - yMin)/totalHeight*100) : null, y: crotchY ? r(crotchY) : null },
      hips_pelvis: { percent: hipScan.percent, y: hipScan.y },
      bust_chest: { percent: bustScan.percent, y: bustScan.y },
      waist: { percent: waistScan.percent, y: waistScan.y },
      shoulders: { percent: shldScan.percent, y: shldScan.y },
      neck: { percent: neckScan.percent, y: neckScan.y },
      head_top: { percent: 100, y: r(yMax) }
    },
    heightScanEveryPercent: scan.map(s => ({
      percent: s.percent,
      y: s.y,
      fullWidth: r(s.fullWidth),
      depth: r(s.fullDepth),
      torsoWidth: r(s.torsoWidth),
      torsoDepth: r(s.torsoDepth)
    }))
  };

  const outPath = path.resolve('mannequin-analysis.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

}, (err) => { console.error('Error:', err); process.exit(1); });
