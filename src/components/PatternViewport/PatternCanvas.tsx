import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { drawSublimationPattern } from '../../utils/patternPresets';
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
  Compass,
  Shapes,
} from 'lucide-react';

export const PatternCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    setCanvasViewMode,
    canvasTheme,
    setCanvasTheme,
    updatePieceColor,
    sublimationPrint,
    tataBusanaMode,
    setTataBusanaMode,
    addNotchToEdge,
    removeNotch,
    annotations,
    selectedAnnotationId,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    setSelectedAnnotationId,
    referenceImages,
    selectedRefImageId,
    addReferenceImage,
    updateReferenceImage,
    removeReferenceImage,
    setSelectedRefImageId,
    showRollGuides,
    fabricRollWidthCm,
    setShowRollGuides,
    addRectanglePiece,
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
    undo,
    redo,
    setActiveTool,
    cutPiece,
    addFabricPatch,
    addCustomPiece,
    setEdgeCurvature,
    pushHistory,
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
    scale: 0.58,
    offsetX: 25,
    offsetY: 65,
  });

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

  // Freeform 2D Canvas Modals & Tools (CorelDraw style)
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [showAddStripModal, setShowAddStripModal] = useState(false);
  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [textModalInput, setTextModalInput] = useState('');
  const [stripNameInput, setStripNameInput] = useState('TALI 1 X');
  const [stripWidthInput, setStripWidthInput] = useState(75);
  const [stripHeightInput, setStripHeightInput] = useState(5);
  const [refNameInput, setRefNameInput] = useState('Foto Prototype Fitting');
  const [refUrlInput, setRefUrlInput] = useState('');

  // Dragging annotations and reference images
  const draggedAnnotationIdRef = useRef<string | null>(null);
  const initialAnnotationPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedRefImageIdRef = useRef<string | null>(null);
  const initialRefImagePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cache for loaded reference images
  const refImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [, setRefImageLoadTrigger] = useState(0);

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
    'pan' | 'piece' | 'vertex' | 'scale' | 'rotate' | 'curve' | 'avatar-guide' | 'cut' | 'annotation' | 'refImage' | null
  >(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedPieceIdRef = useRef<string | null>(null);
  const draggedVertexRef = useRef<number | null>(null);
  const dragHandleRef = useRef<string | null>(null); // 'nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w', 'rot'
  const initialPiecePosRef = useRef({ x: 0, y: 0 });
  const initialPieceRotationRef = useRef(0);
  const initialPointsRef = useRef<{ x: number; y: number }[]>([]);
  const initialVertexPosRef = useRef({ x: 0, y: 0 });

  // Curve tool drag state
  const curveDragRef = useRef<{
    pieceId: string;
    edgeIndex: number;
    startMouse: { x: number; y: number }; // world coords at drag start
    initialCurvature: EdgeCurvature | null;
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
    const dx = wx - piece.position.x;
    const dy = wy - piece.position.y;
    const cos = Math.cos(-piece.rotation);
    const sin = Math.sin(-piece.rotation);
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
  };

  // Check point in polygon (accounts for piece rotation)
  const isPointInPiece = (wx: number, wy: number, piece: PatternPiece) => {
    const local = unrotateFromPiece(wx, wy, piece);
    let inside = false;
    const pts = piece.points;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x,
        yi = pts[i].y;
      const xj = pts[j].x,
        yj = pts[j].y;
      const intersect =
        yi > local.y !== yj > local.y &&
        local.x < ((xj - xi) * (local.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
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
    const local = unrotateFromPiece(wx, wy, piece);
    const worldThreshold = threshold / viewState.scale;
    const pts = piece.points;
    for (let i = 0; i < pts.length; i++) {
      const nextIdx = (i + 1) % pts.length;
      const x1 = pts[i].x;
      const y1 = pts[i].y;
      const x2 = pts[nextIdx].x;
      const y2 = pts[nextIdx].y;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;

      let t = ((local.x - x1) * dx + (local.y - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;

      const dist = Math.hypot(local.x - projX, local.y - projY);
      if (dist <= worldThreshold) {
        return {
          edgeIndex: i,
          param: t,
          point: { x: projX, y: projY },
        };
      }
    }
    return null;
  };

  // Find edge with parameter t (0-1 along edge) for free-sew
  const findEdgeWithParam = (wx: number, wy: number, piece: PatternPiece, threshold = 14) => {
    const local = unrotateFromPiece(wx, wy, piece);
    const worldThreshold = threshold / viewState.scale;
    const pts = piece.points;
    for (let i = 0; i < pts.length; i++) {
      const nextIdx = (i + 1) % pts.length;
      const x1 = pts[i].x, y1 = pts[i].y;
      const x2 = pts[nextIdx].x, y2 = pts[nextIdx].y;
      const dx = x2 - x1, dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let t = ((local.x - x1) * dx + (local.y - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * dx, projY = y1 + t * dy;
      const dist = Math.hypot(local.x - projX, local.y - projY);
      if (dist <= worldThreshold) {
        const rot = rotatePoint(projX, projY, piece.rotation);
        return {
          edgeIndex: i,
          param: t,
          worldPoint: { x: piece.position.x + rot.x, y: piece.position.y + rot.y },
        };
      }
    }
    return null;
  };

  // Find seam near screen point (for edit-sew tool)
  const findSeamNearPoint = (sx: number, sy: number, threshold = 18): string | null => {
    for (const seam of seams) {
      const pieceA = pieces.find((p) => p.id === seam.edgeA.pieceId);
      const pieceB = pieces.find((p) => p.id === seam.edgeB.pieceId);
      if (!pieceA || !pieceB) continue;
      const ptsA = pieceA.points;
      const ptsB = pieceB.points;
      const p1A = ptsA[seam.edgeA.edgeIndex];
      const p2A = ptsA[(seam.edgeA.edgeIndex + 1) % ptsA.length];
      const p1B = ptsB[seam.edgeB.edgeIndex];
      const p2B = ptsB[(seam.edgeB.edgeIndex + 1) % ptsB.length];
      if (!p1A || !p2A || !p1B || !p2B) continue;

      const rot1A = rotatePoint(p1A.x, p1A.y, pieceA.rotation);
      const rot2A = rotatePoint(p2A.x, p2A.y, pieceA.rotation);
      const rot1B = rotatePoint(p1B.x, p1B.y, pieceB.rotation);
      const rot2B = rotatePoint(p2B.x, p2B.y, pieceB.rotation);
      const midA = worldToScreen(
        pieceA.position.x + (rot1A.x + rot2A.x) / 2,
        pieceA.position.y + (rot1A.y + rot2A.y) / 2
      );
      const midB = worldToScreen(
        pieceB.position.x + (rot1B.x + rot2B.x) / 2,
        pieceB.position.y + (rot1B.y + rot2B.y) / 2
      );

      // Check distance to edge segments A and B, and to the arc midpoint
      const distA = distToSegment(sx, sy, midA.x, midA.y, midB.x, midB.y);
      if (distA <= threshold) return seam.id;
      // Check distance to each edge highlight
      const sA1 = worldToScreen(pieceA.position.x + rot1A.x, pieceA.position.y + rot1A.y);
      const sA2 = worldToScreen(pieceA.position.x + rot2A.x, pieceA.position.y + rot2A.y);
      const sB1 = worldToScreen(pieceB.position.x + rot1B.x, pieceB.position.y + rot1B.y);
      const sB2 = worldToScreen(pieceB.position.x + rot2B.x, pieceB.position.y + rot2B.y);
      if (distToSegment(sx, sy, sA1.x, sA1.y, sA2.x, sA2.y) <= threshold) return seam.id;
      if (distToSegment(sx, sy, sB1.x, sB1.y, sB2.x, sB2.y) <= threshold) return seam.id;
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

  // Helper: compute edge length in cm
  const getEdgeLength = (piece: PatternPiece, edgeIndex: number, paramStart = 0, paramEnd = 1) => {
    const pts = piece.points;
    const p1 = pts[edgeIndex];
    const p2 = pts[(edgeIndex + 1) % pts.length];
    if (!p1 || !p2) return 0;
    const fullLen = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 10;
    return Math.round(fullLen * Math.abs(paramEnd - paramStart) * 10) / 10;
  };

  // Get piece bounding box in local coords
  const getPieceLocalBounds = (piece: PatternPiece) => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    piece.points.forEach((pt) => {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    });
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  // Check if mouse hits transform handles (bounding box)
  const findTransformHandleAt = (wx: number, wy: number, piece: PatternPiece) => {
    const local = unrotateFromPiece(wx, wy, piece);
    const bounds = getPieceLocalBounds(piece);
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

    // Body dimensions scaled to pattern units (10 units = 1 cm)
    // Front view center
    const centerX = av2d.position.x;
    const centerY = av2d.position.y;

    const shoulderHalfW = ((av.shoulderWidth || 40) * 10) / 2;
    const bustHalfW = ((av.chestCircumference / Math.PI) * 10) / 2 * 1.08;
    const waistHalfW = ((av.waistCircumference / Math.PI) * 10) / 2 * 1.02;
    const hipHalfW = ((av.hipsCircumference / Math.PI) * 10) / 2 * 1.12;

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

    // 1. Studio Artboard Background
    const isWhite = canvasTheme === 'white';
    ctx.fillStyle = isWhite ? '#ffffff' : '#111317';
    ctx.fillRect(0, 0, width, height);

    // 2. CAD Grid
    const gridSize = 40 * viewState.scale;
    const startX = ((viewState.offsetX % gridSize) + gridSize) % gridSize;
    const startY = ((viewState.offsetY % gridSize) + gridSize) % gridSize;

    ctx.strokeStyle = isWhite ? '#f1f5f9' : '#181b22';
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

    // Major CAD Grid lines (every 5 cells)
    const majorGridSize = gridSize * 5;
    const majorStartX = ((viewState.offsetX % majorGridSize) + majorGridSize) % majorGridSize;
    const majorStartY = ((viewState.offsetY % majorGridSize) + majorGridSize) % majorGridSize;
    ctx.strokeStyle = isWhite ? '#e2e8f0' : '#232834';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = majorStartX; x < width; x += majorGridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = majorStartY; y < height; y += majorGridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 3. Draw 2D Avatar Silhouette Background (CLO3D feature)
    drawAvatar2DGuide(ctx, avatar, avatar2D);

    // 3b. Draw Sublimation Fabric Roll Width Limits (Garis Batas Lebar Kain)
    if (showRollGuides) {
      const topY = worldToScreen(0, 0).y;
      const rollHeightWorld = (fabricRollWidthCm || 150) * 10;
      const bottomY = worldToScreen(0, rollHeightWorld).y;

      ctx.save();
      // Shaded roll background bed
      ctx.fillStyle = isWhite ? 'rgba(244, 63, 94, 0.03)' : 'rgba(244, 63, 94, 0.06)';
      ctx.fillRect(0, topY, width, bottomY - topY);

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 6]);

      ctx.beginPath();
      ctx.moveTo(0, topY);
      ctx.lineTo(width, topY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, bottomY);
      ctx.lineTo(width, bottomY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating Banner Badge (Guaranteed visible)
      const badgeY = Math.max(105, Math.min(height - 40, topY + 16));
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(16, badgeY, 260, 24, 6);
      ctx.fill();

      ctx.font = 'bold 11px ui-sans-serif, system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`📏 LEBAR KAIN SUBLIMASI: ${fabricRollWidthCm || 150} CM`, 146, badgeY + 12);
      ctx.restore();
    }

    // 3c. Draw Reference Images (Foto Prototype & Screenshot Size Chart - CorelDraw style)
    (referenceImages || []).forEach((refImg) => {
      const sp = worldToScreen(refImg.x, refImg.y);
      const sw = refImg.width * viewState.scale;
      const sh = refImg.height * viewState.scale;
      const isRefSel = selectedRefImageId === refImg.id;

      let imgElem = refImageCacheRef.current.get(refImg.url);
      if (!imgElem) {
        imgElem = new Image();
        imgElem.src = refImg.url;
        imgElem.onload = () => {
          setRefImageLoadTrigger((prev) => prev + 1);
        };
        refImageCacheRef.current.set(refImg.url, imgElem);
      }

      ctx.save();
      ctx.globalAlpha = refImg.opacity ?? 0.85;
      if (imgElem.complete && imgElem.naturalWidth > 0) {
        ctx.drawImage(imgElem, sp.x, sp.y, sw, sh);
      } else {
        ctx.fillStyle = isWhite ? '#e2e8f0' : '#1e293b';
        ctx.fillRect(sp.x, sp.y, sw, sh);
        ctx.fillStyle = isWhite ? '#64748b' : '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(refImg.name || 'Reference Photo', sp.x + sw / 2, sp.y + sh / 2);
      }

      ctx.strokeStyle = isRefSel ? '#3b82f6' : 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = isRefSel ? 2.5 : 1;
      ctx.strokeRect(sp.x, sp.y, sw, sh);
      ctx.restore();
    });

    // 3d. Draw Canvas Annotations & Technical Notes (CorelDraw F8 / Tata Busana Notes)
    (annotations || []).forEach((ann) => {
      const sp = worldToScreen(ann.x, ann.y);
      const isAnnSel = selectedAnnotationId === ann.id;
      const lines = ann.text.split('\n');

      ctx.save();
      const scaledSize = Math.max(9, Math.round(ann.fontSize * viewState.scale));
      ctx.font = ann.isHeader
        ? `bold ${scaledSize}px ui-sans-serif, system-ui`
        : `600 ${scaledSize}px ui-monospace, monospace`;

      const lineHeight = scaledSize + 5;

      let maxLineW = 0;
      lines.forEach((line) => {
        const tw = ctx.measureText(line).width;
        if (tw > maxLineW) maxLineW = tw;
      });
      const boxW = maxLineW + 16;
      const boxH = lines.length * lineHeight + 10;

      if (isAnnSel) {
        ctx.fillStyle = isWhite ? 'rgba(239, 246, 255, 0.95)' : 'rgba(30, 41, 59, 0.95)';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(sp.x - 4, sp.y - scaledSize - 2, boxW, boxH, 6);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = ann.color || (isWhite ? '#0f172a' : '#f8fafc');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, sp.x + 4, sp.y + lIdx * lineHeight);
      });
      ctx.restore();
    });

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

      ctx.fillStyle = piece.color
        ? (isWhite ? `${piece.color}2e` : `${piece.color}44`)
        : isSelected
        ? 'rgba(59, 130, 246, 0.22)'
        : piece.locked
        ? 'rgba(100, 116, 139, 0.08)'
        : isWhite
        ? '#f8fafc'
        : 'rgba(255, 255, 255, 0.06)';
      ctx.fill();

      // Sublimation Pattern Print Fill (Diana's Page 45 & 46)
      if (sublimationPrint && sublimationPrint !== 'none') {
        let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
        screenPts.forEach((pt) => {
          if (pt.x < pMinX) pMinX = pt.x;
          if (pt.y < pMinY) pMinY = pt.y;
          if (pt.x > pMaxX) pMaxX = pt.x;
          if (pt.y > pMaxY) pMaxY = pt.y;
        });
        ctx.save();
        ctx.clip();
        drawSublimationPattern(ctx, sublimationPrint, { minX: pMinX, minY: pMinY, maxX: pMaxX, maxY: pMaxY });
        ctx.restore();
      }

      // Tata Busana standard line colors (Garis Merah TM / Garis Biru TB)
      const isFrontPiece = piece.tataBusanaType === 'TM' || piece.name.toLowerCase().includes('front') || piece.name.toLowerCase().includes('depan');
      const isBackPiece = piece.tataBusanaType === 'TB' || piece.name.toLowerCase().includes('back') || piece.name.toLowerCase().includes('belakang');

      // Stroke Outline
      ctx.strokeStyle = isSelected
        ? '#2563eb'
        : tataBusanaMode && isFrontPiece
        ? '#dc2626' // Red for front (TM)
        : tataBusanaMode && isBackPiece
        ? '#2563eb' // Blue for back (TB)
        : piece.locked
        ? '#94a3b8'
        : isWhite
        ? '#0f172a'
        : '#64748b';
      ctx.lineWidth = isSelected ? 2.5 : isWhite ? 1.8 : 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw Sewing Notches (Tanda Pas / Cekikan)
      if (piece.notches && piece.notches.length > 0) {
        piece.notches.forEach((notch) => {
          const sp1 = screenPts[notch.edgeIndex];
          const nextIdx = (notch.edgeIndex + 1) % screenPts.length;
          const sp2 = screenPts[nextIdx];
          if (!sp1 || !sp2) return;
          const t = notch.param;
          const nx = sp1.x + (sp2.x - sp1.x) * t;
          const ny = sp1.y + (sp2.y - sp1.y) * t;
          const dx = sp2.x - sp1.x;
          const dy = sp2.y - sp1.y;
          const len = Math.hypot(dx, dy) || 1;
          const perpX = -dy / len;
          const perpY = dx / len;

          ctx.save();
          ctx.strokeStyle = isSelected ? '#1d4ed8' : '#0f172a';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(nx - perpX * 8, ny - perpY * 8);
          ctx.lineTo(nx + perpX * 8, ny + perpY * 8);
          ctx.stroke();

          if (notch.type === 'double') {
            const uX = dx / len;
            const uY = dy / len;
            ctx.beginPath();
            ctx.moveTo((nx + uX * 5) - perpX * 8, (ny + uY * 5) - perpY * 8);
            ctx.lineTo((nx + uX * 5) + perpX * 8, (ny + uY * 5) + perpY * 8);
            ctx.stroke();
          }
          ctx.restore();
        });
      }

      // Draw Topstitches along seams (if enabled)
      if (stitchSettings.showStitches) {
        seams.forEach((seam) => {
          let edgeIdx: number | null = null;
          if (seam.edgeA.pieceId === piece.id) edgeIdx = seam.edgeA.edgeIndex;
          else if (seam.edgeB.pieceId === piece.id) edgeIdx = seam.edgeB.edgeIndex;

          if (edgeIdx !== null && screenPts[edgeIdx]) {
            const nextIdx = (edgeIdx + 1) % pts.length;
            const p1 = screenPts[edgeIdx];
            const p2 = screenPts[nextIdx];

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

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
          }
        });
      }

      // Draw Center Direction & Grainline Indicator (Arah Serat Benang)
      const centerScreen = worldToScreen(piece.position.x, piece.position.y);
      ctx.save();
      ctx.translate(centerScreen.x, centerScreen.y);
      ctx.rotate(piece.rotation);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, -35 * viewState.scale);
      ctx.lineTo(0, 35 * viewState.scale);
      ctx.moveTo(-4, -30 * viewState.scale);
      ctx.lineTo(0, -35 * viewState.scale);
      ctx.lineTo(4, -30 * viewState.scale);
      ctx.moveTo(-4, 30 * viewState.scale);
      ctx.lineTo(0, 35 * viewState.scale);
      ctx.lineTo(4, 30 * viewState.scale);
      ctx.stroke();
      ctx.setLineDash([]);

      // Grainline Text
      ctx.font = '500 8.5px ui-monospace, monospace';
      ctx.fillStyle = isWhite ? '#64748b' : '#94a3b8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('↕ Arah Serat', 8, 0);

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

      // Piece Label (Unified Pill Badge with Integrated TM/TB tag & zero collision)
      let minPtY = Infinity, maxPtY = -Infinity;
      pts.forEach((p) => {
        if (p.y < minPtY) minPtY = p.y;
        if (p.y > maxPtY) maxPtY = p.y;
      });
      const pieceHeightWorld = maxPtY - minPtY;
      const isNarrowStrip = pieceHeightWorld < 45;

      const hasTataTag = tataBusanaMode && (piece.tataBusanaType || isFrontPiece || isBackPiece);
      const badgeTag = hasTataTag ? (piece.tataBusanaType || (isFrontPiece ? 'TM' : 'TB')) : null;

      ctx.save();
      ctx.font = '600 11px ui-sans-serif, system-ui';
      const labelText = piece.name;
      const textW = ctx.measureText(labelText).width;
      const badgeW = badgeTag ? 28 : 0;
      const pillW = textW + (badgeTag ? badgeW + 20 : 16);
      const pillH = 22;
      const pillX = centerScreen.x - pillW / 2;

      // If narrow strip, place pill ABOVE the strip with clear 12px margin; otherwise centered inside lower body
      const pillY = isNarrowStrip
        ? worldToScreen(piece.position.x, piece.position.y + minPtY).y - pillH - 12
        : centerScreen.y + Math.min(pieceHeightWorld * 0.22, 35) * viewState.scale;

      // Pill Background
      ctx.fillStyle = isWhite ? '#ffffff' : '#1e293b';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#2563eb' : (isWhite ? '#cbd5e1' : '#475569');
      ctx.lineWidth = 1;
      ctx.stroke();

      // If Tata Busana Tag, draw integrated badge on the left side INSIDE the pill!
      if (badgeTag) {
        const isTM = badgeTag === 'TM';
        const tagBoxX = pillX + 3;
        const tagBoxY = pillY + 2.5;
        const tagBoxW = 24;
        const tagBoxH = 17;

        ctx.fillStyle = isTM ? '#dc2626' : '#2563eb';
        ctx.beginPath();
        ctx.roundRect(tagBoxX, tagBoxY, tagBoxW, tagBoxH, 4);
        ctx.fill();

        ctx.font = 'bold 9px ui-sans-serif, system-ui';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeTag, tagBoxX + tagBoxW / 2, tagBoxY + tagBoxH / 2);

        // Draw piece name to the right of the tag inside the pill
        ctx.font = '600 11px ui-sans-serif, system-ui';
        ctx.fillStyle = isSelected ? '#1e40af' : (isWhite ? '#0f172a' : '#f1f5f9');
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, tagBoxX + tagBoxW + 6, pillY + pillH / 2);
      } else {
        ctx.fillStyle = isSelected ? '#1e40af' : (isWhite ? '#0f172a' : '#f1f5f9');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, centerScreen.x, pillY + pillH / 2);
      }
      ctx.restore();

      // Edge Segment Dimensions (Metric labels) with curve arc length approximation
      for (let i = 0; i < pts.length; i++) {
        const nextIdx = (i + 1) % pts.length;
        const p1 = pts[i];
        const p2 = pts[nextIdx];
        const curv = curvatures[i];

        let lengthCm: string;
        if (curv) {
          const cpx = (p1.x + p2.x) / 2 + curv.cpx;
          const cpy = (p1.y + p2.y) / 2 + curv.cpy;
          let arcLen = 0;
          let prevX = p1.x, prevY = p1.y;
          for (let t = 1; t <= 8; t++) {
            const tt = t / 8;
            const inv = 1 - tt;
            const bx = inv * inv * p1.x + 2 * inv * tt * cpx + tt * tt * p2.x;
            const by = inv * inv * p1.y + 2 * inv * tt * cpy + tt * tt * p2.y;
            arcLen += Math.hypot(bx - prevX, by - prevY);
            prevX = bx;
            prevY = by;
          }
          lengthCm = (arcLen / 10).toFixed(1);
        } else {
          lengthCm = (Math.hypot(p2.x - p1.x, p2.y - p1.y) / 10).toFixed(1);
        }

        // Only draw segment dimension if piece is selected (or in measure tool) and segment >= 6 cm
        const numCm = parseFloat(lengthCm);
        const showDim = (isSelected || activeTool === 'measure') && numCm >= 6.0;
        if (showDim) {
          const sp1 = screenPts[i];
          const sp2 = screenPts[nextIdx];
          const midX = (sp1.x + sp2.x) / 2;
          const midY = (sp1.y + sp2.y) / 2;

          ctx.save();
          ctx.font = '600 9.5px ui-monospace, monospace';
          const dimText = `${lengthCm} cm`;
          const dimW = ctx.measureText(dimText).width;
          ctx.fillStyle = isWhite ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.9)';
          ctx.beginPath();
          ctx.roundRect(midX - dimW / 2 - 4, midY - 14, dimW + 8, 14, 4);
          ctx.fill();
          ctx.strokeStyle = isWhite ? '#cbd5e1' : '#475569';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          ctx.fillStyle = isWhite ? '#1e293b' : '#e2e8f0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dimText, midX, midY - 7);
          ctx.restore();
        }
      }

      // Draw Vertices handles (Direct Select tool A, Pen tool P, Curvature tool C)
      const shouldDrawVertices = (activeTool === 'vertex' || activeTool === 'pen' || activeTool === 'curve') || isSelected;
      if (shouldDrawVertices) {
        screenPts.forEach((sp, idx) => {
          const isVertSelected = isSelected && idx === selectedVertexIndex;
          if (isVertSelected) {
            ctx.save();
            // Outer glow ring
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 8.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(37, 99, 235, 0.3)';
            ctx.fill();
            // Solid blue anchor with white border
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = '#2563eb';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#2563eb' : (isWhite ? '#0f172a' : '#64748b');
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
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
        const bounds = getPieceLocalBounds(piece);
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
        const rotHandleLocal = { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY - 30 };
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
        const idx1 = pendingSeamEdge.edgeIndex;
        const idx2 = (idx1 + 1) % pts.length;
        ctx.beginPath();
        ctx.moveTo(screenPts[idx1].x, screenPts[idx1].y);
        ctx.lineTo(screenPts[idx2].x, screenPts[idx2].y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Directional notch indicator (CLO3D style)
        const notchX = screenPts[idx1].x * 0.75 + screenPts[idx2].x * 0.25;
        const notchY = screenPts[idx1].y * 0.75 + screenPts[idx2].y * 0.25;
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
        const idx1 = sewHover.edgeIndex;
        const idx2 = (idx1 + 1) % pts.length;
        ctx.beginPath();
        ctx.moveTo(screenPts[idx1].x, screenPts[idx1].y);
        ctx.lineTo(screenPts[idx2].x, screenPts[idx2].y);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Hover Notch
        const notchX = screenPts[idx1].x * 0.75 + screenPts[idx2].x * 0.25;
        const notchY = screenPts[idx1].y * 0.75 + screenPts[idx2].y * 0.25;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(notchX, notchY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4b. CLO3D Interactive Rubber-Band Sewing Preview Line
    if (activeTool === 'sew' && pendingSeamEdge && mouseScreenPos) {
      const pA = pieces.find((p) => p.id === pendingSeamEdge.pieceId);
      if (pA && pA.points[pendingSeamEdge.edgeIndex]) {
        const p1A = pA.points[pendingSeamEdge.edgeIndex];
        const p2A = pA.points[(pendingSeamEdge.edgeIndex + 1) % pA.points.length];
        const rot1A = rotatePoint(p1A.x, p1A.y, pA.rotation);
        const rot2A = rotatePoint(p2A.x, p2A.y, pA.rotation);
        const midA = worldToScreen(
          pA.position.x + (rot1A.x + rot2A.x) / 2,
          pA.position.y + (rot1A.y + rot2A.y) / 2
        );

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
          const lenA = Math.round((Math.hypot(p2A.x - p1A.x, p2A.y - p1A.y) / 10) * 10) / 10;
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

    // 6. Draw Virtual Seam Links — color-coded arcs, direction notches, labels (only active in sewing tools)
    const isSewingActive = activeTool === 'sew' || activeTool === 'edit-sew' || activeTool === 'free-sew' || selectedSeamId !== null;
    if (isSewingActive) {
      seams.forEach((seam, sIdx) => {
      const pieceA = pieces.find((p) => p.id === seam.edgeA.pieceId);
      const pieceB = pieces.find((p) => p.id === seam.edgeB.pieceId);
      if (!pieceA || !pieceB) return;

      const ptsA = pieceA.points;
      const ptsB = pieceB.points;
      const p1A = ptsA[seam.edgeA.edgeIndex];
      const p2A = ptsA[(seam.edgeA.edgeIndex + 1) % ptsA.length];
      const p1B = ptsB[seam.edgeB.edgeIndex];
      const p2B = ptsB[(seam.edgeB.edgeIndex + 1) % ptsB.length];
      if (!p1A || !p2A || !p1B || !p2B) return;

      // Compute lengths for color coding
      const psA = seam.edgeA.paramStart ?? 0;
      const peA = seam.edgeA.paramEnd ?? 1;
      const psB = seam.edgeB.paramStart ?? 0;
      const peB = seam.edgeB.paramEnd ?? 1;
      const lenA = getEdgeLength(pieceA, seam.edgeA.edgeIndex, psA, peA);
      const lenB = getEdgeLength(pieceB, seam.edgeB.edgeIndex, psB, peB);
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

      const rot1A = rotatePoint(p1A.x, p1A.y, pieceA.rotation);
      const rot2A = rotatePoint(p2A.x, p2A.y, pieceA.rotation);
      const rot1B = rotatePoint(p1B.x, p1B.y, pieceB.rotation);
      const rot2B = rotatePoint(p2B.x, p2B.y, pieceB.rotation);

      const sA1 = worldToScreen(pieceA.position.x + rot1A.x, pieceA.position.y + rot1A.y);
      const sA2 = worldToScreen(pieceA.position.x + rot2A.x, pieceA.position.y + rot2A.y);
      const sB1 = worldToScreen(pieceB.position.x + rot1B.x, pieceB.position.y + rot1B.y);
      const sB2 = worldToScreen(pieceB.position.x + rot2B.x, pieceB.position.y + rot2B.y);

      const midA = { x: (sA1.x + sA2.x) / 2, y: (sA1.y + sA2.y) / 2 };
      const midB = { x: (sB1.x + sB2.x) / 2, y: (sB1.y + sB2.y) / 2 };

      // Highlight edges with colored glow
      ctx.save();
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = isSelected ? 4 : isHovered ? 3.5 : 2.5;
      ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.9 : 0.6;
      // Edge A
      ctx.beginPath();
      ctx.moveTo(sA1.x, sA1.y);
      ctx.lineTo(sA2.x, sA2.y);
      ctx.stroke();
      // Edge B
      ctx.beginPath();
      ctx.moveTo(sB1.x, sB1.y);
      ctx.lineTo(sB2.x, sB2.y);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Selected glow
      if (isSelected) {
        ctx.shadowColor = seamColor;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = seamColor;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sA1.x, sA1.y); ctx.lineTo(sA2.x, sA2.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sB1.x, sB1.y); ctx.lineTo(sB2.x, sB2.y); ctx.stroke();
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
    }

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
        const pts = piece.points;
        const p1 = pts[pendingFreeSewEdge.edgeIndex];
        const p2 = pts[(pendingFreeSewEdge.edgeIndex + 1) % pts.length];
        if (p1 && p2) {
          const pS = pendingFreeSewEdge.paramStart;
          const wx = p1.x + (p2.x - p1.x) * pS;
          const wy = p1.y + (p2.y - p1.y) * pS;
          const rot = rotatePoint(wx, wy, piece.rotation);
          const sp = worldToScreen(piece.position.x + rot.x, piece.position.y + rot.y);

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
    canvasTheme,
    drawAvatar2DGuide,
    sublimationPrint,
    tataBusanaMode,
    annotations,
    selectedAnnotationId,
    referenceImages,
    selectedRefImageId,
    showRollGuides,
    fabricRollWidthCm,
  ]);

  // ==========================================
  // Mouse Handlers (Photoshop & CAD Tools)
  // ==========================================
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    isDraggingRef.current = true;
    dragStartRef.current = { x: sx, y: sy };
    setSeamContextMenu(null); // Dismiss any open context menu

    // Middle click or Space/Move tool -> Pan
    if (e.button === 1 || e.shiftKey || activeTool === 'move') {
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

      // 0d. Notch Tool: Click edge to place sewing balance notch (Tanda Pas)
      if (activeTool === 'notch') {
        for (let i = pieces.length - 1; i >= 0; i--) {
          const piece = pieces[i];
          if (!piece.locked && piece.visible !== false) {
            const edgeHit = findEdgeAt(world.x, world.y, piece, 22);
            if (edgeHit !== null) {
              selectPiece(piece.id);
              pushHistory();
              addNotchToEdge(piece.id, edgeHit.edgeIndex, edgeHit.param);
              setSeamToast(`Added notch (Tanda Pas) on ${piece.name}`);
              return;
            }
          }
        }
      }

      // 0e. Text Annotation Tool (CorelDraw F8 style)
      if (activeTool === 'text') {
        let clickedAnnId: string | null = null;
        for (let i = (annotations || []).length - 1; i >= 0; i--) {
          const ann = annotations[i];
          const dist = Math.hypot(world.x - ann.x, world.y - ann.y);
          if (dist < 40 / viewState.scale) {
            clickedAnnId = ann.id;
            break;
          }
        }
        if (clickedAnnId) {
          setSelectedAnnotationId(clickedAnnId);
          draggedAnnotationIdRef.current = clickedAnnId;
          const found = annotations.find((a) => a.id === clickedAnnId);
          if (found) initialAnnotationPosRef.current = { x: found.x, y: found.y };
          dragModeRef.current = 'annotation';
        } else {
          setTextModalInput('KOMPONEN GARMEN:\n• TALI 1 X\n• LAPISAN 1 X\n• BAN PINGGANG 1 X');
          setShowAddTextModal(true);
        }
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

      // 2. Pen Tool: Split edge & insert point OR start drafting custom polygon
      if (activeTool === 'pen') {
        // First check if clicked on existing vertex to select across all pieces
        for (let i = pieces.length - 1; i >= 0; i--) {
          const piece = pieces[i];
          if (piece.visible !== false) {
            const vIdx = findVertexAt(world.x, world.y, piece, 18);
            if (vIdx !== null) {
              selectPiece(piece.id);
              selectVertex(vIdx);
              return;
            }
          }
        }
        // Then check if clicked on an edge to insert anchor point across all pieces
        for (let i = pieces.length - 1; i >= 0; i--) {
          const piece = pieces[i];
          if (!piece.locked && piece.visible !== false) {
            const edgeHit = findEdgeAt(world.x, world.y, piece, 18);
            if (edgeHit !== null) {
              selectPiece(piece.id);
              pushHistory();
              addVertexToEdge(piece.id, edgeHit.edgeIndex, edgeHit.point);
              selectVertex(edgeHit.edgeIndex + 1);
              setSeamToast(`Added anchor point on ${piece.name}`);
              return;
            }
          }
        }
        // If clicked on empty space, start / continue drafting custom polygon piece
        if (drawingPolygonPoints.length === 0) {
          setDrawingPolygonPoints([{ x: Math.round(world.x), y: Math.round(world.y) }]);
          setPolygonMousePos({ x: world.x, y: world.y });
        } else {
          const firstPt = drawingPolygonPoints[0];
          const distToFirst = Math.hypot(world.x - firstPt.x, world.y - firstPt.y);
          if (distToFirst < 25 && drawingPolygonPoints.length >= 3) {
            pushHistory();
            const cx = drawingPolygonPoints.reduce((s, p) => s + p.x, 0) / drawingPolygonPoints.length;
            const cy = drawingPolygonPoints.reduce((s, p) => s + p.y, 0) / drawingPolygonPoints.length;
            const localPoints = drawingPolygonPoints.map(p => ({ x: Math.round(p.x - cx), y: Math.round(p.y - cy) }));
            addCustomPiece('Custom Pattern Piece', localPoints, { x: Math.round(cx), y: Math.round(cy) });
            setDrawingPolygonPoints([]);
            setPolygonMousePos(null);
            setSeamToast('Created custom pattern piece!');
          } else {
            setDrawingPolygonPoints((prev) => [...prev, { x: Math.round(world.x), y: Math.round(world.y) }]);
          }
        }
        return;
      }

      // 3. Curve Tool: Drag edge to bend (Illustrator-style click+drag)
      if (activeTool === 'curve') {
        for (const piece of pieces) {
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
              pushHistory();
              curveDragRef.current = {
                pieceId: piece.id,
                edgeIndex: edgeIdx,
                startMouse: { x: world.x, y: world.y },
                initialCurvature: { ...curv },
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
            pushHistory();
            const existingCurv = curvs[edgeHit.edgeIndex] || null;
            curveDragRef.current = {
              pieceId: piece.id,
              edgeIndex: edgeHit.edgeIndex,
              startMouse: { x: world.x, y: world.y },
              initialCurvature: existingCurv ? { ...existingCurv } : null,
            };
            dragModeRef.current = 'curve';
            isDraggingRef.current = true;
            return;
          }
        }
      }

      // 4. Select Tool: Check transform handles first (bounding box)
      if (activeTool === 'select') {
        // Check if clicked on a canvas annotation (CorelDraw F8 text note)
        for (let i = (annotations || []).length - 1; i >= 0; i--) {
          const ann = annotations[i];
          const dist = Math.hypot(world.x - ann.x, world.y - ann.y);
          if (dist < 40 / viewState.scale) {
            setSelectedAnnotationId(ann.id);
            selectPiece(null);
            setSelectedRefImageId(null);
            draggedAnnotationIdRef.current = ann.id;
            initialAnnotationPosRef.current = { x: ann.x, y: ann.y };
            dragModeRef.current = 'annotation';
            return;
          }
        }

        // Check if clicked on a reference image
        for (let i = (referenceImages || []).length - 1; i >= 0; i--) {
          const img = referenceImages[i];
          if (
            world.x >= img.x &&
            world.x <= img.x + img.width &&
            world.y >= img.y &&
            world.y <= img.y + img.height
          ) {
            setSelectedRefImageId(img.id);
            selectPiece(null);
            setSelectedAnnotationId(null);
            draggedRefImageIdRef.current = img.id;
            initialRefImagePosRef.current = { x: img.x, y: img.y };
            dragModeRef.current = 'refImage';
            return;
          }
        }
      }

      if (activeTool === 'select' && selectedPieceId) {
        const piece = pieces.find((p) => p.id === selectedPieceId);
        if (piece && !piece.locked) {
          const handle = findTransformHandleAt(world.x, world.y, piece);
          if (handle) {
            draggedPieceIdRef.current = piece.id;
            dragHandleRef.current = handle;
            initialPiecePosRef.current = { ...piece.position };
            initialPieceRotationRef.current = piece.rotation;
            initialPointsRef.current = JSON.parse(JSON.stringify(piece.points));

            const bounds = getPieceLocalBounds(piece);
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
              pushHistory();
            }
            return;
          }
        }
      }

      // 5. Check vertex click (Direct Select Tool A / Node Tool) across ALL pieces
      if (activeTool === 'vertex' || activeTool === 'select') {
        let hitPiece: PatternPiece | null = null;
        let vIdx: number | null = null;

        // Check currently selected piece first
        if (selectedPieceId) {
          const p = pieces.find((item) => item.id === selectedPieceId);
          if (p && !p.locked && p.visible !== false) {
            const hit = findVertexAt(world.x, world.y, p, 18);
            if (hit !== null) {
              hitPiece = p;
              vIdx = hit;
            }
          }
        }

        // If not found on selected piece, search ALL pieces
        if (vIdx === null) {
          for (let i = pieces.length - 1; i >= 0; i--) {
            const p = pieces[i];
            if (!p.locked && p.visible !== false) {
              const hit = findVertexAt(world.x, world.y, p, 18);
              if (hit !== null) {
                hitPiece = p;
                vIdx = hit;
                break;
              }
            }
          }
        }

        if (hitPiece && vIdx !== null) {
          selectPiece(hitPiece.id);
          selectVertex(vIdx);
          pushHistory();
          dragModeRef.current = 'vertex';
          draggedPieceIdRef.current = hitPiece.id;
          draggedVertexRef.current = vIdx;
          initialVertexPosRef.current = {
            x: hitPiece.points[vIdx].x,
            y: hitPiece.points[vIdx].y,
          };
          return;
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
        if (!clickedPiece.locked) {
          dragModeRef.current = 'piece';
          draggedPieceIdRef.current = clickedPiece.id;
          initialPiecePosRef.current = { ...clickedPiece.position };
        }
      } else {
        selectPiece(null);
        dragModeRef.current = 'pan'; // Empty space drag pans canvas
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
          const distWorld = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const lenCm = Math.round((distWorld / 10) * 10) / 10;
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
    } else if (dragModeRef.current === 'annotation' && draggedAnnotationIdRef.current) {
      const worldDx = dx / viewState.scale;
      const worldDy = dy / viewState.scale;
      updateAnnotation(draggedAnnotationIdRef.current, {
        x: Math.round(initialAnnotationPosRef.current.x + worldDx),
        y: Math.round(initialAnnotationPosRef.current.y + worldDy),
      });
    } else if (dragModeRef.current === 'refImage' && draggedRefImageIdRef.current) {
      const worldDx = dx / viewState.scale;
      const worldDy = dy / viewState.scale;
      updateReferenceImage(draggedRefImageIdRef.current, {
        x: Math.round(initialRefImagePosRef.current.x + worldDx),
        y: Math.round(initialRefImagePosRef.current.y + worldDy),
      });
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

      // Project mouse movement to unrotated local space
      const localWorld = unrotateFromPiece(world.x, world.y, piece);
      updatePieceVertex(draggedPieceIdRef.current, draggedVertexRef.current, {
        x: Math.round(localWorld.x),
        y: Math.round(localWorld.y),
      });
    } else if (dragModeRef.current === 'rotate' && draggedPieceIdRef.current) {
      const piece = pieces.find((p) => p.id === draggedPieceIdRef.current);
      if (!piece) return;

      // Compute angle from piece center to mouse
      const center = worldToScreen(piece.position.x, piece.position.y);
      const angle = Math.atan2(sy - center.y, sx - center.x) + Math.PI / 2;
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

      // Apply scale relative to anchor point using initial points
      const newPoints = initialPointsRef.current.map((pt, idx) => ({
        ...piece.points[idx],
        x: Math.round(anchor.x + (pt.x - anchor.x) * scaleX),
        y: Math.round(anchor.y + (pt.y - anchor.y) * scaleY),
      }));

      const updatedPieces = pieces.map((p) =>
        p.id === piece.id ? { ...p, points: newPoints } : p
      );
      // Direct set without pushHistory (already pushed on mouseDown)
      useCloStore.setState({
        pieces: updatedPieces,
        simulationIteration: useCloStore.getState().simulationIteration + 1,
      });
    } else if (dragModeRef.current === 'curve' && curveDragRef.current) {
      // Curve tool: interactive drag to adjust Bezier control point
      const cDrag = curveDragRef.current;
      const piece = pieces.find((p) => p.id === cDrag.pieceId);
      if (!piece) return;

      const pts = piece.points;
      const p1 = pts[cDrag.edgeIndex];
      const p2 = pts[(cDrag.edgeIndex + 1) % pts.length];

      // Project mouse into local piece coordinates
      const localMouse = unrotateFromPiece(world.x, world.y, piece);

      // The control point = mouse position in local coords minus edge midpoint
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const newCurvature: EdgeCurvature = {
        cpx: localMouse.x - midX,
        cpy: localMouse.y - midY,
      };

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
    draggedAnnotationIdRef.current = null;
    draggedRefImageIdRef.current = null;
    isDraggingRef.current = false;
    dragModeRef.current = null;
    draggedPieceIdRef.current = null;
    draggedVertexRef.current = null;
    dragHandleRef.current = null;
  };

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

    // Check if right-clicked near a notch
    for (const piece of pieces) {
      if (piece.notches && piece.notches.length > 0) {
        for (let nIdx = 0; nIdx < piece.notches.length; nIdx++) {
          const notch = piece.notches[nIdx];
          const pts = piece.points;
          const p1 = pts[notch.edgeIndex];
          const p2 = pts[(notch.edgeIndex + 1) % pts.length];
          if (!p1 || !p2) continue;
          const rot1 = rotatePoint(p1.x, p1.y, piece.rotation);
          const rot2 = rotatePoint(p2.x, p2.y, piece.rotation);
          const s1 = worldToScreen(piece.position.x + rot1.x, piece.position.y + rot1.y);
          const s2 = worldToScreen(piece.position.x + rot2.x, piece.position.y + rot2.y);
          const nx = s1.x + (s2.x - s1.x) * notch.param;
          const ny = s1.y + (s2.y - s1.y) * notch.param;
          if (Math.hypot(sx - nx, sy - ny) < 18) {
            removeNotch(piece.id, nIdx);
            setSeamToast('Removed notch (Tanda Pas)');
            return;
          }
        }
      }
    }

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

  // Double-click: Add anchor point to edge OR enter vertex mode (Illustrator / CorelDraw behavior)
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    // 1. Check if double-clicked on any edge -> insert anchor point!
    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i];
      if (piece.locked || piece.visible === false) continue;
      const edgeHit = findEdgeAt(world.x, world.y, piece, 20);
      if (edgeHit !== null) {
        selectPiece(piece.id);
        pushHistory();
        addVertexToEdge(piece.id, edgeHit.edgeIndex, edgeHit.point);
        selectVertex(edgeHit.edgeIndex + 1);
        setActiveTool('vertex');
        setSeamToast(`Added anchor point to ${piece.name}`);
        return;
      }
    }

    // 2. Double click inside piece in select tool -> switch to Direct Select (Vertex) tool
    if (activeTool === 'select') {
      for (let i = pieces.length - 1; i >= 0; i--) {
        if (isPointInPiece(world.x, world.y, pieces[i])) {
          selectPiece(pieces[i].id);
          setActiveTool('vertex');
          return;
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setViewState((prev) => {
      const newScale = Math.max(0.2, Math.min(3.0, prev.scale * zoomFactor));
      return {
        scale: newScale,
        offsetX: mouseX - (mouseX - prev.offsetX) * (newScale / prev.scale),
        offsetY: mouseY - (mouseY - prev.offsetY) * (newScale / prev.scale),
      };
    });
  };

  // Track which tool was active before Space was pressed (for temporary hand tool)
  const spaceToolRef = useRef<string | null>(null);

  // Keyboard Shortcuts for 2D Pattern Editor (Undo/Redo & Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
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
        if (activeTool !== 'select') {
          setActiveTool('select');
        } else {
          selectPiece(null);
        }
        return;
      }

      // Delete selected annotation, ref image, vertex, piece, or seam
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          e.preventDefault();
          removeAnnotation(selectedAnnotationId);
          setSeamToast('Catatan teknis dihapus');
        } else if (selectedRefImageId) {
          e.preventDefault();
          removeReferenceImage(selectedRefImageId);
          setSeamToast('Foto referensi dihapus');
        } else if (selectedSeamId && (activeTool === 'edit-sew' || activeTool === 'sew' || activeTool === 'free-sew')) {
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

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedPieceId) duplicatePiece(selectedPieceId);
      }

      // Hotkeys for CAD & Cutting tools (when no text input active)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'x') setActiveTool('cut');
        else if (k === 'k') setShowPatchModal(true);
        else if (k === 'n') setActiveTool('polygon');
        else if (k === 'v') setActiveTool('select');
        else if (k === 'a') setActiveTool('vertex');
        else if (k === 'p') setActiveTool('pen');
        else if (k === 'c') setActiveTool('curve');
        else if (k === 's') setActiveTool('sew');
        else if (k === 'f') setActiveTool('free-sew');
        else if (k === 'b') setActiveTool('edit-sew');
        else if (k === 'h') setActiveTool('move');
        else if (k === 'm') setActiveTool('measure');
        else if (k === 'u') setActiveTool('notch');
        else if (k === 't' || e.key === 'F8') setActiveTool('text');
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
  }, [selectedPieceId, selectedVertexIndex, activeTool, deleteVertex, deletePiece, duplicatePiece, undo, redo, setActiveTool, selectPiece, selectedSeamId, removeSeam, setSelectedSeamId, selectedRefImageId, selectedAnnotationId, removeReferenceImage, removeAnnotation]);

  return (
    <div className={`relative w-full h-full ${canvasTheme === 'white' ? 'bg-[#f8fafc]' : 'bg-[#111317]'} overflow-hidden flex flex-col select-none`}>
      {/* 2D Canvas Floating Header (Row 1 + Row 2 flex column, guaranteed no overlap) */}
      <div className="absolute top-3 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Row 1: View Modes, Theme, Zoom, Body Sizing & Layers */}
        <div className="flex items-center gap-2 bg-[#171a23]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/70 shadow-xl text-xs text-slate-300 w-fit">
        <Layers className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-slate-100">2D Pattern Window</span>
        <span className="text-slate-600">|</span>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-[11px]">
          <button
            onClick={() => setCanvasViewMode('assembled')}
            className="px-2.5 py-0.5 rounded-md font-semibold text-slate-400 hover:text-white transition-colors"
            title="Switch to Assembled Front & Back Flat Sketch"
          >
            Flat Sketch
          </button>
          <button
            className="px-2.5 py-0.5 rounded-md font-semibold bg-blue-600 text-white shadow-sm"
            title="2D Pattern Pieces & Seams Canvas"
          >
            Pattern Pieces
          </button>
        </div>

        <span className="text-slate-600">|</span>

        {/* Theme Segmented Switcher (White Artboard / Dark CAD) */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-[11px]">
          <button
            onClick={() => setCanvasTheme('white')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              canvasTheme === 'white'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Switch to Clean White Artboard (CorelDraw / Illustrator Style)"
          >
            ☀️ White
          </button>
          <button
            onClick={() => setCanvasTheme('dark')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              canvasTheme === 'dark'
                ? 'bg-slate-700 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Switch to Dark CAD Workspace"
          >
            🌙 Dark
          </button>
        </div>

        <span className="text-slate-600">|</span>
        <span className="text-slate-400 font-mono text-[11px]">{(viewState.scale * 100).toFixed(0)}%</span>

        <span className="text-slate-600">|</span>

        {/* Floating Action Buttons: Layers Panel & Avatar Quick Sizer (Inside same Row 1, zero overlap!) */}
        <button
          onClick={() => setShowAvatarControls(!showAvatarControls)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
            showAvatarControls
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-600/20'
              : 'bg-slate-800/60 text-slate-300 hover:text-white border-slate-700/70'
          }`}
          title="Edit 2D Avatar Measurements"
        >
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>Body Sizing</span>
        </button>

        <button
          onClick={() => setShowLayersOverlay(!showLayersOverlay)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
            showLayersOverlay
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-600/20'
              : 'bg-slate-800/60 text-slate-300 hover:text-white border-slate-700/70'
          }`}
          title="Pattern Layers"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Layers ({pieces.length})</span>
        </button>

        {/* Pending Seam Indicator */}
        {pendingSeamEdge && (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 animate-pulse ml-1">
            <Scissors className="w-3 h-3" /> Select Target Edge to Sew
          </span>
        )}
      </div>

        {/* Row 2: 2D Canvas CAD Drafting & Sublimasi Shelf */}
        <div className="flex items-center gap-2 bg-[#171a23]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs text-slate-200 w-fit">
        <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
          <span>📐 CAD:</span>
        </span>

        {/* Tata Busana (TM/TB) Mode Toggle */}
        <button
          onClick={() => setTataBusanaMode(!tataBusanaMode)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors text-[11px] font-semibold ${
            tataBusanaMode
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
          title="Toggle Indonesian Tata Busana Notation (TM Merah / TB Biru / Arah Serat)"
        >
          <span>{tataBusanaMode ? '📐 Tata Busana: ON' : '📐 Tata Busana: OFF'}</span>
        </button>

        {/* 2D Avatar Guide Toggle */}
        <button
          onClick={() => updateAvatar2D({ visible: !avatar2D.visible })}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors text-[11px] font-semibold ${
            avatar2D.visible
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
          title="Toggle Anatomical 2D Avatar Silhouette Guide"
        >
          <User className="w-3 h-3" />
          <span>Avatar: {avatar2D.visible ? 'ON' : 'OFF'}</span>
        </button>

        <span className="text-slate-600">|</span>

        {/* Fabric Roll Limit Guide Toggle */}
        <button
          onClick={() => setShowRollGuides(!showRollGuides)}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-colors text-[11px] font-semibold ${
            showRollGuides
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
          title="Toggle Sublimation Roll Width Boundary Guides (150cm)"
        >
          <span>{showRollGuides ? '📏 Roll 150cm: ON' : '📏 Roll 150cm'}</span>
        </button>

        <span className="text-slate-600">|</span>

        {/* Action Buttons: Add Note, Add Rect Strip, Add Ref Photo */}
        <button
          onClick={() => {
            setTextModalInput('KOMPONEN GARMEN:\n• TALI 1 X\n• LAPISAN TALI SERUT 1 X\n• BAN PINGGANG 1 X\n• KAIN SERONG 2 X');
            setShowAddTextModal(true);
          }}
          className="px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1 border border-slate-700/60"
          title="Add Technical Text Note / Size Chart (F8)"
        >
          <span>✍️ + Teks (F8)</span>
        </button>

        <button
          onClick={() => setShowAddStripModal(true)}
          className="px-2.5 py-0.5 rounded-md bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-[11px] font-semibold transition-colors flex items-center gap-1 border border-blue-500/40"
          title="Add Rectangular Component Piece (Waistband, Tie, Pocket)"
        >
          <span>📐 + Mal Strip</span>
        </button>

        <button
          onClick={() => setShowAddRefModal(true)}
          className="px-2.5 py-0.5 rounded-md bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[11px] font-semibold transition-colors flex items-center gap-1 border border-purple-500/40"
          title="Drop Reference Photo or Fitting Prototype onto Canvas"
        >
          <span>🖼️ + Foto Ref</span>
        </button>

        {/* If a piece is selected, show its actions right here inline! */}
        {selectedPieceId && (() => {
          const piece = pieces.find((p) => p.id === selectedPieceId);
          if (!piece) return null;
          const swatches = ['#262626', '#f5f5f0', '#4a5340', '#1a2436', '#d4d4d8', '#38bdf8', '#dc2626', '#f59e0b', '#8b5cf6', '#10b981'];
          return (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] text-blue-300 font-bold max-w-[110px] truncate">{piece.name}</span>
              <div className="flex items-center gap-1">
                {swatches.map((col) => (
                  <button
                    key={col}
                    onClick={() => updatePieceColor(piece.id, col)}
                    className="w-3.5 h-3.5 rounded-full border border-white/40 hover:scale-125 transition-transform"
                    style={{ backgroundColor: col }}
                    title={`Fill with ${col}`}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  pushHistory();
                  addNotchToEdge(piece.id, 0, 0.5);
                  setSeamToast(`Added notch (Tanda Pas) to ${piece.name}`);
                }}
                className="px-2 py-0.5 rounded bg-blue-900/50 hover:bg-blue-800/60 text-blue-200 border border-blue-700/50 text-[10px] font-semibold transition-colors"
                title="Add sewing balance notch on this piece"
              >
                + Notch
              </button>
              <button
                onClick={() => duplicatePiece(piece.id)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-colors"
                title="Duplicate Piece (Ctrl+D)"
              >
                Duplicate
              </button>
              <button
                onClick={() => deletePiece(piece.id)}
                className="px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[10px] font-semibold transition-colors"
                title="Delete Piece (Del)"
              >
                Delete
              </button>
            </>
          );
        })()}

        {/* If an annotation is selected, show its actions right here inline! */}
        {selectedAnnotationId && (() => {
          const ann = (annotations || []).find((a) => a.id === selectedAnnotationId);
          if (!ann) return null;
          return (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] text-amber-300 font-bold">Teks Terpilih</span>
              <button
                onClick={() => {
                  setTextModalInput(ann.text);
                  setShowAddTextModal(true);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors"
                title="Edit Text"
              >
                Edit Teks
              </button>
              <button
                onClick={() => removeAnnotation(selectedAnnotationId)}
                className="px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[10px] font-semibold transition-colors"
                title="Delete Annotation"
              >
                Hapus Teks
              </button>
            </>
          );
        })()}

        {/* If a reference image is selected, show its actions right here inline! */}
        {selectedRefImageId && (() => {
          const img = (referenceImages || []).find((i) => i.id === selectedRefImageId);
          if (!img) return null;
          return (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] text-purple-300 font-bold max-w-[120px] truncate">{img.name}</span>
              <button
                onClick={() => removeReferenceImage(selectedRefImageId)}
                className="px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[10px] font-semibold transition-colors"
                title="Delete Reference Image"
              >
                Hapus Foto
              </button>
            </>
          );
        })()}
        </div>
      </div>

      {/* Photoshop-Style Floating Pattern Layers Panel */}
      {showLayersOverlay && (
        <div className="absolute top-14 right-4 z-20 w-72 bg-[#161821]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
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
                      className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
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
        <div className="absolute top-14 right-4 z-20 w-80 bg-[#161821]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
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
          onClick={() => setViewState({ scale: 0.75, offsetX: 120, offsetY: 70 })}
          className="p-1.5 hover:bg-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCanvasViewMode('assembled')}
          className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white text-xs font-semibold rounded-lg transition-colors ml-1"
          title="Return to Assembled Flat View"
        >
          ← Flat View
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

      {/* Modal: Tambah Teks Catatan Teknis / Spek Garmen (CorelDraw F8) */}
      {showAddTextModal && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181b24] border border-slate-700/90 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>✍️ Tambah Teks Catatan Teknis (CorelDraw F8)</span>
              </span>
              <button
                onClick={() => setShowAddTextModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Tulis catatan komponen (e.g. "TALI 1 X", "BAN PINGGANG 1 X", atau tabel ukuran) langsung di kanvas:
            </p>
            <textarea
              rows={5}
              value={textModalInput}
              onChange={(e) => setTextModalInput(e.target.value)}
              className="w-full bg-[#111317] border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
              placeholder="Tulis catatan teknis..."
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddTextModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (textModalInput.trim()) {
                    addAnnotation({
                      text: textModalInput.trim(),
                      x: 250,
                      y: 350,
                      fontSize: 12,
                      color: canvasTheme === 'white' ? '#0f172a' : '#f8fafc',
                    });
                    setSeamToast('Catatan teknis ditambahkan ke kanvas');
                    setShowAddTextModal(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
              >
                Tambahkan ke Kanvas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Mal Pola Komponen (Rectangle Strip) */}
      {showAddStripModal && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181b24] border border-slate-700/90 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>📐 Buat Mal Pola Komponen / Strip Baru</span>
              </span>
              <button
                onClick={() => setShowAddStripModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Pilih template cepat atau atur panjang & lebar komponen (dalam cm):
            </p>

            {/* Quick preset chips */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { name: 'TALI 1 X', w: 75, h: 5 },
                { name: 'BAN PINGGANG 1 X', w: 95, h: 12 },
                { name: 'LAPISAN TALI 1 X', w: 35, h: 6 },
                { name: 'KANTONG 2X', w: 18, h: 16 },
                { name: 'MANSET LENGAN 2X', w: 24, h: 8 },
                { name: 'BIS SERONG 2 X', w: 45, h: 4 },
              ].map((chip) => (
                <button
                  key={chip.name}
                  onClick={() => {
                    setStripNameInput(chip.name);
                    setStripWidthInput(chip.w);
                    setStripHeightInput(chip.h);
                  }}
                  className="p-2 rounded-lg bg-[#111317] border border-slate-800 hover:border-blue-500/50 text-left text-[11px] text-slate-300 transition-colors"
                >
                  <div className="font-semibold text-slate-200">{chip.name}</div>
                  <div className="text-[10px] text-slate-400">{chip.w} cm × {chip.h} cm</div>
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">Nama Komponen Pola:</label>
                <input
                  type="text"
                  value={stripNameInput}
                  onChange={(e) => setStripNameInput(e.target.value)}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium mb-1 block">Panjang (cm):</label>
                  <input
                    type="number"
                    value={stripWidthInput}
                    onChange={(e) => setStripWidthInput(Number(e.target.value))}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium mb-1 block">Lebar / Tinggi (cm):</label>
                  <input
                    type="number"
                    value={stripHeightInput}
                    onChange={(e) => setStripHeightInput(Number(e.target.value))}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddStripModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (stripNameInput.trim() && stripWidthInput > 0 && stripHeightInput > 0) {
                    addRectanglePiece(stripNameInput.trim(), stripWidthInput, stripHeightInput);
                    setSeamToast(`Pola ${stripNameInput} (${stripWidthInput}x${stripHeightInput} cm) dibuat`);
                    setShowAddStripModal(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
              >
                Buat Pola Potong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Foto Referensi / Fitting Prototype (CorelDraw style) */}
      {showAddRefModal && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181b24] border border-slate-700/90 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>🖼️ Tambah Foto Referensi / Prototype Fitting</span>
              </span>
              <button
                onClick={() => setShowAddRefModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Tempel foto anak fitting atau screenshot size chart ke kanvas seperti di CorelDraw:
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">Unggah Gambar (File):</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setRefUrlInput(reader.result as string);
                        setRefNameInput(file.name.replace(/\.[^/.]+$/, ''));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">Atau URL Gambar / DataURL:</label>
                <input
                  type="text"
                  value={refUrlInput}
                  onChange={(e) => setRefUrlInput(e.target.value)}
                  placeholder="https://... atau data:image/..."
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium mb-1 block">Label Foto:</label>
                <input
                  type="text"
                  value={refNameInput}
                  onChange={(e) => setRefNameInput(e.target.value)}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddRefModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (refUrlInput.trim()) {
                    addReferenceImage({
                      name: refNameInput.trim() || 'Foto Prototype',
                      url: refUrlInput.trim(),
                      x: 100,
                      y: 100,
                      width: 220,
                      height: 280,
                      opacity: 0.9,
                    });
                    setSeamToast('Foto referensi ditempel di kanvas');
                    setShowAddRefModal(false);
                    setRefUrlInput('');
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30"
              >
                Tempel di Kanvas
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        className={`w-full h-full block ${
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
