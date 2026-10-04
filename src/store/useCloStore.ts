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
  MockupSceneMode,
  CanvasViewMode,
  StudioLightingPreset,
  GraphicDecal,
  InternalLine,
} from '../types/cad';
import {
  FABRIC_PRESETS,
  GARMENT_TEMPLATES,
  STITCH_PRESETS,
} from '../utils/patternPresets';
import { arrangePatternPieces, scalePatternPiece, getSeamSegment } from '../utils/patternGeometry';

import { cutPattern } from '../utils/patternCut';
import { splitPatternEdge, splitEdgeSeams, deleteVertexSeams } from '../utils/patternTopology';
import { createDefaultProject, normalizeProject, normalizePatternPiece } from '../utils/projectData';

type ProjectPersistence = (projects: CloProject[]) => Promise<void>;
let projectPersistence: ProjectPersistence | null = null;
export function setProjectPersistence(persistence: ProjectPersistence | null) { projectPersistence = persistence; }

const STORAGE_KEY_PROJECTS = 'openclo_projects_v2';
const STORAGE_KEY_ACTIVE = 'openclo_active_project_id';

function projectDesignState(project: CloProject) {
  const color = project.customColor || '#262626';
  return {
    colorZones: project.colorZones || Object.fromEntries(
      ['body', 'collar', 'sleeves', 'leftSleeve', 'rightSleeve', 'pocket', 'hem', 'cuffs', 'hood'].map((zone) => [zone, color])),
    decals: project.decals || [],
    canvasViewMode: project.canvasViewMode || 'pieces',
    mockupScene: project.mockupScene || 'ghost',
    selectedDecalId: null,
    activeTool: 'select' as CadTool,
    pendingSeamEdge: null,
    pendingFreeSewEdge: null,
    selectedSeamId: null,
  };
}

function loadProjectsFromStorage() {
  let recoveryBackup: string | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) {
      recoveryBackup = raw;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('Invalid workspace');
      const projects = parsed.map(normalizeProject);
      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);
      return { projects, activeProject: projects.find((p) => p.id === activeId) || projects[0], recoveryBackup: null };
    }
  } catch { /* Preserve unreadable data for recovery instead of overwriting it. */ }
  const def = createDefaultProject('uniqlo-u-boxy-tee', 'My first design');
  return { projects: [def], activeProject: def, recoveryBackup };
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveProjects(_projects: CloProject[], _activeId: string) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => { useCloStore.getState().saveActiveProject(); }, 600);
}

type HistoryStep = Pick<CloState, 'pieces' | 'seams' | 'currentMaterial' | 'customColor' | 'activeTemplateId'
  | 'avatar' | 'avatar2D' | 'stitchSettings' | 'colorZones' | 'decals'>;
const designKeys = ['pieces', 'seams', 'currentMaterial', 'customColor', 'activeTemplateId', 'avatar', 'avatar2D',
  'stitchSettings', 'colorZones', 'decals'] as const;
function designSnapshot(state: CloState): HistoryStep {
  return Object.fromEntries(designKeys.map((key) => [key, state[key]])) as unknown as HistoryStep;
}

interface CloState {
  // Project Management
  projects: CloProject[];
  activeProjectId: string;
  isSaved: boolean;
  lastSavedAt: number;
  saveError: string | null;
  recoveryBackup: string | null;

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
  patternLayoutRevision: number;
  showWireframe: boolean;
  showHeatmap: boolean;
  showAvatar: boolean;
  layout: ViewportLayout;
  cameraPreset: 'front' | 'back' | 'side' | 'perspective';

  // Drop Animation
  isDropAnimating: boolean;
  dropAnimationProgress: number; // 0-1

  // History (Undo / Redo)
  undoStack: HistoryStep[];
  redoStack: HistoryStep[];

  // Project Actions
  createNewProject: (name: string, templateId?: string) => void;
  switchProject: (id: string) => void;
  saveActiveProject: () => void | Promise<void>;
  saveProjectAs: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  importProjectData: (project: unknown) => void;
  importProjectsData: (projects: unknown[]) => void;
  replaceWorkspace: (projects: CloProject[]) => void;

  // Pattern Editing (Photoshop-like & CLO3D CAD)
  selectPiece: (id: string | null) => void;
  selectVertex: (index: number | null) => void;
  setActiveTool: (tool: CadTool) => void;
  updatePiecePosition: (id: string, pos: { x: number; y: number }) => void;
  setPieceRotation: (id: string, radians: number) => void;
  updatePieceVertex: (pieceId: string, vertexIndex: number, newPoint: { x: number; y: number }) => void;
  scalePiece: (pieceId: string, factorX: number, factorY?: number) => void;
  scalePieces: (pieceIds: string[], factorX: number, factorY?: number) => void;
  arrangePieces: () => void;
  addVertexToEdge: (pieceId: string, edgeIndex: number, newPoint: { x: number; y: number }, param?: number) => void;
  updatePieceShape: (id: string, points: Point2D[], edgeCurvatures?: Record<number, EdgeCurvature>, internalLines?: InternalLine[], cutting?: PatternPiece['cutting']) => void;
  updatePieceDetails: (id: string, details: Pick<PatternPiece, 'name' | 'role' | 'cutting' | 'placement'>) => void;
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

  // Fashion CAD & 3D Showroom additions
  canvasViewMode: CanvasViewMode;
  mockupScene: MockupSceneMode;
  lightingPreset: StudioLightingPreset;
  colorZones: Record<string, string>;
  decals: GraphicDecal[];
  selectedDecalId: string | null;
  decalTextureRevision: number;

  setCanvasViewMode: (mode: CanvasViewMode) => void;
  setMockupScene: (scene: MockupSceneMode) => void;
  setLightingPreset: (preset: StudioLightingPreset) => void;
  setColorZone: (zone: string, color: string) => void;
  setColorZones: (zones: Record<string, string>) => void;
  setSelectedDecalId: (id: string | null) => void;
  addDecal: (decal: Omit<GraphicDecal, 'id'>) => string;
  updateDecal: (id: string, partial: Partial<GraphicDecal>) => void;
  removeDecal: (id: string) => void;
  reorderDecal: (id: string, direction: 'up' | 'down') => void;
  bumpDecalTextureRevision: () => void;

  // Drop Animation Actions
  startDropAnimation: () => void;
  setDropAnimationProgress: (progress: number) => void;
  stopDropAnimation: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  beginEdit: () => void;
  endEdit: () => void;
  cancelEdit: () => void;
}

const initial = loadProjectsFromStorage();
const active = initial.activeProject;

export const useCloStore = create<CloState>((set, get) => {
  let editSnapshot: HistoryStep | null = null;
  const restore = (snapshot: HistoryStep) => ({ ...snapshot, selectedPieceId: null, selectedVertexIndex: null,
    selectedDecalId: null, pendingSeamEdge: null, pendingFreeSewEdge: null, selectedSeamId: null,
    simulationIteration: get().simulationIteration + 1, decalTextureRevision: get().decalTextureRevision + 1,
    ...syncToActiveProject(snapshot) });
  const projectState = (project: CloProject) => ({
    ...projectDesignState(project), activeProjectId: project.id, pieces: project.pieces, seams: project.seams,
    currentMaterial: project.currentMaterial, customColor: project.customColor, activeTemplateId: project.templateId,
    avatar: project.avatar, avatar2D: project.avatar2D, stitchSettings: project.stitchSettings,
    selectedPieceId: null, selectedVertexIndex: null, undoStack: [], redoStack: [],
    simulationIteration: get().simulationIteration + 1, decalTextureRevision: get().decalTextureRevision + 1,
  });
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
        templateId: updatedState.activeTemplateId ?? state.activeTemplateId,
        avatar: updatedState.avatar ?? state.avatar,
        avatar2D: updatedState.avatar2D ?? state.avatar2D,
        stitchSettings: updatedState.stitchSettings ?? state.stitchSettings,
        colorZones: updatedState.colorZones ?? (p.colorZones || state.colorZones),
        decals: updatedState.decals ?? (p.decals || state.decals),
        mockupScene: updatedState.mockupScene ?? (p.mockupScene || state.mockupScene),
        canvasViewMode: updatedState.canvasViewMode ?? (p.canvasViewMode || state.canvasViewMode),
        updatedAt: now,
      };
    });

    debouncedSaveProjects(updatedProjects, currentActiveId);
    return {
      projects: updatedProjects,
      isSaved: false,
    };
  };

  return {
    // Initial Project State
    projects: initial.projects,
    activeProjectId: active.id,
    isSaved: true,
    lastSavedAt: active.updatedAt,
    saveError: null,
    recoveryBackup: initial.recoveryBackup,

    pieces: active.pieces || [],
    seams: active.seams || [],
    selectedPieceId: null,
    selectedVertexIndex: null,
    // Fashion CAD & 3D Showroom State
    ...projectDesignState(active),
    lightingPreset: 'ecommerce-white',
    decalTextureRevision: 0,

    currentMaterial: active.currentMaterial || FABRIC_PRESETS[0],
    customColor: active.customColor || '#262626',
    activeTemplateId: active.templateId || 'uniqlo-u-boxy-tee',
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
      opacity: 0.35,
      showGuides: true,
      position: { x: 300, y: 260 },
    },

    isSimulating: false,
    simulationDynamics: 0.6,
    simulationIteration: 0,
    patternLayoutRevision: 0,
    showWireframe: false,
    showHeatmap: false,
    showAvatar: true,
    layout: 'dual',
    cameraPreset: 'perspective',

    // Drop Animation
    isDropAnimating: false,
    dropAnimationProgress: 0,

    undoStack: [],
    redoStack: [],

    // ==========================================
    // History (Undo / Redo)
    // ==========================================
    pushHistory: () => {
      if (editSnapshot) return;
      set({ undoStack: [...get().undoStack.slice(-39), designSnapshot(get())], redoStack: [] });
    },
    beginEdit: () => { if (!editSnapshot) editSnapshot = designSnapshot(get()); },
    endEdit: () => {
      const snapshot = editSnapshot;
      editSnapshot = null;
      if (snapshot && designKeys.some((key) => snapshot[key] !== get()[key])) {
        set({ undoStack: [...get().undoStack.slice(-39), snapshot], redoStack: [] });
      }
    },
    cancelEdit: () => {
      const snapshot = editSnapshot;
      editSnapshot = null;
      if (snapshot) set(restore(snapshot));
    },
    undo: () => {
      get().endEdit();
      const { undoStack, redoStack } = get();
      const previous = undoStack.at(-1);
      if (!previous) return;
      set({ ...restore(previous), undoStack: undoStack.slice(0, -1), redoStack: [designSnapshot(get()), ...redoStack] });
    },
    redo: () => {
      get().endEdit();
      const { undoStack, redoStack } = get();
      const next = redoStack[0];
      if (!next) return;
      set({ ...restore(next), undoStack: [...undoStack, designSnapshot(get())], redoStack: redoStack.slice(1) });
    },

    // ==========================================
    // Project Management Actions
    // ==========================================
    replaceWorkspace: (projects) => {
      editSnapshot = null;
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      const first = projects[0] || createDefaultProject('uniqlo-u-boxy-tee', 'My first design');
      set({ projects: projects.length ? projects : [first], ...projectState(first), saveError: null, isSaved: true });
    },
    createNewProject: (name, templateId = 'tshirt') => {
      get().endEdit();
      const project = createDefaultProject(templateId, name.trim().slice(0, 120) || 'Untitled design');
      project.decals = [];
      project.canvasViewMode = 'assembled';
      const projects = [project, ...get().projects];
      set({ projects, ...projectState(project), isSaved: false });
      debouncedSaveProjects(projects, project.id);
    },
    switchProject: (id) => {
      get().endEdit();
      const project = get().projects.find((p) => p.id === id);
      if (!project) return;
      set(projectState(project));
      debouncedSaveProjects(get().projects, id);
    },
    saveActiveProject: () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
      const state = get();
      if (projectPersistence) {
        return projectPersistence(state.projects).then(() => {
          if (get().projects === state.projects) set({ isSaved: true, lastSavedAt: Date.now(), saveError: null });
        }).catch((error: Error) => { set({ isSaved: false, saveError: error.message || 'Could not save. Download a backup and retry.' }); });
      }
      if (state.recoveryBackup) {
        set({ saveError: 'An older workspace could not be read. Download its recovery backup before saving.', isSaved: false });
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(state.projects));
        localStorage.setItem(STORAGE_KEY_ACTIVE, state.activeProjectId);
        set({ isSaved: true, lastSavedAt: Date.now(), saveError: null });
      } catch {
        set({ isSaved: false, saveError: 'Storage is full or unavailable. Download a project backup, then free space and retry Save.' });
      }
    },
    saveProjectAs: (name) => {
      get().endEdit();
      const state = get();
      const project = state.projects.find((p) => p.id === state.activeProjectId);
      if (!project) return;
      const clone = { ...project, id: crypto.randomUUID(), name: name.trim().slice(0, 120) || 'Untitled design', createdAt: Date.now(), updatedAt: Date.now() };
      const projects = [clone, ...state.projects];
      set({ projects, ...projectState(clone), isSaved: false });
      debouncedSaveProjects(projects, clone.id);
    },
    renameProject: (id, name) => {
      const projects = get().projects.map((p) => p.id === id ? { ...p, name: name.trim().slice(0, 120) || 'Untitled design', updatedAt: Date.now() } : p);
      set({ projects, isSaved: false });
      debouncedSaveProjects(projects, get().activeProjectId);
    },
    deleteProject: (id) => {
      if (!get().projects.some((p) => p.id === id)) return;
      get().endEdit();
      const projects = get().projects.filter((p) => p.id !== id);
      if (!projects.length) projects.push(createDefaultProject('tshirt', 'My first design'));
      const next = projects.find((p) => p.id === get().activeProjectId) || projects[0];
      set({ projects, ...projectState(next), isSaved: false });
      debouncedSaveProjects(projects, next.id);
    },
    duplicateProject: (id) => {
      const project = get().projects.find((p) => p.id === id);
      if (!project) return;
      const clone = { ...project, id: crypto.randomUUID(), name: `${project.name} (Copy)`.slice(0,120), createdAt: Date.now(), updatedAt: Date.now() };
      const projects = [clone, ...get().projects];
      set({ projects, isSaved: false });
      debouncedSaveProjects(projects, get().activeProjectId);
    },
    importProjectData: (value) => get().importProjectsData([value]),
    importProjectsData: (values) => {
      if (!values.length || values.length > 100) throw new Error('Import between 1 and 100 designs.');
      const imported = values.map((value) => ({ ...normalizeProject(value), id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now() }));
      get().endEdit();
      const projects = [...imported, ...get().projects];
      set({ projects, ...projectState(imported[0]), isSaved: false });
      debouncedSaveProjects(projects, imported[0].id);
    },

    // ==========================================
    // 2D Pattern CAD & Photoshop-like Editing
    // ==========================================
    selectPiece: (id) => set({ selectedPieceId: id, selectedVertexIndex: null }),
    selectVertex: (index) => set({ selectedVertexIndex: index }),
    setActiveTool: (tool) => {
      const canvasViewMode = tool === 'graphic' && get().activeTemplateId !== 'custom-pattern' ? 'assembled'
        : tool === 'select' || tool === 'move' ? get().canvasViewMode : 'pieces';
      set({ activeTool: tool, canvasViewMode, pendingSeamEdge: null, pendingFreeSewEdge: null, selectedSeamId: null,
        ...syncToActiveProject({ canvasViewMode }) });
    },

    updatePiecePosition: (id, pos) => {
      if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || get().pieces.find((p) => p.id === id)?.locked) return;
      get().pushHistory();
      const updatedPieces = get().pieces.map((p) => (p.id === id ? { ...p, position: pos } : p));
      set({
        pieces: updatedPieces,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    setPieceRotation: (id, radians) => {
      if (!Number.isFinite(radians) || get().pieces.find((p) => p.id === id)?.locked) return;
      get().pushHistory();
      const updatedPieces = get().pieces.map((p) => (p.id === id ? { ...p, rotation: radians } : p));
      set({
        pieces: updatedPieces,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    updatePieceVertex: (pieceId, vertexIndex, newPoint) => {
      if (!Number.isFinite(newPoint.x) || !Number.isFinite(newPoint.y) || Math.abs(newPoint.x) > 3600 || Math.abs(newPoint.y) > 3600 || get().pieces.find((p) => p.id === pieceId)?.locked) return;
      get().pushHistory();
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

    updatePieceShape: (id, points, edgeCurvatures, internalLines, cutting) => {
      const piece = get().pieces.find((p) => p.id === id);
      if (!piece || piece.locked || points.length < 3 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 3600 || Math.abs(p.y) > 3600)) return;
      get().pushHistory();
      const pieces = get().pieces.map((p) => p.id === id ? { ...p, points, edgeCurvatures, internalLines: internalLines ?? p.internalLines, cutting: cutting ?? p.cutting } : p);
      set({ pieces, simulationIteration: get().simulationIteration + 1, ...syncToActiveProject({ pieces }) });
    },
    updatePieceDetails: (id, details) => {
      const piece = get().pieces.find((p) => p.id === id);
      if (!piece || piece.locked) return;
      const next = normalizePatternPiece({ ...piece, ...details });
      get().pushHistory();
      const pieces = get().pieces.map((p) => p.id === id ? next : p);
      set({ pieces, simulationIteration: get().simulationIteration + 1, ...syncToActiveProject({ pieces }) });
    },
    scalePiece: (pieceId, factorX, factorY = factorX) => {
      get().scalePieces([pieceId], factorX, factorY);
    },

    scalePieces: (pieceIds, factorX, factorY = factorX) => {
      if (!Number.isFinite(factorX) || !Number.isFinite(factorY) || factorX <= 0 || factorY <= 0) return;
      const ids = new Set(pieceIds);
      if (!get().pieces.some((p) => ids.has(p.id) && !p.locked)) return;
      get().pushHistory();
      const updatedPieces = get().pieces.map((p) => ids.has(p.id) ? scalePatternPiece(p, factorX, factorY) : p);

      set({
        pieces: updatedPieces,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces }),
      });
    },

    arrangePieces: () => {
      get().pushHistory();
      const pieces = arrangePatternPieces(get().pieces);
      set({ pieces, patternLayoutRevision: get().patternLayoutRevision + 1, ...syncToActiveProject({ pieces }) });
    },

    addVertexToEdge: (pieceId, edgeIndex, point, param) => {
      const piece = get().pieces.find((p) => p.id === pieceId);
      if (!piece || piece.locked || !piece.points[edgeIndex]) return;
      const a = piece.points[edgeIndex], b = piece.points[(edgeIndex + 1) % piece.points.length];
      const chord = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      const t = Math.max(0.001, Math.min(0.999, param ?? ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / chord));
      get().pushHistory();
      const split = splitPatternEdge(piece, edgeIndex, { ...point, id: crypto.randomUUID() }, t);
      const pieces = get().pieces.map((p) => p.id === pieceId ? split : p);
      const seams = splitEdgeSeams(get().seams, pieceId, edgeIndex, t);
      set({ pieces, seams, selectedVertexIndex: edgeIndex + 1, simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces, seams }) });
    },

    deleteVertex: (pieceId, vertexIndex) => {
      const piece = get().pieces.find((p) => p.id === pieceId);
      if (!piece || piece.locked || piece.points.length <= 3 || !piece.points[vertexIndex]) return; // Maintain valid polygon

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

        const prevEdge = (vertexIndex - 1 + n) % n;
        return { ...p, points: newPts, edgeCurvatures: Object.keys(newCurvatures).length > 0 ? newCurvatures : undefined,
          ...(p.cutting ? { cutting: { ...p.cutting, notches: p.cutting.notches.filter((notch) => notch.edgeIndex !== vertexIndex && notch.edgeIndex !== prevEdge)
            .map((notch) => ({ ...notch, edgeIndex: notch.edgeIndex > vertexIndex ? notch.edgeIndex - 1 : notch.edgeIndex })) } } : {}) };
      });

      const seams = deleteVertexSeams(get().seams, piece, vertexIndex);
      set({
        seams, pieces: updatedPieces,
        selectedVertexIndex: null,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ pieces: updatedPieces, seams }),
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
      get().pushHistory();
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
        edgeCurvatures: piece.edgeCurvatures && Object.fromEntries(Object.entries(piece.edgeCurvatures).map(([key, curve]) => [key, { ...curve, cpx: mirrorX ? -curve.cpx : curve.cpx }])),
        internalLines: piece.internalLines?.map((line) => ({ ...line, points: line.points.map((point) => ({ ...point, x: mirrorX ? -point.x : point.x })) })),
        ...(piece.cutting ? { cutting: { ...piece.cutting, grainlineAngle: mirrorX ? -piece.cutting.grainlineAngle : piece.cutting.grainlineAngle,
          notches: piece.cutting.notches.map((notch) => ({ ...notch })) } } : {}),
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
      get().pushHistory();
      const updated = get().pieces.map((p) => (p.id === pieceId ? { ...p, locked: !p.locked } : p));
      set({ pieces: updated, ...syncToActiveProject({ pieces: updated }) });
    },

    togglePieceVisibility: (pieceId) => {
      get().pushHistory();
      const updated = get().pieces.map((p) => (p.id === pieceId ? { ...p, visible: p.visible === false ? true : false } : p));
      set({ pieces: updated, ...syncToActiveProject({ pieces: updated }) });
    },

    renamePiece: (pieceId, name) => {
      get().pushHistory();
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

    cutPiece: (pieceId, start, end) => {
      const piece = get().pieces.find((p) => p.id === pieceId);
      if (!piece) return false;
      const local = (point: { x: number; y: number }): Point2D => {
        const x = point.x - piece.position.x, y = point.y - piece.position.y;
        return { id: '', x: x * Math.cos(piece.rotation) + y * Math.sin(piece.rotation), y: -x * Math.sin(piece.rotation) + y * Math.cos(piece.rotation) };
      };
      const result = cutPattern(piece, get().seams, local(start), local(end));
      if (!result) return false;
      get().pushHistory();
      const pieces = get().pieces.filter((p) => p.id !== pieceId).concat(result.pieces);
      set({ pieces, seams: result.seams, selectedPieceId: result.pieces[1].id, selectedVertexIndex: null,
        simulationIteration: get().simulationIteration + 1, ...syncToActiveProject({ pieces, seams: result.seams }) });
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
      get().pushHistory();
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
      const byId = new Map(get().pieces.map((p) => [p.id, p]));
      if (![edgeA, edgeB].every((edge) => byId.has(edge.pieceId) && getSeamSegment(byId.get(edge.pieceId)!, edge))) return;
      // Don't sew an edge to itself
      if (edgeA.pieceId === edgeB.pieceId && edgeA.edgeIndex === edgeB.edgeIndex && edgeA.internalLineId === edgeB.internalLineId) {
        return set({ pendingSeamEdge: null });
      }

      get().pushHistory();
      const state = get();
      const chosenStitch = stitchType || state.stitchSettings.defaultType || 'single-needle';
      const preset = STITCH_PRESETS.find((sp) => sp.id === chosenStitch);

      const sameEdge = (a: SeamEdge, b: SeamEdge) => a.pieceId === b.pieceId && a.edgeIndex === b.edgeIndex
        && a.internalLineId === b.internalLineId && (a.paramStart ?? 0) === (b.paramStart ?? 0) && (a.paramEnd ?? 1) === (b.paramEnd ?? 1);
      const existingIndex = state.seams.findIndex((s) => (sameEdge(s.edgeA, edgeA) && sameEdge(s.edgeB, edgeB))
        || (sameEdge(s.edgeA, edgeB) && sameEdge(s.edgeB, edgeA)));

      // If exact seam already exists, update its stitch parameters without breaking
      if (existingIndex !== -1) {
        const updatedSeams = [...state.seams];
        updatedSeams[existingIndex] = {
          ...updatedSeams[existingIndex],
          stitchType: chosenStitch,
          strength: preset?.defaultStrength ?? 1.0,
          threadColor: state.stitchSettings.defaultColor,
          seamAllowanceMm: preset?.seamAllowanceMm ?? 12,
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
        strength: preset?.defaultStrength ?? 1.0,
        stitchType: chosenStitch,
        threadColor: state.stitchSettings.defaultColor,
        seamAllowanceMm: preset?.seamAllowanceMm ?? 12,
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
      get().pushHistory();
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
      get().pushHistory();
      const updated = { ...get().stitchSettings, defaultType: type };
      set({ stitchSettings: updated, ...syncToActiveProject({ stitchSettings: updated }) });
    },

    setDefaultThreadColor: (color) => {
      get().pushHistory();
      const updated = { ...get().stitchSettings, defaultColor: color };
      set({ stitchSettings: updated, ...syncToActiveProject({ stitchSettings: updated }) });
    },

    toggleShowStitches: () => {
      get().pushHistory();
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
      get().pushHistory();
      set({
        currentMaterial: { ...mat, color: get().customColor },
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ currentMaterial: { ...mat, color: get().customColor } }),
      });
    },

    setCustomColor: (color) => {
      if (!/^#[\da-f]{6}$/i.test(color)) return;
      get().pushHistory();
      const updatedMat = { ...get().currentMaterial, color };
      const colorZones = Object.fromEntries(Object.keys(get().colorZones).map((zone) => [zone, color]));
      set({
        customColor: color,
        currentMaterial: updatedMat,
        colorZones,
        decalTextureRevision: get().decalTextureRevision + 1,
        ...syncToActiveProject({ customColor: color, currentMaterial: updatedMat, colorZones }),
      });
    },

    setAvatarMeasurement: (key, val) => {
      const bounds = { height: [80, 230], chestCircumference: [30, 220], waistCircumference: [25, 220], hipsCircumference: [35, 240], shoulderWidth: [15,75] };
      if (key in bounds) { const [min,max] = bounds[key as keyof typeof bounds]; if (typeof val !== 'number' || !Number.isFinite(val) || val < min || val > max) return; }
      if (key === 'gender' && val !== 'male' && val !== 'female') return;
      if (key === 'showSkin' && typeof val !== 'boolean') return;
      get().pushHistory();
      const updatedAvatar = { ...get().avatar, [key]: val };
      set({
        avatar: updatedAvatar,
        simulationIteration: get().simulationIteration + 1,
        ...syncToActiveProject({ avatar: updatedAvatar }),
      });
    },

    updateAvatar2D: (partial) => {
      get().pushHistory();
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

    // ==========================================
    // Fashion CAD & 3D Showroom Actions
    // ==========================================
    setCanvasViewMode: (mode) => {
      set({ canvasViewMode: mode, activeTool: 'select', pendingSeamEdge: null, pendingFreeSewEdge: null,
        ...syncToActiveProject({ canvasViewMode: mode }) });
    },

    setMockupScene: (scene) => {
      set({ mockupScene: scene, ...syncToActiveProject({ mockupScene: scene }) });
    },

    setLightingPreset: (preset) => {
      set({ lightingPreset: preset });
    },

    setColorZone: (zone, color) => {
      if (!/^#[\da-f]{6}$/i.test(color) || !(zone in get().colorZones)) return;
      get().pushHistory();
      const current = get().colorZones || {};
      const updated = { ...current, [zone]: color, ...(zone === 'sleeves' ? { leftSleeve: color, rightSleeve: color } : {}) };
      const customColor = zone === 'body' ? color : get().customColor;
      set((state) => ({
        colorZones: updated,
        customColor,
        decalTextureRevision: state.decalTextureRevision + 1,
        ...syncToActiveProject({ colorZones: updated, customColor }),
      }));
    },

    setColorZones: (zones) => {
      get().pushHistory();
      set((state) => ({
        colorZones: zones,
        customColor: zones.body || state.customColor,
        decalTextureRevision: state.decalTextureRevision + 1,
        ...syncToActiveProject({ colorZones: zones, customColor: zones.body || state.customColor }),
      }));
    },

    setSelectedDecalId: (id) => set({ selectedDecalId: id }),

    addDecal: (decalData) => {
      get().pushHistory();
      const id = `decal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newDecal: GraphicDecal = { ...decalData, id };
      set((state) => {
        const updated = [...state.decals, newDecal];
        return {
          decals: updated,
          selectedDecalId: id,
          decalTextureRevision: state.decalTextureRevision + 1,
          ...syncToActiveProject({ decals: updated }),
        };
      });
      return id;
    },

    updateDecal: (id, partial) => {
      get().pushHistory();
      set((state) => {
        const updated = state.decals.map((d) => (d.id === id ? { ...d, ...partial } : d));
        return {
          decals: updated,
          decalTextureRevision: state.decalTextureRevision + 1,
          ...syncToActiveProject({ decals: updated }),
        };
      });
    },

    removeDecal: (id) => {
      get().pushHistory();
      set((state) => {
        const updated = state.decals.filter((d) => d.id !== id);
        return {
          decals: updated,
          selectedDecalId: state.selectedDecalId === id ? null : state.selectedDecalId,
          decalTextureRevision: state.decalTextureRevision + 1,
          ...syncToActiveProject({ decals: updated }),
        };
      });
    },

    reorderDecal: (id, direction) => {
      get().pushHistory();
      set((state) => {
        const idx = state.decals.findIndex((d) => d.id === id);
        if (idx === -1) return state;
        const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
        if (targetIdx < 0 || targetIdx >= state.decals.length) return state;
        const copy = [...state.decals];
        const [moved] = copy.splice(idx, 1);
        copy.splice(targetIdx, 0, moved);
        return {
          decals: copy,
          decalTextureRevision: state.decalTextureRevision + 1,
          ...syncToActiveProject({ decals: copy }),
        };
      });
    },

    bumpDecalTextureRevision: () => {
      set((state) => ({ decalTextureRevision: state.decalTextureRevision + 1 }));
    },

    loadPreset: (id: string) => {
      const template = GARMENT_TEMPLATES.find((t) => t.id === id);
      if (template) {
        get().pushHistory();
        const p = template.generator();
        const recFabric =
          FABRIC_PRESETS.find((f) => f.id === template.recommendedFabric) ||
          FABRIC_PRESETS[0];

        const defaultCol = template.recommendedColor || '#262626';
        const newColorZones = {
          body: defaultCol,
          collar: defaultCol,
          sleeves: defaultCol,
          leftSleeve: defaultCol,
          rightSleeve: defaultCol,
          pocket: defaultCol,
          hem: defaultCol,
          cuffs: defaultCol,
          hood: defaultCol,
        };

        const updatedState = {
          activeTemplateId: id,
          pieces: arrangePatternPieces(p.pieces),
          seams: p.seams,
          currentMaterial: recFabric,
          customColor: defaultCol,
          colorZones: newColorZones,
          selectedPieceId: null,
          selectedVertexIndex: null,
          simulationIteration: get().simulationIteration + 1,
          decalTextureRevision: get().decalTextureRevision + 1,
        };

        set({
          ...updatedState,
          ...syncToActiveProject(updatedState),
        });
      }
    },
  };
});
