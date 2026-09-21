export interface Point2D {
  id: string;
  x: number;
  y: number;
}

// Bezier curvature stored per edge (edge i = from point[i] to point[(i+1) % n])
// Control point offsets are relative to the edge midpoint, in local piece coordinates
export interface EdgeCurvature {
  cpx: number; // control point X offset from edge midpoint
  cpy: number; // control point Y offset from edge midpoint
}

export interface SeamEdge {
  pieceId: string;
  edgeIndex: number; // Index of the start point of the segment in points array
  paramStart?: number; // 0-1 parameter along edge for partial seam start (free-sew)
  paramEnd?: number;   // 0-1 parameter along edge for partial seam end (free-sew)
}

export type StitchType =
  | 'single-needle'
  | 'double-needle'
  | 'overlock'
  | 'flatlock'
  | 'zigzag'
  | 'saddle'
  | 'topstitch';

export interface SeamConnection {
  id: string;
  edgeA: SeamEdge;
  edgeB: SeamEdge;
  strength: number; // Sewing pull strength
  stitchType?: StitchType;
  threadColor?: string;
  seamAllowanceMm?: number;
  reversed?: boolean; // Direction reversed (shown via notch direction)
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

export interface PatternNotch {
  edgeIndex: number;
  param: number; // 0.0 to 1.0 along edge
  type?: 'single' | 'double';
}

export type SublimationPrint =
  | 'none'
  | 'retro-check'
  | 'meadow-floral'
  | 'sunset-ombre'
  | 'ocean-marble'
  | 'street-stars';

export interface PatternPiece {
  id: string;
  name: string;
  points: Point2D[];
  edgeCurvatures?: Record<number, EdgeCurvature>; // keyed by edge index
  notches?: PatternNotch[];
  sublimationPrint?: SublimationPrint;
  tataBusanaType?: 'TM' | 'TB';
  hasFoldLine?: boolean;
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

export type PatchPresetType =
  | 'pocket'
  | 'circle'
  | 'star'
  | 'shield'
  | 'sleeve'
  | 'collar'
  | 'waistband'
  | 'cuff'
  | 'rect';

export type CadTool =
  | 'select'    // V: Move & Transform (scale, rotate with Photoshop-like bounding box)
  | 'vertex'    // A: Direct Select / Move vertex
  | 'pen'       // P: Add point on edge
  | 'curve'     // C: Curvature tool (bend edge)
  | 'notch'     // U: Tanda Pas / Sewing Notch Tool
  | 'cut'       // X: Scissor / Slice pattern piece
  | 'patch'     // K: Fabric Patch / Add Fabric Piece
  | 'polygon'   // N: Draw custom polygon pattern piece
  | 'sew'       // S: Virtual Sewing tool
  | 'free-sew'  // F: Free Sewing (partial edge seams)
  | 'edit-sew'  // B: Edit Sewing (select, modify, delete seams)
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
  colorZones?: Record<string, string>;
  decals?: GraphicDecal[];
  mockupScene?: MockupSceneMode;
  canvasViewMode?: CanvasViewMode;
  canvasTheme?: CanvasTheme;
  sublimationPrint?: SublimationPrint;
  tataBusanaMode?: boolean;
}

export type ViewportLayout = 'dual' | 'pattern-only' | '3d-only';

export type MockupSceneMode = 'ghost' | 'flat-lay' | 'hanger' | 'folded' | 'floating-360';
export type CanvasViewMode = 'assembled' | 'pieces';
export type StudioLightingPreset = 'ecommerce-white' | 'moody-dark' | 'warm-editorial';

export type ColorZoneKey =
  | 'body'
  | 'collar'
  | 'sleeves'
  | 'leftSleeve'
  | 'rightSleeve'
  | 'pocket'
  | 'hem'
  | 'cuffs'
  | 'hood'
  | 'zipper';

export interface DecalFontProps {
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  fontWeight: string;
  arcCurvature: number; // -1 to 1 bend curvature
  color: string;
}

export interface GraphicDecal {
  id: string;
  type: 'image' | 'text' | 'preset';
  content: string; // Data URL or text string or preset name
  name: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number; // In degrees
  viewTarget: 'front' | 'back' | 'leftSleeve' | 'rightSleeve';
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  opacity: number;
  width: number;
  height: number;
  fontProps?: DecalFontProps;
}

export type CanvasTheme = 'white' | 'dark';
