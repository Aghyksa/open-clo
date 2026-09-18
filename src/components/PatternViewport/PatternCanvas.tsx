import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCloStore } from '../../store/useCloStore';
import type { PatternPiece, SeamEdge, AvatarConfig, Avatar2DConfig } from '../../types/cad';
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
} from 'lucide-react';

export const PatternCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    pieces,
    seams,
    selectedPieceId,
    selectedVertexIndex,
    activeTool,
    pendingSeamEdge,
    avatar,
    avatar2D,
    stitchSettings,
    selectPiece,
    selectVertex,
    updatePiecePosition,
    updatePieceVertex,
    setPieceRotation,
    scalePiece,
    addVertexToEdge,
    deleteVertex,
    curveEdge,
    duplicatePiece,
    deletePiece,
    togglePieceLock,
    togglePieceVisibility,
    addBlankPiece,
    setPendingSeamEdge,
    addSeam,
    updateAvatar2D,
    setAvatarMeasurement,
    undo,
    redo,
  } = useCloStore();

  // Viewport Pan & Zoom state
  const [viewState, setViewState] = useState({
    scale: 0.75,
    offsetX: 120,
    offsetY: 70,
  });

  // Layers panel overlay toggle
  const [showLayersOverlay, setShowLayersOverlay] = useState(false);
  const [showAvatarControls, setShowAvatarControls] = useState(false);

  // Mouse hover state for pen/curve preview
  const [hoverInfo, setHoverInfo] = useState<{
    pieceId: string;
    edgeIndex: number;
    point: { x: number; y: number };
  } | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<
    'pan' | 'piece' | 'vertex' | 'scale' | 'rotate' | 'curve' | 'avatar-guide' | null
  >(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedPieceIdRef = useRef<string | null>(null);
  const draggedVertexRef = useRef<number | null>(null);
  const dragHandleRef = useRef<string | null>(null); // 'nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w', 'rot'
  const initialPiecePosRef = useRef({ x: 0, y: 0 });
  const initialPieceRotationRef = useRef(0);
  const initialPointsRef = useRef<{ x: number; y: number }[]>([]);
  const initialVertexPosRef = useRef({ x: 0, y: 0 });

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
          point: { x: projX, y: projY },
        };
      }
    }
    return null;
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
  const drawAvatar2DGuide = (
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
  };

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
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Studio Background
    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, width, height);

    // 2. CAD Grid
    const gridSize = 40 * viewState.scale;
    const startX = ((viewState.offsetX % gridSize) + gridSize) % gridSize;
    const startY = ((viewState.offsetY % gridSize) + gridSize) % gridSize;

    ctx.strokeStyle = '#181b22';
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
    drawAvatar2DGuide(ctx, avatar, avatar2D);

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

      // Fill Polygon
      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.22)'
        : piece.locked
        ? 'rgba(100, 116, 139, 0.08)'
        : 'rgba(255, 255, 255, 0.06)';
      ctx.fill();

      // Stroke Outline
      ctx.strokeStyle = isSelected ? '#3b82f6' : piece.locked ? '#475569' : '#64748b';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

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

      // Draw Center Direction & Grainline Indicator
      const centerScreen = worldToScreen(piece.position.x, piece.position.y);
      ctx.save();
      ctx.translate(centerScreen.x, centerScreen.y);
      ctx.rotate(piece.rotation);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
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
      ctx.fillStyle = isSelected ? '#93c5fd' : '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(piece.name, centerScreen.x, centerScreen.y + 48 * viewState.scale);

      // Edge Segment Dimensions (Metric labels)
      for (let i = 0; i < pts.length; i++) {
        const nextIdx = (i + 1) % pts.length;
        const p1 = pts[i];
        const p2 = pts[nextIdx];
        const lengthCm = (Math.hypot(p2.x - p1.x, p2.y - p1.y) / 10).toFixed(1);

        const sp1 = screenPts[i];
        const sp2 = screenPts[nextIdx];
        const midX = (sp1.x + sp2.x) / 2;
        const midY = (sp1.y + sp2.y) / 2;

        ctx.font = '10px ui-monospace, monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${lengthCm} cm`, midX, midY - 6);
      }

      // Draw Vertices handles (Direct Select tool)
      if (isSelected && (activeTool === 'vertex' || activeTool === 'pen')) {
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

      // Highlight pending seam edge
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
      }
    });

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

    // 6. Draw Virtual Seam Links
    const SEAM_COLORS = ['#38bdf8', '#f43f5e', '#10b981', '#f59e0b', '#a855f7', '#06b6d4'];
    seams.forEach((seam, sIdx) => {
      const pieceA = pieces.find((p) => p.id === seam.edgeA.pieceId);
      const pieceB = pieces.find((p) => p.id === seam.edgeB.pieceId);
      if (!pieceA || !pieceB) return;

      const p1A = pieceA.points[seam.edgeA.edgeIndex];
      const p2A = pieceA.points[(seam.edgeA.edgeIndex + 1) % pieceA.points.length];
      const p1B = pieceB.points[seam.edgeB.edgeIndex];
      const p2B = pieceB.points[(seam.edgeB.edgeIndex + 1) % pieceB.points.length];
      if (!p1A || !p2A || !p1B || !p2B) return;

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

      const seamColor = SEAM_COLORS[sIdx % SEAM_COLORS.length];

      // Curved seam thread line
      ctx.beginPath();
      ctx.moveTo(midA.x, midA.y);
      const cpX = (midA.x + midB.x) / 2;
      const cpY = (midA.y + midB.y) / 2 - 35;
      ctx.quadraticCurveTo(cpX, cpY, midB.x, midB.y);
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Seam Stitch badges
      [midA, midB].forEach((m) => {
        ctx.fillStyle = seamColor;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px ui-sans-serif, system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`S${sIdx + 1}`, m.x, m.y);
      });
    });
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
    worldToScreen,
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

    // Middle click or Space/Move tool -> Pan
    if (e.button === 1 || e.shiftKey || activeTool === 'move') {
      dragModeRef.current = 'pan';
      return;
    }

    // Left click
    if (e.button === 0) {
      // 1. Sew Tool: Click edge
      if (activeTool === 'sew') {
        for (const piece of pieces) {
          const edgeHit = findEdgeAt(world.x, world.y, piece);
          if (edgeHit !== null) {
            const edge: SeamEdge = { pieceId: piece.id, edgeIndex: edgeHit.edgeIndex };
            if (!pendingSeamEdge) {
              setPendingSeamEdge(edge);
            } else {
              if (
                pendingSeamEdge.pieceId !== edge.pieceId ||
                pendingSeamEdge.edgeIndex !== edge.edgeIndex
              ) {
                addSeam(pendingSeamEdge, edge);
              } else {
                setPendingSeamEdge(null);
              }
            }
            return;
          }
        }
        setPendingSeamEdge(null);
        return;
      }

      // 2. Pen Tool: Split edge & insert point
      if (activeTool === 'pen') {
        for (const piece of pieces) {
          const edgeHit = findEdgeAt(world.x, world.y, piece);
          if (edgeHit !== null) {
            addVertexToEdge(piece.id, edgeHit.edgeIndex, edgeHit.point);
            return;
          }
        }
      }

      // 3. Curve Tool: Drag edge to bend
      if (activeTool === 'curve') {
        for (const piece of pieces) {
          const edgeHit = findEdgeAt(world.x, world.y, piece);
          if (edgeHit !== null) {
            curveEdge(piece.id, edgeHit.edgeIndex, 15);
            return;
          }
        }
      }

      // 4. Select Tool: Check transform handles first (bounding box)
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

            if (handle === 'rot') {
              dragModeRef.current = 'rotate';
            } else {
              dragModeRef.current = 'scale';
            }
            return;
          }
        }
      }

      // 5. Check vertex click (Direct Select Tool A)
      if (selectedPieceId && (activeTool === 'vertex' || activeTool === 'select')) {
        const piece = pieces.find((p) => p.id === selectedPieceId);
        if (piece && !piece.locked) {
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
      setPieceRotation(draggedPieceIdRef.current, angle);
    } else if (dragModeRef.current === 'scale' && draggedPieceIdRef.current) {
      const handle = dragHandleRef.current;
      const piece = pieces.find((p) => p.id === draggedPieceIdRef.current);
      if (!piece || !handle) return;

      const bounds = getPieceLocalBounds(piece);
      const local = unrotateFromPiece(world.x, world.y, piece);

      let scaleX = 1;
      let scaleY = 1;

      if (handle.includes('e')) {
        const newW = local.x - bounds.minX;
        if (bounds.width > 10 && newW > 10) scaleX = newW / bounds.width;
      }
      if (handle.includes('s')) {
        const newH = local.y - bounds.minY;
        if (bounds.height > 10 && newH > 10) scaleY = newH / bounds.height;
      }

      if (scaleX !== 1 || scaleY !== 1) {
        scalePiece(piece.id, scaleX, scaleY);
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragModeRef.current = null;
    draggedPieceIdRef.current = null;
    draggedVertexRef.current = null;
    dragHandleRef.current = null;
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

      // Delete selected vertex or piece
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPieceId && selectedVertexIndex !== null) {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPieceId, selectedVertexIndex, activeTool, deleteVertex, deletePiece, undo, redo]);

  return (
    <div className="relative w-full h-full bg-[#111317] overflow-hidden flex flex-col select-none">
      {/* 2D Canvas Top Control Strip */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 bg-[#171a23]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/70 shadow-xl text-xs text-slate-300">
        <Layers className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-slate-100">2D Pattern Window</span>
        <span className="text-slate-600">|</span>

        {/* 2D Avatar Guide Toggle */}
        <button
          onClick={() => updateAvatar2D({ visible: !avatar2D.visible })}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-[11px] font-semibold ${
            avatar2D.visible
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
          title="Toggle Anatomical 2D Avatar Silhouette Guide"
        >
          <User className="w-3.5 h-3.5" />
          <span>2D Avatar: {avatar2D.visible ? 'ON' : 'OFF'}</span>
        </button>

        {avatar2D.visible && (
          <div className="flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700/60 text-[10px]">
            <button
              onClick={() => updateAvatar2D({ view: 'front' })}
              className={`px-2 py-0.5 rounded transition-colors ${
                avatar2D.view === 'front' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Front
            </button>
            <button
              onClick={() => updateAvatar2D({ view: 'back' })}
              className={`px-2 py-0.5 rounded transition-colors ${
                avatar2D.view === 'back' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Back
            </button>
            <button
              onClick={() => updateAvatar2D({ view: 'both' })}
              className={`px-2 py-0.5 rounded transition-colors ${
                avatar2D.view === 'both' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Both
            </button>
          </div>
        )}

        <span className="text-slate-600">|</span>
        <span className="text-slate-400">{(viewState.scale * 100).toFixed(0)}%</span>

        {/* Pending Seam Indicator */}
        {pendingSeamEdge && (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 animate-pulse">
            <Scissors className="w-3 h-3" /> Select Target Edge to Sew
          </span>
        )}
      </div>

      {/* Floating Action Buttons: Layers Panel & Avatar Quick Sizer */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowAvatarControls(!showAvatarControls)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
            showAvatarControls
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-600/20'
              : 'bg-[#171a23]/90 text-slate-300 hover:text-white border-slate-700/70'
          }`}
          title="Edit 2D Avatar Measurements"
        >
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>Body Sizing</span>
        </button>

        <button
          onClick={() => setShowLayersOverlay(!showLayersOverlay)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
            showLayersOverlay
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-600/20'
              : 'bg-[#171a23]/90 text-slate-300 hover:text-white border-slate-700/70'
          }`}
          title="Photoshop-like Pattern Layers"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Layers ({pieces.length})</span>
        </button>
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
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full ${
          activeTool === 'move'
            ? 'cursor-grab'
            : activeTool === 'pen'
            ? 'cursor-crosshair'
            : activeTool === 'curve'
            ? 'cursor-alias'
            : activeTool === 'sew'
            ? 'cursor-copy'
            : 'cursor-default'
        }`}
      />
    </div>
  );
};
