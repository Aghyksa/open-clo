import type {
  PatternPiece,
  FabricMaterial,
  SeamConnection,
  StitchType,
  SublimationPrint,
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
  // Real French curve pattern for front bodice
  const frontPoints = [
    { id: 'f0', x: -135, y: -215 }, // Left shoulder tip
    { id: 'f1', x: -65, y: -245 },  // Left neck
    { id: 'f2', x: -30, y: -225 },  // Front neck curve
    { id: 'f3', x: 0, y: -205 },    // Center neck drop
    { id: 'f4', x: 30, y: -225 },
    { id: 'f5', x: 65, y: -245 },   // Right neck
    { id: 'f6', x: 135, y: -215 },  // Right shoulder tip
    { id: 'f7', x: 145, y: -165 },  // Right armhole curve
    { id: 'f8', x: 128, y: -95 },   // Right armscye base
    { id: 'f9', x: 125, y: 30 },    // Right waist contour
    { id: 'f10', x: 130, y: 180 },  // Right hem
    { id: 'f11', x: -130, y: 180 }, // Left hem
    { id: 'f12', x: -125, y: 30 },  // Left waist contour
    { id: 'f13', x: -128, y: -95 }, // Left armscye base
    { id: 'f14', x: -145, y: -165 }, // Left armhole curve
  ];

  const backPoints = [
    { id: 'b0', x: -135, y: -215 }, // Left shoulder tip
    { id: 'b1', x: -65, y: -245 },  // Left neck
    { id: 'b2', x: 0, y: -238 },    // High back neck curve
    { id: 'b3', x: 65, y: -245 },   // Right neck
    { id: 'b4', x: 135, y: -215 },  // Right shoulder tip
    { id: 'b5', x: 142, y: -165 },  // Right armhole
    { id: 'b6', x: 128, y: -95 },   // Right armscye base
    { id: 'b7', x: 125, y: 30 },    // Right waist contour
    { id: 'b8', x: 130, y: 180 },   // Right hem
    { id: 'b9', x: -130, y: 180 },  // Left hem
    { id: 'b10', x: -125, y: 30 },  // Left waist contour
    { id: 'b11', x: -128, y: -95 }, // Left armscye base
    { id: 'b12', x: -142, y: -165 }, // Left armhole
  ];

  // Anatomical curved short sleeve cap (bell crown)
  const sleeveLPoints = [
    { id: 'sl0', x: -90, y: -15 },  // Underarm left
    { id: 'sl1', x: -80, y: -55 },  // Lower cap curve
    { id: 'sl2', x: -45, y: -85 },  // Upper cap curve
    { id: 'sl3', x: 0, y: -100 },   // Sleeve crown apex (puncak lengan)
    { id: 'sl4', x: 45, y: -85 },   // Upper cap curve
    { id: 'sl5', x: 80, y: -55 },   // Lower cap curve
    { id: 'sl6', x: 90, y: -15 },   // Underarm right
    { id: 'sl7', x: 75, y: 80 },    // Sleeve hem opening right
    { id: 'sl8', x: 0, y: 82 },     // Sleeve hem center
    { id: 'sl9', x: -75, y: 80 },   // Sleeve hem opening left
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  // Ribbed Crewneck Collar Band (Kerah Rib)
  const collarPoints = [
    { id: 'c0', x: -105, y: -12 },
    { id: 'c1', x: 105, y: -12 },
    { id: 'c2', x: 105, y: 12 },
    { id: 'c3', x: -105, y: 12 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Front Bodice',
      points: frontPoints,
      position: { x: 200, y: 280 },
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
      position: { x: 560, y: 280 },
      rotation: 0,
      color: '#818cf8',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-sleeve-l',
      name: 'Left Sleeve',
      points: sleeveLPoints,
      position: { x: 880, y: 170 },
      rotation: 0,
      color: '#06b6d4',
      placement: { origin3D: [0.35, 0.35, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-sleeve-r',
      name: 'Right Sleeve',
      points: sleeveRPoints,
      position: { x: 880, y: 390 },
      rotation: 0,
      color: '#06b6d4',
      placement: { origin3D: [-0.35, 0.35, 0], rotation3D: [0, 0, Math.PI / 4] },
    },
    {
      id: 'piece-collar',
      name: 'Ribbed Crewneck Collar',
      points: collarPoints,
      position: { x: 380, y: 560 },
      rotation: 0,
      color: '#e2e8f0',
      placement: { origin3D: [0, 0.55, 0.05], rotation3D: [0, 0, 0] },
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
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 9 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 11 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 9 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-sleeve-l',
      edgeA: { pieceId: 'piece-sleeve-l', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 13 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-sleeve-r',
      edgeA: { pieceId: 'piece-sleeve-r', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-collar-front',
      edgeA: { pieceId: 'piece-collar', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 2 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 2. Summer A-Line Dress Preset
// ==========================================
export function createDressPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  // Realistic A-line dress with fitted bodice, flared skirt, and proper neckline curves
  const frontPoints = [
    { id: 'df0', x: -118, y: -225 }, // Left shoulder tip
    { id: 'df1', x: -55, y: -248 },  // Left neck slope
    { id: 'df2', x: -25, y: -228 },  // Left neck curve
    { id: 'df3', x: 0, y: -195 },    // Center front V-neck drop
    { id: 'df4', x: 25, y: -228 },   // Right neck curve
    { id: 'df5', x: 55, y: -248 },   // Right neck slope
    { id: 'df6', x: 118, y: -225 },  // Right shoulder tip
    { id: 'df7', x: 130, y: -170 },  // Right armhole upper
    { id: 'df8', x: 115, y: -95 },   // Right armscye base
    { id: 'df9', x: 110, y: -20 },   // Right waist (fitted)
    { id: 'df10', x: 135, y: 80 },   // Right hip flare start
    { id: 'df11', x: 185, y: 360 },  // Right hem flare
    { id: 'df12', x: -185, y: 360 }, // Left hem flare
    { id: 'df13', x: -135, y: 80 },  // Left hip flare start
    { id: 'df14', x: -110, y: -20 }, // Left waist (fitted)
    { id: 'df15', x: -115, y: -95 }, // Left armscye base
    { id: 'df16', x: -130, y: -170 }, // Left armhole upper
  ];

  const backPoints = [
    { id: 'db0', x: -118, y: -225 },
    { id: 'db1', x: -55, y: -248 },
    { id: 'db2', x: 0, y: -240 },    // High back neck (shallow scoop)
    { id: 'db3', x: 55, y: -248 },
    { id: 'db4', x: 118, y: -225 },
    { id: 'db5', x: 130, y: -170 },
    { id: 'db6', x: 115, y: -95 },
    { id: 'db7', x: 110, y: -20 },
    { id: 'db8', x: 135, y: 80 },
    { id: 'db9', x: 185, y: 360 },
    { id: 'db10', x: -185, y: 360 },
    { id: 'db11', x: -135, y: 80 },
    { id: 'db12', x: -110, y: -20 },
    { id: 'db13', x: -115, y: -95 },
    { id: 'db14', x: -130, y: -170 },
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
      position: { x: 490, y: 290 },
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
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-dress-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 10 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 8 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-dress-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 12 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 10 },
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
    { id: 'hf2', x: -30, y: -225 },
    { id: 'hf3', x: 0, y: -195 },    // Center neck
    { id: 'hf4', x: 30, y: -225 },
    { id: 'hf5', x: 70, y: -250 },   // Right neck
    { id: 'hf6', x: 160, y: -230 },  // Right drop shoulder
    { id: 'hf7', x: 168, y: -165 },  // Right armhole
    { id: 'hf8', x: 155, y: -80 },   // Armhole base
    { id: 'hf9', x: 155, y: 220 },   // Right hem
    { id: 'hf10', x: -155, y: 220 }, // Left hem
    { id: 'hf11', x: -155, y: -80 },
    { id: 'hf12', x: -168, y: -165 },
  ];

  const backPoints = [
    { id: 'hb0', x: -160, y: -230 },
    { id: 'hb1', x: -70, y: -250 },
    { id: 'hb2', x: 0, y: -240 },
    { id: 'hb3', x: 70, y: -250 },
    { id: 'hb4', x: 160, y: -230 },
    { id: 'hb5', x: 168, y: -165 },
    { id: 'hb6', x: 155, y: -80 },
    { id: 'hb7', x: 155, y: 220 },
    { id: 'hb8', x: -155, y: 220 },
    { id: 'hb9', x: -155, y: -80 },
    { id: 'hb10', x: -168, y: -165 },
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

  const sleeveLPoints = [
    { id: 'hsl0', x: -105, y: -20 },
    { id: 'hsl1', x: -90, y: -65 },
    { id: 'hsl2', x: 0, y: -90 },
    { id: 'hsl3', x: 90, y: -65 },
    { id: 'hsl4', x: 105, y: -20 },
    { id: 'hsl5', x: 65, y: 160 }, // Long sleeve wrist cuff
    { id: 'hsl6', x: -65, y: 160 },
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Hoodie Front Torso',
      points: frontPoints,
      position: { x: 200, y: 280 },
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
      position: { x: 620, y: 280 },
      rotation: 0,
      color: '#334155',
      placement: { origin3D: [0, 0.4, -0.11], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-pocket',
      name: 'Kangaroo Pocket',
      points: pocketPoints,
      position: { x: 200, y: 590 },
      rotation: 0,
      color: '#64748b',
      placement: { origin3D: [0, 0.2, 0.18], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-hood',
      name: 'Hood Side Panel',
      points: hoodPoints,
      position: { x: 620, y: 590 },
      rotation: 0,
      color: '#94a3b8',
      placement: { origin3D: [0, 0.6, 0.0], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-sleeve-l',
      name: 'Left Long Sleeve',
      points: sleeveLPoints,
      position: { x: 1000, y: 180 },
      rotation: 0,
      color: '#475569',
      placement: { origin3D: [0.42, 0.3, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-sleeve-r',
      name: 'Right Long Sleeve',
      points: sleeveRPoints,
      position: { x: 1000, y: 460 },
      rotation: 0,
      color: '#475569',
      placement: { origin3D: [-0.42, 0.3, 0], rotation3D: [0, 0, Math.PI / 4] },
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
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.2,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-hoodie-sd-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 8 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 6 },
      strength: 1.2,
      stitchType: 'overlock',
    },
    {
      id: 'seam-hoodie-sd-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 10 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 8 },
      strength: 1.2,
      stitchType: 'overlock',
    },
    {
      id: 'seam-hoodie-sleeve-l',
      edgeA: { pieceId: 'piece-sleeve-l', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 12 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-hoodie-sleeve-r',
      edgeA: { pieceId: 'piece-sleeve-r', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-hoodie-hood',
      edgeA: { pieceId: 'piece-hood', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 1 },
      strength: 1.2,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-hoodie-pocket',
      edgeA: { pieceId: 'piece-pocket', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 9 },
      strength: 1.2,
      stitchType: 'topstitch',
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

  const sleeveLPoints = [
    { id: 'bms0', x: -105, y: -20 },
    { id: 'bms1', x: -90, y: -65 },
    { id: 'bms2', x: 0, y: -90 },
    { id: 'bms3', x: 90, y: -65 },
    { id: 'bms4', x: 105, y: -20 },
    { id: 'bms5', x: 65, y: 160 },
    { id: 'bms6', x: -65, y: 160 },
  ];
  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  const collarPoints = [
    { id: 'bmc0', x: -95, y: -15 },
    { id: 'bmc1', x: 95, y: -15 },
    { id: 'bmc2', x: 95, y: 15 },
    { id: 'bmc3', x: -95, y: 15 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-bomber-front-l',
      name: 'Bomber Left Front Panel',
      points: frontLeft,
      position: { x: 140, y: 260 },
      rotation: 0,
      color: '#0f766e',
      placement: { origin3D: [-0.08, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-bomber-front-r',
      name: 'Bomber Right Front Panel',
      points: frontRight,
      position: { x: 300, y: 260 },
      rotation: 0,
      color: '#0d9488',
      placement: { origin3D: [0.08, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-bomber-back',
      name: 'Bomber Back Panel',
      points: backPoints,
      position: { x: 510, y: 260 },
      rotation: 0,
      color: '#115e59',
      placement: { origin3D: [0, 0.4, -0.11], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-bomber-sleeve-l',
      name: 'Bomber Left Long Sleeve',
      points: sleeveLPoints,
      position: { x: 740, y: 190 },
      rotation: 0,
      color: '#0f766e',
      placement: { origin3D: [0.42, 0.3, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-bomber-sleeve-r',
      name: 'Bomber Right Long Sleeve',
      points: sleeveRPoints,
      position: { x: 740, y: 430 },
      rotation: 0,
      color: '#0f766e',
      placement: { origin3D: [-0.42, 0.3, 0], rotation3D: [0, 0, Math.PI / 4] },
    },
    {
      id: 'piece-bomber-collar',
      name: 'Bomber Ribbed Baseball Collar',
      points: collarPoints,
      position: { x: 320, y: 80 },
      rotation: 0,
      color: '#134e4a',
      placement: { origin3D: [0, 0.55, 0.05], rotation3D: [0, 0, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-bomber-zipper',
      edgeA: { pieceId: 'piece-bomber-front-l', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-bomber-front-r', edgeIndex: 5 },
      strength: 1.5,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-bomber-sh-l',
      edgeA: { pieceId: 'piece-bomber-front-l', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-bomber-back', edgeIndex: 0 },
      strength: 1.3,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-bomber-sh-r',
      edgeA: { pieceId: 'piece-bomber-front-r', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-bomber-back', edgeIndex: 3 },
      strength: 1.3,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-bomber-sd-l',
      edgeA: { pieceId: 'piece-bomber-front-l', edgeIndex: 4 },
      edgeB: { pieceId: 'piece-bomber-back', edgeIndex: 7 },
      strength: 1.2,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-bomber-sd-r',
      edgeA: { pieceId: 'piece-bomber-front-r', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-bomber-back', edgeIndex: 5 },
      strength: 1.2,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-bomber-sleeve-l',
      edgeA: { pieceId: 'piece-bomber-sleeve-l', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-bomber-front-l', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-bomber-sleeve-r',
      edgeA: { pieceId: 'piece-bomber-sleeve-r', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-bomber-front-r', edgeIndex: 2 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 5. Fitted Athletic Tank Top Preset
// ==========================================
export function createTankTopPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'tf0', x: -85, y: -220 },
    { id: 'tf1', x: -45, y: -240 },
    { id: 'tf2', x: 0, y: -160 },
    { id: 'tf3', x: 45, y: -240 },
    { id: 'tf4', x: 85, y: -220 },
    { id: 'tf5', x: 125, y: -80 },
    { id: 'tf6', x: 120, y: 140 },
    { id: 'tf7', x: -120, y: 140 },
    { id: 'tf8', x: -125, y: -80 },
  ];

  const backPoints = [
    { id: 'tb0', x: -85, y: -220 },
    { id: 'tb1', x: -45, y: -240 },
    { id: 'tb2', x: 0, y: -210 },
    { id: 'tb3', x: 45, y: -240 },
    { id: 'tb4', x: 85, y: -220 },
    { id: 'tb5', x: 125, y: -80 },
    { id: 'tb6', x: 120, y: 140 },
    { id: 'tb7', x: -120, y: 140 },
    { id: 'tb8', x: -125, y: -80 },
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
    { id: 'of0', x: -165, y: -215 }, // Left drop shoulder
    { id: 'of1', x: -70, y: -245 },  // Left neck
    { id: 'of2', x: -30, y: -225 },
    { id: 'of3', x: 0, y: -205 },    // Center neck
    { id: 'of4', x: 30, y: -225 },
    { id: 'of5', x: 70, y: -245 },   // Right neck
    { id: 'of6', x: 165, y: -215 },  // Right drop shoulder
    { id: 'of7', x: 175, y: -160 },  // Dropped armhole
    { id: 'of8', x: 155, y: -80 },   // Armhole bottom
    { id: 'of9', x: 160, y: 220 },   // Wide hem
    { id: 'of10', x: -160, y: 220 },
    { id: 'of11', x: -155, y: -80 },
    { id: 'of12', x: -175, y: -160 },
  ];

  const backPoints = [
    { id: 'ob0', x: -165, y: -215 },
    { id: 'ob1', x: -70, y: -245 },
    { id: 'ob2', x: 0, y: -238 },
    { id: 'ob3', x: 70, y: -245 },
    { id: 'ob4', x: 165, y: -215 },
    { id: 'ob5', x: 175, y: -160 },
    { id: 'ob6', x: 155, y: -80 },
    { id: 'ob7', x: 160, y: 220 },
    { id: 'ob8', x: -160, y: 220 },
    { id: 'ob9', x: -155, y: -80 },
    { id: 'ob10', x: -175, y: -160 },
  ];

  const sleeveLPoints = [
    { id: 'osl0', x: -110, y: -20 },
    { id: 'osl1', x: -95, y: -65 },
    { id: 'osl2', x: 0, y: -90 }, // Flatter dropped cap
    { id: 'osl3', x: 95, y: -65 },
    { id: 'osl4', x: 110, y: -20 },
    { id: 'osl5', x: 95, y: 100 },
    { id: 'osl6', x: -95, y: 100 },
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  const collarPoints = [
    { id: 'oc0', x: -115, y: -15 },
    { id: 'oc1', x: 115, y: -15 },
    { id: 'oc2', x: 115, y: 15 },
    { id: 'oc3', x: -115, y: 15 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Oversized Front',
      points: frontPoints,
      position: { x: 200, y: 220 },
      rotation: 0,
      color: '#10b981',
      placement: { origin3D: [0, 0.4, 0.17], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Oversized Back',
      points: backPoints,
      position: { x: 620, y: 220 },
      rotation: 0,
      color: '#059669',
      placement: { origin3D: [0, 0.4, -0.11], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-sleeve-l',
      name: 'Left Dropped Sleeve',
      points: sleeveLPoints,
      position: { x: 960, y: 150 },
      rotation: 0,
      color: '#34d399',
      placement: { origin3D: [0.38, 0.32, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-sleeve-r',
      name: 'Right Dropped Sleeve',
      points: sleeveRPoints,
      position: { x: 960, y: 410 },
      rotation: 0,
      color: '#34d399',
      placement: { origin3D: [-0.38, 0.32, 0], rotation3D: [0, 0, Math.PI / 4] },
    },
    {
      id: 'piece-collar',
      name: 'Ribbed Collar Band',
      points: collarPoints,
      position: { x: 410, y: 470 },
      rotation: 0,
      color: '#d1fae5',
      placement: { origin3D: [0, 0.55, 0.05], rotation3D: [0, 0, 0] },
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
      edgeA: { pieceId: 'piece-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-over-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 8 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-over-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 10 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 8 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-over-sleeve-l',
      edgeA: { pieceId: 'piece-sleeve-l', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 12 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-over-sleeve-r',
      edgeA: { pieceId: 'piece-sleeve-r', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 6 },
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

  const sleeveLPoints = [
    { id: 'psl0', x: -90, y: -15 },
    { id: 'psl1', x: -75, y: -55 },
    { id: 'psl2', x: 0, y: -95 },
    { id: 'psl3', x: 75, y: -55 },
    { id: 'psl4', x: 90, y: -15 },
    { id: 'psl5', x: 75, y: 75 },
    { id: 'psl6', x: -75, y: 75 },
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

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
    {
      id: 'piece-sleeve-l',
      name: 'Left Sleeve',
      points: sleeveLPoints,
      position: { x: 720, y: 180 },
      rotation: 0,
      color: '#2563eb',
      placement: { origin3D: [0.35, 0.35, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-sleeve-r',
      name: 'Right Sleeve',
      points: sleeveRPoints,
      position: { x: 720, y: 380 },
      rotation: 0,
      color: '#2563eb',
      placement: { origin3D: [-0.35, 0.35, 0], rotation3D: [0, 0, Math.PI / 4] },
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
    {
      id: 'seam-polo-sleeve-l',
      edgeA: { pieceId: 'piece-sleeve-l', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 9 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-polo-sleeve-r',
      edgeA: { pieceId: 'piece-sleeve-r', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-polo-collar',
      edgeA: { pieceId: 'piece-collar', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 1 },
      strength: 1.2,
      stitchType: 'double-needle',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// Garment Template Library Descriptor
// ==========================================
// ==========================================
// 10. SBL Kids Set (Ruched Crop Top & Cutbray Flare Pants)
// Based on PT. Maxxbrother Indonesia & Project SBL Kids
// ==========================================
export function createSblKidsCutbrayPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  // Top Front with center ruching line
  const topFrontPoints = [
    { id: 'tf0', x: -65, y: -110 }, // Left shoulder
    { id: 'tf1', x: -25, y: -125 }, // Left neck
    { id: 'tf2', x: 0, y: -90 },    // Center scoop neck
    { id: 'tf3', x: 25, y: -125 },  // Right neck
    { id: 'tf4', x: 65, y: -110 },  // Right shoulder
    { id: 'tf5', x: 55, y: -40 },   // Right armhole curve
    { id: 'tf6', x: 50, y: 35 },    // Right side hem
    { id: 'tf7', x: 0, y: 40 },     // Center hem cinch
    { id: 'tf8', x: -50, y: 35 },   // Left side hem
    { id: 'tf9', x: -55, y: -40 },  // Left armhole curve
  ];

  // Top Back (higher neck, cut on fold)
  const topBackPoints = [
    { id: 'tb0', x: -65, y: -110 },
    { id: 'tb1', x: -25, y: -125 },
    { id: 'tb2', x: 0, y: -120 },   // High back neck
    { id: 'tb3', x: 25, y: -125 },
    { id: 'tb4', x: 65, y: -110 },
    { id: 'tb5', x: 55, y: -40 },
    { id: 'tb6', x: 50, y: 35 },
    { id: 'tb7', x: -50, y: 35 },
    { id: 'tb8', x: -55, y: -40 },
  ];

  // Cutbray Flared Pants Front (Bell-Bottom Flare)
  const pantFrontPoints = [
    { id: 'pf0', x: -55, y: -150 }, // Left waist
    { id: 'pf1', x: 55, y: -150 },  // Right waist
    { id: 'pf2', x: 58, y: -70 },   // Right hip
    { id: 'pf3', x: 30, y: 15 },    // Knee in
    { id: 'pf4', x: 70, y: 160 },   // Bell flare outer hem
    { id: 'pf5', x: -70, y: 160 },  // Bell flare inner hem
    { id: 'pf6', x: -30, y: 15 },   // Inseam knee
    { id: 'pf7', x: -8, y: -65 },   // Crotch curve
  ];

  // Cutbray Flared Pants Back (with extended back rise and seat curve)
  const pantBackPoints = [
    { id: 'pb0', x: -55, y: -160 }, // Angled back waist
    { id: 'pb1', x: 55, y: -155 },
    { id: 'pb2', x: 60, y: -70 },   // Hip
    { id: 'pb3', x: 32, y: 15 },    // Knee in
    { id: 'pb4', x: 72, y: 160 },   // Bell flare outer hem
    { id: 'pb5', x: -72, y: 160 },  // Bell flare inner hem
    { id: 'pb6', x: -32, y: 15 },   // Inseam knee
    { id: 'pb7', x: -22, y: -58 },  // Extended back crotch
  ];

  // Elastic Waistband Strip
  const waistbandPoints = [
    { id: 'wb0', x: -95, y: -12 },
    { id: 'wb1', x: 95, y: -12 },
    { id: 'wb2', x: 95, y: 12 },
    { id: 'wb3', x: -95, y: 12 },
  ];

  // Drawstring Ties (Tali Serut)
  const drawstringPoints = [
    { id: 'ds0', x: -75, y: -5 },
    { id: 'ds1', x: 75, y: -5 },
    { id: 'ds2', x: 75, y: 5 },
    { id: 'ds3', x: -75, y: 5 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-top-front',
      name: 'Atasan Depan (Serut)',
      points: topFrontPoints,
      position: { x: 440, y: 160 },
      rotation: 0,
      color: '#c084fc',
      tataBusanaType: 'TM',
      hasFoldLine: true,
      notches: [
        { edgeIndex: 5, param: 0.5, type: 'single' },
        { edgeIndex: 9, param: 0.5, type: 'single' },
      ],
      placement: { origin3D: [0, 0.45, 0.15], rotation3D: [0, 0, 0] },
      graphics: [
        {
          id: 'g-ruche',
          name: 'Center Ruche Channel',
          type: 'text',
          content: '— · — SERUT — · —',
          x: 0,
          y: -25,
          scale: 0.8,
          rotation: Math.PI / 2,
          color: '#ffffff',
          fontSize: 9,
          opacity: 0.85,
        },
      ],
    },
    {
      id: 'piece-top-back',
      name: 'Atasan Belakang',
      points: topBackPoints,
      position: { x: 700, y: 160 },
      rotation: 0,
      color: '#a855f7',
      tataBusanaType: 'TB',
      hasFoldLine: true,
      notches: [
        { edgeIndex: 5, param: 0.5, type: 'double' },
        { edgeIndex: 8, param: 0.5, type: 'double' },
      ],
      placement: { origin3D: [0, 0.45, -0.11], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-pant-front',
      name: 'Celana Cutbray Depan',
      points: pantFrontPoints,
      position: { x: 980, y: 220 },
      rotation: 0,
      color: '#c084fc',
      tataBusanaType: 'TM',
      notches: [
        { edgeIndex: 2, param: 0.5, type: 'single' },
        { edgeIndex: 6, param: 0.5, type: 'single' },
      ],
      placement: { origin3D: [0.12, -0.25, 0.05], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-pant-back',
      name: 'Celana Cutbray Belakang',
      points: pantBackPoints,
      position: { x: 1300, y: 220 },
      rotation: 0,
      color: '#a855f7',
      tataBusanaType: 'TB',
      notches: [
        { edgeIndex: 2, param: 0.5, type: 'double' },
        { edgeIndex: 6, param: 0.5, type: 'double' },
      ],
      placement: { origin3D: [-0.12, -0.25, -0.05], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-waistband',
      name: 'Ban Pinggang (Rib)',
      points: waistbandPoints,
      position: { x: 440, y: 315 },
      rotation: 0,
      color: '#38bdf8',
      placement: { origin3D: [0, 0.12, 0.0], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-drawstring',
      name: 'Tali Serut (Drawstring)',
      points: drawstringPoints,
      position: { x: 440, y: 405 },
      rotation: 0,
      color: '#f8fafc',
      placement: { origin3D: [0, 0.28, 0.16], rotation3D: [0, 0, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-sbl-top-sh-l',
      edgeA: { pieceId: 'piece-top-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-top-back', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-sbl-top-sh-r',
      edgeA: { pieceId: 'piece-top-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-top-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-sbl-top-side-r',
      edgeA: { pieceId: 'piece-top-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-top-back', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-sbl-top-side-l',
      edgeA: { pieceId: 'piece-top-front', edgeIndex: 8 },
      edgeB: { pieceId: 'piece-top-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-sbl-pant-outseam',
      edgeA: { pieceId: 'piece-pant-front', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-pant-back', edgeIndex: 2 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-sbl-pant-inseam',
      edgeA: { pieceId: 'piece-pant-front', edgeIndex: 5 },
      edgeB: { pieceId: 'piece-pant-back', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 11. Cropped Bolero / Shrug Jacket (PT. Maxxbrother Indonesia)
// ==========================================
export function createCroppedBoleroPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  // Ultra-cropped front bodice ending above bust
  const frontPoints = [
    { id: 'bof0', x: -90, y: -100 },
    { id: 'bof1', x: -35, y: -120 },
    { id: 'bof2', x: 0, y: -90 },
    { id: 'bof3', x: 35, y: -120 },
    { id: 'bof4', x: 90, y: -100 },
    { id: 'bof5', x: 95, y: -30 },
    { id: 'bof6', x: 80, y: 15 },
    { id: 'bof7', x: -80, y: 15 },
    { id: 'bof8', x: -95, y: -30 },
  ];

  const backPoints = [
    { id: 'bob0', x: -90, y: -100 },
    { id: 'bob1', x: -35, y: -120 },
    { id: 'bob2', x: 0, y: -115 },
    { id: 'bob3', x: 35, y: -120 },
    { id: 'bob4', x: 90, y: -100 },
    { id: 'bob5', x: 95, y: -30 },
    { id: 'bob6', x: 80, y: 15 },
    { id: 'bob7', x: -80, y: 15 },
    { id: 'bob8', x: -95, y: -30 },
  ];

  // Voluminous Puff Sleeve (Leg-of-mutton puff crown tapering to structured cuff)
  const puffSleeveL = [
    { id: 'psl0', x: -110, y: -15 },
    { id: 'psl1', x: -95, y: -70 },
    { id: 'psl2', x: -55, y: -115 },
    { id: 'psl3', x: 0, y: -130 },
    { id: 'psl4', x: 55, y: -115 },
    { id: 'psl5', x: 95, y: -70 },
    { id: 'psl6', x: 110, y: -15 },
    { id: 'psl7', x: 45, y: 120 },
    { id: 'psl8', x: -45, y: 120 },
  ];

  const puffSleeveR = JSON.parse(JSON.stringify(puffSleeveL));

  const cuffPoints = [
    { id: 'cf0', x: -65, y: -14 },
    { id: 'cf1', x: 65, y: -14 },
    { id: 'cf2', x: 65, y: 14 },
    { id: 'cf3', x: -65, y: 14 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-bolero-front',
      name: 'Bolero Front Bodice',
      points: frontPoints,
      position: { x: 200, y: 200 },
      rotation: 0,
      color: '#1e3a8a',
      tataBusanaType: 'TM',
      hasFoldLine: true,
      placement: { origin3D: [0, 0.5, 0.16], rotation3D: [0, 0, 0] },
      graphics: [
        {
          id: 'g-star',
          name: 'Graffiti Star',
          type: 'text',
          content: '★ POLA SBL 1-3',
          x: -25,
          y: -35,
          scale: 0.9,
          rotation: 0,
          color: '#f43f5e',
          fontSize: 10,
          opacity: 0.95,
        },
      ],
    },
    {
      id: 'piece-bolero-back',
      name: 'Bolero Back Bodice',
      points: backPoints,
      position: { x: 520, y: 200 },
      rotation: 0,
      color: '#1e3a8a',
      tataBusanaType: 'TB',
      hasFoldLine: true,
      placement: { origin3D: [0, 0.5, -0.11], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-puff-sleeve-l',
      name: 'Puff Sleeve Kiri (Leg-of-mutton)',
      points: puffSleeveL,
      position: { x: 880, y: 170 },
      rotation: 0,
      color: '#f43f5e',
      placement: { origin3D: [0.4, 0.4, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-puff-sleeve-r',
      name: 'Puff Sleeve Kanan (Leg-of-mutton)',
      points: puffSleeveR,
      position: { x: 880, y: 440 },
      rotation: 0,
      color: '#f43f5e',
      placement: { origin3D: [-0.4, 0.4, 0], rotation3D: [0, 0, Math.PI / 4] },
    },
    {
      id: 'piece-bolero-cuffs',
      name: 'Manset Lengan (Cuffs)',
      points: cuffPoints,
      position: { x: 360, y: 400 },
      rotation: 0,
      color: '#1e3a8a',
      placement: { origin3D: [0, 0.1, 0.0], rotation3D: [0, 0, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-bolero-sh-l',
      edgeA: { pieceId: 'piece-bolero-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-bolero-back', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-bolero-sh-r',
      edgeA: { pieceId: 'piece-bolero-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-bolero-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-bolero-sleeve-l',
      edgeA: { pieceId: 'piece-puff-sleeve-l', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-bolero-front', edgeIndex: 7 },
      strength: 1.2,
      stitchType: 'overlock',
    },
    {
      id: 'seam-bolero-sleeve-r',
      edgeA: { pieceId: 'piece-puff-sleeve-r', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-bolero-front', edgeIndex: 4 },
      strength: 1.2,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

export interface GarmentTemplate {
  id: string;
  name: string;
  category: 'Tops' | 'Outerwear' | 'Dresses' | 'Skirts' | 'Bottoms';
  description: string;
  piecesCount: number;
  icon: string;
  recommendedFabric: string;
  recommendedColor: string;
  brandInspiration?: string;
  silhouetteType?: 'oversized' | 'relaxed' | 'regular' | 'tailored';
  generator: () => { pieces: PatternPiece[]; seams: SeamConnection[] };
}

export const GARMENT_TEMPLATES: GarmentTemplate[] = [
  {
    id: 'sbl-kids-cutbray',
    name: 'SBL Kids Ruched Crop & Cutbray Pants',
    category: 'Sets',
    icon: '👗',
    description: 'Commercial 2-piece set from PT. Maxxbrother & SBL Kids: cropped sleeveless tank with center drawstring ruching, paired with high-waisted flared bell-bottom cutbray trousers.',
    piecesCount: 6,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#c084fc',
    brandInspiration: 'SBL Kids / PT. Maxxbrother',
    silhouetteType: 'regular',
    generator: createSblKidsCutbrayPreset,
  },
  {
    id: 'cropped-bolero-jacket',
    name: 'Pola Sublim Bolero Shrug (Size S)',
    category: 'Outerwear',
    icon: '🧥',
    description: 'Avant-garde streetwear shrug from PT. Maxxbrother: ultra-cropped chest bodice with voluminous leg-of-mutton puff sleeves and structured wrist cuffs.',
    piecesCount: 5,
    recommendedFabric: 'french-terry',
    recommendedColor: '#1e3a8a',
    brandInspiration: 'Pola SBL 1-3 Sublimasi',
    silhouetteType: 'oversized',
    generator: createCroppedBoleroPreset,
  },
  {
    id: 'uniqlo-u-boxy-tee',
    name: 'Uniqlo U AIRism Boxy Tee',
    category: 'Tops',
    icon: '👕',
    description: 'Iconic streetwear cut inspired by Christophe Lemaire: dropped shoulders, wide sleeves hitting the elbow, and tight 1.25" thick knit ribbed collar.',
    piecesCount: 5,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#262626',
    brandInspiration: 'Uniqlo U LifeWear',
    silhouetteType: 'oversized',
    generator: createOversizedTeePreset,
  },
  {
    id: 'heavyweight-hoodie',
    name: 'GU / Uniqlo Heavy Hoodie',
    category: 'Outerwear',
    icon: '🧥',
    description: 'Heavyweight 400+ GSM French Terry pullover hoodie featuring a structured stand-up double-layer hood, deep kangaroo pocket, and heavy 2x2 rib cuffs and hem.',
    piecesCount: 6,
    recommendedFabric: 'french-terry',
    recommendedColor: '#3d4a3e',
    brandInspiration: 'GU Heavyweight 400gsm',
    silhouetteType: 'oversized',
    generator: createHoodiePreset,
  },
  {
    id: 'full-zip-hoodie',
    name: 'Uniqlo Full-Zip Sweat Hoodie',
    category: 'Outerwear',
    icon: '🧥',
    description: 'Full-zip streetwear track hoodie with smooth center metal zipper, split kangaroo front pockets, and comfortable relaxed drop-shoulder cut.',
    piecesCount: 6,
    recommendedFabric: 'french-terry',
    recommendedColor: '#949ba4',
    brandInspiration: 'Uniqlo LifeWear Sweat',
    silhouetteType: 'relaxed',
    generator: createHoodiePreset,
  },
  {
    id: 'coach-jacket',
    name: 'Uniqlo Utility Coach Jacket',
    category: 'Outerwear',
    icon: '🧥',
    description: 'Minimalist street workwear jacket featuring a classic pointed turn-down collar, snap-button / zip placket, welt hand pockets, and straight hem.',
    piecesCount: 6,
    recommendedFabric: 'heavy-denim',
    recommendedColor: '#1a2332',
    brandInspiration: 'Uniqlo Utility Workwear',
    silhouetteType: 'relaxed',
    generator: createBomberJacketPreset,
  },
  {
    id: 'pique-polo',
    name: 'Uniqlo Dry Pique Polo Shirt',
    category: 'Tops',
    icon: '👔',
    description: 'Clean preppy polo featuring a firm textured knit ribbed collar, 2-button front placket, ribbed sleeve bands, and stepped side vents.',
    piecesCount: 5,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#f4f1ea',
    brandInspiration: 'Uniqlo Dry-EX Pique',
    silhouetteType: 'regular',
    generator: createPoloPreset,
  },
  {
    id: 'camp-shirt',
    name: 'Uniqlo Open Collar Vacation Shirt',
    category: 'Tops',
    icon: '👔',
    description: 'Relaxed short-sleeve resort shirt with retro notched camp collar, clean front button placket, left chest patch pocket, and airy drape.',
    piecesCount: 5,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#c2a68c',
    brandInspiration: 'Uniqlo Open Collar Broadcloth',
    silhouetteType: 'relaxed',
    generator: createTshirtPreset,
  },
  {
    id: 'tshirt',
    name: 'Supima Classic Crewneck Tee',
    category: 'Tops',
    icon: '👕',
    description: 'Everyday staple classic fit crewneck t-shirt with tailored shoulder line, neat armhole drape, and single-needle finish.',
    piecesCount: 5,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#ffffff',
    brandInspiration: 'Uniqlo Supima Cotton',
    silhouetteType: 'regular',
    generator: createTshirtPreset,
  },
  {
    id: 'cargo-pants',
    name: 'GU Wide-Leg Parachute Pants',
    category: 'Bottoms',
    icon: '👖',
    description: 'Modern relaxed cargo bottoms with elastic waistband, drawcord tie, side utility cargo flap pockets, and wide straight leg silhouette.',
    piecesCount: 2,
    recommendedFabric: 'heavy-denim',
    recommendedColor: '#262626',
    brandInspiration: 'GU Utility Parachute',
    silhouetteType: 'oversized',
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

// ==========================================
// Curated Fashion Color Palettes (Uniqlo/Streetwear Standard)
// ==========================================
export interface FashionColorSwatch {
  id: string;
  name: string;
  hex: string;
  pantoneRef: string;
}

export const FASHION_COLOR_PALETTES: FashionColorSwatch[] = [
  { id: 'washed-charcoal', name: 'Washed Charcoal', hex: '#262626', pantoneRef: '19-3908 TCX' },
  { id: 'vintage-offwhite', name: 'Vintage Off-White', hex: '#f4f1ea', pantoneRef: '11-0601 TCX' },
  { id: 'airism-white', name: 'AIRism Pure White', hex: '#ffffff', pantoneRef: '11-0602 TCX' },
  { id: 'deep-navy', name: 'Deep Indigo Navy', hex: '#1a2332', pantoneRef: '19-3921 TCX' },
  { id: 'olive-drab', name: 'Military Olive Drab', hex: '#3d4a3e', pantoneRef: '18-0527 TCX' },
  { id: 'earth-sand', name: 'Earth Clay Sand', hex: '#c2a68c', pantoneRef: '16-1324 TCX' },
  { id: 'terracotta-rust', name: 'Terracotta Rust', hex: '#9e4732', pantoneRef: '18-1442 TCX' },
  { id: 'sage-green', name: 'Muted Sage Green', hex: '#8b9d83', pantoneRef: '16-0213 TCX' },
  { id: 'heather-grey', name: 'Melange Heather Grey', hex: '#949ba4', pantoneRef: '16-3850 TCX' },
  { id: 'pitch-black', name: 'Pitch Pure Black', hex: '#0f1014', pantoneRef: '19-4004 TCX' },
  { id: 'butter-cream', name: 'Butter Cream Yellow', hex: '#f6e7c1', pantoneRef: '12-0720 TCX' },
  { id: 'burgundy-wine', name: 'Vintage Burgundy', hex: '#5c1d2e', pantoneRef: '19-1725 TCX' },
];

// ==========================================
// Curated Fashion Typography & Fonts
// ==========================================
export interface FashionFontItem {
  id: string;
  name: string;
  family: string;
  category: string;
  previewText: string;
}

export const FASHION_FONTS: FashionFontItem[] = [
  { id: 'gothic-streetwear', name: 'Streetwear Heavy Gothic', family: '"Impact", "Arial Black", sans-serif', category: 'Streetwear Gothic', previewText: 'TOKYO OVERSIZED' },
  { id: 'swiss-sans', name: 'Swiss Minimalist Sans', family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', category: 'Swiss Sans', previewText: 'LIFEWEAR ARCHIVE 2026' },
  { id: 'varsity-block', name: 'Athletic Varsity Block', family: '"Trebuchet MS", "Impact", sans-serif', category: 'Varsity Block', previewText: 'STATE ATHLETICS 98' },
  { id: 'vintage-serif', name: 'Editorial Serif Luxury', family: '"Georgia", "Times New Roman", serif', category: 'Editorial Serif', previewText: 'Atelier de Couture' },
  { id: 'tech-stencil', name: 'Industrial Tech Stencil', family: '"Courier New", monospace', category: 'Tech Stencil', previewText: 'SPEC // 04-240-GSM' },
];

// ==========================================
// Streetwear Graphic & Decal Library
// ==========================================
export interface GraphicPresetItem {
  id: string;
  name: string;
  category: 'streetwear' | 'vintage' | 'minimal' | 'label';
  svg: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const GRAPHIC_PRESETS: GraphicPresetItem[] = [
  {
    id: 'tokyo-box-logo',
    name: 'Tokyo Minimalist Box Stamp',
    category: 'streetwear',
    svg: `<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="196" height="56" fill="#000000" stroke="#ffffff" stroke-width="2"/><text x="100" y="38" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="900" text-anchor="middle" letter-spacing="3">TOKYO / ARCHIVE</text></svg>`,
    defaultWidth: 160,
    defaultHeight: 48,
  },
  {
    id: 'care-label-barcode',
    name: 'Industrial Care Label & Barcode',
    category: 'label',
    svg: `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="120" fill="#ffffff" stroke="#111111" stroke-width="2"/><text x="12" y="22" fill="#111111" font-family="monospace" font-size="10" font-weight="700">100% HEAVY COTTON</text><text x="12" y="38" fill="#111111" font-family="monospace" font-size="8">MADE IN JAPAN // DRY CLEAN</text><rect x="12" y="50" width="4" height="42" fill="#111111"/><rect x="19" y="50" width="2" height="42" fill="#111111"/><rect x="25" y="50" width="6" height="42" fill="#111111"/><rect x="35" y="50" width="2" height="42" fill="#111111"/><rect x="41" y="50" width="5" height="42" fill="#111111"/><rect x="50" y="50" width="3" height="42" fill="#111111"/><rect x="57" y="50" width="7" height="42" fill="#111111"/><rect x="68" y="50" width="2" height="42" fill="#111111"/><rect x="74" y="50" width="4" height="42" fill="#111111"/><rect x="82" y="50" width="6" height="42" fill="#111111"/><rect x="92" y="50" width="3" height="42" fill="#111111"/><rect x="99" y="50" width="5" height="42" fill="#111111"/><rect x="108" y="50" width="2" height="42" fill="#111111"/><rect x="114" y="50" width="6" height="42" fill="#111111"/><rect x="124" y="50" width="4" height="42" fill="#111111"/><rect x="132" y="50" width="3" height="42" fill="#111111"/><rect x="139" y="50" width="6" height="42" fill="#111111"/><text x="80" y="108" fill="#111111" font-family="monospace" font-size="9" text-anchor="middle">2 0 2 6 9 8 7 4 1 0</text></svg>`,
    defaultWidth: 130,
    defaultHeight: 95,
  },
  {
    id: 'vintage-athletics-crest',
    name: 'Varsity Athletics Oval Emblem',
    category: 'vintage',
    svg: `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg"><circle cx="80" cy="80" r="74" fill="none" stroke="#222222" stroke-width="5" stroke-dasharray="4,3"/><circle cx="80" cy="80" r="64" fill="none" stroke="#222222" stroke-width="2"/><text x="80" y="70" fill="#222222" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="middle">98</text><text x="80" y="92" fill="#222222" font-family="sans-serif" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="3">VARSITY</text><text x="80" y="108" fill="#222222" font-family="sans-serif" font-size="8" font-weight="600" text-anchor="middle">ATHLETIC DEPT.</text></svg>`,
    defaultWidth: 120,
    defaultHeight: 120,
  },
  {
    id: 'sun-minimalist',
    name: 'Sol Horizon Geometric Mark',
    category: 'minimal',
    svg: `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg"><path d="M 20 80 A 50 50 0 0 1 120 80 Z" fill="#222222"/><line x1="10" y1="90" x2="130" y2="90" stroke="#222222" stroke-width="3"/><line x1="25" y1="100" x2="115" y2="100" stroke="#222222" stroke-width="2"/><line x1="40" y1="110" x2="100" y2="110" stroke="#222222" stroke-width="2"/></svg>`,
    defaultWidth: 100,
    defaultHeight: 100,
  },
  {
    id: 'cyber-barcode-stamp',
    name: 'Cyberpunk Industrial Serial Tag',
    category: 'streetwear',
    svg: `<svg viewBox="0 0 180 50" xmlns="http://www.w3.org/2000/svg"><rect width="180" height="50" fill="none" stroke="#222222" stroke-width="2"/><text x="10" y="22" fill="#222222" font-family="monospace" font-size="12" font-weight="900">PROJECT: OVERSIZE</text><text x="10" y="38" fill="#555555" font-family="monospace" font-size="9">SERIES 01 // AUTUMN 26</text><text x="165" y="32" fill="#222222" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="end">[*]</text></svg>`,
    defaultWidth: 150,
    defaultHeight: 45,
  },
];

// ==========================================
// Assembled Garment Flat Sketch Definitions
// ==========================================
export interface AssembledGarmentSpec {
  templateId: string;
  name: string;
  hasKangarooPocket?: boolean;
  hasChestPocket?: boolean;
  hasHood?: boolean;
  hasZipper?: boolean;
  hasPoloCollar?: boolean;
  hasCampCollar?: boolean;
  isPants?: boolean;
  isKidsSet?: boolean;
  isBolero?: boolean;
  hasRuching?: boolean;
  hasDrawstrings?: boolean;
  hasPuffSleeves?: boolean;
  halfChestCm: number;
  bodyLengthCm: number;
  shoulderDropCm: number;
  sleeveLengthCm: number;
}

export const ASSEMBLED_GARMENT_SPECS: Record<string, AssembledGarmentSpec> = {
  'sbl-kids-cutbray': {
    templateId: 'sbl-kids-cutbray',
    name: 'SBL Kids Ruched Top & Cutbray Pants',
    isKidsSet: true,
    hasRuching: true,
    hasDrawstrings: true,
    halfChestCm: 36,
    bodyLengthCm: 32,
    shoulderDropCm: 34,
    sleeveLengthCm: 0,
  },
  'cropped-bolero-jacket': {
    templateId: 'cropped-bolero-jacket',
    name: 'Pola Sublim Bolero Shrug (Size S)',
    isBolero: true,
    hasPuffSleeves: true,
    halfChestCm: 48,
    bodyLengthCm: 30,
    shoulderDropCm: 42,
    sleeveLengthCm: 64,
  },
  'uniqlo-u-boxy-tee': {
    templateId: 'uniqlo-u-boxy-tee',
    name: 'Uniqlo U AIRism Boxy Tee',
    halfChestCm: 62,
    bodyLengthCm: 74,
    shoulderDropCm: 56,
    sleeveLengthCm: 26,
  },
  'heavyweight-hoodie': {
    templateId: 'heavyweight-hoodie',
    name: 'GU / Uniqlo Heavy Pullover Hoodie',
    hasKangarooPocket: true,
    hasHood: true,
    halfChestCm: 64,
    bodyLengthCm: 72,
    shoulderDropCm: 58,
    sleeveLengthCm: 62,
  },
  'full-zip-hoodie': {
    templateId: 'full-zip-hoodie',
    name: 'Uniqlo Full-Zip Sweat Hoodie',
    hasKangarooPocket: true,
    hasHood: true,
    hasZipper: true,
    halfChestCm: 63,
    bodyLengthCm: 71,
    shoulderDropCm: 57,
    sleeveLengthCm: 61,
  },
  'coach-jacket': {
    templateId: 'coach-jacket',
    name: 'Uniqlo Utility Coach Jacket',
    hasCampCollar: true,
    hasZipper: true,
    hasChestPocket: true,
    halfChestCm: 61,
    bodyLengthCm: 73,
    shoulderDropCm: 53,
    sleeveLengthCm: 63,
  },
  'pique-polo': {
    templateId: 'pique-polo',
    name: 'Uniqlo Dry Pique Polo Shirt',
    hasPoloCollar: true,
    halfChestCm: 54,
    bodyLengthCm: 71,
    shoulderDropCm: 46,
    sleeveLengthCm: 23,
  },
  'camp-shirt': {
    templateId: 'camp-shirt',
    name: 'Uniqlo Open Collar Vacation Shirt',
    hasCampCollar: true,
    hasChestPocket: true,
    halfChestCm: 59,
    bodyLengthCm: 72,
    shoulderDropCm: 51,
    sleeveLengthCm: 25,
  },
  'tshirt': {
    templateId: 'tshirt',
    name: 'Supima Classic Crewneck Tee',
    halfChestCm: 53,
    bodyLengthCm: 70,
    shoulderDropCm: 45,
    sleeveLengthCm: 22,
  },
  'cargo-pants': {
    templateId: 'cargo-pants',
    name: 'GU Wide-Leg Parachute Pants',
    isPants: true,
    halfChestCm: 42, // waist half width
    bodyLengthCm: 104, // outseam length
    shoulderDropCm: 32, // leg opening
    sleeveLengthCm: 76, // inseam length
  },
};

export function getAssembledSpec(templateId: string): AssembledGarmentSpec {
  return ASSEMBLED_GARMENT_SPECS[templateId] || ASSEMBLED_GARMENT_SPECS['uniqlo-u-boxy-tee'];
}

export function drawSublimationPattern(
  ctx: CanvasRenderingContext2D,
  print: SublimationPrint | undefined,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
) {
  if (!print || print === 'none') return;

  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (w <= 0 || h <= 0) return;

  ctx.save();

  if (print === 'retro-check') {
    // Wavy / distorted Y2K checkerboard (Diana's Page 28 & 46)
    const tileSize = 28;
    for (let x = bounds.minX - tileSize; x < bounds.maxX + tileSize; x += tileSize) {
      for (let y = bounds.minY - tileSize; y < bounds.maxY + tileSize; y += tileSize) {
        const xi = Math.floor((x - bounds.minX) / tileSize);
        const yi = Math.floor((y - bounds.minY) / tileSize);
        if ((xi + yi) % 2 === 0) {
          ctx.fillStyle = 'rgba(192, 132, 252, 0.45)'; // Soft lilac
        } else {
          ctx.fillStyle = 'rgba(125, 211, 252, 0.45)'; // Baby blue
        }
        ctx.beginPath();
        const waveX = Math.sin(y * 0.05) * 4;
        const waveY = Math.cos(x * 0.05) * 4;
        ctx.roundRect(x + waveX, y + waveY, tileSize, tileSize, 4);
        ctx.fill();
      }
    }
  } else if (print === 'meadow-floral') {
    // 70s Retro Meadow Daisy flowers (Diana's Page 46)
    const spacing = 45;
    for (let x = bounds.minX + 15; x < bounds.maxX; x += spacing) {
      for (let y = bounds.minY + 15; y < bounds.maxY; y += spacing) {
        const ox = Math.sin(x * 12.3 + y * 4.1) * 8;
        const oy = Math.cos(y * 9.2 + x * 3.3) * 8;
        const cx = x + ox;
        const cy = y + oy;
        ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(251, 146, 60, 0.6)' : 'rgba(244, 114, 182, 0.6)';
        for (let a = 0; a < 5; a++) {
          const rad = (a * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(rad) * 8, cy + Math.sin(rad) * 8, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();
      }
    }
  } else if (print === 'sunset-ombre') {
    // Airbrush ombré gradient (Diana's Page 46)
    const grad = ctx.createLinearGradient(bounds.minX, bounds.minY, bounds.minX, bounds.maxY);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.55)'); // Sky blue
    grad.addColorStop(0.5, 'rgba(244, 114, 182, 0.55)'); // Pink
    grad.addColorStop(1, 'rgba(192, 132, 252, 0.55)'); // Lavender
    ctx.fillStyle = grad;
    ctx.fillRect(bounds.minX, bounds.minY, w, h);
  } else if (print === 'ocean-marble') {
    // Liquid fluid marble curves (Diana's Page 46)
    for (let y = bounds.minY - 20; y < bounds.maxY + 40; y += 18) {
      ctx.beginPath();
      ctx.moveTo(bounds.minX - 10, y);
      for (let x = bounds.minX; x < bounds.maxX + 20; x += 30) {
        const wave = Math.sin(x * 0.04 + y * 0.08) * 14 + Math.cos(x * 0.08) * 8;
        ctx.lineTo(x, y + wave);
      }
      ctx.strokeStyle = y % 36 === 0 ? 'rgba(29, 78, 216, 0.45)' : 'rgba(2, 132, 199, 0.35)';
      ctx.lineWidth = 6;
      ctx.stroke();
    }
  } else if (print === 'street-stars') {
    // Streetwear graffiti 5-point stars & doodle crosses (Diana's Page 45)
    const step = 50;
    for (let x = bounds.minX + 20; x < bounds.maxX; x += step) {
      for (let y = bounds.minY + 20; y < bounds.maxY; y += step) {
        const ox = Math.sin(x * 7.7) * 10;
        const oy = Math.cos(y * 5.5) * 10;
        const sx = x + ox;
        const sy = y + oy;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate((x + y) * 0.1);
        if ((x + y) % 3 === 0) {
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            const rot = (s * Math.PI * 2) / 5 - Math.PI / 2;
            const r1 = 9;
            const r2 = 4;
            const px1 = Math.cos(rot) * r1;
            const py1 = Math.sin(rot) * r1;
            const rotInner = rot + Math.PI / 5;
            const px2 = Math.cos(rotInner) * r2;
            const py2 = Math.sin(rotInner) * r2;
            if (s === 0) ctx.moveTo(px1, py1);
            else ctx.lineTo(px1, py1);
            ctx.lineTo(px2, py2);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(244, 63, 94, 0.65)';
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-5, 0);
          ctx.lineTo(5, 0);
          ctx.moveTo(0, -5);
          ctx.lineTo(0, 5);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  ctx.restore();
}
