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

  // Collect ALL vertices in world space
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

  // From the 1% scan data, we know:
  // - Below 59% (y<0.998): no arms, full width IS torso width
  // - 59-83%: arms extend outward. The torso is roughly |x| < 0.20
  // - Above 83%: neck/head, no arms
  // 
  // Looking at the scan data:
  // At 58% width=0.308, at 59% width jumps to 1.485 (arms appear)
  // At 83% width=0.344, at 84% width=0.175 (arms end, just neck)
  // 
  // So for the torso region 59-83%, we'll clip to |x| <= 0.20 for torso-only,
  // but use full width for "shoulder span" measurement.

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
  
  // Fine 1% scan of the full body for all width values
  const scan = [];
  for (let pct = 0; pct <= 100; pct++) {
    const y = yMin + (pct / 100) * totalHeight;
    const full = getExtentsAtY(y, sliceH);
    // For arm region, also get torso-only (|x| < 0.20)
    const torso = (pct >= 58 && pct <= 84) ? getExtentsAtY(y, sliceH, 0.20) : null;
    scan.push({
      percent: pct,
      y: r(y),
      fullWidth: full ? r(full.fullWidth) : 0,
      fullDepth: full ? r(full.depth) : 0,
      torsoWidth: torso ? r(torso.fullWidth) : (full ? r(full.fullWidth) : 0),
      torsoDepth: torso ? r(torso.depth) : (full ? r(full.depth) : 0),
      vertexCount: full ? full.vertexCount : 0
    });
  }

  // Now find landmarks based on torso width (not full width with arms)
  // Hips: widest torso point 37-52%
  const hipCands = scan.filter(s => s.percent >= 37 && s.percent <= 52);
  const hipScan = hipCands.reduce((m, s) => s.torsoWidth > m.torsoWidth ? s : m, hipCands[0]);

  // Waist: narrowest torso point 52-62%
  const waistCands = scan.filter(s => s.percent >= 52 && s.percent <= 62 && s.torsoWidth > 0);
  const waistScan = waistCands.reduce((m, s) => s.torsoWidth < m.torsoWidth ? s : m, waistCands[0]);

  // Bust: For the bust, we need the widest TORSO point from 60-72%.
  // With arms clipped to |x|<0.20, the torso is the chest/ribcage.
  // But 0.20 might be too narrow — the chest can be wider.
  // Let's try |x| < 0.25 for bust detection
  const bustCands = [];
  for (let pct = 60; pct <= 74; pct++) {
    const y = yMin + (pct / 100) * totalHeight;
    const ext = getExtentsAtY(y, sliceH, 0.25);
    bustCands.push({
      percent: pct, y: r(y),
      width: ext ? r(ext.fullWidth) : 0,
      depth: ext ? r(ext.depth) : 0
    });
  }
  const bustScan = bustCands.reduce((m, s) => s.width > m.width ? s : m, bustCands[0]);

  // Shoulders: widest FULL width at 75-82% (shoulder span includes upper arms)
  const shldCands = scan.filter(s => s.percent >= 75 && s.percent <= 82);
  const shldScan = shldCands.reduce((m, s) => s.fullWidth > m.fullWidth ? s : m, shldCands[0]);

  // Knees: widest point in 20-30% (both legs)
  const kneeCands = scan.filter(s => s.percent >= 22 && s.percent <= 30);
  const kneeScan = kneeCands.reduce((m, s) => s.fullWidth > m.fullWidth ? s : m, kneeCands[0]);

  // Neck: narrowest point 84-90%
  const neckCands = scan.filter(s => s.percent >= 84 && s.percent <= 90 && s.fullWidth > 0);
  const neckScan = neckCands.reduce((m, s) => s.fullWidth < m.fullWidth ? s : m, neckCands[0]);

  // Measure at each landmark with appropriate slice
  const sliceThick = totalHeight * 0.015;

  function measure(y, maxAbsX = Infinity) {
    const ext = getExtentsAtY(y, sliceThick, maxAbsX);
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

  const bodyLandmarks = {
    feet_floor: measure(yMin),
    knees: measure(+kneeScan.y),
    hips_pelvis: measure(+hipScan.y),
    waist: measure(+waistScan.y),
    bust_chest_torso: measure(+bustScan.y, 0.25),  // torso only
    bust_chest_full: measure(+bustScan.y),           // full width at bust level
    shoulders_full: measure(+shldScan.y),            // full shoulder span
    shoulders_torso: measure(+shldScan.y, 0.25),     // torso at shoulder height
    neck: measure(+neckScan.y),
    head_top: measure(yMax)
  };

  // Also get the crotch/inseam point — where the two legs meet
  // This is where going down from 45%, the width suddenly doubles (two separate legs)
  const crotchCands = [];
  for (let pct = 40; pct <= 52; pct++) {
    const y = yMin + (pct / 100) * totalHeight;
    const ext = getExtentsAtY(y, sliceH);
    if (!ext) continue;
    // At crotch level, there should be a gap in the middle (between legs)
    const centerVerts = allVertices.filter(v =>
      v.y >= y - sliceH/2 && v.y <= y + sliceH/2 && Math.abs(v.x) < 0.03
    );
    crotchCands.push({
      percent: pct, y: r(y),
      width: r(ext.fullWidth),
      centerVertCount: centerVerts.length
    });
  }
  // Crotch is approximately where center vertex count drops to 0 going downward
  let crotchY = null;
  for (let i = crotchCands.length - 1; i >= 0; i--) {
    if (crotchCands[i].centerVertCount === 0) {
      crotchY = +crotchCands[i].y;
      break;
    }
  }
  if (crotchY) {
    bodyLandmarks.crotch_inseam = measure(crotchY);
  }

  const result = {
    file: glbPath,
    units: "meters (Three.js default GLB/glTF units)",
    overallBoundingBox: {
      min: { x: r(overallBox.min.x), y: r(overallBox.min.y), z: r(overallBox.min.z) },
      max: { x: r(overallBox.max.x), y: r(overallBox.max.y), z: r(overallBox.max.z) },
      size: { x: r(overallSize.x), y: r(overallSize.y), z: r(overallSize.z) },
      center: { x: r(overallCenter.x), y: r(overallCenter.y), z: r(overallCenter.z) }
    },
    totalVertices: allVertices.length,
    totalHeight_m: r(totalHeight),
    totalHeight_cm: r(totalHeight * 100),
    notes: {
      coordinate_system: "Y-up, X-right, Z-back. Model centered on X=0.",
      model_height: "~169.5 cm — standard female mannequin height",
      arms_position: "Arms angled outward ~45° starting at y≈1.0 (59% height). Full X extent includes arms.",
      torso_measurements: "bust_chest_torso and shoulders_torso exclude arm vertices by capping |x| at 0.25",
      z_convention: "Z-min ≈ front of body, Z-max ≈ back of body"
    },
    bodyLandmarks,
    detectedLandmarkSources: {
      knees: { atPercent: kneeScan.percent, atY: kneeScan.y, method: "widest point in 22-30% range" },
      hips: { atPercent: hipScan.percent, atY: hipScan.y, method: "widest torso point in 37-52% range" },
      waist: { atPercent: waistScan.percent, atY: waistScan.y, method: "narrowest torso point in 52-62% range" },
      bust: { atPercent: bustScan.percent, atY: bustScan.y, method: "widest point within |x|<0.25 in 60-74% range" },
      shoulders: { atPercent: shldScan.percent, atY: shldScan.y, method: "widest full span in 75-82% range" },
      neck: { atPercent: neckScan.percent, atY: neckScan.y, method: "narrowest point in 84-90% range" },
      crotch: crotchY ? { atY: r(crotchY), method: "lowest Y with center gap between legs" } : "not detected"
    },
    heightScan1Percent: scan
  };

  const outPath = path.resolve('mannequin-analysis.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

}, (err) => { console.error('Error:', err); process.exit(1); });
