import { create } from 'zustand';
import type {
  PatternPiece,
  SeamConnection,
  FabricMaterial,
  CadTool,
  AvatarConfig,
  ViewportLayout,
  SeamEdge,
} from '../types/cad';
import { createTshirtPreset, FABRIC_PRESETS } from '../utils/patternPresets';

interface CloState {
  // Pattern Data
  pieces: PatternPiece[];
  seams: SeamConnection[];
  selectedPieceId: string | null;
  selectedVertexIndex: number | null;
  activeTool: CadTool;
  pendingSeamEdge: SeamEdge | null;

  // Material & Fabric
  currentMaterial: FabricMaterial;
  customColor: string;

  // 3D Simulation & Viewport
  isSimulating: boolean;
  simulationIteration: number;
  showWireframe: boolean;
  showHeatmap: boolean;
  showAvatar: boolean;
  layout: ViewportLayout;
  cameraPreset: 'front' | 'back' | 'side' | 'perspective';

  // Avatar Configuration
  avatar: AvatarConfig;

  // Actions
  selectPiece: (id: string | null) => void;
  selectVertex: (index: number | null) => void;
  updatePiecePosition: (id: string, pos: { x: number; y: number }) => void;
  updatePieceVertex: (pieceId: string, vertexIndex: number, newDelta: { x: number; y: number }) => void;
  scalePiece: (pieceId: string, factor: number) => void;
  setActiveTool: (tool: CadTool) => void;
  setPendingSeamEdge: (edge: SeamEdge | null) => void;
  addSeam: (edgeA: SeamEdge, edgeB: SeamEdge) => void;
  removeSeam: (id: string) => void;
  setMaterial: (material: FabricMaterial) => void;
  setCustomColor: (color: string) => void;
  setIsSimulating: (simulating: boolean) => void;
  toggleWireframe: () => void;
  toggleHeatmap: () => void;
  toggleAvatar: () => void;
  setLayout: (layout: ViewportLayout) => void;
  setCameraPreset: (preset: 'front' | 'back' | 'side' | 'perspective') => void;
  setAvatarMeasurement: (key: keyof AvatarConfig, val: number | string | boolean) => void;
  resetSimulation: () => void;
  loadPreset: (name: string) => void;
}

const initialPreset = createTshirtPreset();

export const useCloStore = create<CloState>((set, get) => ({
  pieces: initialPreset.pieces,
  seams: initialPreset.seams,
  selectedPieceId: null,
  selectedVertexIndex: null,
  activeTool: 'select',
  pendingSeamEdge: null,

  currentMaterial: FABRIC_PRESETS[0],
  customColor: FABRIC_PRESETS[0].color,

  isSimulating: true,
  simulationIteration: 0,
  showWireframe: false,
  showHeatmap: false,
  showAvatar: true,
  layout: 'dual',
  cameraPreset: 'perspective',

  avatar: {
    gender: 'female',
    height: 175,
    chestCircumference: 92,
    waistCircumference: 68,
    hipsCircumference: 96,
    showSkin: true,
  },

  selectPiece: (id) => set({ selectedPieceId: id, selectedVertexIndex: null }),
  selectVertex: (index) => set({ selectedVertexIndex: index }),

  updatePiecePosition: (id, pos) =>
    set((state) => ({
      pieces: state.pieces.map((p) => (p.id === id ? { ...p, position: pos } : p)),
    })),

  updatePieceVertex: (pieceId, vertexIndex, newPoint) =>
    set((state) => ({
      pieces: state.pieces.map((p) => {
        if (p.id !== pieceId) return p;
        const newPoints = [...p.points];
        if (newPoints[vertexIndex]) {
          newPoints[vertexIndex] = {
            ...newPoints[vertexIndex],
            x: newPoint.x,
            y: newPoint.y,
          };
        }
        return { ...p, points: newPoints };
      }),
      // Trigger simulation update
      simulationIteration: state.simulationIteration + 1,
    })),

  scalePiece: (pieceId, factor) =>
    set((state) => ({
      pieces: state.pieces.map((p) => {
        if (p.id !== pieceId) return p;
        return {
          ...p,
          points: p.points.map((pt) => ({
            ...pt,
            x: Math.round(pt.x * factor),
            y: Math.round(pt.y * factor),
          })),
        };
      }),
      simulationIteration: state.simulationIteration + 1,
    })),

  setActiveTool: (tool) => set({ activeTool: tool, pendingSeamEdge: null }),

  setPendingSeamEdge: (edge) => set({ pendingSeamEdge: edge }),

  addSeam: (edgeA, edgeB) =>
    set((state) => {
      // Check if duplicate
      const exists = state.seams.some(
        (s) =>
          (s.edgeA.pieceId === edgeA.pieceId &&
            s.edgeA.edgeIndex === edgeA.edgeIndex &&
            s.edgeB.pieceId === edgeB.pieceId &&
            s.edgeB.edgeIndex === edgeB.edgeIndex) ||
          (s.edgeA.pieceId === edgeB.pieceId &&
            s.edgeA.edgeIndex === edgeB.edgeIndex &&
            s.edgeB.pieceId === edgeA.pieceId &&
            s.edgeB.edgeIndex === edgeA.edgeIndex)
      );
      if (exists) return { pendingSeamEdge: null };

      const newSeam: SeamConnection = {
        id: `seam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        edgeA,
        edgeB,
        strength: 1.0,
      };

      return {
        seams: [...state.seams, newSeam],
        pendingSeamEdge: null,
        simulationIteration: state.simulationIteration + 1,
      };
    }),

  removeSeam: (id) =>
    set((state) => ({
      seams: state.seams.filter((s) => s.id !== id),
      simulationIteration: state.simulationIteration + 1,
    })),

  setMaterial: (mat) => set({ currentMaterial: mat, customColor: mat.color }),
  setCustomColor: (color) =>
    set((state) => ({
      customColor: color,
      currentMaterial: { ...state.currentMaterial, color },
    })),

  setIsSimulating: (simulating) => set({ isSimulating: simulating }),
  toggleWireframe: () => set((state) => ({ showWireframe: !state.showWireframe })),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  toggleAvatar: () => set((state) => ({ showAvatar: !state.showAvatar })),
  setLayout: (layout) => set({ layout }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  setAvatarMeasurement: (key, val) =>
    set((state) => ({
      avatar: { ...state.avatar, [key]: val },
      simulationIteration: state.simulationIteration + 1,
    })),

  resetSimulation: () =>
    set((state) => ({
      simulationIteration: state.simulationIteration + 1,
    })),

  loadPreset: (name) => {
    if (name === 'tshirt') {
      const p = createTshirtPreset();
      set({ pieces: p.pieces, seams: p.seams, simulationIteration: get().simulationIteration + 1 });
    }
  },
}));
