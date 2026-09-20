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
    description: 'Parallel twin topstitching for denim seams, hems, pocket borders, and streetwear tees.',
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
  {
    id: 'topstitch',
    name: 'Edge Topstitch Detail',
    code: 'ISO 101',
    description: 'Crisp aesthetic topstitch run 1/16" or 1/4" from garment seams.',
    defaultSpacingMm: 3.2,
    seamAllowanceMm: 10,
    defaultStrength: 1.2,
    patternLabel: '┈┈┈',
  },
];

export const FABRIC_PRESETS: FabricMaterial[] = [
  {
    id: 'cotton-jersey',
    name: 'Heavyweight Combed Cotton (240 GSM)',
    category: 'Knit',
    color: '#1e293b',
    density: 240,
    stretchStiffness: 0.85,
    bendingStiffness: 0.18,
    friction: 0.45,
    roughness: 0.72,
    metalness: 0.02,
    patternType: 'solid',
    description: 'Premium dense combed cotton jersey with crisp body drape and smooth handfeel.',
  },
  {
    id: 'french-terry',
    name: 'Heavy French Terry Fleece (400 GSM)',
    category: 'Knit',
    color: '#334155',
    density: 400,
    stretchStiffness: 0.78,
    bendingStiffness: 0.38,
    friction: 0.55,
    roughness: 0.82,
    metalness: 0.0,
    patternType: 'rib',
    description: 'Substantial streetwear hoodie loopback fleece with structured drape and shape retention.',
  },
  {
    id: 'tech-ripstop',
    name: 'MA-1 Flight Shell Nylon',
    category: 'Technical',
    color: '#1c3d2e',
    density: 180,
    stretchStiffness: 0.98,
    bendingStiffness: 0.32,
    friction: 0.35,
    roughness: 0.42,
    metalness: 0.18,
    patternType: 'solid',
    description: 'Durable military flight satin nylon with subtle sheen and wind resistance.',
  },
  {
    id: 'heavy-denim',
    name: 'Vintage Raw Indigo Denim (14 oz)',
    category: 'Woven',
    color: '#1e3a8a',
    density: 460,
    stretchStiffness: 0.98,
    bendingStiffness: 0.72,
    friction: 0.65,
    roughness: 0.88,
    metalness: 0.0,
    patternType: 'denim',
    description: 'Rigid selvedge denim with prominent twill structure and sharp architectural creases.',
  },
  {
    id: 'silk-satin',
    name: 'Mulberry Silk Charmeuse',
    category: 'Luxury',
    color: '#be185d',
    density: 95,
    stretchStiffness: 0.94,
    bendingStiffness: 0.02,
    friction: 0.15,
    roughness: 0.22,
    metalness: 0.25,
    patternType: 'solid',
    description: 'Liquid fluid silk satin with luminous highlights and cascading drape.',
  },
  {
    id: 'sport-spandex',
    name: 'Performance 4-Way Spandex',
    category: 'Technical',
    color: '#0284c7',
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
    id: 'pique-cotton',
    name: 'Double Pique Knit (220 GSM)',
    category: 'Knit',
    color: '#1e3a8a',
    density: 220,
    stretchStiffness: 0.82,
    bendingStiffness: 0.24,
    friction: 0.48,
    roughness: 0.75,
    metalness: 0.02,
    patternType: 'grid',
    description: 'Classic honeycomb waffle-textured polo knit with excellent breathability and collar stand.',
  },
];

// ==========================================
// 1. Streetwear Heavyweight Boxy Crewneck Tee (Size L / Unisex)
// True proportions: 72cm length, 58cm chest width, 54cm drop shoulder, 23cm sleeve
// Coordinate scale: 10 units = 1 cm (1 unit = 1 mm)
// ==========================================
export function createTshirtPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  // Front Bodice (Half-width 290mm, Length 720mm from HPS)
  const frontPoints = [
    { id: 'tf0', x: -270, y: -325 }, // Left drop shoulder tip
    { id: 'tf1', x: -90, y: -360 },  // Left neck point (HPS)
    { id: 'tf2', x: -45, y: -315 },  // Front neck curve
    { id: 'tf3', x: 0, y: -270 },    // Center front neck drop (9cm deep)
    { id: 'tf4', x: 45, y: -315 },
    { id: 'tf5', x: 90, y: -360 },   // Right neck point (HPS)
    { id: 'tf6', x: 270, y: -325 },  // Right drop shoulder tip
    { id: 'tf7', x: 275, y: -200 },  // Right armhole curve
    { id: 'tf8', x: 290, y: -70 },   // Right armscye base (underarm)
    { id: 'tf9', x: 285, y: 150 },   // Right waist
    { id: 'tf10', x: 285, y: 360 },  // Right bottom hem
    { id: 'tf11', x: -285, y: 360 }, // Left bottom hem
    { id: 'tf12', x: -285, y: 150 }, // Left waist
    { id: 'tf13', x: -290, y: -70 }, // Left armscye base (underarm)
    { id: 'tf14', x: -275, y: -200 }, // Left armhole curve
  ];

  // Back Bodice (Same chest & shoulder width, high back neckline)
  const backPoints = [
    { id: 'tb0', x: -270, y: -325 },
    { id: 'tb1', x: -90, y: -360 },
    { id: 'tb2', x: 0, y: -332 },    // High back neck curve (2.8cm drop)
    { id: 'tb3', x: 90, y: -360 },
    { id: 'tb4', x: 270, y: -325 },
    { id: 'tb5', x: 275, y: -200 },
    { id: 'tb6', x: 290, y: -70 },
    { id: 'tb7', x: 285, y: 150 },
    { id: 'tb8', x: 285, y: 360 },
    { id: 'tb9', x: -285, y: 360 },
    { id: 'tb10', x: -285, y: 150 },
    { id: 'tb11', x: -290, y: -70 },
    { id: 'tb12', x: -275, y: -200 },
  ];

  // Drop Shoulder Short Sleeve (23cm length, 46cm bicep, 40cm opening)
  const sleeveLPoints = [
    { id: 'tsl0', x: -230, y: -20 }, // Underarm left
    { id: 'tsl1', x: -160, y: -70 },
    { id: 'tsl2', x: 0, y: -110 },   // Sleeve crown apex
    { id: 'tsl3', x: 160, y: -70 },
    { id: 'tsl4', x: 230, y: -20 },  // Underarm right
    { id: 'tsl5', x: 200, y: 120 },  // Hem opening right
    { id: 'tsl6', x: -200, y: 120 }, // Hem opening left
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  // 1x1 Cotton Spandex Crewneck Collar Rib (46cm circumference x 2.8cm height)
  const collarPoints = [
    { id: 'tc0', x: -230, y: -14 },
    { id: 'tc1', x: 230, y: -14 },
    { id: 'tc2', x: 230, y: 14 },
    { id: 'tc3', x: -230, y: 14 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Front Bodice',
      points: frontPoints,
      position: { x: 380, y: 450 },
      rotation: 0,
      color: '#1e293b',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
      graphics: [
        {
          id: 'g-logo',
          name: 'Chest Brandmark',
          type: 'text',
          content: 'OPENCLO ATELIER',
          x: 0,
          y: -140,
          scale: 1.0,
          rotation: 0,
          color: '#ffffff',
          fontSize: 12,
          opacity: 0.95,
        },
      ],
    },
    {
      id: 'piece-back',
      name: 'Back Bodice',
      points: backPoints,
      position: { x: 1040, y: 450 },
      rotation: 0,
      color: '#1e293b',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-collar',
      name: 'Ribbed Crewneck Collar',
      points: collarPoints,
      position: { x: 710, y: 90 },
      rotation: 0,
      color: '#0f172a',
      placement: { origin3D: [0, 0.55, 0.05], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-sleeve-l',
      name: 'Left Sleeve',
      points: sleeveLPoints,
      position: { x: 1650, y: 280 },
      rotation: 0,
      color: '#1e293b',
      placement: { origin3D: [0.35, 0.35, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-sleeve-r',
      name: 'Right Sleeve',
      points: sleeveRPoints,
      position: { x: 1650, y: 680 },
      rotation: 0,
      color: '#1e293b',
      placement: { origin3D: [-0.35, 0.35, 0], rotation3D: [0, 0, Math.PI / 4] },
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
      id: 'seam-collar-front',
      edgeA: { pieceId: 'piece-collar', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-front', edgeIndex: 2 },
      strength: 1.0,
      stitchType: 'double-needle',
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
      edgeA: { pieceId: 'piece-front', edgeIndex: 12 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 10 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-sleeve-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 14 },
      edgeB: { pieceId: 'piece-sleeve-l', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-sleeve-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 6 },
      edgeB: { pieceId: 'piece-sleeve-r', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 2. Heavyweight Boxy Streetwear Pullover Hoodie
// True proportions: 70cm length, 62cm chest, 60cm long sleeves, kangaroo pocket, 38cm hood
// ==========================================
export function createHoodiePreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'hf0', x: -290, y: -320 },
    { id: 'hf1', x: -100, y: -350 },
    { id: 'hf2', x: 0, y: -260 },
    { id: 'hf3', x: 100, y: -350 },
    { id: 'hf4', x: 290, y: -320 },
    { id: 'hf5', x: 305, y: -190 },
    { id: 'hf6', x: 310, y: -50 },
    { id: 'hf7', x: 310, y: 285 },
    { id: 'hf8', x: 270, y: 350 },
    { id: 'hf9', x: -270, y: 350 },
    { id: 'hf10', x: -310, y: 285 },
    { id: 'hf11', x: -310, y: -50 },
    { id: 'hf12', x: -305, y: -190 },
  ];

  const backPoints = [
    { id: 'hb0', x: -290, y: -320 },
    { id: 'hb1', x: -100, y: -350 },
    { id: 'hb2', x: 0, y: -330 },
    { id: 'hb3', x: 100, y: -350 },
    { id: 'hb4', x: 290, y: -320 },
    { id: 'hb5', x: 305, y: -190 },
    { id: 'hb6', x: 310, y: -50 },
    { id: 'hb7', x: 310, y: 285 },
    { id: 'hb8', x: 270, y: 350 },
    { id: 'hb9', x: -270, y: 350 },
    { id: 'hb10', x: -310, y: 285 },
    { id: 'hb11', x: -310, y: -50 },
    { id: 'hb12', x: -305, y: -190 },
  ];

  const pocketPoints = [
    { id: 'hpk0', x: -120, y: -105 },
    { id: 'hpk1', x: 120, y: -105 },
    { id: 'hpk2', x: 170, y: 0 },
    { id: 'hpk3', x: 170, y: 105 },
    { id: 'hpk4', x: -170, y: 105 },
    { id: 'hpk5', x: -170, y: 0 },
  ];

  const sleeveLPoints = [
    { id: 'hsl0', x: -240, y: -200 },
    { id: 'hsl1', x: 0, y: -280 },
    { id: 'hsl2', x: 240, y: -200 },
    { id: 'hsl3', x: 120, y: 320 },
    { id: 'hsl4', x: -120, y: 320 },
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  const hoodPoints = [
    { id: 'hhd0', x: -140, y: -190 },
    { id: 'hhd1', x: 60, y: -190 },
    { id: 'hhd2', x: 140, y: -100 },
    { id: 'hhd3', x: 130, y: 150 },
    { id: 'hhd4', x: -40, y: 190 },
    { id: 'hhd5', x: -140, y: 100 },
    { id: 'hhd6', x: -160, y: 0 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Hoodie Front Torso',
      points: frontPoints,
      position: { x: 390, y: 460 },
      rotation: 0,
      color: '#334155',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
      graphics: [
        {
          id: 'g-hoodie-print',
          name: 'Chest Minimal Print',
          type: 'text',
          content: 'OPENCLO HEAVY FLEECE',
          x: 0,
          y: -110,
          scale: 1.0,
          rotation: 0,
          color: '#f8fafc',
          fontSize: 11,
          opacity: 0.9,
        },
      ],
    },
    {
      id: 'piece-back',
      name: 'Hoodie Back Torso',
      points: backPoints,
      position: { x: 1060, y: 460 },
      rotation: 0,
      color: '#334155',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-pocket',
      name: 'Kangaroo Pocket',
      points: pocketPoints,
      position: { x: 390, y: 560 },
      rotation: 0,
      color: '#1e293b',
      placement: { origin3D: [0, 0.15, 0.20], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-hood',
      name: 'Double Hood Panel',
      points: hoodPoints,
      position: { x: 720, y: 120 },
      rotation: 0,
      color: '#334155',
      placement: { origin3D: [0, 0.75, 0], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-sleeve-l',
      name: 'Left Long Sleeve',
      points: sleeveLPoints,
      position: { x: 1680, y: 290 },
      rotation: 0,
      color: '#334155',
      placement: { origin3D: [0.38, 0.32, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-sleeve-r',
      name: 'Right Long Sleeve',
      points: sleeveRPoints,
      position: { x: 1680, y: 730 },
      rotation: 0,
      color: '#334155',
      placement: { origin3D: [-0.38, 0.32, 0], rotation3D: [0, 0, Math.PI / 4] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-hoodie-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-hoodie-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'double-needle',
    },
    {
      id: 'seam-hoodie-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 6 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-hoodie-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 10 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 10 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 3. MA-1 Flight Zip Bomber Jacket
// True proportions: 67cm length, 60cm chest, split front panels with center zipper fly
// ==========================================
export function createBomberJacketPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontLPoints = [
    { id: 'bjfl0', x: -150, y: -300 },
    { id: 'bjfl1', x: -50, y: -335 },
    { id: 'bjfl2', x: 0, y: -260 },
    { id: 'bjfl3', x: 0, y: 335 },
    { id: 'bjfl4', x: -150, y: 335 },
    { id: 'bjfl5', x: -150, y: -50 },
    { id: 'bjfl6', x: -145, y: -190 },
  ];

  const frontRPoints = [
    { id: 'bjfr0', x: 0, y: -260 },
    { id: 'bjfr1', x: 50, y: -335 },
    { id: 'bjfr2', x: 150, y: -300 },
    { id: 'bjfr3', x: 145, y: -190 },
    { id: 'bjfr4', x: 150, y: -50 },
    { id: 'bjfr5', x: 150, y: 335 },
    { id: 'bjfr6', x: 0, y: 335 },
  ];

  const backPoints = [
    { id: 'bjb0', x: -280, y: -300 },
    { id: 'bjb1', x: -90, y: -335 },
    { id: 'bjb2', x: 0, y: -315 },
    { id: 'bjb3', x: 90, y: -335 },
    { id: 'bjb4', x: 280, y: -300 },
    { id: 'bjb5', x: 295, y: -190 },
    { id: 'bjb6', x: 300, y: -50 },
    { id: 'bjb7', x: 290, y: 335 },
    { id: 'bjb8', x: -290, y: 335 },
    { id: 'bjb9', x: -300, y: -50 },
    { id: 'bjb10', x: -295, y: -190 },
  ];

  const sleeveLPoints = [
    { id: 'bjs0', x: -230, y: -200 },
    { id: 'bjs1', x: 0, y: -280 },
    { id: 'bjs2', x: 230, y: -200 },
    { id: 'bjs3', x: 125, y: 310 },
    { id: 'bjs4', x: -125, y: 310 },
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  const collarPoints = [
    { id: 'bjc0', x: -210, y: -25 },
    { id: 'bjc1', x: 210, y: -25 },
    { id: 'bjc2', x: 210, y: 25 },
    { id: 'bjc3', x: -210, y: 25 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-bomber-front-l',
      name: 'Left Front Zip Panel',
      points: frontLPoints,
      position: { x: 260, y: 450 },
      rotation: 0,
      color: '#1c3d2e',
      placement: { origin3D: [0.15, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-bomber-front-r',
      name: 'Right Front Zip Panel',
      points: frontRPoints,
      position: { x: 580, y: 450 },
      rotation: 0,
      color: '#1c3d2e',
      placement: { origin3D: [-0.15, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-bomber-back',
      name: 'Bomber Back Panel',
      points: backPoints,
      position: { x: 1120, y: 450 },
      rotation: 0,
      color: '#1c3d2e',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-collar',
      name: 'Baseball Ribbed Collar',
      points: collarPoints,
      position: { x: 840, y: 90 },
      rotation: 0,
      color: '#0f241a',
      placement: { origin3D: [0, 0.55, 0.05], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-bomber-sleeve-l',
      name: 'Left Flight Sleeve',
      points: sleeveLPoints,
      position: { x: 1720, y: 280 },
      rotation: 0,
      color: '#1c3d2e',
      placement: { origin3D: [0.38, 0.32, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-bomber-sleeve-r',
      name: 'Right Flight Sleeve',
      points: sleeveRPoints,
      position: { x: 1720, y: 720 },
      rotation: 0,
      color: '#1c3d2e',
      placement: { origin3D: [-0.38, 0.32, 0], rotation3D: [0, 0, Math.PI / 4] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-bomber-zip',
      edgeA: { pieceId: 'piece-bomber-front-l', edgeIndex: 2 },
      edgeB: { pieceId: 'piece-bomber-front-r', edgeIndex: 5 },
      strength: 1.0,
      stitchType: 'topstitch',
    },
    {
      id: 'seam-bomber-shoulder-l',
      edgeA: { pieceId: 'piece-bomber-front-l', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-bomber-back', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-bomber-shoulder-r',
      edgeA: { pieceId: 'piece-bomber-front-r', edgeIndex: 1 },
      edgeB: { pieceId: 'piece-bomber-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-bomber-side-l',
      edgeA: { pieceId: 'piece-bomber-front-l', edgeIndex: 4 },
      edgeB: { pieceId: 'piece-bomber-back', edgeIndex: 8 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-bomber-side-r',
      edgeA: { pieceId: 'piece-bomber-front-r', edgeIndex: 4 },
      edgeB: { pieceId: 'piece-bomber-back', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 4. Classic Pique Polo Shirt
// True proportions: 72cm length, 54cm chest, 3-button placket, knit turnover collar
// ==========================================
export function createPoloPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'pf0', x: -240, y: -330 },
    { id: 'pf1', x: -80, y: -360 },
    { id: 'pf2', x: -20, y: -320 },
    { id: 'pf3', x: -20, y: -180 },
    { id: 'pf4', x: 20, y: -180 },
    { id: 'pf5', x: 20, y: -320 },
    { id: 'pf6', x: 80, y: -360 },
    { id: 'pf7', x: 240, y: -330 },
    { id: 'pf8', x: 255, y: -200 },
    { id: 'pf9', x: 270, y: -70 },
    { id: 'pf10', x: 265, y: 360 },
    { id: 'pf11', x: -265, y: 360 },
    { id: 'pf12', x: -270, y: -70 },
    { id: 'pf13', x: -255, y: -200 },
  ];

  const backPoints = [
    { id: 'pb0', x: -240, y: -330 },
    { id: 'pb1', x: -80, y: -360 },
    { id: 'pb2', x: 0, y: -335 },
    { id: 'pb3', x: 80, y: -360 },
    { id: 'pb4', x: 240, y: -330 },
    { id: 'pb5', x: 255, y: -200 },
    { id: 'pb6', x: 270, y: -70 },
    { id: 'pb7', x: 265, y: 380 },
    { id: 'pb8', x: -265, y: 380 },
    { id: 'pb9', x: -270, y: -70 },
    { id: 'pb10', x: -255, y: -200 },
  ];

  const sleeveLPoints = [
    { id: 'psl0', x: -220, y: -20 },
    { id: 'psl1', x: 0, y: -110 },
    { id: 'psl2', x: 220, y: -20 },
    { id: 'psl3', x: 180, y: 110 },
    { id: 'psl4', x: -180, y: 110 },
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  const collarPoints = [
    { id: 'pc0', x: -220, y: -35 },
    { id: 'pc1', x: 220, y: -35 },
    { id: 'pc2', x: 200, y: 35 },
    { id: 'pc3', x: -200, y: 35 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Polo Front Bodice',
      points: frontPoints,
      position: { x: 380, y: 450 },
      rotation: 0,
      color: '#1e3a8a',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Polo Back Bodice',
      points: backPoints,
      position: { x: 1040, y: 450 },
      rotation: 0,
      color: '#1e3a8a',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-collar',
      name: 'Turnover Knit Collar',
      points: collarPoints,
      position: { x: 710, y: 90 },
      rotation: 0,
      color: '#172554',
      placement: { origin3D: [0, 0.55, 0.05], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-sleeve-l',
      name: 'Left Short Sleeve',
      points: sleeveLPoints,
      position: { x: 1650, y: 280 },
      rotation: 0,
      color: '#1e3a8a',
      placement: { origin3D: [0.35, 0.35, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-sleeve-r',
      name: 'Right Short Sleeve',
      points: sleeveRPoints,
      position: { x: 1650, y: 680 },
      rotation: 0,
      color: '#1e3a8a',
      placement: { origin3D: [-0.35, 0.35, 0], rotation3D: [0, 0, Math.PI / 4] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-polo-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-polo-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 6 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-polo-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 11 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 8 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-polo-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 9 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 5. Athletic Muscle Tank Top
// True proportions: 70cm length, 50cm chest, deep scoop neck, racerback cut
// ==========================================
export function createTankTopPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'tf0', x: -140, y: -330 },
    { id: 'tf1', x: -80, y: -350 },
    { id: 'tf2', x: 0, y: -220 },
    { id: 'tf3', x: 80, y: -350 },
    { id: 'tf4', x: 140, y: -330 },
    { id: 'tf5', x: 150, y: -190 },
    { id: 'tf6', x: 250, y: -70 },
    { id: 'tf7', x: 245, y: 350 },
    { id: 'tf8', x: -245, y: 350 },
    { id: 'tf9', x: -250, y: -70 },
    { id: 'tf10', x: -150, y: -190 },
  ];

  const backPoints = [
    { id: 'tb0', x: -140, y: -330 },
    { id: 'tb1', x: -80, y: -350 },
    { id: 'tb2', x: 0, y: -300 },
    { id: 'tb3', x: 80, y: -350 },
    { id: 'tb4', x: 140, y: -330 },
    { id: 'tb5', x: 120, y: -190 },
    { id: 'tb6', x: 250, y: -70 },
    { id: 'tb7', x: 245, y: 350 },
    { id: 'tb8', x: -245, y: 350 },
    { id: 'tb9', x: -250, y: -70 },
    { id: 'tb10', x: -120, y: -190 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Tank Front Panel',
      points: frontPoints,
      position: { x: 420, y: 440 },
      rotation: 0,
      color: '#0284c7',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Racerback Panel',
      points: backPoints,
      position: { x: 1060, y: 440 },
      rotation: 0,
      color: '#0284c7',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-tank-strap-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'flatlock',
    },
    {
      id: 'seam-tank-strap-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'flatlock',
    },
    {
      id: 'seam-tank-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 8 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 8 },
      strength: 1.0,
      stitchType: 'flatlock',
    },
    {
      id: 'seam-tank-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 6 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'flatlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 6. Modern Boxy Cropped Streetwear Tee
// True proportions: 46cm cropped length, 56cm relaxed boxy cut, drop shoulder
// ==========================================
export function createCropTopPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'cf0', x: -260, y: -230 },
    { id: 'cf1', x: -85, y: -260 },
    { id: 'cf2', x: 0, y: -190 },
    { id: 'cf3', x: 85, y: -260 },
    { id: 'cf4', x: 260, y: -230 },
    { id: 'cf5', x: 275, y: -110 },
    { id: 'cf6', x: 280, y: 0 },
    { id: 'cf7', x: 275, y: 200 },
    { id: 'cf8', x: -275, y: 200 },
    { id: 'cf9', x: -280, y: 0 },
    { id: 'cf10', x: -275, y: -110 },
  ];

  const backPoints = [
    { id: 'cb0', x: -260, y: -230 },
    { id: 'cb1', x: -85, y: -260 },
    { id: 'cb2', x: 0, y: -240 },
    { id: 'cb3', x: 85, y: -260 },
    { id: 'cb4', x: 260, y: -230 },
    { id: 'cb5', x: 275, y: -110 },
    { id: 'cb6', x: 280, y: 0 },
    { id: 'cb7', x: 275, y: 200 },
    { id: 'cb8', x: -275, y: 200 },
    { id: 'cb9', x: -280, y: 0 },
    { id: 'cb10', x: -275, y: -110 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Cropped Front Bodice',
      points: frontPoints,
      position: { x: 420, y: 380 },
      rotation: 0,
      color: '#475569',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Cropped Back Bodice',
      points: backPoints,
      position: { x: 1060, y: 380 },
      rotation: 0,
      color: '#475569',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-crop-shoulder-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 0 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 0 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-crop-shoulder-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'single-needle',
    },
    {
      id: 'seam-crop-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 8 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 8 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-crop-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 6 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 7. Vintage Skate Drop-Shoulder Oversized Tee
// True proportions: 76cm longline, 64cm chest, 60cm drop shoulder
// ==========================================
export function createOversizedTeePreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'of0', x: -300, y: -340 },
    { id: 'of1', x: -95, y: -380 },
    { id: 'of2', x: 0, y: -290 },
    { id: 'of3', x: 95, y: -380 },
    { id: 'of4', x: 300, y: -340 },
    { id: 'of5', x: 310, y: -200 },
    { id: 'of6', x: 320, y: -50 },
    { id: 'of7', x: 320, y: 380 },
    { id: 'of8', x: -320, y: 380 },
    { id: 'of9', x: -320, y: -50 },
    { id: 'of10', x: -310, y: -200 },
  ];

  const backPoints = [
    { id: 'ob0', x: -300, y: -340 },
    { id: 'ob1', x: -95, y: -380 },
    { id: 'ob2', x: 0, y: -350 },
    { id: 'ob3', x: 95, y: -380 },
    { id: 'ob4', x: 300, y: -340 },
    { id: 'ob5', x: 310, y: -200 },
    { id: 'ob6', x: 320, y: -50 },
    { id: 'ob7', x: 320, y: 380 },
    { id: 'ob8', x: -320, y: 380 },
    { id: 'ob9', x: -320, y: -50 },
    { id: 'ob10', x: -310, y: -200 },
  ];

  const sleeveLPoints = [
    { id: 'osl0', x: -250, y: -20 },
    { id: 'osl1', x: 0, y: -90 },
    { id: 'osl2', x: 250, y: -20 },
    { id: 'osl3', x: 220, y: 150 },
    { id: 'osl4', x: -220, y: 150 },
  ];

  const sleeveRPoints = JSON.parse(JSON.stringify(sleeveLPoints));

  const collarPoints = [
    { id: 'oc0', x: -240, y: -16 },
    { id: 'oc1', x: 240, y: -16 },
    { id: 'oc2', x: 240, y: 16 },
    { id: 'oc3', x: -240, y: 16 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Oversized Front Bodice',
      points: frontPoints,
      position: { x: 400, y: 460 },
      rotation: 0,
      color: '#292524',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
      graphics: [
        {
          id: 'g-skate',
          name: 'Vintage Skate Print',
          type: 'text',
          content: 'HEAVYWEIGHT OVERSIZED',
          x: 0,
          y: -130,
          scale: 1.0,
          rotation: 0,
          color: '#e7e5e4',
          fontSize: 12,
          opacity: 0.9,
        },
      ],
    },
    {
      id: 'piece-back',
      name: 'Oversized Back Bodice',
      points: backPoints,
      position: { x: 1080, y: 460 },
      rotation: 0,
      color: '#292524',
      placement: { origin3D: [0, 0.4, -0.10], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-collar',
      name: 'Thick Crewneck Rib',
      points: collarPoints,
      position: { x: 740, y: 90 },
      rotation: 0,
      color: '#1c1917',
      placement: { origin3D: [0, 0.55, 0.05], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-sleeve-l',
      name: 'Left Oversized Sleeve',
      points: sleeveLPoints,
      position: { x: 1720, y: 280 },
      rotation: 0,
      color: '#292524',
      placement: { origin3D: [0.35, 0.35, 0], rotation3D: [0, 0, -Math.PI / 4] },
    },
    {
      id: 'piece-sleeve-r',
      name: 'Right Oversized Sleeve',
      points: sleeveRPoints,
      position: { x: 1720, y: 720 },
      rotation: 0,
      color: '#292524',
      placement: { origin3D: [-0.35, 0.35, 0], rotation3D: [0, 0, Math.PI / 4] },
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
      id: 'seam-over-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 8 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 8 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-over-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 6 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 8. Casual Summer A-Line Dress
// True proportions: 94cm length, tailored waist, flowing flared hemline
// ==========================================
export function createDressPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'df0', x: -160, y: -450 },
    { id: 'df1', x: -80, y: -470 },
    { id: 'df2', x: 0, y: -380 },
    { id: 'df3', x: 80, y: -470 },
    { id: 'df4', x: 160, y: -450 },
    { id: 'df5', x: 175, y: -320 },
    { id: 'df6', x: 240, y: -200 },
    { id: 'df7', x: 210, y: -50 },
    { id: 'df8', x: 360, y: 470 },
    { id: 'df9', x: -360, y: 470 },
    { id: 'df10', x: -210, y: -50 },
    { id: 'df11', x: -240, y: -200 },
    { id: 'df12', x: -175, y: -320 },
  ];

  const backPoints = [
    { id: 'db0', x: -160, y: -450 },
    { id: 'db1', x: -80, y: -470 },
    { id: 'db2', x: 0, y: -440 },
    { id: 'db3', x: 80, y: -470 },
    { id: 'db4', x: 160, y: -450 },
    { id: 'db5', x: 175, y: -320 },
    { id: 'db6', x: 240, y: -200 },
    { id: 'db7', x: 210, y: -50 },
    { id: 'db8', x: 360, y: 470 },
    { id: 'db9', x: -360, y: 470 },
    { id: 'db10', x: -210, y: -50 },
    { id: 'db11', x: -240, y: -200 },
    { id: 'db12', x: -175, y: -320 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front',
      name: 'Dress Front Panel',
      points: frontPoints,
      position: { x: 440, y: 520 },
      rotation: 0,
      color: '#be185d',
      placement: { origin3D: [0, 0.4, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back',
      name: 'Dress Back Panel',
      points: backPoints,
      position: { x: 1140, y: 520 },
      rotation: 0,
      color: '#be185d',
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
      id: 'seam-dress-side-l',
      edgeA: { pieceId: 'piece-front', edgeIndex: 9 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 9 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-dress-side-r',
      edgeA: { pieceId: 'piece-front', edgeIndex: 7 },
      edgeB: { pieceId: 'piece-back', edgeIndex: 7 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// 9. Flared A-Line Midi Skirt
// True proportions: 76cm length, 36cm flat waistband, 88cm flared hem
// ==========================================
export function createSkirtPreset(): { pieces: PatternPiece[]; seams: SeamConnection[] } {
  const frontPoints = [
    { id: 'sf0', x: -180, y: -380 },
    { id: 'sf1', x: 0, y: -370 },
    { id: 'sf2', x: 180, y: -380 },
    { id: 'sf3', x: 240, y: -200 },
    { id: 'sf4', x: 440, y: 380 },
    { id: 'sf5', x: 0, y: 395 },
    { id: 'sf6', x: -440, y: 380 },
    { id: 'sf7', x: -240, y: -200 },
  ];

  const backPoints = [
    { id: 'sb0', x: -180, y: -380 },
    { id: 'sb1', x: 0, y: -370 },
    { id: 'sb2', x: 180, y: -380 },
    { id: 'sb3', x: 240, y: -200 },
    { id: 'sb4', x: 440, y: 380 },
    { id: 'sb5', x: 0, y: 395 },
    { id: 'sb6', x: -440, y: 380 },
    { id: 'sb7', x: -240, y: -200 },
  ];

  const waistbandPoints = [
    { id: 'sw0', x: -180, y: -20 },
    { id: 'sw1', x: 180, y: -20 },
    { id: 'sw2', x: 180, y: 20 },
    { id: 'sw3', x: -180, y: 20 },
  ];

  const pieces: PatternPiece[] = [
    {
      id: 'piece-front-skirt',
      name: 'Front Skirt Flare',
      points: frontPoints,
      position: { x: 480, y: 480 },
      rotation: 0,
      color: '#b45309',
      placement: { origin3D: [0, 0, 0.16], rotation3D: [0, 0, 0] },
    },
    {
      id: 'piece-back-skirt',
      name: 'Back Skirt Flare',
      points: backPoints,
      position: { x: 1180, y: 480 },
      rotation: 0,
      color: '#b45309',
      placement: { origin3D: [0, 0, -0.10], rotation3D: [0, Math.PI, 0] },
    },
    {
      id: 'piece-waistband',
      name: 'Elastic Waistband Band',
      points: waistbandPoints,
      position: { x: 830, y: 80 },
      rotation: 0,
      color: '#78350f',
      placement: { origin3D: [0, 0.2, 0.05], rotation3D: [0, 0, 0] },
    },
  ];

  const seams: SeamConnection[] = [
    {
      id: 'seam-skirt-side-l',
      edgeA: { pieceId: 'piece-front-skirt', edgeIndex: 6 },
      edgeB: { pieceId: 'piece-back-skirt', edgeIndex: 6 },
      strength: 1.0,
      stitchType: 'overlock',
    },
    {
      id: 'seam-skirt-side-r',
      edgeA: { pieceId: 'piece-front-skirt', edgeIndex: 3 },
      edgeB: { pieceId: 'piece-back-skirt', edgeIndex: 3 },
      strength: 1.0,
      stitchType: 'overlock',
    },
  ];

  return { pieces, seams };
}

// ==========================================
// Garment Template Catalog
// ==========================================
export interface GarmentTemplate {
  id: string;
  name: string;
  category: 'Tops' | 'Outerwear' | 'Dresses' | 'Skirts';
  icon: string;
  description: string;
  piecesCount: number;
  recommendedFabric: string;
  recommendedColor: string;
  generator: () => { pieces: PatternPiece[]; seams: SeamConnection[] };
}

export const GARMENT_TEMPLATES: GarmentTemplate[] = [
  {
    id: 'tshirt',
    name: 'Streetwear Boxy Tee',
    category: 'Tops',
    icon: '👕',
    description: 'Authentic 240 GSM heavyweight boxy drop-shoulder tee with 72cm length, 58cm chest, twin-needle hems and ribbed collar.',
    piecesCount: 5,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#1e293b',
    generator: createTshirtPreset,
  },
  {
    id: 'hoodie',
    name: 'Heavyweight Boxy Hoodie',
    category: 'Outerwear',
    icon: '🧥',
    description: '400 GSM fleece streetwear pullover with 60cm full long sleeves, ribbed cuffs, authentic kangaroo pocket, and double-layer hood.',
    piecesCount: 6,
    recommendedFabric: 'french-terry',
    recommendedColor: '#334155',
    generator: createHoodiePreset,
  },
  {
    id: 'bomber',
    name: 'MA-1 Flight Bomber Jacket',
    category: 'Outerwear',
    icon: '🧥',
    description: 'Military flight jacket with split front zip panels, gathered long sleeves, baseball varsity collar, and ribbed waistband.',
    piecesCount: 6,
    recommendedFabric: 'tech-ripstop',
    recommendedColor: '#1c3d2e',
    generator: createBomberJacketPreset,
  },
  {
    id: 'polo',
    name: 'Classic Pique Polo Shirt',
    category: 'Tops',
    icon: '👔',
    description: '3-button placket polo with flat-knit turnover collar, ribbed armbands, and tennis dropped-tail side vents.',
    piecesCount: 5,
    recommendedFabric: 'pique-cotton',
    recommendedColor: '#1e3a8a',
    generator: createPoloPreset,
  },
  {
    id: 'oversized',
    name: 'Vintage Skate Oversized Tee',
    category: 'Tops',
    icon: '👕',
    description: '76cm longline skate aesthetic with deep drop-shoulder cut, 64cm wide chest, and elbow-grazing short sleeves.',
    piecesCount: 5,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#292524',
    generator: createOversizedTeePreset,
  },
  {
    id: 'croptop',
    name: 'Boxy Cropped Streetwear Tee',
    category: 'Tops',
    icon: '👚',
    description: 'Clean 46cm cropped length ending right at the natural waistline with relaxed boxy drop shoulders.',
    piecesCount: 2,
    recommendedFabric: 'cotton-jersey',
    recommendedColor: '#475569',
    generator: createCropTopPreset,
  },
  {
    id: 'tanktop',
    name: 'Athletic Muscle Tank Top',
    category: 'Tops',
    icon: '🎽',
    description: 'Racerback-styled athletic sleeveless tank with deep scoop neck and flatlock stretch seams.',
    piecesCount: 2,
    recommendedFabric: 'sport-spandex',
    recommendedColor: '#0284c7',
    generator: createTankTopPreset,
  },
  {
    id: 'dress',
    name: 'Summer A-Line Dress',
    category: 'Dresses',
    icon: '👗',
    description: 'Flowing feminine silhouette with fitted bust, tailored waist, and flared hemline.',
    piecesCount: 2,
    recommendedFabric: 'silk-satin',
    recommendedColor: '#be185d',
    generator: createDressPreset,
  },
  {
    id: 'skirt',
    name: 'Flared A-Line Midi Skirt',
    category: 'Skirts',
    icon: '👗',
    description: 'High-waisted flared skirt with natural circular drapery folds and hem flare.',
    piecesCount: 3,
    recommendedFabric: 'silk-satin',
    recommendedColor: '#b45309',
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

  const width = Math.max(100, maxX - minX + 80);
  const height = Math.max(100, maxY - minY + 80);
  const ox = minX - 40;
  const oy = minY - 40;

  const svgPaths = pieces.map(p => {
    const d = p.points.map((pt, i) => {
      const wx = p.position.x + pt.x - ox;
      const wy = p.position.y + pt.y - oy;
      return `${i === 0 ? 'M' : 'L'} ${wx.toFixed(1)} ${wy.toFixed(1)}`;
    }).join(' ') + ' Z';

    return `<path d="${d}" fill="${p.color || '#e2e8f0'}" fill-opacity="0.25" stroke="#0f172a" stroke-width="2" stroke-linejoin="round" />
    <text x="${(p.position.x - ox).toFixed(1)}" y="${(p.position.y - oy).toFixed(1)}" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#0f172a" text-anchor="middle">${p.name}</text>`;
  }).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width.toFixed(0)}mm" height="${height.toFixed(0)}mm" viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}" xmlns="http://www.w3.org/2000/svg">
  <!-- OpenCLO Fashion CAD Technical Pattern Export -->
  <rect width="100%" height="100%" fill="#ffffff" />
  ${svgPaths}
</svg>`;
}
