import { create } from 'zustand';
import type {
  PatternPiece,
  Point2D,
  SeamConnection,
  FabricMaterial,
  CadTool,
  PatchPresetType,
  AvatarConfig,
  Avatar2DConfig,
  StitchSettings,
  StitchType,
  CloProject,
  ViewportLayout,
  SeamEdge,
  GraphicLayer,
  EdgeCurvature,
  CanvasTheme,
} from '../types/cad';
import {
  FABRIC_PRESETS,
  GARMENT_TEMPLATES,
  STITCH_PRESETS,
} from '../utils/patternPresets';

const STORAGE_KEY_PROJECTS = 'openclo_projects_v1';
const STORAGE_KEY_ACTIVE = 'openclo_active_project_id';

function createDefaultProject(templateId = 'tshirt', name?: string): CloProject {
  const tmpl = GARMENT_TEMPLATES.find((t) => t.id === templateId) || GARMENT_TEMPLATES[0];
  const data = tmpl.generator();
  const fabric = FABRIC_PRESETS.find((f) => f.id === tmpl.recommendedFabric) || FABRIC_PRESETS[0];

  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: name || `${tmpl.name} Studio`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    templateId: tmpl.id,
    pieces: data.pieces,
    seams: data.seams,
    currentMaterial: fabric,
    customColor: tmpl.recommendedColor,
    avatar: {
      gender: 'female',
      height: 175,
      chestCircumference: 92,
      waistCircumference: 68,
      hipsCircumference: 96,
      shoulderWidth: 40,
      showSkin: true,
    },
    avatar2D: {
      visible: true,
      view: 'front',
      opacity: 0.15,
      showGuides: false,
      position: { x: 180, y: 260 },
    },
    stitchSettings: {
      defaultType: 'single-needle',
      defaultColor: '#f8fafc',
      showStitches: true,
      seamAllowanceMm: 12,
    },
  };
}

function loadProjectsFromStorage(): { projects: CloProject[]; activeProject: CloProject } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);

    if (raw) {
      const parsed = JSON.parse(raw) as CloProject[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        let active = parsed.find((p) => p.id === activeId);
        if (!active) active = parsed[0];
        return { projects: parsed, activeProject: active };
      }
    }
  } catch (e) {
    console.warn('Failed to load projects from localStorage:', e);
  }

  const def = createDefaultProject('tshirt', 'Classic T-Shirt Studio');
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify([def]));
    localStorage.setItem(STORAGE_KEY_ACTIVE, def.id);
  } catch {
    // Ignore storage quota errors
  }
  return { projects: [def], activeProject: def };
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveProjects(projects: CloProject[], activeId: string) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeId);
    } catch (e) {
      console.warn('Auto-save to localStorage failed:', e);
    }
  }, 400);
}

interface HistoryStep {
  pieces: PatternPiece[];
  seams: SeamConnection[];
}

interface CloState {
  // Project Management
  projects: CloProject[];
  activeProjectId: string;
  isSaved: boolean;
  lastSavedAt: number;

  // Pattern Workspace
  pieces: PatternPiece[];
  seams: SeamConnection[];
  selectedPieceId: string | null;
  selectedVertexIndex: number | null;
  activeTool: CadTool;
  pendingSeamEdge: SeamEdge | null;

  // Free-Sew state (partial edge sewing)
  pendingFreeSewEdge: (SeamEdge & { paramStart: number; paramEnd: number }) | null;

  // Edit-Sew state
  selectedSeamId: string | null;

  // Material & Stitching
  currentMaterial: FabricMaterial;
  customColor: string;
  activeTemplateId: string;
  stitchSettings: StitchSettings;

  // Avatar Sizing & 2D Avatar Guide
  avatar: AvatarConfig;
  avatar2D: Avatar2DConfig;

  // 3D Viewport Controls
  isSimulating: boolean;
  simulationDynamics: number; // 0 (calm) to 1.0 (runway wind)
  simulationIteration: number;
  showWireframe: boolean;
  showHeatmap: boolean;
  showAvatar: boolean;
  layout: ViewportLayout;
  canvasTheme: CanvasTheme;
  cameraPreset: 'front' | 'back' | 'side' | 'perspective';

  // Drop Animation
  isDropAnimating: boolean;
  dropAnimationProgress: number; // 0-1

  // Canvas Theme
  setCanvasTheme: (theme: CanvasTheme) => void;
  toggleCanvasTheme: () => void;

  // History (Undo / Redo)
  undoStack: HistoryStep[];
  redoStack: HistoryStep[];

  // Project Actions
  createNewProject: (name: string, templateId?: string) => void;
  switchProject: (id: string) => void;
  saveActiveProject: () => void;
  saveProjectAs: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  importProjectData: (project: CloProject) => void;

  // Pattern Editing (Photoshop-like & CLO3D CAD)
  selectPiece: (id: string | null) => void;
  selectVertex: (index: number | null) => void;
  setActiveTool: (tool: CadTool) => void;
  updatePiecePosition: (id: string, pos: { x: number; y: number }) => void;
  setPieceRotation: (id: string, radians: number) => void;
  updatePieceVertex: (pieceId: string, vertexIndex: number, newPoint: { x: number; y: number }) => void;
  scalePiece: (pieceId: string, factorX: number, factorY?: number) => void;
  addVertexToEdge: (pieceId: string, edgeIndex: number, newPoint: { x: number; y: number }) => void;
  deleteVertex: (pieceId: string, vertexIndex: number) => void;
  curveEdge: (pieceId: string, edgeIndex: number, curvatureAmount: number) => void;
  setEdgeCurvature: (pieceId: string, edgeIndex: number, curvature: EdgeCurvature | null) => void;
  duplicatePiece: (pieceId: string, mirrorX?: boolean) => void;
  deletePiece: (pieceId: string) => void;
  togglePieceLock: (pieceId: string) => void;
  togglePieceVisibility: (pieceId: string) => void;
  renamePiece: (pieceId: string, name: string) => void;
  addBlankPiece: (type: 'rectangle' | 'pocket') => void;
  cutPiece: (pieceId: string, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }) => boolean;
  addFabricPatch: (type: PatchPresetType, position?: { x: number; y: number }) => void;
  addCustomPiece: (name: string, points: { x: number; y: number }[], position?: { x: number; y: number }) => void;

  // Graphic / Stamp Layers (Photoshop style)
  addGraphicLayer: (pieceId: string, graphic: Omit<GraphicLayer, 'id'>) => void;
  updateGraphicLayer: (pieceId: string, graphicId: string, partial: Partial<GraphicLayer>) => void;
  removeGraphicLayer: (pieceId: string, graphicId: string) => void;

  // Seam & Stitching
  setPendingSeamEdge: (edge: SeamEdge | null) => void;
  addSeam: (edgeA: SeamEdge, edgeB: SeamEdge, stitchType?: StitchType) => void;
  removeSeam: (id: string) => void;
  updateSeamStitch: (seamId: string, stitchType: StitchType, threadColor?: string, strength?: number) => void;
  setDefaultStitchType: (type: StitchType) => void;
  setDefaultThreadColor: (color: string) => void;
  toggleShowStitches: () => void;

  // Free-Sew & Edit-Sew actions
  setPendingFreeSewEdge: (edge: (SeamEdge & { paramStart: number; paramEnd: number }) | null) => void;
  setSelectedSeamId: (id: string | null) => void;
  reverseSeam: (id: string) => void;
  updateSeam: (id: string, partial: Partial<SeamConnection>) => void;

  // Material & Avatar
  setMaterial: (material: FabricMaterial) => void;
  setCustomColor: (color: string) => void;
  setAvatarMeasurement: (key: keyof AvatarConfig, val: number | string | boolean) => void;
  updateAvatar2D: (partial: Partial<Avatar2DConfig>) => void;

  // Viewport & Simulation
  setIsSimulating: (simulating: boolean) => void;
  setSimulationDynamics: (dynamics: number) => void;
  toggleWireframe: () => void;
  toggleHeatmap: () => void;
  toggleAvatar: () => void;
  setLayout: (layout: ViewportLayout) => void;
  setCameraPreset: (preset: 'front' | 'back' | 'side' | 'perspective') => void;
  resetSimulation: () => void;
  loadPreset: (id: string) => void;

  // Drop Animation Actions
  startDropAnimation: () => void;
  setDropAnimationProgress: (progress: number) => void;
  stopDropAnimation: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const initial = loadProjectsFromStorage();
const active = initial.activeProject;

export const useCloStore = create<CloState>((set, get) => {
  // Expose store for debugging / QA testing
  if (typeof window !== 'undefined') {
    (window as any).__CLO_STORE = { getState: get, setState: set };
  }
  // Helper to commit changes to active project & localStorage
  const syncToActiveProject = (updatedState: Partial<CloState>) => {
    const state = get();
    const currentActiveId = state.activeProjectId;
    const now = Date.now();

    const updatedProjects = state.projects.map((p) => {
      if (p.id !== currentActiveId) return p;
      return {
        ...p,
        pieces: updatedState.pieces ?? state.pieces,
        seams: updatedState.seams ?? state.seams,
        currentMaterial: updatedState.currentMaterial ?? state.currentMaterial,
        customColor: updatedState.customColor ?? state.customColor,
        activeTemplateId: updatedState.activeTemplateId ?? state.activeTemplateId,
        avatar: updatedState.avatar ?? state.avatar,
        avatar2D: updatedState.avatar2D ?? state.avatar2D,
        stitchSettings: updatedState.stitchSettings ?? state.stitchSettings,
        updatedAt: now,
      };
    });

    debouncedSaveProjects(updatedProjects, currentActiveId);
    return {
      projects: updatedProjects,
      isSaved: true,
      lastSavedAt: now,
    };
  };

  return {
    // Initial Project State
    projects: initial.projects,
    activeProjectId: active.id,
    isSaved: true,
    lastSavedAt: active.updatedAt,

    pieces: active.pieces || [],
    seams: active.seams || [],
    selectedPieceId: null,
    selectedVertexIndex: null,
    activeTool: 'select',
    pendingSeamEdge: null,
    pendingFreeSewEdge: null,
    selectedSeamId: null,

    currentMaterial: active.currentMaterial || FABRIC_PRESETS[0],
    customColor: active.customColor || '#38bdf8',
    activeTemplateId: active.templateId || 'tshirt',
    stitchSettings: active.stitchSettings || {
      defaultType: 'single-needle',
      defaultColor: '#f8fafc',
      showStitches: true,
      seamAllowanceMm: 12,
    },

    avatar: active.avatar || {
      gender: 'female',
      height: 175,
      chestCircumference: 92,
      waistCircumference: 68,
      hipsCircumference: 96,
      shoulderWidth: 40,
      showSkin: true,
    },
    avatar2D: active.avatar2D || {
      visible: true,
      view: 'front',
      opacity: 0.15,
      showGuides: false,
      position: { x: 180, y: 260 },
    },

    isSimulating: false,
    simulationDynamics: 0.6,
    simulationIteration: 0,
    showWireframe: false,
    showHeatmap: false,
    showAvatar: true,
    layout: 'pattern-only',
    canvasTheme: 'white',
    cameraPreset: 'perspective',

    // Drop Animation
    isDropAnimating: false,
    dropAnimationProgress: 0,

    // Canvas Theme
    setCanvasTheme: (theme) => set({ canvasTheme: theme }),
    toggleCanvasTheme: () => set((state) => ({ canvasTheme: state.canvasTheme === 'white' ? 'dark' : 'white' })),

    undoStack: [],
    redoStack: [],

    // ==========================================
    // History (Undo / Redo)
    // ==========================================
    pushHistory: () => {
      const { pieces, seams, undoStack } = get();
      const currentSnapshot: HistoryStep = {
        pieces: JSON.parse(JSON.stringify(pieces)),
        seams: JSON.parse(JSON.stringify(seams)),
      };
      set({
        undoStack: [...undoStack.slice(-25), currentSnapshot],
        redoStack: [],
      });
    },

    undo: () => {
      const { undoStack, redoStack, pieces, seams } = get();
      if (undoStack.length === 0) return;

      const previous = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, -1);
      const currentSnapshot: HistoryStep = {
        pieces: JSON.parse(JSON.stringify(pieces)),
        seams: JSON.parse(JSON.stringify(seams)),
      };

      set({
        pieces: previous.pieces,
        seams: previous.seams,
        undoStack: newUndo,
        redoStack: [currentSnapshot, ...redoStack],
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: previous.pieces, seams: previous.seams }),
      });
    },

    redo: () => {
      const { undoStack, redoStack, pieces, seams } = get();
      if (redoStack.length === 0) return;

      const next = redoStack[0];
      const newRedo = redoStack.slice(1);
      const currentSnapshot: HistoryStep = {
        pieces: JSON.parse(JSON.stringify(pieces)),
        seams: JSON.parse(JSON.stringify(seams)),
      };

      set({
        pieces: next.pieces,
        seams: next.seams,
        undoStack: [...undoStack, currentSnapshot],
        redoStack: newRedo,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: next.pieces, seams: next.seams }),
      });
    },

    // ==========================================
    // Project Management Actions
    // ==========================================
    createNewProject: (name, templateId = 'tshirt') => {
      const newProj = createDefaultProject(templateId, name);
      const updatedProjects = [newProj, ...get().projects];

      set({
        projects: updatedProjects,
        activeProjectId: newProj.id,
        pieces: newProj.pieces,
        seams: newProj.seams,
        currentMaterial: newProj.currentMaterial,
        customColor: newProj.customColor,
        activeTemplateId: newProj.templateId,
        avatar: newProj.avatar,
        avatar2D: newProj.avatar2D,
        stitchSettings: newProj.stitchSettings,
        selectedPieceId: null,
        selectedVertexIndex: null,
        undoStack: [],
        redoStack: [],
        simulationIteration: get().simulationIteration + 1,
        isSaved: true,
        lastSavedAt: newProj.updatedAt,
      });

      debouncedSaveProjects(updatedProjects, newProj.id);
    },

    switchProject: (id) => {
      const proj = get().projects.find((p) => p.id === id);
      if (!proj) return;

      set({
        activeProjectId: proj.id,
        pieces: proj.pieces,
        seams: proj.seams,
        currentMaterial: proj.currentMaterial || FABRIC_PRESETS[0],
        customColor: proj.customColor || '#38bdf8',
        activeTemplateId: proj.templateId || 'tshirt',
        avatar: proj.avatar,
        avatar2D: proj.avatar2D,
        stitchSettings: proj.stitchSettings,
        selectedPieceId: null,
        selectedVertexIndex: null,
        undoStack: [],
        redoStack: [],
        simulationIteration: get().simulationIteration + 1,
        isSaved: true,
        lastSavedAt: proj.updatedAt,
      });

      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE, proj.id);
      } catch {}
    },

    saveActiveProject: () => {
      const state = get();
      const now = Date.now();
      const updatedProjects = state.projects.map((p) => {
        if (p.id !== state.activeProjectId) return p;
        return {
          ...p,
          pieces: state.pieces,
          seams: state.seams,
          currentMaterial: state.currentMaterial,
          customColor: state.customColor,
          activeTemplateId: state.activeTemplateId,
          avatar: state.avatar,
          avatar2D: state.avatar2D,
          stitchSettings: state.stitchSettings,
          updatedAt: now,
        };
      });

      try {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updatedProjects));
        localStorage.setItem(STORAGE_KEY_ACTIVE, state.activeProjectId);
      } catch {}

      set({
        projects: updatedProjects,
        isSaved: true,
        lastSavedAt: now,
      });
    },

    saveProjectAs: (name) => {
      const state = get();
      const now = Date.now();
      const cloned: CloProject = {
        id: `proj-${now}-${Math.random().toString(36).substr(2, 5)}`,
        name,
        createdAt: now,
        updatedAt: now,
        templateId: state.activeTemplateId,
        pieces: JSON.parse(JSON.stringify(state.pieces)),
        seams: JSON.parse(JSON.stringify(state.seams)),
        currentMaterial: { ...state.currentMaterial },
        customColor: state.customColor,
        avatar: { ...state.avatar },
        avatar2D: { ...state.avatar2D },
        stitchSettings: { ...state.stitchSettings },
      };

      const updatedProjects = [cloned, ...state.projects];
      set({
        projects: updatedProjects,
        activeProjectId: cloned.id,
        isSaved: true,
        lastSavedAt: now,
      });

      debouncedSaveProjects(updatedProjects, cloned.id);
    },

    renameProject: (id, name) => {
      const updated = get().projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p));
      set({ projects: updated });
      debouncedSaveProjects(updated, get().activeProjectId);
    },

    deleteProject: (id) => {
      const { projects, activeProjectId } = get();
      if (projects.length <= 1) {
        // If deleting the only project, reset to a new clean one
        const fallback = createDefaultProject('tshirt', 'New Studio Project');
        set({
          projects: [fallback],
          activeProjectId: fallback.id,
          pieces: fallback.pieces,
          seams: fallback.seams,
          currentMaterial: fallback.currentMaterial,
          customColor: fallback.customColor,
          activeTemplateId: fallback.templateId,
          avatar: fallback.avatar,
          avatar2D: fallback.avatar2D,
          stitchSettings: fallback.stitchSettings,
          simulationIteration: get().simulationIteration + 1,
        });
        debouncedSaveProjects([fallback], fallback.id);
        return;
      }

      const filtered = projects.filter((p) => p.id !== id);
      if (activeProjectId === id) {
        const nextActive = filtered[0];
        set({
          projects: filtered,
          activeProjectId: nextActive.id,
          pieces: nextActive.pieces,
          seams: nextActive.seams,
          currentMaterial: nextActive.currentMaterial,
          customColor: nextActive.customColor,
          activeTemplateId: nextActive.templateId,
          avatar: nextActive.avatar,
          avatar2D: nextActive.avatar2D,
          stitchSettings: nextActive.stitchSettings,
          simulationIteration: get().simulationIteration + 1,
        });
        debouncedSaveProjects(filtered, nextActive.id);
      } else {
        set({ projects: filtered });
        debouncedSaveProjects(filtered, activeProjectId);
      }
    },

    duplicateProject: (id) => {
      const target = get().projects.find((p) => p.id === id);
      if (!target) return;
      const now = Date.now();
      const cloned: CloProject = {
        ...JSON.parse(JSON.stringify(target)),
        id: `proj-${now}-${Math.random().toString(36).substr(2, 5)}`,
        name: `${target.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [cloned, ...get().projects];
      set({ projects: updated });
      debouncedSaveProjects(updated, get().activeProjectId);
    },

    importProjectData: (importedProject) => {
      const now = Date.now();
      const normalized: CloProject = {
        ...importedProject,
        id: `proj-${now}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [normalized, ...get().projects];
      set({
        projects: updated,
        activeProjectId: normalized.id,
        pieces: normalized.pieces,
        seams: normalized.seams,
        currentMaterial: normalized.currentMaterial || FABRIC_PRESETS[0],
        customColor: normalized.customColor || '#38bdf8',
        activeTemplateId: normalized.templateId || 'tshirt',
        avatar: normalized.avatar,
        avatar2D: normalized.avatar2D,
        stitchSettings: normalized.stitchSettings,
        simulationIteration: get().simulationIteration + 1,
      });

      debouncedSaveProjects(updated, normalized.id);
    },

    // ==========================================
    // 2D Pattern CAD & Photoshop-like Editing
    // ==========================================
    selectPiece: (id) => set({ selectedPieceId: id, selectedVertexIndex: null }),
    selectVertex: (index) => set({ selectedVertexIndex: index }),
    setActiveTool: (tool) => set({ activeTool: tool, pendingSeamEdge: null, pendingFreeSewEdge: null, selectedSeamId: null }),

    updatePiecePosition: (id, pos) => {
      const updatedPieces = get().pieces.map((p) => (p.id === id ? { ...p, position: pos } : p));
      set({
        pieces: updatedPieces,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    setPieceRotation: (id, radians) => {
      get().pushHistory();
      const updatedPieces = get().pieces.map((p) => (p.id === id ? { ...p, rotation: radians } : p));
      set({
        pieces: updatedPieces,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    updatePieceVertex: (pieceId, vertexIndex, newPoint) => {
      const updatedPieces = get().pieces.map((p) => {
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
      });

      set({
        pieces: updatedPieces,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    scalePiece: (pieceId, factorX, factorY = factorX) => {
      get().pushHistory();
      const updatedPieces = get().pieces.map((p) => {
        if (p.id !== pieceId) return p;
        return {
          ...p,
          points: p.points.map((pt) => ({
            ...pt,
            x: Math.round(pt.x * factorX),
            y: Math.round(pt.y * factorY),
          })),
        };
      });

      set({
        pieces: updatedPieces,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    addVertexToEdge: (pieceId, edgeIndex, newPoint) => {
      get().pushHistory();
      const updatedPieces = get().pieces.map((p) => {
        if (p.id !== pieceId) return p;
        const newPts = [...p.points];
        const newVert = {
          id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          x: Math.round(newPoint.x),
          y: Math.round(newPoint.y),
        };
        newPts.splice(edgeIndex + 1, 0, newVert);

        // Re-index edge curvatures: inserting a point splits the edge
        // Edges after the insertion shift index by +1
        const oldCurvatures = p.edgeCurvatures || {};
        const newCurvatures: Record<number, import('../types/cad').EdgeCurvature> = {};
        for (const [key, val] of Object.entries(oldCurvatures)) {
          const idx = Number(key);
          if (idx < edgeIndex) {
            newCurvatures[idx] = val;
          } else if (idx === edgeIndex) {
            // The curved edge is being split - remove curvature from both halves
            // (user can re-curve them individually)
          } else {
            newCurvatures[idx + 1] = val;
          }
        }

        return { ...p, points: newPts, edgeCurvatures: Object.keys(newCurvatures).length > 0 ? newCurvatures : undefined };
      });

      set({
        pieces: updatedPieces,
        selectedVertexIndex: edgeIndex + 1,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    deleteVertex: (pieceId, vertexIndex) => {
      const piece = get().pieces.find((p) => p.id === pieceId);
      if (!piece || piece.points.length <= 3) return; // Maintain valid polygon

      get().pushHistory();
      const updatedPieces = get().pieces.map((p) => {
        if (p.id !== pieceId) return p;
        const newPts = p.points.filter((_, idx) => idx !== vertexIndex);

        // Re-index edge curvatures when a vertex is removed
        const n = p.points.length;
        const oldCurvatures = p.edgeCurvatures || {};
        const newCurvatures: Record<number, import('../types/cad').EdgeCurvature> = {};
        for (const [key, val] of Object.entries(oldCurvatures)) {
          const idx = Number(key);
          // Edge idx connects point[idx] to point[idx+1]
          // Removing vertexIndex: edges vertexIndex-1 and vertexIndex are destroyed
          const prevEdge = (vertexIndex - 1 + n) % n;
          if (idx === prevEdge || idx === vertexIndex) {
            continue; // skip edges touching the deleted vertex
          }
          // Re-index: edges after the removed vertex shift down by 1
          if (idx > vertexIndex) {
            newCurvatures[idx - 1] = val;
          } else {
            newCurvatures[idx] = val;
          }
        }

        return { ...p, points: newPts, edgeCurvatures: Object.keys(newCurvatures).length > 0 ? newCurvatures : undefined };
      });

      set({
        pieces: updatedPieces,
        selectedVertexIndex: null,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    curveEdge: (pieceId, edgeIndex, curvatureAmount) => {
      get().pushHistory();
      const piece = get().pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      const pts = piece.points;
      const p1 = pts[edgeIndex];
      const p2 = pts[(edgeIndex + 1) % pts.length];

      // Compute perpendicular offset for the control point
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      const newCurvatures = { ...(piece.edgeCurvatures || {}) };
      newCurvatures[edgeIndex] = {
        cpx: nx * curvatureAmount,
        cpy: ny * curvatureAmount,
      };

      const updatedPieces = get().pieces.map((p) =>
        p.id === pieceId ? { ...p, edgeCurvatures: newCurvatures } : p
      );
      set({
        pieces: updatedPieces,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    setEdgeCurvature: (pieceId, edgeIndex, curvature) => {
      const piece = get().pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      const newCurvatures = { ...(piece.edgeCurvatures || {}) };
      if (curvature) {
        newCurvatures[edgeIndex] = curvature;
      } else {
        delete newCurvatures[edgeIndex];
      }

      const updatedPieces = get().pieces.map((p) =>
        p.id === pieceId ? { ...p, edgeCurvatures: newCurvatures } : p
      );
      set({
        pieces: updatedPieces,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    duplicatePiece: (pieceId, mirrorX = false) => {
      get().pushHistory();
      const piece = get().pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      const newId = `piece-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const duplicated: PatternPiece = {
        ...JSON.parse(JSON.stringify(piece)),
        id: newId,
        name: `${piece.name} (${mirrorX ? 'Mirrored' : 'Copy'})`,
        position: { x: piece.position.x + 120, y: piece.position.y + 40 },
        points: piece.points.map((pt) => ({
          ...pt,
          id: `pt-${Math.random().toString(36).substr(2, 6)}`,
          x: mirrorX ? -pt.x : pt.x,
        })),
      };

      const updated = [...get().pieces, duplicated];
      set({
        pieces: updated,
        selectedPieceId: newId,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updated }),
      });
    },

    deletePiece: (pieceId) => {
      if (get().pieces.length <= 1) return;
      get().pushHistory();
      const updatedPieces = get().pieces.filter((p) => p.id !== pieceId);
      const updatedSeams = get().seams.filter((s) => s.edgeA.pieceId !== pieceId && s.edgeB.pieceId !== pieceId);

      set({
        pieces: updatedPieces,
        seams: updatedSeams,
        selectedPieceId: null,
        selectedVertexIndex: null,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces, seams: updatedSeams }),
      });
    },

    togglePieceLock: (pieceId) => {
      const updated = get().pieces.map((p) => (p.id === pieceId ? { ...p, locked: !p.locked } : p));
      set({ pieces: updated, ...syncToActiveProject({ pieces: updated }) });
    },

    togglePieceVisibility: (pieceId) => {
      const updated = get().pieces.map((p) => (p.id === pieceId ? { ...p, visible: p.visible === false ? true : false } : p));
      set({ pieces: updated, ...syncToActiveProject({ pieces: updated }) });
    },

    renamePiece: (pieceId, name) => {
      const updated = get().pieces.map((p) => (p.id === pieceId ? { ...p, name } : p));
      set({ pieces: updated, ...syncToActiveProject({ pieces: updated }) });
    },

    addBlankPiece: (type) => {
      get().pushHistory();
      const newId = `piece-${Date.now()}`;
      let pts = [];
      let name = 'Custom Rect Panel';

      if (type === 'pocket') {
        name = 'Patch Pocket';
        pts = [
          { id: 'pk0', x: -60, y: -60 },
          { id: 'pk1', x: 60, y: -60 },
          { id: 'pk2', x: 60, y: 50 },
          { id: 'pk3', x: 0, y: 75 },
          { id: 'pk4', x: -60, y: 50 },
        ];
      } else {
        pts = [
          { id: 'r0', x: -90, y: -90 },
          { id: 'r1', x: 90, y: -90 },
          { id: 'r2', x: 90, y: 90 },
          { id: 'r3', x: -90, y: 90 },
        ];
      }

      const newPiece: PatternPiece = {
        id: newId,
        name,
        points: pts,
        position: { x: 300, y: 250 },
        rotation: 0,
        color: '#3b82f6',
        placement: { origin3D: [0, 0.4, 0.15], rotation3D: [0, 0, 0] },
      };

      const updated = [...get().pieces, newPiece];
      set({
        pieces: updated,
        selectedPieceId: newId,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updated }),
      });
    },

    cutPiece: (pieceId, lineStart, lineEnd) => {
      const piece = get().pieces.find((p) => p.id === pieceId);
      if (!piece || piece.points.length < 3) return false;

      // Transform world line points into piece local coordinate space
      const unrotate = (wx: number, wy: number) => {
        const dx = wx - piece.position.x;
        const dy = wy - piece.position.y;
        const cos = Math.cos(-piece.rotation);
        const sin = Math.sin(-piece.rotation);
        return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
      };

      const p1 = unrotate(lineStart.x, lineStart.y);
      const p2 = unrotate(lineEnd.x, lineEnd.y);

      // Edge intersection helper
      const lineIntersect = (
        ax: number, ay: number, bx: number, by: number,
        cx: number, cy: number, dx: number, dy: number
      ) => {
        const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
        if (Math.abs(denom) < 1e-6) return null;
        const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
        const u = -((bx - ax) * (ay - cy) - (by - ay) * (ax - cx)) / denom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
          return { t, x: ax + t * (bx - ax), y: ay + t * (by - ay) };
        }
        return null;
      };

      const pts = piece.points;
      const n = pts.length;
      const intersections: { edgeIndex: number; t: number; point: { x: number; y: number } }[] = [];

      for (let i = 0; i < n; i++) {
        const pa = pts[i];
        const pb = pts[(i + 1) % n];
        const hit = lineIntersect(pa.x, pa.y, pb.x, pb.y, p1.x, p1.y, p2.x, p2.y);
        if (hit) {
          intersections.push({ edgeIndex: i, t: hit.t, point: { x: Math.round(hit.x), y: Math.round(hit.y) } });
        }
      }

      if (intersections.length !== 2) return false;

      get().pushHistory();

      // Sort by edge index
      intersections.sort((a, b) => a.edgeIndex - b.edgeIndex);
      const [hitA, hitB] = intersections;

      const ptCutA: Point2D = { id: `cut-${Date.now()}-a`, x: hitA.point.x, y: hitA.point.y };
      const ptCutB: Point2D = { id: `cut-${Date.now()}-b`, x: hitB.point.x, y: hitB.point.y };

      // Polygon 1: from hitA to hitB along loop
      const poly1: Point2D[] = [ptCutA];
      let curr = (hitA.edgeIndex + 1) % n;
      while (curr !== (hitB.edgeIndex + 1) % n) {
        poly1.push({ ...pts[curr] });
        curr = (curr + 1) % n;
      }
      poly1.push(ptCutB);

      // Polygon 2: from hitB to hitA along loop
      const poly2: Point2D[] = [ptCutB];
      curr = (hitB.edgeIndex + 1) % n;
      while (curr !== (hitA.edgeIndex + 1) % n) {
        poly2.push({ ...pts[curr] });
        curr = (curr + 1) % n;
      }
      poly2.push({ ...ptCutA, id: `cut-${Date.now()}-a2` });

      const newIdB = `piece-${Date.now()}-split`;
      const pieceA: PatternPiece = {
        ...piece,
        name: `${piece.name} (Upper/A)`,
        points: poly1,
      };

      const pieceB: PatternPiece = {
        ...piece,
        id: newIdB,
        name: `${piece.name} (Lower/B)`,
        points: poly2,
        position: { x: piece.position.x + 25, y: piece.position.y + 25 },
        color: piece.color || '#3b82f6',
      };

      // Auto seam connecting cut line
      const newSeam: SeamConnection = {
        id: `seam-cut-${Date.now()}`,
        edgeA: { pieceId: piece.id, edgeIndex: poly1.length - 1 },
        edgeB: { pieceId: newIdB, edgeIndex: poly2.length - 1 },
        strength: 1.0,
        stitchType: 'single-needle',
      };

      const updatedPieces = get().pieces.map((p) => (p.id === piece.id ? pieceA : p)).concat(pieceB);
      const updatedSeams = [...get().seams, newSeam];

      set({
        pieces: updatedPieces,
        seams: updatedSeams,
        selectedPieceId: newIdB,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces, seams: updatedSeams }),
      });
      return true;
    },

    addFabricPatch: (type, position) => {
      get().pushHistory();
      const newId = `piece-${Date.now()}`;
      const defaultPos = position || { x: 320, y: 240 };
      let pts: Point2D[] = [];
      let name = 'Patch';
      let color = '#38bdf8';
      let origin3D: [number, number, number] = [0, 1.15, 0.16];

      switch (type) {
        case 'pocket':
          name = 'Chest Patch Pocket';
          pts = [
            { id: 'pk0', x: -35, y: -40 },
            { id: 'pk1', x: 35, y: -40 },
            { id: 'pk2', x: 35, y: 30 },
            { id: 'pk3', x: 0, y: 48 },
            { id: 'pk4', x: -35, y: 30 },
          ];
          color = '#0284c7';
          origin3D = [-0.07, 1.18, 0.14];
          break;
        case 'circle':
          name = 'Circular Patch';
          pts = Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return { id: `c${i}`, x: Math.round(35 * Math.cos(a)), y: Math.round(35 * Math.sin(a)) };
          });
          color = '#d97706';
          origin3D = [0.08, 1.15, 0.14];
          break;
        case 'star':
          name = 'Star Emblem Patch';
          pts = Array.from({ length: 10 }, (_, i) => {
            const r = i % 2 === 0 ? 40 : 18;
            const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
            return { id: `st${i}`, x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
          });
          color = '#eab308';
          origin3D = [0, 1.22, 0.15];
          break;
        case 'shield':
          name = 'Shield Crest Patch';
          pts = [
            { id: 'sh0', x: -35, y: -40 },
            { id: 'sh1', x: 35, y: -40 },
            { id: 'sh2', x: 35, y: 15 },
            { id: 'sh3', x: 0, y: 50 },
            { id: 'sh4', x: -35, y: 15 },
          ];
          color = '#dc2626';
          origin3D = [0.07, 1.18, 0.14];
          break;
        case 'sleeve':
          name = 'T-Shirt Short Sleeve';
          pts = [
            { id: 'sl0', x: 0, y: -70 },
            { id: 'sl1', x: 70, y: -50 },
            { id: 'sl2', x: 130, y: -20 },
            { id: 'sl3', x: 110, y: 120 },
            { id: 'sl4', x: -110, y: 120 },
            { id: 'sl5', x: -130, y: -20 },
            { id: 'sl6', x: -70, y: -50 },
          ];
          color = '#6366f1';
          origin3D = [0.28, 1.25, 0.04];
          break;
        case 'collar':
          name = 'Ribbed Neck Collar Band';
          pts = [
            { id: 'cl0', x: -160, y: -20 },
            { id: 'cl1', x: 160, y: -20 },
            { id: 'cl2', x: 150, y: 20 },
            { id: 'cl3', x: -150, y: 20 },
          ];
          color = '#1e293b';
          origin3D = [0, 1.38, 0.02];
          break;
        case 'waistband':
          name = 'Ribbed Waistband Strip';
          pts = [
            { id: 'wb0', x: -180, y: -30 },
            { id: 'wb1', x: 180, y: -30 },
            { id: 'wb2', x: 180, y: 30 },
            { id: 'wb3', x: -180, y: 30 },
          ];
          color = '#334155';
          origin3D = [0, 0.72, 0.04];
          break;
        case 'cuff':
          name = 'Ribbed Sleeve Cuff';
          pts = [
            { id: 'cf0', x: -65, y: -22 },
            { id: 'cf1', x: 65, y: -22 },
            { id: 'cf2', x: 60, y: 22 },
            { id: 'cf3', x: -60, y: 22 },
          ];
          color = '#475569';
          origin3D = [0.35, 1.12, 0.04];
          break;
        case 'rect':
        default:
          name = 'Custom Fabric Strip';
          pts = [
            { id: 'rc0', x: -75, y: -50 },
            { id: 'rc1', x: 75, y: -50 },
            { id: 'rc2', x: 75, y: 50 },
            { id: 'rc3', x: -75, y: 50 },
          ];
          color = '#10b981';
          origin3D = [0, 1.0, 0.14];
          break;
      }

      const newPiece: PatternPiece = {
        id: newId,
        name,
        points: pts,
        position: defaultPos,
        rotation: 0,
        color,
        placement: { origin3D, rotation3D: [0, 0, 0] },
      };

      const updated = [...get().pieces, newPiece];
      set({
        pieces: updated,
        selectedPieceId: newId,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updated }),
      });
    },

    addCustomPiece: (name, points, position) => {
      get().pushHistory();
      const newId = `piece-${Date.now()}`;
      const pts = points.map((p, idx) => ({ id: `pt-${idx}`, x: p.x, y: p.y }));
      const newPiece: PatternPiece = {
        id: newId,
        name: name || 'Custom Panel',
        points: pts,
        position: position || { x: 300, y: 250 },
        rotation: 0,
        color: '#8b5cf6',
        placement: { origin3D: [0, 1.1, 0.15], rotation3D: [0, 0, 0] },
      };
      const updated = [...get().pieces, newPiece];
      set({
        pieces: updated,
        selectedPieceId: newId,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updated }),
      });
    },

    // ==========================================
    // Graphic / Stamp Layers
    // ==========================================
    addGraphicLayer: (pieceId, graphic) => {
      get().pushHistory();
      const newGraphic: GraphicLayer = {
        ...graphic,
        id: `g-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };

      const updated = get().pieces.map((p) => {
        if (p.id !== pieceId) return p;
        return {
          ...p,
          graphics: [...(p.graphics || []), newGraphic],
        };
      });

      set({
        pieces: updated,
        ...syncToActiveProject({ pieces: updated }),
      });
    },

    updateGraphicLayer: (pieceId, graphicId, partial) => {
      const updated = get().pieces.map((p) => {
        if (p.id !== pieceId) return p;
        return {
          ...p,
          graphics: (p.graphics || []).map((g) => (g.id === graphicId ? { ...g, ...partial } : g)),
        };
      });

      set({
        pieces: updated,
        ...syncToActiveProject({ pieces: updated }),
      });
    },

    removeGraphicLayer: (pieceId, graphicId) => {
      get().pushHistory();
      const updated = get().pieces.map((p) => {
        if (p.id !== pieceId) return p;
        return {
          ...p,
          graphics: (p.graphics || []).filter((g) => g.id !== graphicId),
        };
      });

      set({
        pieces: updated,
        ...syncToActiveProject({ pieces: updated }),
      });
    },

    // ==========================================
    // Seams & Stitching
    // ==========================================
    setPendingSeamEdge: (edge) => set({ pendingSeamEdge: edge }),

    addSeam: (edgeA, edgeB, stitchType) => {
      // Don't sew an edge to itself
      if (edgeA.pieceId === edgeB.pieceId && edgeA.edgeIndex === edgeB.edgeIndex) {
        return set({ pendingSeamEdge: null });
      }

      get().pushHistory();
      const state = get();
      const chosenStitch = stitchType || state.stitchSettings.defaultType || 'single-needle';
      const preset = STITCH_PRESETS.find((sp) => sp.id === chosenStitch);

      const existingIndex = state.seams.findIndex(
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

      // If exact seam already exists, update its stitch parameters without breaking
      if (existingIndex !== -1) {
        const updatedSeams = [...state.seams];
        updatedSeams[existingIndex] = {
          ...updatedSeams[existingIndex],
          stitchType: chosenStitch,
          strength: preset?.defaultStrength || 1.0,
          threadColor: state.stitchSettings.defaultColor,
          seamAllowanceMm: preset?.seamAllowanceMm || 12,
        };
        set({
          seams: updatedSeams,
          pendingSeamEdge: null,
          simulationIteration: state.simulationIteration + 1,
          ...syncToActiveProject({ seams: updatedSeams }),
        });
        return;
      }

      const newSeam: SeamConnection = {
        id: `seam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        edgeA,
        edgeB,
        strength: preset?.defaultStrength || 1.0,
        stitchType: chosenStitch,
        threadColor: state.stitchSettings.defaultColor,
        seamAllowanceMm: preset?.seamAllowanceMm || 12,
      };

      const updatedSeams = [...state.seams, newSeam];
      set({
        seams: updatedSeams,
        pendingSeamEdge: null,
        simulationIteration: state.simulationIteration + 1,
        ...syncToActiveProject({ seams: updatedSeams }),
      });
    },

    removeSeam: (id) => {
      get().pushHistory();
      const updatedSeams = get().seams.filter((s) => s.id !== id);
      set({
        seams: updatedSeams,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ seams: updatedSeams }),
      });
    },

    updateSeamStitch: (seamId, stitchType, threadColor, strength) => {
      const updatedSeams = get().seams.map((s) => {
        if (s.id !== seamId) return s;
        return {
          ...s,
          stitchType,
          threadColor: threadColor || s.threadColor,
          strength: strength !== undefined ? strength : s.strength,
        };
      });

      set({
        seams: updatedSeams,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ seams: updatedSeams }),
      });
    },

    setDefaultStitchType: (type) => {
      const updated = { ...get().stitchSettings, defaultType: type };
      set({ stitchSettings: updated, ...syncToActiveProject({ stitchSettings: updated }) });
    },

    setDefaultThreadColor: (color) => {
      const updated = { ...get().stitchSettings, defaultColor: color };
      set({ stitchSettings: updated, ...syncToActiveProject({ stitchSettings: updated }) });
    },

    toggleShowStitches: () => {
      const updated = { ...get().stitchSettings, showStitches: !get().stitchSettings.showStitches };
      set({ stitchSettings: updated, ...syncToActiveProject({ stitchSettings: updated }) });
    },

    // ==========================================
    // Free-Sew & Edit-Sew Actions
    // ==========================================
    setPendingFreeSewEdge: (edge) => set({ pendingFreeSewEdge: edge }),

    setSelectedSeamId: (id) => set({ selectedSeamId: id }),

    reverseSeam: (id) => {
      get().pushHistory();
      const updatedSeams = get().seams.map((s) => {
        if (s.id !== id) return s;
        return { ...s, reversed: !s.reversed };
      });
      set({
        seams: updatedSeams,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ seams: updatedSeams }),
      });
    },

    updateSeam: (id, partial) => {
      get().pushHistory();
      const updatedSeams = get().seams.map((s) => {
        if (s.id !== id) return s;
        return { ...s, ...partial };
      });
      set({
        seams: updatedSeams,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ seams: updatedSeams }),
      });
    },

    // ==========================================
    // Fabric Material & Avatar
    // ==========================================
    setMaterial: (mat) => {
      set({
        currentMaterial: mat,
        customColor: mat.color,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ currentMaterial: mat, customColor: mat.color }),
      });
    },

    setCustomColor: (color) => {
      const updatedMat = { ...get().currentMaterial, color };
      set({
        customColor: color,
        currentMaterial: updatedMat,
        ...syncToActiveProject({ customColor: color, currentMaterial: updatedMat }),
      });
    },

    setAvatarMeasurement: (key, val) => {
      const updatedAvatar = { ...get().avatar, [key]: val };
      set({
        avatar: updatedAvatar,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ avatar: updatedAvatar }),
      });
    },

    updateAvatar2D: (partial) => {
      const updated2D = { ...get().avatar2D, ...partial };
      set({
        avatar2D: updated2D,
        ...syncToActiveProject({ avatar2D: updated2D }),
      });
    },

    // ==========================================
    // Viewport & 3D Settings
    // ==========================================
    setIsSimulating: (simulating) => set({ isSimulating: simulating }),
    setSimulationDynamics: (dynamics) => set({ simulationDynamics: Math.max(0, Math.min(1, dynamics)) }),
    toggleWireframe: () => set((state) => ({ showWireframe: !state.showWireframe })),
    toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
    toggleAvatar: () => set((state) => ({ showAvatar: !state.showAvatar })),
    setLayout: (layout) => set({ layout }),
    setCameraPreset: (preset) => set({ cameraPreset: preset }),

    resetSimulation: () => set((state) => ({ simulationIteration: state.simulationIteration + 1 })),

    // Drop Animation Actions
    startDropAnimation: () => set({ isDropAnimating: true, dropAnimationProgress: 0 }),
    setDropAnimationProgress: (progress) => set({ dropAnimationProgress: progress }),
    stopDropAnimation: () => set({ isDropAnimating: false, dropAnimationProgress: 0 }),

    loadPreset: (id: string) => {
      const template = GARMENT_TEMPLATES.find((t) => t.id === id);
      if (template) {
        get().pushHistory();
        const p = template.generator();
        const recFabric =
          FABRIC_PRESETS.find((f) => f.id === template.recommendedFabric) ||
          FABRIC_PRESETS[0];

        const updatedState = {
          activeTemplateId: id,
          pieces: p.pieces,
          seams: p.seams,
          currentMaterial: recFabric,
          customColor: template.recommendedColor,
          selectedPieceId: null,
          selectedVertexIndex: null,
          simulationIteration: get().simulationIteration + 1,
        };

        set({
          ...updatedState,
          ...syncToActiveProject(updatedState),
        });
      }
    },
  };
});
