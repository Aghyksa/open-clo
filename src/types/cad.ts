export interface Point2D {
  id: string;
  x: number;
  y: number;
}

export interface SeamEdge {
  pieceId: string;
  edgeIndex: number; // Index of the start point of the segment in points array
}

export type StitchType =
  | 'single-needle'
  | 'double-needle'
  | 'overlock'
  | 'flatlock'
  | 'zigzag'
  | 'saddle';

export interface SeamConnection {
  id: string;
  edgeA: SeamEdge;
  edgeB: SeamEdge;
  strength: number; // Sewing pull strength
  stitchType?: StitchType;
  threadColor?: string;
  seamAllowanceMm?: number;
}

export interface GraphicLayer {
  id: string;
  name: string;
  type: 'text' | 'logo' | 'shape';
  content: string; // text or label or svg
  x: number; // relative to piece center
  y: number;
  scale: number;
  rotation: number; // in radians
  color: string;
  fontSize?: number;
  opacity: number;
}

export interface InternalLine {
  id: string;
  type: 'dart' | 'fold' | 'cut' | 'pocket';
  points: Point2D[];
}

export interface PatternPiece {
  id: string;
  name: string;
  points: Point2D[];
  position: { x: number; y: number };
  rotation: number; // In radians
  color?: string;
  locked?: boolean;
  visible?: boolean;
  // 3D initial placement hints around avatar
  placement: {
    origin3D: [number, number, number]; // [x, y, z]
    rotation3D: [number, number, number];
    curved?: boolean;
    curveRadius?: number;
  };
  internalLines?: InternalLine[];
  graphics?: GraphicLayer[];
}

export interface FabricMaterial {
  id: string;
  name: string;
  category?: 'Knit' | 'Woven' | 'Denim' | 'Luxury' | 'Technical' | 'Leather';
  color: string;
  density: number; // g/m² - Affects gravity weight
  stretchStiffness: number; // 0.1 (very stretchy) to 1.0 (rigid canvas)
  bendingStiffness: number; // 0.01 (flowing silk) to 0.8 (thick leather)
  friction: number; // Surface friction against avatar
  roughness: number;
  metalness: number;
  patternType?: 'solid' | 'grid' | 'stripes' | 'denim' | 'fleece' | 'rib';
  description?: string;
}

export type CadTool =
  | 'select'    // V: Move & Transform (scale, rotate with Photoshop-like bounding box)
  | 'vertex'    // A: Direct Select / Move vertex
  | 'pen'       // P: Add point on edge
  | 'curve'     // C: Curvature tool (bend edge)
  | 'sew'       // S: Virtual Sewing tool
  | 'move'      // H: Pan Viewport
  | 'measure'   // M: Measure edge segment
  | 'graphic';  // T: Add artwork / graphic stamp

export interface AvatarConfig {
  gender: 'female' | 'male';
  height: number; // cm
  chestCircumference: number; // cm
  waistCircumference: number; // cm
  hipsCircumference: number; // cm
  shoulderWidth?: number; // cm
  showSkin: boolean;
}

export interface Avatar2DConfig {
  visible: boolean;
  view: 'front' | 'back' | 'both';
  opacity: number; // 0.1 to 1.0
  showGuides: boolean; // bust, waist, hips reference lines
  position: { x: number; y: number };
}

export interface StitchSettings {
  defaultType: StitchType;
  defaultColor: string;
  showStitches: boolean;
  seamAllowanceMm: number;
}

export interface CloProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  pieces: PatternPiece[];
  seams: SeamConnection[];
  currentMaterial: FabricMaterial;
  customColor: string;
  avatar: AvatarConfig;
  avatar2D: Avatar2DConfig;
  stitchSettings: StitchSettings;
}

export type ViewportLayout = 'dual' | 'pattern-only' | '3d-only';
