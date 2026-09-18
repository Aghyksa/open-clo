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
    density: 80,
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
    id: 'black-leather',
    name: 'Structured Leather',
    color: '#1e293b',
    density: 500,
    stretchStiffness: 0.99,
    bendingStiffness: 0.85,
    friction: 0.45,
    roughness: 0.4,
    metalness: 0.1,
    patternType: 'solid',
  },
];

// Generates points for a standard T-Shirt
export function createTshirtPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  // Front Bodice
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

  // Back Bodice
  const backPoints = [
    { id: 'b0', x: -140, y: -220 }, // Left shoulder tip
    { id: 'b1', x: -60, y: -250 },  // Left neck
    { id: 'b2', x: 0, y: -240 },    // Back neck (higher drop)
    { id: 'b3', x: 60, y: -250 },   // Right neck
    { id: 'b4', x: 140, y: -220 },  // Right shoulder tip
    { id: 'b5', x: 125, y: -100 },  // Right armhole bottom
    { id: 'b6', x: 130, y: 180 },   // Right hem
    { id: 'b7', x: -130, y: 180 },  // Left hem
    { id: 'b8', x: -125, y: -100 }, // Left armhole bottom
  ];

  // Left Sleeve
  const leftSleevePoints = [
    { id: 'sl0', x: -80, y: -80 },  // Underarm left
    { id: 'sl1', x: 0, y: -140 },   // Sleeve cap top
    { id: 'sl2', x: 80, y: -80 },   // Underarm right
    { id: 'sl3', x: 65, y: 80 },    // Cuff right
    { id: 'sl4', x: -65, y: 80 },   // Cuff left
  ];

  // Right Sleeve
  const rightSleevePoints = [
    { id: 'sr0', x: -80, y: -80 },
    { id: 'sr1', x: 0, y: -140 },
    { id: 'sr2', x: 80, y: -80 },
    { id: 'sr3', x: 65, y: 80 },
    { id: 'sr4', x: -65, y: 80 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Front Bodice',
      points: frontPoints,
      position: { x: 300, y: 320 },
      rotation: 0,
      color: '#38bdf8',
      placement: {
        origin3D: [0, 0.4, 0.22],
        rotation3D: [0, 0, 0],
      },
    },
    {
      id: 'piece-back',
      name: 'Back Bodice',
      points: backPoints,
      position: { x: 650, y: 320 },
      rotation: 0,
      color: '#818cf8',
      placement: {
        origin3D: [0, 0.4, -0.22],
        rotation3D: [0, Math.PI, 0],
      },
    },
    {
      id: 'piece-left-sleeve',
      name: 'Left Sleeve',
      points: leftSleevePoints,
      position: { x: 100, y: 320 },
      rotation: 0,
      color: '#34d399',
      placement: {
        origin3D: [-0.38, 0.35, 0],
        rotation3D: [0, 0, -0.4],
      },
    },
    {
      id: 'piece-right-sleeve',
      name: 'Right Sleeve',
      points: rightSleevePoints,
      position: { x: 850, y: 320 },
      rotation: 0,
      color: '#fbbf24',
      placement: {
        origin3D: [0.38, 0.35, 0],
        rotation3D: [0, 0, 0.4],
      },
    },
  ];

  // Initial Seam pairings (Front shoulder to Back shoulder, Side seams)
  const seams: SeamConnection[] = [
    // Left Shoulder: Front f0-f1 to Back b0-b1
    {
      id: 'seam-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
    },
    // Right Shoulder: Front f3-f4 to Back b3-b4
    {
      id: 'seam-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
    },
    // Right Side: Front f5-f6 to Back b5-b6
    {
      id: 'seam-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
    },
    // Left Side: Front f7-f8 to Back b7-b8
    {
      id: 'seam-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
    },
  ];

  return { pieces, seams };
}

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
