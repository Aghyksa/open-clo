import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { getPatternBounds, getPatternEdgeLength, PATTERN_UNITS_PER_CM } from '../../utils/patternGeometry';
import { getGrainlineSegments, getPieceCuttingGeometry } from '../../utils/cuttingGeometry';
import { dragCurvature, findPatternEdge, isPointInPattern, localPoint, rotationDelta, scalePatternShape, seamLocalPoints, useCanvasPointers } from '../../utils/canvasInteraction';
import { TOOLS } from '../UI/editorTools';
import type { PatternPiece, SeamEdge, AvatarConfig, Avatar2DConfig, PatchPresetType, EdgeCurvature } from '../../types/cad';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scissors,
  Layers,
  User,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Plus,
  Shapes,
} from 'lucide-react';

export const PatternCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    setCanvasViewMode,
    activeTemplateId,
    patternLayoutRevision,
    pieces,
    seams,
    selectedPieceId,
    selectedVertexIndex,
    activeTool,
    pendingSeamEdge,
    avatar,
    avatar2D,
    stitchSettings,
    layout,
    selectPiece,
    selectVertex,
    updatePiecePosition,
    updatePieceVertex,
    setPieceRotation,
    addVertexToEdge,
    deleteVertex,
    duplicatePiece,
    deletePiece,
    togglePieceLock,
    togglePieceVisibility,
    addBlankPiece,
    setPendingSeamEdge,
    addSeam,
    removeSeam,
    updateAvatar2D,
    setAvatarMeasurement,
    setActiveTool,
    cutPiece,
    addFabricPatch,
    addCustomPiece,
    setEdgeCurvature,
    beginEdit,
    endEdit,
    cancelEdit,
    updatePieceShape,
    // Free-Sew & Edit-Sew
    pendingFreeSewEdge,
    setPendingFreeSewEdge,
    selectedSeamId,
    setSelectedSeamId,
    reverseSeam,
  } = useCloStore();

  // Container dimensions for non-stretching high-DPI canvas
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Viewport Pan & Zoom state
  const [viewState, setViewState] = useState({
    scale: 0.75,
    offsetX: 120,
    offsetY: 70,
  });

  const [showSeams, setShowSeams] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showBodyGuide, setShowBodyGuide] = useState(false);
  const sewingTool = ['sew', 'free-sew', 'edit-sew'].includes(activeTool);
  const pieceById = React.useMemo(() => new Map(pieces.map((piece) => [piece.id, piece])), [pieces]);
  const cuttingById = React.useMemo(() => new Map(pieces.map((piece) => [piece.id, getPieceCuttingGeometry(piece)])), [pieces]);

  const fitView = useCallback((targetPieces = useCloStore.getState().pieces) => {
    const visible = targetPieces.filter((piece) => piece.visible !== false && piece.points.length >= 3);
    if (!visible.length || !canvasDims.width || !canvasDims.height) return;
    const bounds = visible.map((piece) => getPatternBounds(piece, true));
    const left = Math.min(...bounds.map((b) => b.minX)), top = Math.min(...bounds.map((b) => b.minY));
    const width = Math.max(...bounds.map((b) => b.maxX)) - left;
    const height = Math.max(...bounds.map((b) => b.maxY)) - top;
    const scale = Math.max(0.08, Math.min(1.5, (canvasDims.width - 64) / Math.max(1, width),
      (canvasDims.height - 180) / Math.max(1, height)));
    setViewState({ scale, offsetX: (canvasDims.width - width * scale) / 2 - left * scale,
      offsetY: 100 + (canvasDims.height - 180 - height * scale) / 2 - top * scale });
  }, [canvasDims.width, canvasDims.height]);
  const pieceSet = pieces.map((piece) => piece.id).join(',');
  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView());
    return () => cancelAnimationFrame(frame);
  }, [fitView, activeTemplateId, pieceSet, patternLayoutRevision]);

  // Layers panel overlay toggle
  const [showLayersOverlay, setShowLayersOverlay] = useState(false);
  const [showAvatarControls, setShowAvatarControls] = useState(false);
  const [showPatchModal, setShowPatchModal] = useState(false);

  // CLO3D-Style Sewing hover state & interactive preview
  const [sewHover, setSewHover] = useState<{
    pieceId: string;
    edgeIndex: number;
    lenCm: number;
    midScreen: { x: number; y: number };
    startScreen: { x: number; y: number };
    endScreen: { x: number; y: number };
  } | null>(null);
  const [mouseScreenPos, setMouseScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [seamToast, setSeamToast] = useState<string | null>(null);

  // Cutting Tool state
  const [cutLine, setCutLine] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  // Polygon drawing tool state
  const [drawingPolygonPoints, setDrawingPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [polygonMousePos, setPolygonMousePos] = useState<{ x: number; y: number } | null>(null);

  // Mouse hover state for pen/curve preview
  const [hoverInfo, setHoverInfo] = useState<{
    pieceId: string;
    edgeIndex: number;
    point: { x: number; y: number };
  } | null>(null);

  // Free-Sew hover state
  const [freeSewHover, setFreeSewHover] = useState<{
    pieceId: string;
    edgeIndex: number;
    param: number;
    worldPoint: { x: number; y: number };
    screenPoint: { x: number; y: number };
  } | null>(null);

  // Edit-Sew hover/context menu
  const [editSewHover, setEditSewHover] = useState<string | null>(null); // seam id
  const [seamContextMenu, setSeamContextMenu] = useState<{
    x: number;
    y: number;
    seamId: string;
  } | null>(null);

  // Observe container resizing (prevents any canvas distortion / stretching on view switch or resize)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasDims({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });

    ro.observe(canvas);
    if (parent) ro.observe(parent);

    window.addEventListener('resize', updateSize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Auto-dismiss seam toast after 3.5 seconds
  useEffect(() => {
    if (!seamToast) return;
    const timer = setTimeout(() => setSeamToast(null), 3500);
    return () => clearTimeout(timer);
  }, [seamToast]);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<
    'pan' | 'piece' | 'vertex' | 'scale' | 'rotate' | 'curve' | 'avatar-guide' | 'cut' | null
  >(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedPieceIdRef = useRef<string | null>(null);
  const draggedVertexRef = useRef<number | null>(null);
  const dragHandleRef = useRef<string | null>(null); // 'nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w', 'rot'
  const initialPiecePosRef = useRef({ x: 0, y: 0 });
  const initialPieceRotationRef = useRef(0);
  const initialShapeRef = useRef<Pick<PatternPiece, 'points' | 'edgeCurvatures' | 'internalLines' | 'cutting'>>({ points: [] });
  const initialDragAngleRef = useRef(0);
  const initialVertexPosRef = useRef({ x: 0, y: 0 });

  // Curve tool drag state
  const curveDragRef = useRef<{
    pieceId: string;
    edgeIndex: number;
    startMouse: { x: number; y: number }; // world coords at drag start
    initialCurvature: EdgeCurvature | null;
    controlWeight: number;
  } | null>(null);

  // Transform (bounding box) state for select tool
  const transformAnchorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 }); // opposite corner in local coords
  const transformBoundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }>({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 });

  // Convert Screen (Canvas pixel) to World 2D coords
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      return {
        x: (sx - viewState.offsetX) / viewState.scale,
        y: (sy - viewState.offsetY) / viewState.scale,
      };
    },
    [viewState]
  );

  // Convert World 2D coords to Screen
  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      return {
        x: wx * viewState.scale + viewState.offsetX,
        y: wy * viewState.scale + viewState.offsetY,
      };
    },
    [viewState]
  );

  // Helper: Rotate local point by angle
  const rotatePoint = (x: number, y: number, rad: number) => {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: x * cos - y * sin,
      y: x * sin + y * cos,
    };
  };

  // Helper: Un-rotate world point around piece position
  const unrotateFromPiece = (wx: number, wy: number, piece: PatternPiece) => {
    return localPoint({ x: wx, y: wy }, piece.position, piece.rotation);
  };

  // Check point in polygon (accounts for piece rotation)
  const isPointInPiece = (wx: number, wy: number, piece: PatternPiece) => {
    return piece.visible !== false && isPointInPattern(piece, { x: wx, y: wy });
  };

  // Find vertex under mouse
  const findVertexAt = (wx: number, wy: number, piece: PatternPiece, radius = 14) => {
    const local = unrotateFromPiece(wx, wy, piece);
    const worldRadius = radius / viewState.scale;
    for (let i = 0; i < piece.points.length; i++) {
      const pt = piece.points[i];
      const dist = Math.hypot(local.x - pt.x, local.y - pt.y);
      if (dist <= worldRadius) return i;
    }
    return null;
  };

  // Find edge under mouse
  const findEdgeAt = (wx: number, wy: number, piece: PatternPiece, threshold = 14) => {
    return piece.visible === false ? null : findPatternEdge(piece, { x: wx, y: wy }, threshold / viewState.scale);
  };

  // Find edge with parameter t (0-1 along edge) for free-sew
  const findEdgeWithParam = (wx: number, wy: number, piece: PatternPiece, threshold = 14) => {
    const hit = findEdgeAt(wx, wy, piece, threshold);
    if (!hit) return null;
    const rot = rotatePoint(hit.point.x, hit.point.y, piece.rotation);
    return { edgeIndex: hit.edgeIndex, param: hit.param,
      worldPoint: { x: piece.position.x + rot.x, y: piece.position.y + rot.y } };
  };

  const seamScreenPoints = useCallback((piece: PatternPiece, edge: SeamEdge) => seamLocalPoints(piece, edge).map((point) => {
    const rotated = rotatePoint(point.x, point.y, piece.rotation);
    return worldToScreen(piece.position.x + rotated.x, piece.position.y + rotated.y);
  }), [worldToScreen]);
  const traceSeam = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) => {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
  };
  const seamMidpoint = (points: { x: number; y: number }[]) => {
    const before = points[Math.floor((points.length - 1) / 2)], after = points[Math.ceil((points.length - 1) / 2)];
    return { x: (before.x + after.x) / 2, y: (before.y + after.y) / 2 };
  };
  const seamLength = (piece: PatternPiece, edge: SeamEdge) => {
    if (!edge.internalLineId) return getEdgeLength(piece, edge.edgeIndex, edge.paramStart, edge.paramEnd);
    const points = seamLocalPoints(piece, edge);
    return points.length < 2 ? 0 : Math.round(Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
      / PATTERN_UNITS_PER_CM * 10) / 10;
  };

  // Find seam near screen point (for edit-sew tool)
  const findSeamNearPoint = (sx: number, sy: number, threshold = 18): string | null => {
    for (const seam of seams) {
      const pieceA = pieceById.get(seam.edgeA.pieceId), pieceB = pieceById.get(seam.edgeB.pieceId);
      if (!pieceA || !pieceB || pieceA.visible === false || pieceB.visible === false) continue;
      const pathA = seamScreenPoints(pieceA, seam.edgeA), pathB = seamScreenPoints(pieceB, seam.edgeB);
      if (pathA.length < 2 || pathB.length < 2) continue;
      const midA = seamMidpoint(pathA), midB = seamMidpoint(pathB);
      const distance = Math.hypot(midB.x - midA.x, midB.y - midA.y) || 1, bow = Math.min(distance * 0.25, 60);
      const cx = (midA.x + midB.x) / 2 - (midB.y - midA.y) / distance * bow;
      const cy = (midA.y + midB.y) / 2 + (midB.x - midA.x) / distance * bow;
      const arc = Array.from({ length: 21 }, (_, index) => {
        const t = index / 20, inverse = 1 - t;
        return { x: inverse * inverse * midA.x + 2 * inverse * t * cx + t * t * midB.x,
          y: inverse * inverse * midA.y + 2 * inverse * t * cy + t * t * midB.y };
      });
      for (const path of [pathA, pathB, arc]) for (let i = 1; i < path.length; i++) {
        if (distToSegment(sx, sy, path[i - 1].x, path[i - 1].y, path[i].x, path[i].y) <= threshold) return seam.id;
      }
    }
    return null;
  };

  // Distance from point to line segment
  const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };

  const getEdgeLength = (piece: PatternPiece, edge: number, start = 0, end = 1) =>
    Math.round(getPatternEdgeLength(piece, edge, start, end) * 10) / 10;

  // Check if mouse hits transform handles (bounding box)
  const findTransformHandleAt = (wx: number, wy: number, piece: PatternPiece) => {
    const local = unrotateFromPiece(wx, wy, piece);
    const bounds = getPatternBounds(piece);
    const handleSize = 16 / viewState.scale;

    const handles: { id: string; x: number; y: number }[] = [
      { id: 'nw', x: bounds.minX, y: bounds.minY },
      { id: 'ne', x: bounds.maxX, y: bounds.minY },
      { id: 'se', x: bounds.maxX, y: bounds.maxY },
      { id: 'sw', x: bounds.minX, y: bounds.maxY },
      { id: 'n', x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY },
      { id: 's', x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY },
      { id: 'w', x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 },
      { id: 'e', x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 },
      { id: 'rot', x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY - 35 / viewState.scale },
    ];

    for (const h of handles) {
      if (Math.hypot(local.x - h.x, local.y - h.y) <= handleSize) {
        return h.id;
      }
    }
    return null;
  };

  // ==========================================
  // Draw Anatomical 2D Avatar Silhouette (CLO3D Style)
  // ==========================================
  const drawAvatar2DGuide = useCallback((
    ctx: CanvasRenderingContext2D,
    av: AvatarConfig,
    av2d: Avatar2DConfig
  ) => {
    if (!av2d.visible) return;

    ctx.save();
    ctx.globalAlpha = av2d.opacity;

    // Body measurements use the same scale as the cloth mesh.
    // Front view center
    const centerX = av2d.position.x;
    const centerY = av2d.position.y;

    const shoulderHalfW = ((av.shoulderWidth || 40) * PATTERN_UNITS_PER_CM) / 2;
    const bustHalfW = ((av.chestCircumference / Math.PI) * PATTERN_UNITS_PER_CM) / 2 * 1.08;
    const waistHalfW = ((av.waistCircumference / Math.PI) * PATTERN_UNITS_PER_CM) / 2 * 1.02;
    const hipHalfW = ((av.hipsCircumference / Math.PI) * PATTERN_UNITS_PER_CM) / 2 * 1.12;

    const viewsToDraw =
      av2d.view === 'both' ? ['front', 'back'] : [av2d.view];

    viewsToDraw.forEach((viewType, vIdx) => {
      const offsetX =
        viewsToDraw.length > 1 ? centerX + (vIdx === 0 ? -190 : 190) : centerX;

      // 1. Mannequin anatomical contour
      ctx.beginPath();
      // Head & Neck
      const neckTop = worldToScreen(offsetX, centerY - 310);
      const neckBaseL = worldToScreen(offsetX - 45, centerY - 250);
      const shoulderL = worldToScreen(offsetX - shoulderHalfW, centerY - 220);
      const armpitL = worldToScreen(offsetX - bustHalfW * 0.95, centerY - 110);
      const waistL = worldToScreen(offsetX - waistHalfW, centerY);
      const hipL = worldToScreen(offsetX - hipHalfW, centerY + 100);
      const crotchL = worldToScreen(offsetX - 25, centerY + 200);
      const legL = worldToScreen(offsetX - 45, centerY + 360);

      const legR = worldToScreen(offsetX + 45, centerY + 360);
      const crotchR = worldToScreen(offsetX + 25, centerY + 200);
      const hipR = worldToScreen(offsetX + hipHalfW, centerY + 100);
      const waistR = worldToScreen(offsetX + waistHalfW, centerY);
      const armpitR = worldToScreen(offsetX + bustHalfW * 0.95, centerY - 110);
      const shoulderR = worldToScreen(offsetX + shoulderHalfW, centerY - 220);
      const neckBaseR = worldToScreen(offsetX + 45, centerY - 250);

      ctx.moveTo(neckTop.x, neckTop.y);
      ctx.lineTo(neckBaseL.x, neckBaseL.y);
      ctx.lineTo(shoulderL.x, shoulderL.y);
      ctx.quadraticCurveTo(
        worldToScreen(offsetX - bustHalfW, centerY - 150).x,
        worldToScreen(offsetX - bustHalfW, centerY - 150).y,
        armpitL.x,
        armpitL.y
      );
      ctx.quadraticCurveTo(
        worldToScreen(offsetX - waistHalfW * 0.9, centerY - 50).x,
        worldToScreen(offsetX - waistHalfW * 0.9, centerY - 50).y,
        waistL.x,
        waistL.y
      );
      ctx.quadraticCurveTo(
        worldToScreen(offsetX - hipHalfW * 1.05, centerY + 50).x,
        worldToScreen(offsetX - hipHalfW * 1.05, centerY + 50).y,
        hipL.x,
        hipL.y
      );
      ctx.lineTo(crotchL.x, crotchL.y);
      ctx.lineTo(legL.x, legL.y);
      ctx.lineTo(legR.x, legR.y);
      ctx.lineTo(crotchR.x, crotchR.y);
      ctx.lineTo(hipR.x, hipR.y);
      ctx.quadraticCurveTo(
        worldToScreen(offsetX + waistHalfW * 0.9, centerY - 50).x,
        worldToScreen(offsetX + waistHalfW * 0.9, centerY - 50).y,
        waistR.x,
        waistR.y
      );
      ctx.quadraticCurveTo(
        worldToScreen(offsetX + bustHalfW, centerY - 150).x,
        worldToScreen(offsetX + bustHalfW, centerY - 150).y,
        armpitR.x,
        armpitR.y
      );
      ctx.lineTo(shoulderR.x, shoulderR.y);
      ctx.lineTo(neckBaseR.x, neckBaseR.y);
      ctx.closePath();

      // Translucent mannequin body fill
      ctx.fillStyle = viewType === 'front' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(129, 140, 248, 0.08)';
      ctx.fill();

      // Crisp anatomical outline
      ctx.strokeStyle = viewType === 'front' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(129, 140, 248, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2. Guidelines (Shoulder, Bust Apex, Waist, Hips)
      if (av2d.showGuides) {
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = '#64748b';

        // Center Front / Center Back Axis
        const cfTop = worldToScreen(offsetX, centerY - 320);
        const cfBottom = worldToScreen(offsetX, centerY + 380);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.beginPath();
        ctx.moveTo(cfTop.x, cfTop.y);
        ctx.lineTo(cfBottom.x, cfBottom.y);
        ctx.stroke();

        ctx.fillText(
          viewType === 'front' ? 'CF (Center Front)' : 'CB (Center Back)',
          cfTop.x + 5,
          cfTop.y + 12
        );

        // Shoulder Line
        const shL = worldToScreen(offsetX - shoulderHalfW - 20, centerY - 220);
        const shR = worldToScreen(offsetX + shoulderHalfW + 20, centerY - 220);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.moveTo(shL.x, shL.y);
        ctx.lineTo(shR.x, shR.y);
        ctx.stroke();
        ctx.fillText(`Shoulder: ${av.shoulderWidth || 40} cm`, shR.x + 6, shR.y + 3);

        // Bust Line
        const bustL = worldToScreen(offsetX - bustHalfW - 20, centerY - 130);
        const bustR = worldToScreen(offsetX + bustHalfW + 20, centerY - 130);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.beginPath();
        ctx.moveTo(bustL.x, bustL.y);
        ctx.lineTo(bustR.x, bustR.y);
        ctx.stroke();
        ctx.fillText(`Bust / Chest: ${av.chestCircumference} cm`, bustR.x + 6, bustR.y + 3);

        // Waist Line
        const wL = worldToScreen(offsetX - waistHalfW - 20, centerY);
        const wR = worldToScreen(offsetX + waistHalfW + 20, centerY);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.beginPath();
        ctx.moveTo(wL.x, wL.y);
        ctx.lineTo(wR.x, wR.y);
        ctx.stroke();
        ctx.fillText(`Waist: ${av.waistCircumference} cm`, wR.x + 6, wR.y + 3);

        // High Hip Line
        const hipGuideL = worldToScreen(offsetX - hipHalfW - 20, centerY + 100);
        const hipGuideR = worldToScreen(offsetX + hipHalfW + 20, centerY + 100);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.beginPath();
        ctx.moveTo(hipGuideL.x, hipGuideL.y);
        ctx.lineTo(hipGuideR.x, hipGuideR.y);
        ctx.stroke();
        ctx.fillText(`Hips: ${av.hipsCircumference} cm`, hipGuideR.x + 6, hipGuideR.y + 3);

        ctx.setLineDash([]);
      }
    });

    ctx.restore();
  }, [worldToScreen]);

  // ==========================================
  // Main Canvas Render Loop
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina DPR scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Studio Background
    ctx.fillStyle = '#f7f5ef';
    ctx.fillRect(0, 0, width, height);

    // 2. CAD Grid
    const gridSize = 40 * viewState.scale;
    const startX = ((viewState.offsetX % gridSize) + gridSize) % gridSize;
    const startY = ((viewState.offsetY % gridSize) + gridSize) % gridSize;

    ctx.strokeStyle = '#e9e5dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 3. Draw 2D Avatar Silhouette Background (CLO3D feature)
    if (showBodyGuide) drawAvatar2DGuide(ctx, avatar, avatar2D);

    // 4. Draw Pattern Pieces
    pieces.forEach((piece) => {
      if (piece.visible === false) return;
      const isSelected = piece.id === selectedPieceId;
      const pts = piece.points;
      if (pts.length < 3) return;

      // Transform points to screen coordinates
      const screenPts = pts.map((pt) => {
        const rotated = rotatePoint(pt.x, pt.y, piece.rotation);
        return worldToScreen(piece.position.x + rotated.x, piece.position.y + rotated.y);
      });

      // Fill Polygon (with Bezier curve support)
      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      const curvatures = piece.edgeCurvatures || {};
      for (let i = 0; i < screenPts.length; i++) {
        const nextIdx = (i + 1) % screenPts.length;
        const curv = curvatures[i];
        if (curv) {
          // Compute control point in world space, then to screen
          const p1 = pts[i];
          const p2 = pts[nextIdx];
          const midX = (p1.x + p2.x) / 2 + curv.cpx;
          const midY = (p1.y + p2.y) / 2 + curv.cpy;
          const rotCP = rotatePoint(midX, midY, piece.rotation);
          const cpScreen = worldToScreen(piece.position.x + rotCP.x, piece.position.y + rotCP.y);
          ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, screenPts[nextIdx].x, screenPts[nextIdx].y);
        } else {
          ctx.lineTo(screenPts[nextIdx].x, screenPts[nextIdx].y);
        }
      }
      ctx.closePath();

      ctx.fillStyle = isSelected
        ? 'rgba(218, 164, 73, 0.18)'
        : piece.locked
        ? 'rgba(100, 116, 139, 0.08)'
        : '#ffffff';
      ctx.fill();

      // Stroke Outline
      ctx.strokeStyle = isSelected ? '#a86614' : piece.locked ? '#a8a29e' : '#57534e';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw Topstitches along seams (if enabled)
      if (stitchSettings.showStitches && (isSelected || showSeams || sewingTool)) {
        seams.forEach((seam) => {
          const edge = seam.edgeA.pieceId === piece.id ? seam.edgeA
            : seam.edgeB.pieceId === piece.id ? seam.edgeB : null;
          if (edge) {

            ctx.save();
            ctx.strokeStyle = seam.threadColor || stitchSettings.defaultColor || '#f8fafc';
            ctx.lineWidth = 1.5;
            if (seam.stitchType === 'double-needle') {
              ctx.setLineDash([3, 3]);
            } else if (seam.stitchType === 'overlock') {
              ctx.setLineDash([2, 4]);
            } else if (seam.stitchType === 'flatlock') {
              ctx.setLineDash([4, 2]);
            } else if (seam.stitchType === 'saddle') {
              ctx.setLineDash([6, 3]);
              ctx.lineWidth = 2.2;
            } else {
              ctx.setLineDash([4, 3]);
            }

            traceSeam(ctx, seamScreenPoints(piece, edge));
            ctx.restore();
          }
        });
      }

      // Cutting instructions are drawn only from recorded metadata, in the panel's local coordinates.
      const centerScreen = worldToScreen(piece.position.x, piece.position.y);
      ctx.save();
      ctx.translate(centerScreen.x, centerScreen.y);
      ctx.rotate(piece.rotation);
      const cutting = cuttingById.get(piece.id)!;
      if (cutting.cutOutline) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        cutting.cutOutline.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point.x * viewState.scale, point.y * viewState.scale);
          else ctx.lineTo(point.x * viewState.scale, point.y * viewState.scale);
        });
        ctx.closePath();
        ctx.stroke();
      }
      const markLines = [...(cutting.grainline ? getGrainlineSegments(cutting.grainline) : []), ...cutting.notches];
      ctx.lineWidth = 1.5;
      markLines.forEach((line, i) => {
        ctx.strokeStyle = i < markLines.length - cutting.notches.length ? '#166534' : '#1e293b';
        ctx.beginPath();
        ctx.moveTo(line.start.x * viewState.scale, line.start.y * viewState.scale);
        ctx.lineTo(line.end.x * viewState.scale, line.end.y * viewState.scale);
        ctx.stroke();
      });

      // Draw Graphic / Artwork Layer (Photoshop-like layer)
      if (piece.graphics) {
        piece.graphics.forEach((g) => {
          ctx.save();
          ctx.translate(g.x * viewState.scale, g.y * viewState.scale);
          ctx.rotate(g.rotation);
          ctx.font = `bold ${(g.fontSize || 12) * viewState.scale * g.scale}px sans-serif`;
          ctx.fillStyle = g.color;
          ctx.globalAlpha = g.opacity;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(g.content, 0, 0);
          ctx.restore();
        });
      }

      ctx.restore();

      // Piece Label
      ctx.font = '500 12px ui-sans-serif, system-ui';
      ctx.fillStyle = isSelected ? '#854d0e' : '#334155';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelBounds = getPatternBounds(piece, true);
      const labelWidth = Math.max(50, labelBounds.width * viewState.scale + 12);
      const labelLines: string[] = [];
      let labelLine = '';
      for (const word of piece.name.split(' ')) {
        const next = labelLine ? `${labelLine} ${word}` : word;
        if (labelLine && ctx.measureText(next).width > labelWidth) { labelLines.push(labelLine); labelLine = word; }
        else labelLine = next;
      }
      labelLines.push(labelLine);
      const thinPiece = labelBounds.height * viewState.scale < 30;
      const labelY = thinPiece ? worldToScreen(0, labelBounds.minY).y - 10 - (Math.min(3, labelLines.length) - 1) * 14
        : centerScreen.y + 48 * viewState.scale;
      labelLines.slice(0, 3).forEach((line, i) => ctx.fillText(line, centerScreen.x,
        labelY + i * 14, labelWidth));
      if (piece.cutting) {
        ctx.font = '10px ui-sans-serif, system-ui';
        cutting.labels.forEach((line, i) => ctx.fillText(line, centerScreen.x,
          labelY + Math.min(3, labelLines.length) * 14 + i * 13, Math.max(100, labelWidth)));
      }

      // Edge Segment Dimensions (Metric labels) with curve arc length approximation
      if (showDimensions || (isSelected && activeTool === 'measure')) for (let i = 0; i < pts.length; i++) {
        const nextIdx = (i + 1) % pts.length;
        const lengthCm = getPatternEdgeLength(piece, i).toFixed(1);

        const sp1 = screenPts[i];
        const sp2 = screenPts[nextIdx];
        const midX = (sp1.x + sp2.x) / 2;
        const midY = (sp1.y + sp2.y) / 2;

        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`E${i + 1} · ${lengthCm} cm`, midX, midY - 6);
      }

      // Draw Vertices handles (Direct Select tool)
      if (isSelected && (activeTool === 'vertex' || activeTool === 'pen' || activeTool === 'curve')) {
        screenPts.forEach((sp, idx) => {
          const isVertSelected = isSelected && idx === selectedVertexIndex;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, isVertSelected ? 6 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = isVertSelected ? '#38bdf8' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Draw Bezier curve control handles (when curve tool or vertex tool is active)
        if (activeTool === 'curve' || activeTool === 'vertex') {
          Object.entries(curvatures).forEach(([key, curv]) => {
            const edgeIdx = Number(key);
            const nextIdx = (edgeIdx + 1) % pts.length;
            const p1 = pts[edgeIdx];
            const p2 = pts[nextIdx];
            const cpLocalX = (p1.x + p2.x) / 2 + curv.cpx;
            const cpLocalY = (p1.y + p2.y) / 2 + curv.cpy;
            const rotCP = rotatePoint(cpLocalX, cpLocalY, piece.rotation);
            const cpScreen = worldToScreen(piece.position.x + rotCP.x, piece.position.y + rotCP.y);

            // Draw handle lines from endpoints to control point
            ctx.save();
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            const sp1 = screenPts[edgeIdx];
            const sp2 = screenPts[nextIdx];
            ctx.beginPath();
            ctx.moveTo(sp1.x, sp1.y);
            ctx.lineTo(cpScreen.x, cpScreen.y);
            ctx.lineTo(sp2.x, sp2.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw control point diamond
            ctx.fillStyle = '#a855f7';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cpScreen.x, cpScreen.y - 5);
            ctx.lineTo(cpScreen.x + 5, cpScreen.y);
            ctx.lineTo(cpScreen.x, cpScreen.y + 5);
            ctx.lineTo(cpScreen.x - 5, cpScreen.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          });
        }
      }

      // Photoshop-Style Bounding Box & Transform Handles (Select Tool V)
      if (isSelected && activeTool === 'select' && !piece.locked) {
        const bounds = getPatternBounds(piece);
        const nw = worldToScreen(
          piece.position.x + rotatePoint(bounds.minX, bounds.minY, piece.rotation).x,
          piece.position.y + rotatePoint(bounds.minX, bounds.minY, piece.rotation).y
        );
        const ne = worldToScreen(
          piece.position.x + rotatePoint(bounds.maxX, bounds.minY, piece.rotation).x,
          piece.position.y + rotatePoint(bounds.maxX, bounds.minY, piece.rotation).y
        );
        const se = worldToScreen(
          piece.position.x + rotatePoint(bounds.maxX, bounds.maxY, piece.rotation).x,
          piece.position.y + rotatePoint(bounds.maxX, bounds.maxY, piece.rotation).y
        );
        const sw = worldToScreen(
          piece.position.x + rotatePoint(bounds.minX, bounds.maxY, piece.rotation).x,
          piece.position.y + rotatePoint(bounds.minX, bounds.maxY, piece.rotation).y
        );

        // Bounding Box stroke
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(nw.x, nw.y);
        ctx.lineTo(ne.x, ne.y);
        ctx.lineTo(se.x, se.y);
        ctx.lineTo(sw.x, sw.y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Rotation Handle at Top
        const midTopLocal = { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY };
        const rotHandleLocal = { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY - 35 / viewState.scale };
        const midTopScreen = worldToScreen(
          piece.position.x + rotatePoint(midTopLocal.x, midTopLocal.y, piece.rotation).x,
          piece.position.y + rotatePoint(midTopLocal.x, midTopLocal.y, piece.rotation).y
        );
        const rotHandleScreen = worldToScreen(
          piece.position.x + rotatePoint(rotHandleLocal.x, rotHandleLocal.y, piece.rotation).x,
          piece.position.y + rotatePoint(rotHandleLocal.x, rotHandleLocal.y, piece.rotation).y
        );

        // Stem to rotation knob
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(midTopScreen.x, midTopScreen.y);
        ctx.lineTo(rotHandleScreen.x, rotHandleScreen.y);
        ctx.stroke();

        // Rotation Knob
        ctx.beginPath();
        ctx.arc(rotHandleScreen.x, rotHandleScreen.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 8 Anchor Handles (Square handles like Photoshop Free Transform)
        const localHandles = [
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.maxY },
          { x: bounds.minX, y: bounds.maxY },
          { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY },
          { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY },
          { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 },
          { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 },
        ];

        localHandles.forEach((lh) => {
          const rot = rotatePoint(lh.x, lh.y, piece.rotation);
          const sp = worldToScreen(piece.position.x + rot.x, piece.position.y + rot.y);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1.5;
          ctx.fillRect(sp.x - 4, sp.y - 4, 8, 8);
          ctx.strokeRect(sp.x - 4, sp.y - 4, 8, 8);
        });

        ctx.restore();
      }

      // Highlight pending seam edge (first edge clicked in Sew mode)
      if (
        pendingSeamEdge &&
        pendingSeamEdge.pieceId === piece.id &&
        screenPts[pendingSeamEdge.edgeIndex]
      ) {
        const path = seamScreenPoints(piece, pendingSeamEdge);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        traceSeam(ctx, path);

        // Directional notch indicator (CLO3D style)
        const notch = path[Math.round((path.length - 1) * 0.25)];
        const notchX = notch.x, notchY = notch.y;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(notchX, notchY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Highlight hovered edge in Sew mode
      if (
        activeTool === 'sew' &&
        sewHover &&
        sewHover.pieceId === piece.id &&
        screenPts[sewHover.edgeIndex] &&
        (!pendingSeamEdge || pendingSeamEdge.pieceId !== piece.id || pendingSeamEdge.edgeIndex !== sewHover.edgeIndex)
      ) {
        const path = seamScreenPoints(piece, { pieceId: piece.id, edgeIndex: sewHover.edgeIndex });
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        traceSeam(ctx, path);

        // Hover Notch
        const notch = path[Math.round((path.length - 1) * 0.25)];
        const notchX = notch.x, notchY = notch.y;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(notchX, notchY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4b. CLO3D Interactive Rubber-Band Sewing Preview Line
    if (activeTool === 'sew' && pendingSeamEdge && mouseScreenPos) {
      const pA = pieces.find((p) => p.id === pendingSeamEdge.pieceId);
      if (pA && pA.visible !== false && pA.points[pendingSeamEdge.edgeIndex]) {
        const midA = seamMidpoint(seamScreenPoints(pA, pendingSeamEdge));

        const targetPos = sewHover ? sewHover.midScreen : mouseScreenPos;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(midA.x, midA.y);
        const cpX = (midA.x + targetPos.x) / 2;
        const cpY = (midA.y + targetPos.y) / 2 - 25;
        ctx.quadraticCurveTo(cpX, cpY, targetPos.x, targetPos.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target marker
        ctx.fillStyle = sewHover ? '#10b981' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(targetPos.x, targetPos.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // If hovering target edge, show live length comparison pill (CLO3D segment match)
        if (sewHover) {
          const lenA = seamLength(pA, pendingSeamEdge);
          const lenB = sewHover.lenCm;
          const diff = Math.abs(Math.round((lenA - lenB) * 10) / 10);
          const isMatching = diff <= 1.5;

          const pillText = `${lenA} cm ⟷ ${lenB} cm ${isMatching ? '(✓ Cocok)' : `(Beda: ${diff} cm)`}`;
          ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
          const tw = ctx.measureText(pillText).width;
          const px = (midA.x + targetPos.x) / 2 - tw / 2 - 8;
          const py = (midA.y + targetPos.y) / 2 - 35;

          ctx.fillStyle = isMatching ? 'rgba(6, 78, 59, 0.95)' : 'rgba(120, 53, 15, 0.95)';
          ctx.strokeStyle = isMatching ? '#10b981' : '#f59e0b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(px, py, tw + 16, 22, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(pillText, px + 8, py + 15);
        }
        ctx.restore();
      }
    }

    // 5. Draw Pen/Curve Hover Preview Point
    if (hoverInfo && (activeTool === 'pen' || activeTool === 'curve')) {
      const hp = worldToScreen(hoverInfo.point.x, hoverInfo.point.y);
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = activeTool === 'pen' ? '#10b981' : '#a855f7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 6. Draw Virtual Seam Links — color-coded arcs, direction notches, labels
    if (showSeams || sewingTool) seams.forEach((seam, sIdx) => {
      const pieceA = pieceById.get(seam.edgeA.pieceId), pieceB = pieceById.get(seam.edgeB.pieceId);
      if (!pieceA || !pieceB || pieceA.visible === false || pieceB.visible === false) return;
      const pathA = seamScreenPoints(pieceA, seam.edgeA), pathB = seamScreenPoints(pieceB, seam.edgeB);
      if (pathA.length < 2 || pathB.length < 2) return;

      // Compute lengths for color coding
      const lenA = seamLength(pieceA, seam.edgeA), lenB = seamLength(pieceB, seam.edgeB);
      const lenDiff = Math.abs(lenA - lenB);
      const avgLen = (lenA + lenB) / 2;
      const diffPct = avgLen > 0 ? (lenDiff / avgLen) * 100 : 0;

      // Color-code: green = matched, orange = slight mismatch, red = >15%
      let seamColor: string;
      if (diffPct <= 5) seamColor = '#22c55e'; // green
      else if (diffPct <= 15) seamColor = '#f59e0b'; // orange
      else seamColor = '#ef4444'; // red

      const isSelected = selectedSeamId === seam.id;
      const isHovered = editSewHover === seam.id;

      const sA1 = pathA[0], sA2 = pathA[pathA.length - 1], sB1 = pathB[0], sB2 = pathB[pathB.length - 1];
      const midA = seamMidpoint(pathA), midB = seamMidpoint(pathB);

      // Highlight edges with colored glow
      ctx.save();
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = isSelected ? 4 : isHovered ? 3.5 : 2.5;
      ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.9 : 0.6;
      // Edge A
      traceSeam(ctx, pathA);
      // Edge B
      traceSeam(ctx, pathB);
      ctx.globalAlpha = 1;

      // Selected glow
      if (isSelected) {
        ctx.shadowColor = seamColor;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = seamColor;
        ctx.lineWidth = 2;
        traceSeam(ctx, pathA);
        traceSeam(ctx, pathB);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // Curved dashed arc connector (Figma-style connector line)
      ctx.save();
      const arcDist = Math.hypot(midB.x - midA.x, midB.y - midA.y);
      const arcBow = Math.min(arcDist * 0.25, 60);
      const cpX = (midA.x + midB.x) / 2;
      const perpX = -(midB.y - midA.y);
      const perpY = midB.x - midA.x;
      const perpLen = Math.hypot(perpX, perpY) || 1;
      const cpArcX = cpX + (perpX / perpLen) * arcBow;
      const cpArcY = (midA.y + midB.y) / 2 + (perpY / perpLen) * arcBow;
      ctx.beginPath();
      ctx.moveTo(midA.x, midA.y);
      ctx.quadraticCurveTo(cpArcX, cpArcY, midB.x, midB.y);
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
      ctx.setLineDash(isSelected ? [8, 4] : [5, 5]);
      ctx.globalAlpha = isSelected ? 1 : 0.7;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();

      // Direction notches — small triangles at 25% of each edge
      const drawNotch = (s1: {x:number;y:number}, s2: {x:number;y:number}, reversed: boolean) => {
        const t = reversed ? 0.75 : 0.25;
        const nx = s1.x + (s2.x - s1.x) * t;
        const ny = s1.y + (s2.y - s1.y) * t;
        const edgeDx = s2.x - s1.x;
        const edgeDy = s2.y - s1.y;
        const edgeLen = Math.hypot(edgeDx, edgeDy) || 1;
        const ux = edgeDx / edgeLen;
        const uy = edgeDy / edgeLen;
        // Perpendicular outward
        const px = -uy;
        const py = ux;
        const size = 6;
        ctx.beginPath();
        ctx.moveTo(nx + ux * size, ny + uy * size);
        ctx.lineTo(nx + px * size * 1.2, ny + py * size * 1.2);
        ctx.lineTo(nx - ux * size, ny - uy * size);
        ctx.closePath();
        ctx.fillStyle = seamColor;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      };
      const reversed = !!seam.reversed;
      drawNotch(sA1, sA2, reversed);
      drawNotch(sB1, sB2, reversed);

      // Seam label badges (S1, S2...) at connector midpoint
      const labelX = (cpArcX + cpX) / 2;
      const labelY = (cpArcY + (midA.y + midB.y) / 2) / 2;
      const label = `S${sIdx + 1}`;
      ctx.save();
      ctx.font = 'bold 9px ui-sans-serif, system-ui';
      const tw = ctx.measureText(label).width;
      // Pill background
      ctx.fillStyle = isSelected ? seamColor : 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(labelX - tw / 2 - 6, labelY - 8, tw + 12, 16, 8);
      ctx.fill();
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Label text
      ctx.fillStyle = isSelected ? '#0f172a' : seamColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX, labelY);
      ctx.restore();

      // Endpoint badges on edges
      [midA, midB].forEach((m) => {
        ctx.fillStyle = seamColor;
        ctx.beginPath();
        ctx.arc(m.x, m.y, isSelected ? 6 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Edit-sew selected seam tooltip
      if (isSelected && activeTool === 'edit-sew') {
        const tooltipX = (midA.x + midB.x) / 2;
        const tooltipY = Math.min(midA.y, midB.y) - 35;
        const stType = seam.stitchType || 'single-needle';
        const tooltipText = `${lenA} cm ↔ ${lenB} cm | ${stType} | str: ${(seam.strength * 100).toFixed(0)}%`;
        ctx.save();
        ctx.font = '11px ui-sans-serif, system-ui';
        const ttw = ctx.measureText(tooltipText).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.beginPath();
        ctx.roundRect(tooltipX - ttw / 2 - 10, tooltipY - 12, ttw + 20, 24, 8);
        ctx.fill();
        ctx.strokeStyle = seamColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, tooltipX, tooltipY);
        ctx.restore();
      }
    });

    // 6b. Draw Free-Sew hover point preview
    if (activeTool === 'free-sew' && freeSewHover) {
      const sp = freeSewHover.screenPoint;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Inner dot
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.restore();
    }

    // 6c. Draw Free-Sew pending first point
    if (activeTool === 'free-sew' && pendingFreeSewEdge) {
      const piece = pieces.find(p => p.id === pendingFreeSewEdge.pieceId);
      if (piece) {
        if (piece.visible !== false && piece.points[pendingFreeSewEdge.edgeIndex]) {
          const pS = pendingFreeSewEdge.paramStart;
          const sp = seamScreenPoints(piece, { ...pendingFreeSewEdge, paramStart: pS, paramEnd: pS })[0];

          ctx.save();
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Rubber band to mouse
          if (mouseScreenPos) {
            const target = freeSewHover ? freeSewHover.screenPoint : mouseScreenPos;
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            const cpx = (sp.x + target.x) / 2;
            const cpy = (sp.y + target.y) / 2 - 20;
            ctx.quadraticCurveTo(cpx, cpy, target.x, target.y);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();
        }
      }
    }

    // 7. Draw Cut / Slice Line Preview
    if (cutLine) {
      const sStart = worldToScreen(cutLine.start.x, cutLine.start.y);
      const sEnd = worldToScreen(cutLine.end.x, cutLine.end.y);
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px ui-sans-serif, system-ui';
      const midX = (sStart.x + sEnd.x) / 2;
      const midY = (sStart.y + sEnd.y) / 2;
      ctx.fillText('✂️ SLICE CUT', midX + 10, midY - 10);
      ctx.restore();
    }

    // 8. Draw Custom Polygon Drafting Preview
    if (drawingPolygonPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const s0 = worldToScreen(drawingPolygonPoints[0].x, drawingPolygonPoints[0].y);
      ctx.moveTo(s0.x, s0.y);
      for (let i = 1; i < drawingPolygonPoints.length; i++) {
        const sp = worldToScreen(drawingPolygonPoints[i].x, drawingPolygonPoints[i].y);
        ctx.lineTo(sp.x, sp.y);
      }
      if (polygonMousePos) {
        const sm = worldToScreen(polygonMousePos.x, polygonMousePos.y);
        ctx.setLineDash([4, 4]);
        ctx.lineTo(sm.x, sm.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      drawingPolygonPoints.forEach((p, idx) => {
        const sp = worldToScreen(p.x, p.y);
        ctx.fillStyle = idx === 0 ? '#10b981' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.restore();
    }
  }, [
    pieces,
    seams,
    selectedPieceId,
    selectedVertexIndex,
    activeTool,
    pendingSeamEdge,
    avatar,
    avatar2D,
    stitchSettings,
    viewState,
    hoverInfo,
    sewHover,
    mouseScreenPos,
    canvasDims,
    layout,
    cutLine,
    drawingPolygonPoints,
    polygonMousePos,
    worldToScreen,
    freeSewHover,
    pendingFreeSewEdge,
    selectedSeamId,
    editSewHover,
    showSeams,
    showDimensions,
    showBodyGuide,
    drawAvatar2DGuide,
    sewingTool,
    pieceById,
    cuttingById,
    seamScreenPoints,
  ]);

  // ==========================================
  // Mouse Handlers (Photoshop & CAD Tools)
  // ==========================================
  const handleMouseDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    isDraggingRef.current = true;
    dragStartRef.current = { x: sx, y: sy };
    setSeamContextMenu(null); // Dismiss any open context menu

    // The modifier for constrained edits is Shift; the hand tool pans.
    if (e.button === 1 || activeTool === 'move') {
      dragModeRef.current = 'pan';
      return;
    }

    // Left click
    if (e.button === 0) {
      // 0a. Cut Tool (Slice Piece): Start dragging cut line
      if (activeTool === 'cut') {
        setCutLine({ start: { x: world.x, y: world.y }, end: { x: world.x, y: world.y } });
        dragModeRef.current = 'cut';
        return;
      }

      // 0b. Polygon Draw Tool: Click to add vertices
      if (activeTool === 'polygon') {
        if (drawingPolygonPoints.length >= 3) {
          const p0 = drawingPolygonPoints[0];
          const dist = Math.hypot(world.x - p0.x, world.y - p0.y);
          if (dist < 22) {
            const cx = drawingPolygonPoints.reduce((s, p) => s + p.x, 0) / drawingPolygonPoints.length;
            const cy = drawingPolygonPoints.reduce((s, p) => s + p.y, 0) / drawingPolygonPoints.length;
            const localPoints = drawingPolygonPoints.map(p => ({ x: Math.round(p.x - cx), y: Math.round(p.y - cy) }));
            addCustomPiece('Custom Pattern Piece', localPoints, { x: Math.round(cx), y: Math.round(cy) });
            setDrawingPolygonPoints([]);
            setPolygonMousePos(null);
            setActiveTool('select');
            return;
          }
        }
        setDrawingPolygonPoints(prev => [...prev, { x: Math.round(world.x), y: Math.round(world.y) }]);
        return;
      }

      // 0c. Patch Tool: Open patch library
      if (activeTool === 'patch') {
        setShowPatchModal(true);
        return;
      }

      // 1. Sew Tool: Click edge (CLO3D Segment Sewing)
      if (activeTool === 'sew') {
        for (const piece of pieces) {
          const edgeHit = findEdgeAt(world.x, world.y, piece, 22);
          if (edgeHit !== null) {
            const edge: SeamEdge = { pieceId: piece.id, edgeIndex: edgeHit.edgeIndex };
            if (!pendingSeamEdge) {
              setPendingSeamEdge(edge);
              setSeamToast(`Garis 1 terpilih (${piece.name}). Sekarang klik garis target di pola pasangan.`);
            } else {
              if (
                pendingSeamEdge.pieceId !== edge.pieceId ||
                pendingSeamEdge.edgeIndex !== edge.edgeIndex
              ) {
                addSeam(pendingSeamEdge, edge);
                setSeamToast(`✓ Jahitan berhasil dihubungkan!`);
              } else {
                setPendingSeamEdge(null);
                setSeamToast(`Pilihan jahitan dibatalkan.`);
              }
            }
            return;
          }
        }
        if (pendingSeamEdge) {
          setPendingSeamEdge(null);
          setSeamToast(`Pilihan jahitan dibatalkan.`);
        }
        return;
      }

      // 1b. Free-Sew Tool: Click point on edge
      if (activeTool === 'free-sew') {
        for (const piece of pieces) {
          const hit = findEdgeWithParam(world.x, world.y, piece, 22);
          if (hit !== null) {
            if (!pendingFreeSewEdge) {
              setPendingFreeSewEdge({
                pieceId: piece.id,
                edgeIndex: hit.edgeIndex,
                paramStart: hit.param,
                paramEnd: hit.param,
              });
              setSeamToast(`Free-sew point 1 set on ${piece.name}. Click target point on another edge.`);
            } else {
              // Create seam with partial params
              if (pendingFreeSewEdge.pieceId !== piece.id || pendingFreeSewEdge.edgeIndex !== hit.edgeIndex) {
                addSeam(
                  { pieceId: pendingFreeSewEdge.pieceId, edgeIndex: pendingFreeSewEdge.edgeIndex, paramStart: pendingFreeSewEdge.paramStart, paramEnd: 1 },
                  { pieceId: piece.id, edgeIndex: hit.edgeIndex, paramStart: 0, paramEnd: hit.param }
                );
                setSeamToast(`✓ Free seam connected!`);
              }
              setPendingFreeSewEdge(null);
            }
            return;
          }
        }
        if (pendingFreeSewEdge) {
          setPendingFreeSewEdge(null);
          setSeamToast('Free-sew cancelled.');
        }
        return;
      }

      // 1c. Edit-Sew Tool: Click to select/deselect seam
      if (activeTool === 'edit-sew') {
        setSeamContextMenu(null);
        const nearSeam = findSeamNearPoint(sx, sy, 22);
        if (nearSeam) {
          setSelectedSeamId(nearSeam);
          const seam = seams.find(s => s.id === nearSeam);
          if (seam) {
            const pA = pieces.find(p => p.id === seam.edgeA.pieceId);
            const pB = pieces.find(p => p.id === seam.edgeB.pieceId);
            const nameA = pA?.name || '?';
            const nameB = pB?.name || '?';
            setSeamToast(`Selected seam: ${nameA} ↔ ${nameB}. Press Delete to remove, right-click for options.`);
          }
        } else {
          setSelectedSeamId(null);
        }
        return;
      }

      // 2. Pen Tool: Split edge & insert point (Illustrator Pen Tool behavior)
      if (activeTool === 'pen') {
        // First check if we click on a vertex (to select it)
        for (const piece of pieces) {
          if (piece.id === selectedPieceId) {
            const vIdx = findVertexAt(world.x, world.y, piece);
            if (vIdx !== null) {
              selectVertex(vIdx);
              return;
            }
          }
        }
        // Then check edge click to add a point
        for (const piece of pieces) {
          if (piece.locked) continue;
          const edgeHit = findEdgeAt(world.x, world.y, piece, 15);
          if (edgeHit !== null) {
            selectPiece(piece.id);
            addVertexToEdge(piece.id, edgeHit.edgeIndex, edgeHit.point, edgeHit.param);
            return;
          }
        }
      }

      // 3. Curve Tool: Drag edge to bend (Illustrator-style click+drag)
      if (activeTool === 'curve') {
        for (const piece of pieces) {
          if (piece.visible === false || piece.locked) continue;
          // First check if clicking on an existing curve control point
          const curvs = piece.edgeCurvatures || {};
          for (const [key, curv] of Object.entries(curvs)) {
            const edgeIdx = Number(key);
            const nextIdx = (edgeIdx + 1) % piece.points.length;
            const p1 = piece.points[edgeIdx];
            const p2 = piece.points[nextIdx];
            const cpLocalX = (p1.x + p2.x) / 2 + curv.cpx;
            const cpLocalY = (p1.y + p2.y) / 2 + curv.cpy;
            const rotCP = rotatePoint(cpLocalX, cpLocalY, piece.rotation);
            const cpWorldX = piece.position.x + rotCP.x;
            const cpWorldY = piece.position.y + rotCP.y;
            const dist = Math.hypot(world.x - cpWorldX, world.y - cpWorldY);
            if (dist <= 14 / viewState.scale) {
              selectPiece(piece.id);
              beginEdit();
              curveDragRef.current = {
                pieceId: piece.id,
                edgeIndex: edgeIdx,
                startMouse: { x: world.x, y: world.y },
                initialCurvature: { ...curv },
                controlWeight: 1,
              };
              dragModeRef.current = 'curve';
              isDraggingRef.current = true;
              return;
            }
          }

          // Then check edge hit for creating new curve
          const edgeHit = findEdgeAt(world.x, world.y, piece);
          if (edgeHit !== null) {
            selectPiece(piece.id);
            beginEdit();
            const existingCurv = curvs[edgeHit.edgeIndex] || null;
            curveDragRef.current = {
              pieceId: piece.id,
              edgeIndex: edgeHit.edgeIndex,
              startMouse: { x: world.x, y: world.y },
              initialCurvature: existingCurv ? { ...existingCurv } : null,
              controlWeight: Math.max(0.25, 2 * edgeHit.param * (1 - edgeHit.param)),
            };
            dragModeRef.current = 'curve';
            isDraggingRef.current = true;
            return;
          }
        }
      }

      // 4. Select Tool: Check transform handles first (bounding box)
      if (activeTool === 'select' && selectedPieceId) {
        const piece = pieces.find((p) => p.id === selectedPieceId);
        if (piece && piece.visible !== false && !piece.locked) {
          const handle = findTransformHandleAt(world.x, world.y, piece);
          if (handle) {
            draggedPieceIdRef.current = piece.id;
            dragHandleRef.current = handle;
            initialPiecePosRef.current = { ...piece.position };
            initialPieceRotationRef.current = piece.rotation;
            initialShapeRef.current = { points: piece.points, edgeCurvatures: piece.edgeCurvatures, internalLines: piece.internalLines, cutting: piece.cutting };
            initialDragAngleRef.current = Math.atan2(world.y - piece.position.y, world.x - piece.position.x);
            beginEdit();

            const bounds = getPatternBounds(piece);
            transformBoundsRef.current = bounds;

            if (handle === 'rot') {
              dragModeRef.current = 'rotate';
            } else {
              dragModeRef.current = 'scale';
              // Set anchor as the opposite corner/edge
              const anchorMap: Record<string, { x: number; y: number }> = {
                nw: { x: bounds.maxX, y: bounds.maxY },
                ne: { x: bounds.minX, y: bounds.maxY },
                se: { x: bounds.minX, y: bounds.minY },
                sw: { x: bounds.maxX, y: bounds.minY },
                n: { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY },
                s: { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY },
                w: { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 },
                e: { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 },
              };
              transformAnchorRef.current = anchorMap[handle] || { x: 0, y: 0 };
            }
            return;
          }
        }
      }

      // 5. Check vertex click (Direct Select Tool A)
      if (selectedPieceId && (activeTool === 'vertex' || activeTool === 'select')) {
        const piece = pieces.find((p) => p.id === selectedPieceId);
        if (piece && piece.visible !== false && !piece.locked) {
          const vIdx = findVertexAt(world.x, world.y, piece);
          if (vIdx !== null) {
            selectVertex(vIdx);
            dragModeRef.current = 'vertex';
            draggedPieceIdRef.current = piece.id;
            draggedVertexRef.current = vIdx;
            initialVertexPosRef.current = {
              x: piece.points[vIdx].x,
              y: piece.points[vIdx].y,
            };
            initialPieceRotationRef.current = piece.rotation;
            beginEdit();
            return;
          }
        }
      }

      // 6. Check piece body click
      let clickedPiece: PatternPiece | null = null;
      for (let i = pieces.length - 1; i >= 0; i--) {
        if (isPointInPiece(world.x, world.y, pieces[i])) {
          clickedPiece = pieces[i];
          break;
        }
      }

      if (clickedPiece) {
        selectPiece(clickedPiece.id);
        if (!clickedPiece.locked && activeTool === 'select') {
          dragModeRef.current = 'piece';
          draggedPieceIdRef.current = clickedPiece.id;
          initialPiecePosRef.current = { ...clickedPiece.position };
          beginEdit();
        }
      } else {
        selectPiece(null);
        dragModeRef.current = 'pan'; // Empty space drag pans canvas
      }
    }
  };

  const handleMouseMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    setMouseScreenPos({ x: sx, y: sy });

    if (activeTool === 'polygon') {
      setPolygonMousePos({ x: world.x, y: world.y });
    }

    if (dragModeRef.current === 'cut') {
      setCutLine((prev) => (prev ? { ...prev, end: { x: world.x, y: world.y } } : null));
      return;
    }

    // Update hover preview for Sew tool (CLO3D Segment Sewing)
    if (!isDraggingRef.current && activeTool === 'sew') {
      let foundSew: any = null;
      for (const piece of pieces) {
        const edgeHit = findEdgeAt(world.x, world.y, piece, 22);
        if (edgeHit !== null) {
          const pts = piece.points;
          const p1 = pts[edgeHit.edgeIndex];
          const p2 = pts[(edgeHit.edgeIndex + 1) % pts.length];
          const lenCm = getEdgeLength(piece, edgeHit.edgeIndex);
          const rot1 = rotatePoint(p1.x, p1.y, piece.rotation);
          const rot2 = rotatePoint(p2.x, p2.y, piece.rotation);
          const startScreen = worldToScreen(piece.position.x + rot1.x, piece.position.y + rot1.y);
          const endScreen = worldToScreen(piece.position.x + rot2.x, piece.position.y + rot2.y);
          const midScreen = {
            x: (startScreen.x + endScreen.x) / 2,
            y: (startScreen.y + endScreen.y) / 2,
          };
          foundSew = {
            pieceId: piece.id,
            edgeIndex: edgeHit.edgeIndex,
            lenCm,
            midScreen,
            startScreen,
            endScreen,
          };
          break;
        }
      }
      setSewHover(foundSew);
    } else if (sewHover && activeTool !== 'sew') {
      setSewHover(null);
    }

    // Update hover for Free-Sew tool
    if (!isDraggingRef.current && activeTool === 'free-sew') {
      let foundFreeSew: typeof freeSewHover = null;
      for (const piece of pieces) {
        const hit = findEdgeWithParam(world.x, world.y, piece, 22);
        if (hit !== null) {
          const sp = worldToScreen(hit.worldPoint.x, hit.worldPoint.y);
          foundFreeSew = {
            pieceId: piece.id,
            edgeIndex: hit.edgeIndex,
            param: hit.param,
            worldPoint: hit.worldPoint,
            screenPoint: sp,
          };
          break;
        }
      }
      setFreeSewHover(foundFreeSew);
    } else if (freeSewHover && activeTool !== 'free-sew') {
      setFreeSewHover(null);
    }

    // Update hover for Edit-Sew tool
    if (!isDraggingRef.current && activeTool === 'edit-sew') {
      const nearSeam = findSeamNearPoint(sx, sy, 18);
      setEditSewHover(nearSeam);
    } else if (editSewHover && activeTool !== 'edit-sew') {
      setEditSewHover(null);
    }

    // Update hover preview for Pen / Curve tool
    if (!isDraggingRef.current && (activeTool === 'pen' || activeTool === 'curve')) {
      let found: any = null;
      for (const piece of pieces) {
        const edgeHit = findEdgeAt(world.x, world.y, piece);
        if (edgeHit !== null) {
          const rot = rotatePoint(edgeHit.point.x, edgeHit.point.y, piece.rotation);
          found = {
            pieceId: piece.id,
            edgeIndex: edgeHit.edgeIndex,
            point: { x: piece.position.x + rot.x, y: piece.position.y + rot.y },
          };
          break;
        }
      }
      setHoverInfo(found);
    }

    if (!isDraggingRef.current) return;

    const dx = sx - dragStartRef.current.x;
    const dy = sy - dragStartRef.current.y;

    if (dragModeRef.current === 'pan') {
      setViewState((prev) => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }));
      dragStartRef.current = { x: sx, y: sy };
    } else if (dragModeRef.current === 'piece' && draggedPieceIdRef.current) {
      const worldDx = dx / viewState.scale;
      const worldDy = dy / viewState.scale;
      updatePiecePosition(draggedPieceIdRef.current, {
        x: Math.round(initialPiecePosRef.current.x + worldDx),
        y: Math.round(initialPiecePosRef.current.y + worldDy),
      });
    } else if (
      dragModeRef.current === 'vertex' &&
      draggedPieceIdRef.current &&
      draggedVertexRef.current !== null
    ) {
      const piece = pieces.find((p) => p.id === draggedPieceIdRef.current);
      if (!piece) return;

      const localDelta = localPoint({ x: dx / viewState.scale, y: dy / viewState.scale }, { x: 0, y: 0 }, initialPieceRotationRef.current);
      updatePieceVertex(draggedPieceIdRef.current, draggedVertexRef.current, {
        x: initialVertexPosRef.current.x + localDelta.x,
        y: initialVertexPosRef.current.y + localDelta.y,
      });
    } else if (dragModeRef.current === 'rotate' && draggedPieceIdRef.current) {
      const piece = pieces.find((p) => p.id === draggedPieceIdRef.current);
      if (!piece) return;

      const angle = initialPieceRotationRef.current + rotationDelta(
        Math.atan2(world.y - piece.position.y, world.x - piece.position.x), initialDragAngleRef.current);
      // Snap to 15° increments when Shift is held
      const finalAngle = e.shiftKey ? Math.round(angle / (Math.PI / 12)) * (Math.PI / 12) : angle;
      setPieceRotation(draggedPieceIdRef.current, finalAngle);
    } else if (dragModeRef.current === 'scale' && draggedPieceIdRef.current) {
      const handle = dragHandleRef.current;
      const piece = pieces.find((p) => p.id === draggedPieceIdRef.current);
      if (!piece || !handle) return;

      const anchor = transformAnchorRef.current;
      const bounds = transformBoundsRef.current;
      const local = unrotateFromPiece(world.x, world.y, piece);

      let scaleX = 1;
      let scaleY = 1;

      const isCorner = ['nw', 'ne', 'se', 'sw'].includes(handle);
      const isHorizontalEdge = ['n', 's'].includes(handle);
      const isVerticalEdge = ['w', 'e'].includes(handle);

      if (isCorner || isVerticalEdge) {
        // Scale X from anchor to mouse
        const oldDist = Math.abs(bounds.width);
        const newDist = handle.includes('w')
          ? anchor.x - local.x
          : local.x - anchor.x;
        if (oldDist > 5 && Math.abs(newDist) > 5) scaleX = newDist / oldDist;
      }
      if (isCorner || isHorizontalEdge) {
        // Scale Y from anchor to mouse
        const oldDist = Math.abs(bounds.height);
        const newDist = handle.includes('n')
          ? anchor.y - local.y
          : local.y - anchor.y;
        if (oldDist > 5 && Math.abs(newDist) > 5) scaleY = newDist / oldDist;
      }

      // Shift = proportional scale for corners (free scale without Shift)
      // For edge midpoints: Shift constrains to proportional
      if (e.shiftKey && (isCorner || isHorizontalEdge || isVerticalEdge)) {
        const uniform = Math.max(Math.abs(scaleX), Math.abs(scaleY));
        if (isCorner) {
          scaleX = uniform * Math.sign(scaleX || 1);
          scaleY = uniform * Math.sign(scaleY || 1);
        } else if (isHorizontalEdge) {
          scaleX = scaleY;
        } else if (isVerticalEdge) {
          scaleY = scaleX;
        }
      }

      // Clamp to prevent inversion below a threshold
      scaleX = Math.max(0.05, Math.abs(scaleX)) * Math.sign(scaleX || 1);
      scaleY = Math.max(0.05, Math.abs(scaleY)) * Math.sign(scaleY || 1);

      const shape = scalePatternShape(initialShapeRef.current, scaleX, scaleY, anchor);
      updatePieceShape(piece.id, shape.points, shape.edgeCurvatures, shape.internalLines, shape.cutting);
    } else if (dragModeRef.current === 'curve' && curveDragRef.current) {
      // Curve tool: interactive drag to adjust Bezier control point
      const cDrag = curveDragRef.current;
      const piece = pieces.find((p) => p.id === cDrag.pieceId);
      if (!piece) return;

      const newCurvature = dragCurvature(cDrag.initialCurvature,
        { x: world.x - cDrag.startMouse.x, y: world.y - cDrag.startMouse.y }, piece.rotation, cDrag.controlWeight);

      // If curvature is very small, remove it
      if (Math.abs(newCurvature.cpx) < 2 && Math.abs(newCurvature.cpy) < 2) {
        setEdgeCurvature(cDrag.pieceId, cDrag.edgeIndex, null);
      } else {
        setEdgeCurvature(cDrag.pieceId, cDrag.edgeIndex, newCurvature);
      }
    }
  };

  const handleMouseUp = () => {
    if (dragModeRef.current === 'cut' && cutLine) {
      const dist = Math.hypot(cutLine.end.x - cutLine.start.x, cutLine.end.y - cutLine.start.y);
      if (dist > 20) {
        for (const piece of pieces) {
          const ok = cutPiece(piece.id, cutLine.start, cutLine.end);
          if (ok) break;
        }
      }
      setCutLine(null);
    }
    if (dragModeRef.current === 'curve') {
      curveDragRef.current = null;
    }
    isDraggingRef.current = false;
    dragModeRef.current = null;
    draggedPieceIdRef.current = null;
    draggedVertexRef.current = null;
    dragHandleRef.current = null;
    endEdit();
  };

  const cancelDrag = useCallback(() => {
    cancelEdit();
    isDraggingRef.current = false;
    dragModeRef.current = null;
    draggedPieceIdRef.current = null;
    draggedVertexRef.current = null;
    dragHandleRef.current = null;
    curveDragRef.current = null;
    setCutLine(null);
  }, [cancelEdit]);
  const pointerHandlers = useCanvasPointers({ view: viewState, setView: setViewState,
    minScale: 0.08, maxScale: 3, onDown: handleMouseDown, onMove: handleMouseMove,
    onUp: handleMouseUp, onCancel: cancelDrag });

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (pendingSeamEdge) {
      setPendingSeamEdge(null);
      setSeamToast('Pilihan jahitan dibatalkan.');
      return;
    }
    if (pendingFreeSewEdge) {
      setPendingFreeSewEdge(null);
      setSeamToast('Free-sew cancelled.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    // Check for seam near right-click → show context menu
    const nearSeam = findSeamNearPoint(sx, sy, 22);
    if (nearSeam) {
      setSelectedSeamId(nearSeam);
      setSeamContextMenu({ x: e.clientX, y: e.clientY, seamId: nearSeam });
      return;
    }

    // Fallback: right-click on edge to remove seam
    for (const piece of pieces) {
      const edgeHit = findEdgeAt(world.x, world.y, piece, 22);
      if (edgeHit !== null) {
        const matchingSeam = seams.find(
          (s) =>
            (s.edgeA.pieceId === piece.id && s.edgeA.edgeIndex === edgeHit.edgeIndex) ||
            (s.edgeB.pieceId === piece.id && s.edgeB.edgeIndex === edgeHit.edgeIndex)
        );
        if (matchingSeam) {
          setSelectedSeamId(matchingSeam.id);
          setSeamContextMenu({ x: e.clientX, y: e.clientY, seamId: matchingSeam.id });
          return;
        }
      }
    }
    setSeamContextMenu(null);
  };

  // Double-click: Photoshop-style enter vertex editing mode from select tool
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'select') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    for (let i = pieces.length - 1; i >= 0; i--) {
      if (isPointInPiece(world.x, world.y, pieces[i])) {
        selectPiece(pieces[i].id);
        setActiveTool('vertex');
        return;
      }
    }
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setViewState((prev) => {
      const newScale = Math.max(0.08, Math.min(3.0, prev.scale * zoomFactor));
      return {
        scale: newScale,
        offsetX: mouseX - (mouseX - prev.offsetX) * (newScale / prev.scale),
        offsetY: mouseY - (mouseY - prev.offsetY) * (newScale / prev.scale),
      };
    });
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas?.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas?.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Track which tool was active before Space was pressed (for temporary hand tool)
  const spaceToolRef = useRef<string | null>(null);

  // Keyboard Shortcuts for 2D Pattern Editor (Undo/Redo & Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && (e.target.isContentEditable || !!e.target.closest('button'))) ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }

      // Space = temporary hand/pan tool (Photoshop convention)
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        if (activeTool !== 'move') {
          spaceToolRef.current = activeTool;
          setActiveTool('move');
        }
        return;
      }

      // Escape = return to Select tool / deselect
      if (e.key === 'Escape') {
        cancelDrag();
        setDrawingPolygonPoints([]);
        setPolygonMousePos(null);
        setSeamContextMenu(null);
        if (activeTool !== 'select') {
          setActiveTool('select');
        } else {
          selectPiece(null);
        }
        return;
      }

      // Delete selected vertex or piece or seam
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSeamId && (activeTool === 'edit-sew' || activeTool === 'sew' || activeTool === 'free-sew')) {
          e.preventDefault();
          removeSeam(selectedSeamId);
          setSelectedSeamId(null);
          setSeamToast('✂️ Seam removed.');
        } else if (selectedPieceId && selectedVertexIndex !== null) {
          e.preventDefault();
          deleteVertex(selectedPieceId, selectedVertexIndex);
        } else if (selectedPieceId && activeTool === 'select') {
          e.preventDefault();
          deletePiece(selectedPieceId);
        }
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedPieceId) duplicatePiece(selectedPieceId);
      }

    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release Space = return to previous tool
      if (e.key === ' ' && spaceToolRef.current !== null) {
        setActiveTool(spaceToolRef.current as any);
        spaceToolRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedPieceId, selectedVertexIndex, activeTool, deleteVertex, deletePiece, duplicatePiece, setActiveTool, selectPiece, selectedSeamId, removeSeam, setSelectedSeamId, cancelDrag]);

  return (
    <div className="relative w-full h-full bg-[#111317] overflow-hidden flex flex-col select-none">
      <div className="absolute top-0 left-0 right-0 z-10 border-b border-stone-200 bg-[#f7f5ef]/95 text-stone-600">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-stone-800">Pattern editor</span>
          <button onClick={() => setCanvasViewMode('assembled')} className="text-[11px] hover:text-stone-950">Sketch & artwork</button>
        </div>
        <div className="flex items-center gap-1 px-3 pb-2 flex-wrap text-[11px]">
          <button onClick={() => setShowSeams(!showSeams)} aria-pressed={showSeams || sewingTool}
            className={`px-2 py-1 rounded ${showSeams || sewingTool ? 'bg-amber-100 text-amber-900' : 'hover:bg-stone-200'}`}>Seams</button>
          <button onClick={() => setShowDimensions(!showDimensions)} aria-pressed={showDimensions}
            className={`px-2 py-1 rounded ${showDimensions ? 'bg-amber-100 text-amber-900' : 'hover:bg-stone-200'}`}>Sizes</button>
          <button onClick={() => { setShowBodyGuide(!showBodyGuide); updateAvatar2D({ visible: !showBodyGuide }); }}
            aria-pressed={showBodyGuide} className={`px-2 py-1 rounded ${showBodyGuide ? 'bg-amber-100 text-amber-900' : 'hover:bg-stone-200'}`}><User className="w-3 h-3 inline mr-1" />Body guide</button>
          <button onClick={() => setShowLayersOverlay(!showLayersOverlay)} className="px-2 py-1 rounded hover:bg-stone-200">Pieces</button>
          <button onClick={() => setShowAvatarControls(!showAvatarControls)} className="px-2 py-1 rounded hover:bg-stone-200">Body size</button>
        </div>
      </div>
      <div className="absolute bottom-16 left-4 right-4 z-10 pointer-events-none text-[11px] text-stone-600 leading-relaxed bg-[#f7f5ef]/90 rounded-md px-2 py-1">
        {TOOLS.find((tool) => tool.id === activeTool)?.description}
        {pendingSeamEdge && <span className="block font-semibold text-amber-800">Now choose the edge to join it to.</span>}
      </div>

      {/* Photoshop-Style Floating Pattern Layers Panel */}
      {showLayersOverlay && (
        <div className="absolute top-24 right-4 z-20 w-72 bg-[#161821]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> Pattern Layers
            </span>
            <button
              onClick={() => addBlankPiece('pocket')}
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-semibold"
            >
              <Plus className="w-3 h-3" /> Add Piece
            </button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {pieces.map((p) => {
              const isSelected = p.id === selectedPieceId;
              return (
                <div
                  key={p.id}
                  onClick={() => selectPiece(p.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 text-white'
                      : 'bg-[#1b1e28]/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: p.color || '#3b82f6' }}
                    />
                    <span className="truncate font-medium text-xs">{p.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePieceVisibility(p.id);
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                      title={p.visible === false ? 'Show Piece' : 'Hide Piece'}
                    >
                      {p.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePieceLock(p.id);
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                      title={p.locked ? 'Unlock Piece' : 'Lock Piece'}
                    >
                      {p.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicatePiece(p.id, true);
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Mirror Duplicate (Flip X)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePiece(p.id);
                      }}
                      className="p-1 text-rose-400/80 hover:text-rose-300"
                      title="Delete Piece"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating 2D Avatar Body Sizing Overlay */}
      {showAvatarControls && (
        <div className="absolute top-24 right-4 z-20 w-80 bg-[#161821]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" /> 2D Avatar Body Measurements
            </span>
            <button
              onClick={() => setShowAvatarControls(false)}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Adjust mannequin body lines. The 2D cutting silhouette updates synchronously with 3D draping:
          </p>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-slate-400">Bust Circumference</span>
                <span className="text-blue-400 font-mono">{avatar.chestCircumference} cm</span>
              </div>
              <input
                type="range"
                min={75}
                max={125}
                value={avatar.chestCircumference}
                onChange={(e) => setAvatarMeasurement('chestCircumference', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-slate-400">Waist Circumference</span>
                <span className="text-amber-400 font-mono">{avatar.waistCircumference} cm</span>
              </div>
              <input
                type="range"
                min={55}
                max={110}
                value={avatar.waistCircumference}
                onChange={(e) => setAvatarMeasurement('waistCircumference', Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-slate-400">Hips Circumference</span>
                <span className="text-emerald-400 font-mono">{avatar.hipsCircumference} cm</span>
              </div>
              <input
                type="range"
                min={80}
                max={130}
                value={avatar.hipsCircumference}
                onChange={(e) => setAvatarMeasurement('hipsCircumference', Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-slate-400">Avatar Height</span>
                <span className="text-indigo-400 font-mono">{avatar.height} cm</span>
              </div>
              <input
                type="range"
                min={150}
                max={195}
                value={avatar.height}
                onChange={(e) => setAvatarMeasurement('height', Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-slate-400">Guide Opacity</span>
                <span className="text-slate-300 font-mono">{Math.round(avatar2D.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={avatar2D.opacity}
                onChange={(e) => updateAvatar2D({ opacity: Number(e.target.value) })}
                className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 bg-[#171a23]/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/70 shadow-xl">
        <button
          onClick={() =>
            setViewState((v) => ({ ...v, scale: Math.min(3.0, v.scale * 1.2) }))
          }
          className="p-1.5 hover:bg-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            setViewState((v) => ({ ...v, scale: Math.max(0.2, v.scale * 0.8) }))
          }
          className="p-1.5 hover:bg-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => fitView()}
          className="p-1.5 hover:bg-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Fit all pieces"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCanvasViewMode('assembled')}
          className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white text-xs font-semibold rounded-lg transition-colors ml-1"
          title="Return to Assembled Flat View"
        >
          Sketch
        </button>
      </div>

      {/* Fabric Patch & Component Library Modal */}
      {(showPatchModal || activeTool === 'patch') && (
        <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181b24] border border-slate-700/90 rounded-2xl p-5 max-w-xl w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Shapes className="w-5 h-5 text-blue-400" />
                <span>Fabric Patch & Component Library</span>
              </div>
              <button
                onClick={() => {
                  setShowPatchModal(false);
                  if (activeTool === 'patch') setActiveTool('select');
                }}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors font-medium"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Select a garment piece, pocket, sleeve, or decorative patch to insert directly into your 2D pattern cutting workspace.
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { type: 'pocket', icon: '👝', title: 'Patch Pocket', desc: 'Chest / utility pocket' },
                { type: 'sleeve', icon: '💪', title: 'Short Sleeves', desc: 'Pair of anatomical sleeves' },
                { type: 'collar', icon: '👔', title: 'Ribbed Collar', desc: 'Neckband rib knit collar' },
                { type: 'star', icon: '⭐', title: 'Star Emblem', desc: '5-point decorative applique' },
                { type: 'shield', icon: '🛡️', title: 'Shield Crest', desc: 'Chest heraldic badge' },
                { type: 'circle', icon: '⭕', title: 'Round Elbow Patch', desc: 'Circular reinforcement patch' },
                { type: 'waistband', icon: '📏', title: 'Waistband Band', desc: 'Ribbed hem bottom band' },
                { type: 'cuff', icon: '🧥', title: 'Wrist Cuffs', desc: 'Ribbed sleeve cuffs' },
                { type: 'rect', icon: '📐', title: 'Rectangular Panel', desc: 'Custom fabric block' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    addFabricPatch(item.type as PatchPresetType, { x: 320, y: 240 });
                    setShowPatchModal(false);
                    setActiveTool('select');
                  }}
                  className="bg-[#13151c] hover:bg-slate-800/90 p-3 rounded-xl border border-slate-800 hover:border-blue-500/70 transition-all text-left flex flex-col gap-1 group cursor-pointer"
                >
                  <span className="text-2xl mb-0.5">{item.icon}</span>
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-400">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CLO3D Dynamic Toast / Status Banner */}
      {seamToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-[#141824]/95 text-slate-100 text-xs px-4 py-2 rounded-full border border-blue-500/50 shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in zoom-in duration-200 pointer-events-none">
          <Scissors className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">{seamToast}</span>
        </div>
      )}

      {/* Pending Free-Sew Indicator */}
      {pendingFreeSewEdge && (
        <span className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 animate-pulse pointer-events-none backdrop-blur-md">
          🔗 Click target point on another edge
        </span>
      )}

      {/* Seam Context Menu (right-click) */}
      {seamContextMenu && (() => {
        const seam = seams.find(s => s.id === seamContextMenu.seamId);
        if (!seam) return null;
        const pA = pieces.find(p => p.id === seam.edgeA.pieceId);
        const pB = pieces.find(p => p.id === seam.edgeB.pieceId);
        return (
          <div
            className="fixed z-50 bg-[#1a1d26] border border-slate-600/80 rounded-xl shadow-2xl py-1.5 min-w-[200px] text-xs text-slate-200 backdrop-blur-md"
            style={{ left: seamContextMenu.x, top: seamContextMenu.y }}
            onClick={() => setSeamContextMenu(null)}
          >
            <div className="px-3 py-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-700/80 mb-1">
              Seam: {pA?.name || '?'} ↔ {pB?.name || '?'}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); reverseSeam(seamContextMenu.seamId); setSeamToast('↺ Seam direction reversed.'); setSeamContextMenu(null); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-700/60 flex items-center gap-2 transition-colors"
            >
              <span>↺</span> Reverse Direction
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeSeam(seamContextMenu.seamId); setSelectedSeamId(null); setSeamToast('✂️ Seam removed.'); setSeamContextMenu(null); }}
              className="w-full text-left px-3 py-2 hover:bg-rose-950/40 text-rose-400 flex items-center gap-2 transition-colors"
            >
              <span>✂️</span> Delete Seam
            </button>
            <div className="border-t border-slate-700/80 mt-1 pt-1.5 px-3 py-1 text-[10px] text-slate-500">
              {seam.stitchType || 'single-needle'} · Strength: {(seam.strength * 100).toFixed(0)}%
            </div>
          </div>
        );
      })()}

      <canvas
        ref={canvasRef}
        {...pointerHandlers}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={`w-full h-full block touch-none ${
          activeTool === 'move'
            ? 'cursor-grab'
            : activeTool === 'pen'
            ? 'cursor-crosshair'
            : activeTool === 'curve'
            ? 'cursor-alias'
            : activeTool === 'cut'
            ? 'cursor-crosshair'
            : activeTool === 'polygon'
            ? 'cursor-crosshair'
            : activeTool === 'sew'
            ? 'cursor-copy'
            : activeTool === 'free-sew'
            ? 'cursor-crosshair'
            : activeTool === 'edit-sew'
            ? 'cursor-pointer'
            : 'cursor-default'
        }`}
      />
    </div>
  );
};
