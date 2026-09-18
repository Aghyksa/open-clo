import type { PatternPiece, FabricMaterial, SeamConnection } from '../types/cad';

export const FABRIC_PRESETS: FabricMaterial[] = [
  {
    id: 'cotton-jersey',
    name: 'Cotton Jersey (T-Shirt)',
    color: '#e2e8f0',
    density: 180,
    stretchStiffness: 0.85,
    bendingStiffness: 0.15,
    friction: 0.4,
    roughness: 0.7,
    metalness: 0.05,
    patternType: 'solid',
  },
  {
    id: 'silk-satin',
    name: 'Silk Satin',
    color: '#fbcfe8',
    density: 90,
    stretchStiffness: 0.95,
    bendingStiffness: 0.02,
    friction: 0.15,
    roughness: 0.25,
    metalness: 0.2,
    patternType: 'solid',
  },
  {
    id: 'heavy-denim',
    name: 'Heavy Denim 14oz',
    color: '#2563eb',
    density: 450,
    stretchStiffness: 0.98,
    bendingStiffness: 0.75,
    friction: 0.65,
    roughness: 0.85,
    metalness: 0.0,
    patternType: 'denim',
  },
  {
    id: 'merino-wool',
    name: 'Merino Knit Wool',
    color: '#d97706',
    density: 280,
    stretchStiffness: 0.65,
    bendingStiffness: 0.35,
    friction: 0.5,
    roughness: 0.8,
    metalness: 0.0,
    patternType: 'grid',
  },
  {
    id: 'linen-blend',
    name: 'Pure Summer Linen',
    color: '#fef3c7',
    density: 210,
    stretchStiffness: 0.92,
    bendingStiffness: 0.28,
    friction: 0.45,
    roughness: 0.75,
    metalness: 0.0,
    patternType: 'solid',
  },
  {
    id: 'black-leather',
    name: 'Structured Leather',
    color: '#1e293b',
    density: 520,
    stretchStiffness: 0.99,
    bendingStiffness: 0.85,
    friction: 0.45,
    roughness: 0.4,
    metalness: 0.1,
    patternType: 'solid',
  },
];

// 1. Classic T-Shirt Preset
export function createTshirtPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'f0', x: -140, y: -220 }, // Left shoulder tip
    { id: 'f1', x: -60, y: -250 },  // Left neck
    { id: 'f2', x: 0, y: -200 },    // Front center neck drop
    { id: 'f3', x: 60, y: -250 },   // Right neck
    { id: 'f4', x: 140, y: -220 },  // Right shoulder tip
    { id: 'f5', x: 125, y: -100 },  // Right armhole bottom
    { id: 'f6', x: 130, y: 180 },   // Right hem
    { id: 'f7', x: -130, y: 180 },  // Left hem
    { id: 'f8', x: -125, y: -100 }, // Left armhole bottom
  ];

  const backPoints = [
    { id: 'b0', x: -140, y: -220 },
    { id: 'b1', x: -60, y: -250 },
    { id: 'b2', x: 0, y: -240 },
    { id: 'b3', x: 60, y: -250 },
    { id: 'b4', x: 140, y: -220 },
    { id: 'b5', x: 125, y: -100 },
    { id: 'b6', x: 130, y: 180 },
    { id: 'b7', x: -130, y: 180 },
    { id: 'b8', x: -125, y: -100 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Front Bodice',
      points: frontPoints,
      position: { x: 170, y: 260 },
      rotation: 0,
      color: '#38bdf8',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Back Bodice',
      points: backPoints,
      position: { x: 440, y: 260 },
      rotation: 0,
      color: '#818cf8',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
    },
    {
      id: 'seam-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
    },
    {
      id: 'seam-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
    },
    {
      id: 'seam-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
    },
  ];

  return { pieces, seams };
}

// 2. Summer A-Line Dress Preset
export function createDressPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  // Dress Front: Fitted top + tapered waist + wide flowing flare to thigh
  const frontPoints = [
    { id: 'df0', x: -120, y: -220 }, // Left shoulder tip
    { id: 'df1', x: -50, y: -250 },  // Left neck
    { id: 'df2', x: 0, y: -190 },    // Sweetheart neck drop
    { id: 'df3', x: 50, y: -250 },   // Right neck
    { id: 'df4', x: 120, y: -220 },  // Right shoulder tip
    { id: 'df5', x: 110, y: -90 },   // Right armpit
    { id: 'df6', x: 185, y: 380 },   // Right hem flare
    { id: 'df7', x: -185, y: 380 },  // Left hem flare
    { id: 'df8', x: -110, y: -90 },  // Left armpit
  ];

  const backPoints = [
    { id: 'db0', x: -120, y: -220 },
    { id: 'db1', x: -50, y: -250 },
    { id: 'db2', x: 0, y: -230 },
    { id: 'db3', x: 50, y: -250 },
    { id: 'db4', x: 120, y: -220 },
    { id: 'db5', x: 110, y: -90 },
    { id: 'db6', x: 185, y: 380 },
    { id: 'db7', x: -185, y: 380 },
    { id: 'db8', x: -110, y: -90 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Dress Front Panel',
      points: frontPoints,
      position: { x: 190, y: 290 },
      rotation: 0,
      color: '#ec4899',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Dress Back Panel',
      points: backPoints,
      position: { x: 470, y: 290 },
      rotation: 0,
      color: '#f43f5e',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-dress-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
    },
    {
      id: 'seam-dress-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
    },
    {
      id: 'seam-dress-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
    },
    {
      id: 'seam-dress-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
    },
  ];

  return { pieces, seams };
}

// 3. Fitted Athletic Tank Top Preset
export function createTankTopPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'tf0', x: -90, y: -220 }, // Narrow shoulder strap
    { id: 'tf1', x: -45, y: -240 },
    { id: 'tf2', x: 0, y: -160 },   // Deep athletic scoop neck
    { id: 'tf3', x: 45, y: -240 },
    { id: 'tf4', x: 90, y: -220 },
    { id: 'tf5', x: 110, y: -80 },  // Sculpted armhole
    { id: 'tf6', x: 105, y: 140 },  // Hem right
    { id: 'tf7', x: -105, y: 140 }, // Hem left
    { id: 'tf8', x: -110, y: -80 },
  ];

  const backPoints = [
    { id: 'tb0', x: -90, y: -220 },
    { id: 'tb1', x: -45, y: -240 },
    { id: 'tb2', x: 0, y: -210 },
    { id: 'tb3', x: 45, y: -240 },
    { id: 'tb4', x: 90, y: -220 },
    { id: 'tb5', x: 110, y: -80 },
    { id: 'tb6', x: 105, y: 140 },
    { id: 'tb7', x: -105, y: 140 },
    { id: 'tb8', x: -110, y: -80 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Tank Front',
      points: frontPoints,
      position: { x: 160, y: 250 },
      rotation: 0,
      color: '#06b6d4',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Tank Back',
      points: backPoints,
      position: { x: 420, y: 250 },
      rotation: 0,
      color: '#0284c7',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-tank-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
    },
    {
      id: 'seam-tank-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
    },
    {
      id: 'seam-tank-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
    },
    {
      id: 'seam-tank-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
    },
  ];

  return { pieces, seams };
}

// 4. Trendy Cropped Top Preset
export function createCropTopPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'cf0', x: -130, y: -220 },
    { id: 'cf1', x: -55, y: -250 },
    { id: 'cf2', x: 0, y: -190 },
    { id: 'cf3', x: 55, y: -250 },
    { id: 'cf4', x: 130, y: -220 },
    { id: 'cf5', x: 120, y: -100 },
    { id: 'cf6', x: 115, y: 30 },   // Cropped hem line above navel
    { id: 'cf7', x: -115, y: 30 },
    { id: 'cf8', x: -120, y: -100 },
  ];

  const backPoints = [
    { id: 'cb0', x: -130, y: -220 },
    { id: 'cb1', x: -55, y: -250 },
    { id: 'cb2', x: 0, y: -230 },
    { id: 'cb3', x: 55, y: -250 },
    { id: 'cb4', x: 130, y: -220 },
    { id: 'cb5', x: 120, y: -100 },
    { id: 'cb6', x: 115, y: 30 },
    { id: 'cb7', x: -115, y: 30 },
    { id: 'cb8', x: -120, y: -100 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Crop Top Front',
      points: frontPoints,
      position: { x: 160, y: 240 },
      rotation: 0,
      color: '#a855f7',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Crop Top Back',
      points: backPoints,
      position: { x: 420, y: 240 },
      rotation: 0,
      color: '#9333ea',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-crop-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
    },
    {
      id: 'seam-crop-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
    },
    {
      id: 'seam-crop-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
    },
    {
      id: 'seam-crop-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
    },
  ];

  return { pieces, seams };
}

// 5. Streetwear Boxy Oversized Tee Preset
export function createOversizedTeePreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'of0', x: -175, y: -220 }, // Wide Drop shoulders
    { id: 'of1', x: -65, y: -250 },
    { id: 'of2', x: 0, y: -195 },
    { id: 'of3', x: 65, y: -250 },
    { id: 'of4', x: 175, y: -220 },
    { id: 'of5', x: 160, y: -80 },   // Lower drop armpit
    { id: 'of6', x: 165, y: 220 },   // Long boxy hem
    { id: 'of7', x: -165, y: 220 },
    { id: 'of8', x: -160, y: -80 },
  ];

  const backPoints = [
    { id: 'ob0', x: -175, y: -220 },
    { id: 'ob1', x: -65, y: -250 },
    { id: 'ob2', x: 0, y: -235 },
    { id: 'ob3', x: 65, y: -250 },
    { id: 'ob4', x: 175, y: -220 },
    { id: 'ob5', x: 160, y: -80 },
    { id: 'ob6', x: 165, y: 220 },
    { id: 'ob7', x: -165, y: 220 },
    { id: 'ob8', x: -160, y: -80 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Oversized Front',
      points: frontPoints,
      position: { x: 200, y: 270 },
      rotation: 0,
      color: '#10b981',
      placement: { origin3D: [0, 0.4, 0.17], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Oversized Back',
      points: backPoints,
      position: { x: 500, y: 270 },
      rotation: 0,
      color: '#059669',
      placement: { origin3D: [0, 0.4, -0.11], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-over-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
    },
    {
      id: 'seam-over-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
    },
    {
      id: 'seam-over-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
    },
    {
      id: 'seam-over-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
    },
  ];

  return { pieces, seams };
}

// 6. Flared A-Line Skirt Preset
export function createSkirtPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  // Skirt Front Panel: Sits on waist (y = 0), flares to hem (y = 280)
  const frontPoints = [
    { id: 'sf0', x: -125, y: -100 }, // Left waist
    { id: 'sf1', x: 0, y: -90 },     // Center waist curve
    { id: 'sf2', x: 125, y: -100 },  // Right waist
    { id: 'sf3', x: 210, y: 220 },   // Right Hem
    { id: 'sf4', x: 0, y: 240 },     // Hem center
    { id: 'sf5', x: -210, y: 220 },  // Left Hem
  ];

  const backPoints = [
    { id: 'sb0', x: -125, y: -100 },
    { id: 'sb1', x: 0, y: -95 },
    { id: 'sb2', x: 125, y: -100 },
    { id: 'sb3', x: 210, y: 220 },
    { id: 'sb4', x: 0, y: 240 },
    { id: 'sb5', x: -210, y: 220 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front-skirt',
      name: 'Skirt Front',
      points: frontPoints,
      position: { x: 180, y: 250 },
      rotation: 0,
      color: '#f59e0b',
      placement: { origin3D: [0, 0.0, 0.14], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back-skirt',
      name: 'Skirt Back',
      points: backPoints,
      position: { x: 460, y: 250 },
      rotation: 0,
      color: '#d97706',
      placement: { origin3D: [0, 0.0, -0.11], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-skirt-side-r',
      edgeA: { pieceId: 'piece-front-skirt', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-back-skirt', edgeIndex: 2 },
      strength: 1.0,
    },
    {
      id: 'seam-skirt-side-l',
      edgeA: { pieceId: 'piece-front-skirt', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back-skirt', edgeIndex: 5 },
      strength: 1.0,
    },
  ];

  return { pieces, seams };
}

export interface GarmentTemplateInfo {
  id: string;
  name: string;
  category: 'Tops' | 'Dresses' | 'Skirts';
  description: string;
  piecesCount: number;
  recommendedFabric: string;
  recommendedColor: string;
  generator: () => { pieces: PatternPiece[]; seams: SeamConnection[] };
}

export const GARMENT_TEMPLATES: GarmentTemplateInfo[] = [
  {
    id: 'tshirt',
    name: 'Classic T-Shirt',
    category: 'Tops',
    description: 'Standard crewneck fitted short sleeve t-shirt block pattern.',
    piecesCount: 2,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#f1f5f9',
    generator: createTshirtPreset,
  },
  {
    id: 'dress',
    name: 'Summer A-Line Dress',
    category: 'Dresses',
    description: 'Flowing feminine silhouette with fitted bust and flared hemline.',
    piecesCount: 2,
    recommendedFabric: 'silk-satin',
    recommendedColor: '#f43f5e',
    generator: createDressPreset,
  },
  {
    id: 'tanktop',
    name: 'Athletic Tank Top',
    category: 'Tops',
    description: 'Racerback-styled athletic sleeveless tank with deep scoop neck.',
    piecesCount: 2,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#06b6d4',
    generator: createTankTopPreset,
  },
  {
    id: 'croptop',
    name: 'Trendy Crop Top',
    category: 'Tops',
    description: 'Modern minimalist cropped top ending above the navel.',
    piecesCount: 2,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#a855f7',
    generator: createCropTopPreset,
  },
  {
    id: 'oversized',
    name: 'Streetwear Boxy Tee',
    category: 'Tops',
    description: 'Loose drop-shoulder oversized streetwear aesthetic.',
    piecesCount: 2,
    recommendedFabric: 'heavy-denim',
    recommendedColor: '#1e293b',
    generator: createOversizedTeePreset,
  },
  {
    id: 'skirt',
    name: 'Flared A-Line Skirt',
    category: 'Skirts',
    description: 'High-waisted flared skirt with natural drapery folds.',
    piecesCount: 2,
    recommendedFabric: 'silk-satin',
    recommendedColor: '#d97706',
    generator: createSkirtPreset,
  },
];

// Generates SVG export string from pattern pieces
export function exportPatternsToSvg(pieces: PatternPiece[]): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  pieces.forEach(p => {
    p.points.forEach(pt => {
      const wx = p.position.x + pt.x;
      const wy = p.position.y + pt.y;
      if (wx < minX) minX = wx;
      if (wy < minY) minY = wy;
      if (wx > maxX) maxX = wx;
      if (wy > maxY) maxY = wy;
    });
  });

  const padding = 50;
  const width = Math.max(800, (maxX - minX) + padding * 2);
  const height = Math.max(600, (maxY - minY) + padding * 2);
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;

  let paths = '';
  pieces.forEach(piece => {
    if (piece.points.length < 3) return;
    let d = `M ${piece.position.x + piece.points[0].x} ${piece.position.y + piece.points[0].y}`;
    for (let i = 1; i < piece.points.length; i++) {
      d += ` L ${piece.position.x + piece.points[i].x} ${piece.position.y + piece.points[i].y}`;
    }
    d += ' Z';

    paths += `
    <g id="${piece.id}" class="pattern-piece">
      <path d="${d}" fill="${piece.color || '#3b82f6'}" fill-opacity="0.25" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" />
      <text x="${piece.position.x}" y="${piece.position.y}" font-family="sans-serif" font-size="14" font-weight="600" fill="#1e293b" text-anchor="middle">${piece.name}</text>
    </g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <style>
    .pattern-piece:hover path { stroke: #1d4ed8; stroke-width: 3; }
  </style>
  <rect width="100%" height="100%" fill="#ffffff" />
  ${paths}
</svg>`;
}
