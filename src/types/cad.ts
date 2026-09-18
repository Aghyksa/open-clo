export interface Point2D {
  id: string;
  x: number;
  y: number;
}

export interface SeamEdge {
  pieceId: string;
  edgeIndex: number; // Index of the start point of the segment in points array
}

export interface SeamConnection {
  id: string;
  edgeA: SeamEdge;
  edgeB: SeamEdge;
  strength: number; // Sewing pull strength
}

export interface PatternPiece {
  id: string;
  name: string;
  points: Point2D[];
  position: { x: number; y: number };
  rotation: number; // In radians
  color?: string;
  // 3D initial placement hints around avatar
  placement: {
    origin3D: [number, number, number]; // [x, y, z]
    rotation3D: [number, number, number];
    curved?: boolean;
    curveRadius?: number;
  };
}

export interface FabricMaterial {
  id: string;
  name: string;
  color: string;
  density: number; // g/m² - Affects gravity weight
  stretchStiffness: number; // 0.1 (very stretchy) to 1.0 (rigid canvas)
  bendingStiffness: number; // 0.01 (flowing silk) to 0.8 (thick leather)
  friction: number; // Surface friction against avatar
  roughness: number;
  metalness: number;
  patternType?: 'solid' | 'grid' | 'stripes' | 'denim';
}

export type CadTool = 'select' | 'move' | 'vertex' | 'sew' | 'measure';

export interface AvatarConfig {
  gender: 'female' | 'male';
  height: number; // cm
  chestCircumference: number; // cm
  waistCircumference: number; // cm
  hipsCircumference: number; // cm
  showSkin: boolean;
}

export type ViewportLayout = 'dual' | 'pattern-only' | '3d-only';
