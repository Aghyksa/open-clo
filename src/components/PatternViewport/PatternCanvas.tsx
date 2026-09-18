import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCloStore } from '../../store/useCloStore';
import type { PatternPiece, SeamEdge } from '../../types/cad';
import { ZoomIn, ZoomOut, Maximize2, Scissors, Layers } from 'lucide-react';

export const PatternCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    pieces,
    seams,
    selectedPieceId,
    selectedVertexIndex,
    activeTool,
    pendingSeamEdge,
    selectPiece,
    selectVertex,
    updatePiecePosition,
    updatePieceVertex,
    setPendingSeamEdge,
    addSeam,
  } = useCloStore();

  // Viewport Pan & Zoom state
  const [viewState, setViewState] = useState({
    scale: 0.8,
    offsetX: 100,
    offsetY: 60,
  });

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'pan' | 'piece' | 'vertex' | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedPieceIdRef = useRef<string | null>(null);
  const draggedVertexRef = useRef<number | null>(null);
  const initialPiecePosRef = useRef({ x: 0, y: 0 });
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

  // Check point in polygon
  const isPointInPiece = (wx: number, wy: number, piece: PatternPiece) => {
    const localX = wx - piece.position.x;
    const localY = wy - piece.position.y;
    let inside = false;
    const pts = piece.points;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x,
        yi = pts[i].y;
      const xj = pts[j].x,
        yj = pts[j].y;
      const intersect =
        yi > localY !== yj > localY &&
        localX < ((xj - xi) * (localY - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Find vertex under mouse
  const findVertexAt = (wx: number, wy: number, piece: PatternPiece, radius = 12) => {
    const worldRadius = radius / viewState.scale;
    for (let i = 0; i < piece.points.length; i++) {
      const pt = piece.points[i];
      const vx = piece.position.x + pt.x;
      const vy = piece.position.y + pt.y;
      const dist = Math.hypot(wx - vx, wy - vy);
      if (dist <= worldRadius) return i;
    }
    return null;
  };

  // Find edge under mouse
  const findEdgeAt = (wx: number, wy: number, piece: PatternPiece, threshold = 12) => {
    const worldThreshold = threshold / viewState.scale;
    const pts = piece.points;
    for (let i = 0; i < pts.length; i++) {
      const nextIdx = (i + 1) % pts.length;
      const x1 = piece.position.x + pts[i].x;
      const y1 = piece.position.y + pts[i].y;
      const x2 = piece.position.x + pts[nextIdx].x;
      const y2 = piece.position.y + pts[nextIdx].y;

      // Distance from point to segment
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;

      let t = ((wx - x1) * dx + (wy - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;

      const dist = Math.hypot(wx - projX, wy - projY);
      if (dist <= worldThreshold) {
        return i; // Edge index
      }
    }
    return null;
  };

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI retina display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Clear background
    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw CAD Grid
    const gridSize = 40 * viewState.scale;
    const startX = (viewState.offsetX % gridSize + gridSize) % gridSize;
    const startY = (viewState.offsetY % gridSize + gridSize) % gridSize;

    // Minor grid
    ctx.strokeStyle = '#1a1d24';
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

    // Major origin axes
    const origin = worldToScreen(0, 0);
    ctx.strokeStyle = '#2d3340';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();

    // 3. Draw Pattern Pieces
    pieces.forEach((piece) => {
      const isSelected = piece.id === selectedPieceId;
      const pts = piece.points;
      if (pts.length < 3) return;

      const screenPts = pts.map((pt) =>
        worldToScreen(piece.position.x + pt.x, piece.position.y + pt.y)
      );

      // Fill polygon
      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y);
      }
      ctx.closePath();

      // Translucent fabric color
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.22)'
        : 'rgba(255, 255, 255, 0.06)';
      ctx.fill();

      // Stroke outline
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#64748b';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Grainline / Center Direction Indicator
      const centerScreen = worldToScreen(piece.position.x, piece.position.y);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(centerScreen.x, centerScreen.y - 40 * viewState.scale);
      ctx.lineTo(centerScreen.x, centerScreen.y + 40 * viewState.scale);
      // Grainline arrows
      ctx.moveTo(centerScreen.x - 4, centerScreen.y - 34 * viewState.scale);
      ctx.lineTo(centerScreen.x, centerScreen.y - 40 * viewState.scale);
      ctx.lineTo(centerScreen.x + 4, centerScreen.y - 34 * viewState.scale);
      ctx.moveTo(centerScreen.x - 4, centerScreen.y + 34 * viewState.scale);
      ctx.lineTo(centerScreen.x, centerScreen.y + 40 * viewState.scale);
      ctx.lineTo(centerScreen.x + 4, centerScreen.y + 34 * viewState.scale);
      ctx.stroke();
      ctx.setLineDash([]);

      // Piece Label
      ctx.font = '500 12px ui-sans-serif, system-ui';
      ctx.fillStyle = isSelected ? '#93c5fd' : '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(piece.name, centerScreen.x, centerScreen.y + 55 * viewState.scale);

      // Edge Segment Dimensions
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

      // Draw Vertices handles
      if (isSelected || activeTool === 'vertex') {
        screenPts.forEach((sp, idx) => {
          const isVertSelected = isSelected && idx === selectedVertexIndex;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, isVertSelected ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = isVertSelected ? '#38bdf8' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
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

    // 4. Draw Seam Links and Matching Edge Badges between pieces
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

      const midA = worldToScreen(
        pieceA.position.x + (p1A.x + p2A.x) / 2,
        pieceA.position.y + (p1A.y + p2A.y) / 2
      );
      const midB = worldToScreen(
        pieceB.position.x + (p1B.x + p2B.x) / 2,
        pieceB.position.y + (p1B.y + p2B.y) / 2
      );

      const seamColor = SEAM_COLORS[sIdx % SEAM_COLORS.length];

      // Highlight paired edges with seam color
      const sp1A = worldToScreen(pieceA.position.x + p1A.x, pieceA.position.y + p1A.y);
      const sp2A = worldToScreen(pieceA.position.x + p2A.x, pieceA.position.y + p2A.y);
      const sp1B = worldToScreen(pieceB.position.x + p1B.x, pieceB.position.y + p1B.y);
      const sp2B = worldToScreen(pieceB.position.x + p2B.x, pieceB.position.y + p2B.y);

      ctx.beginPath();
      ctx.moveTo(sp1A.x, sp1A.y);
      ctx.lineTo(sp2A.x, sp2A.y);
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(sp1B.x, sp1B.y);
      ctx.lineTo(sp2B.x, sp2B.y);
      ctx.strokeStyle = seamColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

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

      // Seam Stitch badges with label "S1", "S2"
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
    viewState,
    worldToScreen,
  ]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    isDraggingRef.current = true;
    dragStartRef.current = { x: sx, y: sy };

    // Middle click or Space key -> Pan
    if (e.button === 1 || e.shiftKey || activeTool === 'move') {
      dragModeRef.current = 'pan';
      return;
    }

    // Left click
    if (e.button === 0) {
      // If active tool is 'sew', check for edge click
      if (activeTool === 'sew') {
        for (const piece of pieces) {
          const edgeIdx = findEdgeAt(world.x, world.y, piece);
          if (edgeIdx !== null) {
            const edge: SeamEdge = { pieceId: piece.id, edgeIndex: edgeIdx };
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

      // Check vertex click if piece selected or in vertex tool
      if (selectedPieceId) {
        const piece = pieces.find((p) => p.id === selectedPieceId);
        if (piece) {
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

      // Check piece body click
      let clickedPiece: PatternPiece | null = null;
      for (let i = pieces.length - 1; i >= 0; i--) {
        if (isPointInPiece(world.x, world.y, pieces[i])) {
          clickedPiece = pieces[i];
          break;
        }
      }

      if (clickedPiece) {
        selectPiece(clickedPiece.id);
        dragModeRef.current = 'piece';
        draggedPieceIdRef.current = clickedPiece.id;
        initialPiecePosRef.current = { ...clickedPiece.position };
      } else {
        selectPiece(null);
        dragModeRef.current = 'pan'; // Dragging empty space pans view
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

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
      const worldDx = dx / viewState.scale;
      const worldDy = dy / viewState.scale;
      updatePieceVertex(draggedPieceIdRef.current, draggedVertexRef.current, {
        x: Math.round(initialVertexPosRef.current.x + worldDx),
        y: Math.round(initialVertexPosRef.current.y + worldDy),
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragModeRef.current = null;
    draggedPieceIdRef.current = null;
    draggedVertexRef.current = null;
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

  return (
    <div className="relative w-full h-full bg-[#111317] overflow-hidden flex flex-col">
      {/* 2D Canvas Viewport Header */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 bg-[#1b1e26]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs text-slate-300">
        <Layers className="w-4 h-4 text-blue-400" />
        <span className="font-semibold text-slate-100">2D Pattern Window</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Scale: {(viewState.scale * 100).toFixed(0)}%</span>
        {pendingSeamEdge && (
          <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
            <Scissors className="w-3 h-3" /> Select target seam edge
          </span>
        )}
      </div>

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 bg-[#1b1e26]/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 shadow-xl">
        <button
          onClick={() =>
            setViewState((v) => ({ ...v, scale: Math.min(3.0, v.scale * 1.2) }))
          }
          className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            setViewState((v) => ({ ...v, scale: Math.max(0.2, v.scale * 0.8) }))
          }
          className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewState({ scale: 0.8, offsetX: 100, offsetY: 60 })}
          className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 hover:text-white transition-colors"
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
        className="w-full h-full cursor-crosshair"
      />
    </div>
  );
};
