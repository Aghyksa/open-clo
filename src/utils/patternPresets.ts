import type {
  PatternPiece,
  FabricMaterial,
  SeamConnection,
  StitchType,
} from '../types/cad';

export interface StitchPreset {
  id: StitchType;
  name: string;
  code: string;
  description: string;
  defaultSpacingMm: number;
  seamAllowanceMm: number;
  defaultStrength: number;
  patternLabel: string;
}

export const STITCH_PRESETS: StitchPreset[] = [
  {
    id: 'single-needle',
    name: 'Single Needle Lockstitch',
    code: 'ISO 301',
    description: 'Universal clean straight seam. High tensile strength for wovens and standard seams.',
    defaultSpacingMm: 2.5,
    seamAllowanceMm: 12,
    defaultStrength: 1.0,
    patternLabel: '— — —',
  },
  {
    id: 'double-needle',
    name: 'Double Needle Topstitch',
    code: 'ISO 406',
    description: 'Parallel twin topstitching for denim seams, hems, pocket borders, and outerwear.',
    defaultSpacingMm: 3.0,
    seamAllowanceMm: 15,
    defaultStrength: 1.4,
    patternLabel: '= = =',
  },
  {
    id: 'overlock',
    name: '4-Thread Safety Overlock',
    code: 'ISO 514',
    description: 'Serger stitch that finishes raw fabric edges with knit stretch recovery.',
    defaultSpacingMm: 2.0,
    seamAllowanceMm: 8,
    defaultStrength: 1.1,
    patternLabel: '∿∿∿',
  },
  {
    id: 'flatlock',
    name: 'Flatlock Active Stretch',
    code: 'ISO 607',
    description: 'Zero-bulk flush seam engineered for high-performance athleticwear and swimwear.',
    defaultSpacingMm: 1.8,
    seamAllowanceMm: 0,
    defaultStrength: 1.5,
    patternLabel: '▤▤▤',
  },
  {
    id: 'zigzag',
    name: 'Zigzag Elastic Stitch',
    code: 'ISO 304',
    description: 'Side-to-side flexible stitch optimal for waistband elastics, cuffs, and knit hems.',
    defaultSpacingMm: 2.2,
    seamAllowanceMm: 10,
    defaultStrength: 0.9,
    patternLabel: '╱╲╱╲',
  },
  {
    id: 'saddle',
    name: 'Artisan Saddle Stitch',
    code: 'Saddle 200',
    description: 'Heavy gauge luxury thread with contrast spacing for leather, outerwear, and accents.',
    defaultSpacingMm: 4.0,
    seamAllowanceMm: 14,
    defaultStrength: 1.8,
    patternLabel: '▪ ▪ ▪',
  },
];

export const FABRIC_PRESETS: FabricMaterial[] = [
  {
    id: 'cotton-jersey',
    name: 'Cotton Jersey (T-Shirt)',
    category: 'Knit',
    color: '#e2e8f0',
    density: 180,
    stretchStiffness: 0.85,
    bendingStiffness: 0.15,
    friction: 0.4,
    roughness: 0.7,
    metalness: 0.05,
    patternType: 'solid',
    description: 'Classic lightweight circular knit with natural drape and comfortable softness.',
  },
  {
    id: 'french-terry',
    name: 'Heavy French Terry Fleece',
    category: 'Knit',
    color: '#334155',
    density: 380,
    stretchStiffness: 0.75,
    bendingStiffness: 0.45,
    friction: 0.55,
    roughness: 0.82,
    metalness: 0.02,
    patternType: 'fleece',
    description: 'Substantial looped-back cotton fleece engineered for hoodies and oversized pullovers.',
  },
  {
    id: 'heavy-denim',
    name: 'Raw Heavy Denim 14oz',
    category: 'Denim',
    color: '#1e3a8a',
    density: 450,
    stretchStiffness: 0.98,
    bendingStiffness: 0.75,
    friction: 0.65,
    roughness: 0.85,
    metalness: 0.0,
    patternType: 'denim',
    description: 'Rigid shuttle-loom indigo twill with crisp folding lines and structured silhouettes.',
  },
  {
    id: 'silk-satin',
    name: 'Mulberry Silk Satin',
    category: 'Luxury',
    color: '#fbcfe8',
    density: 90,
    stretchStiffness: 0.95,
    bendingStiffness: 0.02,
    friction: 0.15,
    roughness: 0.25,
    metalness: 0.22,
    patternType: 'solid',
    description: 'High-lustre flowing drape that cascades smoothly across anatomical body curves.',
  },
  {
    id: 'structured-leather',
    name: 'Full-Grain Structured Leather',
    category: 'Leather',
    color: '#18181b',
    density: 520,
    stretchStiffness: 0.99,
    bendingStiffness: 0.85,
    friction: 0.45,
    roughness: 0.42,
    metalness: 0.1,
    patternType: 'solid',
    description: 'Thick calfskin leather with prominent sculptural form and minimal stretch.',
  },
  {
    id: 'linen-blend',
    name: 'Pure Summer Flax Linen',
    category: 'Woven',
    color: '#fef3c7',
    density: 210,
    stretchStiffness: 0.92,
    bendingStiffness: 0.28,
    friction: 0.45,
    roughness: 0.78,
    metalness: 0.0,
    patternType: 'solid',
    description: 'Breathable slub-textured open weave with organic wrinkles and crisp summer folds.',
  },
  {
    id: 'merino-wool',
    name: 'Merino Knit Wool',
    category: 'Knit',
    color: '#b45309',
    density: 280,
    stretchStiffness: 0.65,
    bendingStiffness: 0.35,
    friction: 0.5,
    roughness: 0.8,
    metalness: 0.0,
    patternType: 'rib',
    description: 'Fine-gauge resilient wool with cozy stretch recovery and soft natural volume.',
  },
  {
    id: 'tech-ripstop',
    name: 'Technical Ripstop Nylon',
    category: 'Technical',
    color: '#0284c7',
    density: 120,
    stretchStiffness: 0.99,
    bendingStiffness: 0.22,
    friction: 0.3,
    roughness: 0.38,
    metalness: 0.15,
    patternType: 'grid',
    description: 'Ultralight water-repellent grid-weave shell used for streetwear windbreakers.',
  },
  {
    id: 'crushed-velvet',
    name: 'Luxe Crushed Velvet',
    category: 'Luxury',
    color: '#701a75',
    density: 320,
    stretchStiffness: 0.82,
    bendingStiffness: 0.18,
    friction: 0.6,
    roughness: 0.65,
    metalness: 0.3,
    patternType: 'solid',
    description: 'Plush directional pile reflecting light dynamically across drapery folds.',
  },
  {
    id: 'sheer-chiffon',
    name: 'Ethereal Sheer Chiffon',
    category: 'Luxury',
    color: '#e0e7ff',
    density: 65,
    stretchStiffness: 0.96,
    bendingStiffness: 0.015,
    friction: 0.2,
    roughness: 0.3,
    metalness: 0.05,
    patternType: 'solid',
    description: 'Featherweight transparent plain weave with supreme fluid drapery.',
  },
  {
    id: 'sport-spandex',
    name: 'Performance 4-Way Spandex',
    category: 'Technical',
    color: '#10b981',
    density: 230,
    stretchStiffness: 0.45,
    bendingStiffness: 0.08,
    friction: 0.35,
    roughness: 0.45,
    metalness: 0.1,
    patternType: 'solid',
    description: 'High compression 4-way stretch fabric hugging body contours tightly without sag.',
  },
  {
    id: 'vintage-corduroy',
    name: 'Wide-Wale Vintage Corduroy',
    category: 'Woven',
    color: '#78350f',
    density: 410,
    stretchStiffness: 0.94,
    bendingStiffness: 0.68,
    friction: 0.6,
    roughness: 0.85,
    metalness: 0.0,
    patternType: 'stripes',
    description: 'Distinctive ribbed cut-pile ridges delivering rich tactile depth and structure.',
  },
];

// ==========================================
// 1. Classic Crewneck T-Shirt Preset
// ==========================================
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
      graphics: [
        {
          id: 'g-logo',
          name: 'Chest Brandmark',
          type: 'text',
          content: 'OPENCLO ATELIER',
          x: 0,
          y: -130,
          scale: 1.0,
          rotation: 0,
          color: '#ffffff',
          fontSize: 11,
          opacity: 0.9,
        },
      ],
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
      stitchType: 'single-needle',
    },
    {
      id: 'seam-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 2. Summer A-Line Dress Preset
// ==========================================
export function createDressPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'df0', x: -120, y: -220 },
    { id: 'df1', x: -50, y: -250 },
    { id: 'df2', x: 0, y: -190 },
    { id: 'df3', x: 50, y: -250 },
    { id: 'df4', x: 120, y: -220 },
    { id: 'df5', x: 110, y: -90 },
    { id: 'df6', x: 185, y: 380 },
    { id: 'df7', x: -185, y: 380 },
    { id: 'df8', x: -110, y: -90 },
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
      stitchType: 'single-needle',
    },
    {
      id: 'seam-dress-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-dress-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-dress-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 3. Urban Streetwear Hoodie Preset
// ==========================================
export function createHoodiePreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'hf0', x: -160, y: -230 }, // Left drop shoulder
    { id: 'hf1', x: -70, y: -250 },  // Left neck
    { id: 'hf2', x: 0, y: -195 },    // Center neck
    { id: 'hf3', x: 70, y: -250 },   // Right neck
    { id: 'hf4', x: 160, y: -230 },  // Right drop shoulder
    { id: 'hf5', x: 155, y: -80 },   // Armhole
    { id: 'hf6', x: 155, y: 220 },   // Right hem
    { id: 'hf7', x: -155, y: 220 },  // Left hem
    { id: 'hf8', x: -155, y: -80 },
  ];

  const backPoints = [
    { id: 'hb0', x: -160, y: -230 },
    { id: 'hb1', x: -70, y: -250 },
    { id: 'hb2', x: 0, y: -240 },
    { id: 'hb3', x: 70, y: -250 },
    { id: 'hb4', x: 160, y: -230 },
    { id: 'hb5', x: 155, y: -80 },
    { id: 'hb6', x: 155, y: 220 },
    { id: 'hb7', x: -155, y: 220 },
    { id: 'hb8', x: -155, y: -80 },
  ];

  const pocketPoints = [
    { id: 'pk0', x: -75, y: -30 },  // Top edge
    { id: 'pk1', x: 75, y: -30 },
    { id: 'pk2', x: 115, y: 40 },  // Angled pocket hand opening
    { id: 'pk3', x: 115, y: 110 }, // Bottom side
    { id: 'pk4', x: -115, y: 110 },
    { id: 'pk5', x: -115, y: 40 },
  ];

  const hoodPoints = [
    { id: 'hd0', x: -70, y: -120 },
    { id: 'hd1', x: 30, y: -130 },
    { id: 'hd2', x: 90, y: -70 },
    { id: 'hd3', x: 90, y: 50 },
    { id: 'hd4', x: -40, y: 60 },
    { id: 'hd5', x: -80, y: 10 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Hoodie Front Torso',
      points: frontPoints,
      position: { x: 180, y: 260 },
      rotation: 0,
      color: '#475569',
      placement: { origin3D: [0, 0.4, 0.17], rotation3D: [0, 0, 0] },
      graphics: [
        {
          id: 'h-print',
          name: 'Box Logo',
          type: 'text',
          content: 'CLO // STUDIO 2026',
          x: 0,
          y: -110,
          scale: 1.1,
          rotation: 0,
          color: '#f8fafc',
          fontSize: 12,
          opacity: 0.95,
        },
      ],
    },
    {
      id: 'piece-back',
      name: 'Hoodie Back Torso',
      points: backPoints,
      position: { x: 480, y: 260 },
      rotation: 0,
      color: '#334155',
      placement: { origin3D: [0, 0.4, -0.11], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-pocket',
      name: 'Kangaroo Pocket',
      points: pocketPoints,
      position: { x: 180, y: 420 },
      rotation: 0,
      color: '#64748b',
      placement: { origin3D: [0, 0.2, 0.18], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-hood',
      name: 'Hood Side Panel',
      points: hoodPoints,
      position: { x: 330, y: 90 },
      rotation: 0,
      color: '#94a3b8',
      placement: { origin3D: [0, 0.6, 0.0], rotation3D: [0, 0, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-hoodie-sh-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.2,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-hoodie-sh-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.2,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-hoodie-sd-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.2,
      stitchType: 'overlock',
    },
    {
      id: 'seam-hoodie-sd-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.2,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 4. Zip Bomber Jacket Preset
// ==========================================
export function createBomberJacketPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontLeft = [
    { id: 'bl0', x: -140, y: -220 },
    { id: 'bl1', x: -60, y: -245 },
    { id: 'bl2', x: 0, y: -215 },
    { id: 'bl3', x: 0, y: 190 },
    { id: 'bl4', x: -140, y: 190 },
    { id: 'bl5', x: -135, y: -90 },
  ];

  const frontRight = [
    { id: 'br0', x: 0, y: -215 },
    { id: 'br1', x: 60, y: -245 },
    { id: 'br2', x: 140, y: -220 },
    { id: 'br3', x: 135, y: -90 },
    { id: 'br4', x: 140, y: 190 },
    { id: 'br5', x: 0, y: 190 },
  ];

  const backPoints = [
    { id: 'bb0', x: -140, y: -220 },
    { id: 'bb1', x: -60, y: -245 },
    { id: 'bb2', x: 0, y: -235 },
    { id: 'bb3', x: 60, y: -245 },
    { id: 'bb4', x: 140, y: -220 },
    { id: 'bb5', x: 135, y: -90 },
    { id: 'bb6', x: 140, y: 190 },
    { id: 'bb7', x: -140, y: 190 },
    { id: 'bb8', x: -135, y: -90 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front-l',
      name: 'Left Front Panel',
      points: frontLeft,
      position: { x: 140, y: 260 },
      rotation: 0,
      color: '#0f766e',
      placement: { origin3D: [-0.08, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-front-r',
      name: 'Right Front Panel',
      points: frontRight,
      position: { x: 300, y: 260 },
      rotation: 0,
      color: '#0d9488',
      placement: { origin3D: [0.08, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Back Panel',
      points: backPoints,
      position: { x: 510, y: 260 },
      rotation: 0,
      color: '#115e59',
      placement: { origin3D: [0, 0.4, -0.11], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-bomber-sh-l',
      edgeA: { pieceId: 'piece-front-l', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.3,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-bomber-sh-r',
      edgeA: { pieceId: 'piece-front-r', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.3,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-bomber-sd-l',
      edgeA: { pieceId: 'piece-front-l', edgeIndex: 4 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.2,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-bomber-sd-r',
      edgeA: { pieceId: 'piece-front-r', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.2,
      stitchType: 'single-needle',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 5. Fitted Athletic Tank Top Preset
// ==========================================
export function createTankTopPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'tf0', x: -90, y: -220 },
    { id: 'tf1', x: -45, y: -240 },
    { id: 'tf2', x: 0, y: -160 },
    { id: 'tf3', x: 45, y: -240 },
    { id: 'tf4', x: 90, y: -220 },
    { id: 'tf5', x: 110, y: -80 },
    { id: 'tf6', x: 105, y: 140 },
    { id: 'tf7', x: -105, y: 140 },
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
      stitchType: 'flatlock',
    },
    {
      id: 'seam-tank-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'flatlock',
    },
    {
      id: 'seam-tank-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'flatlock',
    },
    {
      id: 'seam-tank-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'flatlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 6. Trendy Cropped Top Preset
// ==========================================
export function createCropTopPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'cf0', x: -130, y: -220 },
    { id: 'cf1', x: -55, y: -250 },
    { id: 'cf2', x: 0, y: -190 },
    { id: 'cf3', x: 55, y: -250 },
    { id: 'cf4', x: 130, y: -220 },
    { id: 'cf5', x: 120, y: -100 },
    { id: 'cf6', x: 115, y: 30 },
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
      stitchType: 'overlock',
    },
    {
      id: 'seam-crop-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-crop-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-crop-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 7. Streetwear Boxy Oversized Tee Preset
// ==========================================
export function createOversizedTeePreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'of0', x: -175, y: -220 },
    { id: 'of1', x: -65, y: -250 },
    { id: 'of2', x: 0, y: -195 },
    { id: 'of3', x: 65, y: -250 },
    { id: 'of4', x: 175, y: -220 },
    { id: 'of5', x: 160, y: -80 },
    { id: 'of6', x: 165, y: 220 },
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
      stitchType: 'single-needle',
    },
    {
      id: 'seam-over-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-over-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-over-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 8. Flared A-Line Skirt Preset
// ==========================================
export function createSkirtPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'sf0', x: -125, y: -100 },
    { id: 'sf1', x: 0, y: -90 },
    { id: 'sf2', x: 125, y: -100 },
    { id: 'sf3', x: 210, y: 220 },
    { id: 'sf4', x: 0, y: 240 },
    { id: 'sf5', x: -210, y: 220 },
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
      placement: { origin3D: [0, 0.0, -0.10], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-skirt-r',
      edgeA: { pieceId: 'piece-front-skirt', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-back-skirt', edgeIndex: 2 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-skirt-l',
      edgeA: { pieceId: 'piece-front-skirt', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back-skirt', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 9. Classic Pique Polo Shirt Preset
// ==========================================
export function createPoloPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'pf0', x: -140, y: -220 },
    { id: 'pf1', x: -60, y: -248 },
    { id: 'pf2', x: -15, y: -160 }, // Left Placket notch
    { id: 'pf3', x: 15, y: -160 },  // Right Placket notch
    { id: 'pf4', x: 60, y: -248 },
    { id: 'pf5', x: 140, y: -220 },
    { id: 'pf6', x: 125, y: -100 },
    { id: 'pf7', x: 130, y: 190 },
    { id: 'pf8', x: -130, y: 190 },
    { id: 'pf9', x: -125, y: -100 },
  ];

  const backPoints = [
    { id: 'pb0', x: -140, y: -220 },
    { id: 'pb1', x: -60, y: -248 },
    { id: 'pb2', x: 0, y: -240 },
    { id: 'pb3', x: 60, y: -248 },
    { id: 'pb4', x: 140, y: -220 },
    { id: 'pb5', x: 125, y: -100 },
    { id: 'pb6', x: 130, y: 195 },
    { id: 'pb7', x: -130, y: 195 },
    { id: 'pb8', x: -125, y: -100 },
  ];

  const collarPoints = [
    { id: 'pc0', x: -90, y: -30 },
    { id: 'pc1', x: 90, y: -30 },
    { id: 'pc2', x: 110, y: 25 },
    { id: 'pc3', x: -110, y: 25 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Polo Front Bodice',
      points: frontPoints,
      position: { x: 180, y: 260 },
      rotation: 0,
      color: '#1e40af',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Polo Back Bodice',
      points: backPoints,
      position: { x: 460, y: 260 },
      rotation: 0,
      color: '#1d4ed8',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-collar',
      name: 'Ribbed Knit Collar',
      points: collarPoints,
      position: { x: 320, y: 70 },
      rotation: 0,
      color: '#e2e8f0',
      placement: { origin3D: [0, 0.55, 0.05], rotation3D: [0, 0, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-polo-sh-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-polo-sh-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 4 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-polo-sd-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 6 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-polo-sd-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 8 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// Garment Template Library Descriptor
// ==========================================
export interface GarmentTemplate {
  id: string;
  name: string;
  category: 'Tops' | 'Outerwear' | 'Dresses' | 'Skirts';
  description: string;
  piecesCount: number;
  icon: string;
  recommendedFabric: string;
  recommendedColor: string;
  generator: () => { pieces: PatternPiece[]; seams: SeamConnection[] };
}

export const GARMENT_TEMPLATES: GarmentTemplate[] = [
  {
    id: 'tshirt',
    name: 'Classic Crewneck Tee',
    category: 'Tops',
    icon: '👕',
    description: 'Timeless tailored crewneck t-shirt with balanced proportions and natural shoulder drape.',
    piecesCount: 2,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#38bdf8',
    generator: createTshirtPreset,
  },
  {
    id: 'hoodie',
    name: 'Streetwear Pullover Hoodie',
    category: 'Outerwear',
    icon: '🧥',
    description: 'Heavy fleece boxy hoodie featuring an anatomical kangaroo pocket and sculpted hood.',
    piecesCount: 4,
    recommendedFabric: 'french-terry',
    recommendedColor: '#334155',
    generator: createHoodiePreset,
  },
  {
    id: 'bomber',
    name: 'Zip Bomber Jacket',
    category: 'Outerwear',
    icon: '🧥',
    description: 'Structured zip-front bomber with dual front flight panels and ribbed waist hem.',
    piecesCount: 3,
    recommendedFabric: 'structured-leather',
    recommendedColor: '#0f766e',
    generator: createBomberJacketPreset,
  },
  {
    id: 'dress',
    name: 'Summer A-Line Dress',
    category: 'Dresses',
    icon: '👗',
    description: 'Flowing feminine silhouette with fitted bust, tailored waist, and flared hemline.',
    piecesCount: 2,
    recommendedFabric: 'silk-satin',
    recommendedColor: '#ec4899',
    generator: createDressPreset,
  },
  {
    id: 'polo',
    name: 'Classic Pique Polo Shirt',
    category: 'Tops',
    icon: '👔',
    description: 'Clean preppy polo featuring button placket cutout and contrasting ribbed collar band.',
    piecesCount: 3,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#1e40af',
    generator: createPoloPreset,
  },
  {
    id: 'tanktop',
    name: 'Athletic Tank Top',
    category: 'Tops',
    icon: '🎽',
    description: 'Racerback-styled athletic sleeveless tank with deep scoop neck and flatlock stretch seams.',
    piecesCount: 2,
    recommendedFabric: 'sport-spandex',
    recommendedColor: '#06b6d4',
    generator: createTankTopPreset,
  },
  {
    id: 'croptop',
    name: 'Modern Crop Top',
    category: 'Tops',
    icon: '👚',
    description: 'Minimalist contemporary cropped top ending cleanly above the waistline.',
    piecesCount: 2,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#a855f7',
    generator: createCropTopPreset,
  },
  {
    id: 'oversized',
    name: 'Boxy Drop-Shoulder Tee',
    category: 'Tops',
    icon: '👕',
    description: 'Relaxed streetwear aesthetic with dropped shoulder lines and extended wide hem.',
    piecesCount: 2,
    recommendedFabric: 'heavy-denim',
    recommendedColor: '#10b981',
    generator: createOversizedTeePreset,
  },
  {
    id: 'skirt',
    name: 'Flared A-Line Skirt',
    category: 'Skirts',
    icon: '👗',
    description: 'High-waisted flared skirt with natural circular drapery folds and hem flare.',
    piecesCount: 2,
    recommendedFabric: 'silk-satin',
    recommendedColor: '#f59e0b',
    generator: createSkirtPreset,
  },
];

// ==========================================
// SVG Production Export
// ==========================================
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

    let graphicsSvg = '';
    if (piece.graphics) {
      piece.graphics.forEach(g => {
        const gx = piece.position.x + g.x;
        const gy = piece.position.y + g.y;
        graphicsSvg += `
        <text x="${gx}" y="${gy}" font-family="sans-serif" font-size="${g.fontSize || 12}" font-weight="700" fill="${g.color}" text-anchor="middle" opacity="${g.opacity}">${g.content}</text>`;
      });
    }

    paths += `
    <g id="${piece.id}" class="pattern-piece">
      <path d="${d}" fill="${piece.color || '#3b82f6'}" fill-opacity="0.25" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" />
      <text x="${piece.position.x}" y="${piece.position.y}" font-family="sans-serif" font-size="14" font-weight="600" fill="#1e293b" text-anchor="middle">${piece.name}</text>
      ${graphicsSvg}
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
