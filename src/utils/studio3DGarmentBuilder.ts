import * as THREE from 'three';
import type { GraphicDecal, MockupSceneMode } from '../types/cad';
import {
  getAssembledSpec,
  GRAPHIC_PRESETS,
  type AssembledGarmentSpec,
} from './patternPresets';

// =========================================================
// 1. Offscreen UV Texture Generator
// =========================================================
export interface TextureGenOptions {
  colorZones: Record<string, string>;
  decals: GraphicDecal[];
  activeTemplateId: string;
  customColor: string;
}

export function generateGarmentTextureCanvas(
  options: TextureGenOptions,
  existingCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const size = 1024;
  const canvas = existingCanvas || document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { colorZones, decals, activeTemplateId, customColor } = options;
  const spec = getAssembledSpec(activeTemplateId);

  const bodyCol = colorZones.body || customColor || '#262626';
  const collarCol = colorZones.collar || bodyCol;
  const sleeveCol = colorZones.sleeves || bodyCol;
  const pocketCol = colorZones.pocket || bodyCol;
  const hemCol = colorZones.hem || bodyCol;

  // Background Fill
  ctx.fillStyle = bodyCol;
  ctx.fillRect(0, 0, size, size);

  // Left Half = Front UV (0 to 512)
  // Right Half = Back UV (512 to 1024)

  // 1. Fabric Micro-Texture Simulation (Cotton jersey / French terry ribs)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
  for (let y = 0; y < size; y += 4) {
    ctx.fillRect(0, y, size, 1.5);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let x = 0; x < size; x += 4) {
    ctx.fillRect(x, 0, 1.5, size);
  }

  // 2. Collar Rib UV Regions (Top areas)
  ctx.fillStyle = collarCol;
  ctx.fillRect(128, 10, 256, 75); // Front collar UV
  ctx.fillRect(640, 10, 256, 50); // Back collar UV

  // Collar Knit Rib Lines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let rx = 128; rx < 384; rx += 6) {
    ctx.fillRect(rx, 10, 2, 75);
  }
  for (let rx = 640; rx < 896; rx += 6) {
    ctx.fillRect(rx, 10, 2, 50);
  }

  // 3. Sleeves UV Regions (Outer edges)
  ctx.fillStyle = sleeveCol;
  ctx.fillRect(0, 120, 100, 360);   // Left sleeve front
  ctx.fillRect(412, 120, 100, 360); // Right sleeve front
  ctx.fillRect(512, 120, 100, 360); // Left sleeve back
  ctx.fillRect(924, 120, 100, 360); // Right sleeve back

  // 4. Bottom Hem Rib UV
  ctx.fillStyle = hemCol;
  ctx.fillRect(0, 920, 512, 104);   // Front hem
  ctx.fillRect(512, 920, 512, 104); // Back hem

  // Double needle hem topstitch
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, 930);
  ctx.lineTo(size, 930);
  ctx.moveTo(0, 938);
  ctx.lineTo(size, 938);
  ctx.stroke();
  ctx.setLineDash([]);

  // 5. Kangaroo Pocket UV (for hoodies)
  if (spec.hasKangarooPocket) {
    ctx.fillStyle = pocketCol;
    ctx.beginPath();
    ctx.roundRect(140, 600, 232, 280, 12);
    ctx.fill();
    ctx.strokeStyle = '#00000044';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Bar-tack pocket corner stitches
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(140, 600);
    ctx.lineTo(155, 600);
    ctx.moveTo(372, 600);
    ctx.lineTo(357, 600);
    ctx.stroke();
  }

  // 6. Placed Decals Painting (Front & Back)
  const frontCenter = { x: 256, y: 460 };
  const backCenter = { x: 768, y: 460 };

  decals.forEach((decal) => {
    const isBack = decal.viewTarget === 'back';
    const center = isBack ? backCenter : frontCenter;

    // Map 2D flat sketch offsets to UV texture coordinates
    const scaleFactor = 1.9;
    const uvX = center.x + decal.position.x * scaleFactor;
    const uvY = center.y + decal.position.y * scaleFactor;

    ctx.save();
    ctx.translate(uvX, uvY);
    ctx.rotate((decal.rotation * Math.PI) / 180);
    ctx.scale(decal.scale * scaleFactor, decal.scale * scaleFactor);
    ctx.globalAlpha = decal.opacity;

    if (decal.blendMode === 'multiply') {
      ctx.globalCompositeOperation = 'multiply';
    } else if (decal.blendMode === 'screen') {
      ctx.globalCompositeOperation = 'screen';
    } else if (decal.blendMode === 'overlay') {
      ctx.globalCompositeOperation = 'overlay';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    const w = decal.width;
    const h = decal.height;

    if (decal.type === 'text' && decal.fontProps) {
      ctx.fillStyle = decal.fontProps.color || '#ffffff';
      ctx.font = `${decal.fontProps.fontWeight || 'bold'} ${decal.fontProps.fontSize || 24}px ${
        decal.fontProps.fontFamily || 'Inter, sans-serif'
      }`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(decal.content, 0, 0);
    } else if (decal.type === 'preset') {
      const preset = GRAPHIC_PRESETS.find((p) => p.id === decal.content);
      if (preset) {
        // Draw vector stamp preview directly
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(preset.name.split(' ')[0].toUpperCase(), 0, 0);
      }
    } else if (decal.type === 'image') {
      const img = new Image();
      img.src = decal.content;
      if (img.complete && img.width > 0) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
    }

    ctx.restore();
  });

  return canvas;
}

// =========================================================
// 2. Procedural 3D Garment Mesh & Scene Builder
// =========================================================

export function createGarment3DModel(
  spec: AssembledGarmentSpec,
  sceneMode: MockupSceneMode,
  canvasTexture: THREE.CanvasTexture
): THREE.Group {
  const root = new THREE.Group();

  // PBR Fabric Material
  const fabricMat = new THREE.MeshStandardMaterial({
    map: canvasTexture,
    roughness: 0.85,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  const isBoxy = spec.templateId === 'uniqlo-u-boxy-tee';
  const isHoodie = spec.hasHood;
  const isJacket = spec.hasCampCollar;

  // Garment dimensions in 3D world meters
  const width = isBoxy ? 0.72 : 0.62;
  const height = 0.85;
  const depth = 0.22;

  // =========================================================
  // SCENE MODE 1: GHOST MANNEQUIN (Default)
  // Volumetric hollow drape without limbs or avatar
  // =========================================================
  if (sceneMode === 'ghost' || sceneMode === 'floating-360') {
    // 1. Torso Body Geometry
    const bodyGeo = new THREE.CylinderGeometry(
      width * 0.44, // top chest width
      width * 0.48, // bottom hem width
      height,
      36,
      24,
      true // open-ended cylinder for realistic hollow hollow interior
    );

    // Flatten slightly on Z axis for realistic human chest oval proportion
    bodyGeo.scale(1, 1, depth / (width * 0.46));
    bodyGeo.computeVertexNormals();

    // Map UVs: Front = 0.0 to 0.5, Back = 0.5 to 1.0
    const uvs = bodyGeo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      let u = uvs.getX(i);
      let v = uvs.getY(i);
      // Align front to center of left half, back to right half
      u = (u + 0.25) % 1.0;
      uvs.setXY(i, u, v);
    }
    uvs.needsUpdate = true;

    const bodyMesh = new THREE.Mesh(bodyGeo, fabricMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.y = 0.45;
    root.add(bodyMesh);

    // 2. Hollow Inner Neck Ring (shows neck tape & collar volume)
    const neckRingGeo = new THREE.TorusGeometry(width * 0.22, 0.022, 16, 48);
    neckRingGeo.scale(1, 0.45, 1);
    const neckMesh = new THREE.Mesh(neckRingGeo, fabricMat);
    neckMesh.rotation.x = Math.PI / 2;
    neckMesh.position.set(0, 0.45 + height / 2, 0);
    neckMesh.castShadow = true;
    root.add(neckMesh);

    // 3. Left and Right Short / Long Sleeves
    const sleeveRadius = isBoxy ? 0.12 : 0.095;
    const sleeveLen = isHoodie || isJacket ? 0.62 : isBoxy ? 0.28 : 0.22;

    const sleeveGeo = new THREE.CylinderGeometry(sleeveRadius * 1.15, sleeveRadius, sleeveLen, 24, 12, true);
    sleeveGeo.scale(1, 1, 0.7);

    // Left Sleeve
    const leftSleeve = new THREE.Mesh(sleeveGeo, fabricMat);
    leftSleeve.position.set(-width * 0.45 - sleeveLen * 0.35, 0.45 + height * 0.25, 0);
    leftSleeve.rotation.z = Math.PI / 2 - 0.35;
    leftSleeve.castShadow = true;
    root.add(leftSleeve);

    // Right Sleeve
    const rightSleeve = new THREE.Mesh(sleeveGeo, fabricMat);
    rightSleeve.position.set(width * 0.45 + sleeveLen * 0.35, 0.45 + height * 0.25, 0);
    rightSleeve.rotation.z = -Math.PI / 2 + 0.35;
    rightSleeve.castShadow = true;
    root.add(rightSleeve);

    // 4. Stand-Up Structured Hood (if Hoodie)
    if (isHoodie) {
      const hoodGeo = new THREE.SphereGeometry(0.24, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.75);
      hoodGeo.scale(0.85, 1.2, 0.9);
      const hoodMesh = new THREE.Mesh(hoodGeo, fabricMat);
      hoodMesh.position.set(0, 0.45 + height / 2 + 0.15, -0.05);
      hoodMesh.rotation.x = 0.25;
      hoodMesh.castShadow = true;
      root.add(hoodMesh);
    }
  }

  // =========================================================
  // SCENE MODE 2: BOUTIQUE HANGER & CLOTHING RACK
  // Sleek Scandinavian curved wooden hanger + metal hook
  // =========================================================
  else if (sceneMode === 'hanger') {
    // 1. Natural Wood Hanger
    const hangerWidth = width * 0.95;
    const woodMat = new THREE.MeshStandardMaterial({
      color: '#d4b996', // Birch wood tone
      roughness: 0.4,
      metalness: 0.05,
    });
    const metalHookMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1', // Brushed chrome / stainless steel
      roughness: 0.2,
      metalness: 0.85,
    });

    const hangerGroup = new THREE.Group();

    // Curved wood shoulder bar
    const woodCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-hangerWidth / 2, 0, 0),
      new THREE.Vector3(0, 0.06, 0),
      new THREE.Vector3(hangerWidth / 2, 0, 0)
    );
    const woodGeo = new THREE.TubeGeometry(woodCurve, 32, 0.016, 12, false);
    const woodMesh = new THREE.Mesh(woodGeo, woodMat);
    woodMesh.castShadow = true;
    hangerGroup.add(woodMesh);

    // Metal Hook
    const hookCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.06, 0),
      new THREE.Vector3(0, 0.16, 0),
      new THREE.Vector3(0.04, 0.22, 0)
    );
    const hookGeo = new THREE.TubeGeometry(hookCurve, 24, 0.005, 8, false);
    const hookMesh = new THREE.Mesh(hookGeo, metalHookMat);
    hookMesh.castShadow = true;
    hangerGroup.add(hookMesh);

    hangerGroup.position.set(0, 0.45 + height / 2 - 0.04, 0);
    root.add(hangerGroup);

    // 2. Garment Drape Mesh on Hanger (flatter drape hanging vertically)
    const drapeGeo = new THREE.CylinderGeometry(
      width * 0.45,
      width * 0.47,
      height,
      32,
      20,
      true
    );
    drapeGeo.scale(1, 1, 0.16); // Thinner Z dimension since it is hanging
    const drapeMesh = new THREE.Mesh(drapeGeo, fabricMat);
    drapeMesh.position.y = 0.45;
    drapeMesh.castShadow = true;
    drapeMesh.receiveShadow = true;
    root.add(drapeMesh);

    // Hanging Sleeves
    const sleeveLen = isHoodie || isJacket ? 0.58 : 0.26;
    const sleeveGeo = new THREE.CylinderGeometry(0.1, 0.08, sleeveLen, 20, 10, true);
    sleeveGeo.scale(1, 1, 0.6);

    const leftSleeve = new THREE.Mesh(sleeveGeo, fabricMat);
    leftSleeve.position.set(-width * 0.44, 0.45 + height * 0.18 - sleeveLen * 0.35, 0);
    leftSleeve.rotation.z = 0.15;
    leftSleeve.castShadow = true;
    root.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, fabricMat);
    rightSleeve.position.set(width * 0.44, 0.45 + height * 0.18 - sleeveLen * 0.35, 0);
    rightSleeve.rotation.z = -0.15;
    rightSleeve.castShadow = true;
    root.add(rightSleeve);
  }

  // =========================================================
  // SCENE MODE 3: STUDIO FLAT LAY (Top-down tabletop display)
  // =========================================================
  else if (sceneMode === 'flat-lay') {
    // Pedestal / Table Surface
    const tableGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.04, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.6,
      metalness: 0.1,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = 0.02;
    tableMesh.receiveShadow = true;
    root.add(tableMesh);

    // Laid Flat Garment Plane with natural cloth ripples
    const flatGeo = new THREE.PlaneGeometry(width * 1.3, height * 1.1, 40, 40);
    // Add subtle organic fabric wrinkles
    const pos = flatGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const wrinkle = Math.sin(px * 12) * Math.cos(py * 14) * 0.008;
      pos.setZ(i, wrinkle);
    }
    flatGeo.computeVertexNormals();

    const flatMesh = new THREE.Mesh(flatGeo, fabricMat);
    flatMesh.rotation.x = -Math.PI / 2;
    flatMesh.position.set(0, 0.045, 0);
    flatMesh.castShadow = true;
    flatMesh.receiveShadow = true;
    root.add(flatMesh);
  }

  // =========================================================
  // SCENE MODE 4: FOLDED DROP (Retail folded presentation)
  // =========================================================
  else if (sceneMode === 'folded') {
    // Studio Display Block
    const blockGeo = new THREE.BoxGeometry(0.65, 0.14, 0.55);
    const blockMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.5,
      metalness: 0.2,
    });
    const blockMesh = new THREE.Mesh(blockGeo, blockMat);
    blockMesh.position.y = 0.07;
    blockMesh.receiveShadow = true;
    root.add(blockMesh);

    // Folded Shirt Geometry
    const foldGeo = new THREE.BoxGeometry(0.44, 0.065, 0.42);
    const foldMesh = new THREE.Mesh(foldGeo, fabricMat);
    foldMesh.position.set(0, 0.175, 0);
    foldMesh.castShadow = true;
    foldMesh.receiveShadow = true;
    root.add(foldMesh);

    // Woven Neck Brand Label on Top
    const labelGeo = new THREE.PlaneGeometry(0.12, 0.05);
    const labelMat = new THREE.MeshStandardMaterial({
      color: '#000000',
      roughness: 0.3,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.set(0, 0.21, -0.12);
    root.add(labelMesh);
  }

  return root;
}
