import { drawDecalText } from '../../utils/decalDrawing';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { getPatternBounds, getPatternColorZone, getGarmentColorZones, getGarmentSketchScale } from '../../utils/patternGeometry';
import { findDecalHandle, isPointInDecal, rotationDelta, useCanvasPointers } from '../../utils/canvasInteraction';
import type { PatternPiece } from '../../types/cad';
import {
  getAssembledSpec,
  GRAPHIC_PRESETS,
  FASHION_COLOR_PALETTES,
} from '../../utils/patternPresets';
import type { GraphicDecal } from '../../types/cad';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Palette,
  Ruler,
  Check,
} from 'lucide-react';
import { DecalToolModal } from '../UI/DecalToolModal';

export const AssembledFlatCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    activeTemplateId,
    pieces,
    activeTool,
    setActiveTool,
    colorZones,
    setColorZone,
    decals,
    selectedDecalId,
    setSelectedDecalId,
    updateDecal,
    removeDecal,
    setCanvasViewMode,
    decalTextureRevision,
    beginEdit,
    endEdit,
    cancelEdit,
  } = useCloStore();

  const [decalModalOpen, setDecalModalOpen] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [sketchView, setSketchView] = useState<'front' | 'back' | 'both' | 'leftSleeve' | 'rightSleeve'>('front');
  const selectedArtworkTarget = decals.find((item) => item.id === selectedDecalId)?.viewTarget;
  useEffect(() => {
    if (!selectedArtworkTarget) return;
    const frame = requestAnimationFrame(() => setSketchView(selectedArtworkTarget));
    return () => cancelAnimationFrame(frame);
  }, [selectedDecalId, selectedArtworkTarget]);
  const artboardWidth = sketchView === 'both' ? 860 : 470;
  const [activeZonePicker, setActiveZonePicker] = useState<string | null>(null);

  // Viewport Pan & Zoom
  const [viewState, setViewState] = useState({
    scale: 0.95,
    offsetX: 100,
    offsetY: 60,
  });

  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Decal Interaction State
  const activeHandleRef = useRef<string | null>(null);
  const decalDragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    initialPos: { x: number; y: number };
    initialScale: number;
    initialRot: number;
  } | null>(null);

  // Cache for loaded images
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const spec = React.useMemo(() => getAssembledSpec(activeTemplateId, pieces), [activeTemplateId, pieces]);

  // Keyboard Delete shortcut for selected decal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable) ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDecalId) {
        e.preventDefault();
        removeDecal(selectedDecalId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDecalId, removeDecal]);

  // Handle Resize
  const [dims, setSizes] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current?.parentElement) return;
      const rect = canvasRef.current.parentElement.getBoundingClientRect();
      setSizes({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (canvasRef.current?.parentElement) observer.observe(canvasRef.current.parentElement);
    return () => observer.disconnect();
  }, []);

  const renderCanvasRef = useRef<(() => void) | null>(null);

  const fitView = useCallback(() => {
    const scale = Math.max(0.2, Math.min(1.05, (dims.width - 24) / artboardWidth, (dims.height - 64) / 600));
    setViewState({ scale, offsetX: (dims.width - artboardWidth * scale) / 2,
      offsetY: 12 + Math.max(0, (dims.height - 64 - 600 * scale) / 2) });
  }, [dims.width, dims.height, artboardWidth]);

  useEffect(() => {
    const frame = requestAnimationFrame(fitView);
    return () => cancelAnimationFrame(frame);
  }, [fitView, activeTemplateId]);

  // Main Canvas Render
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.width * dpr;
    canvas.height = dims.height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Draw Clean White Artboard Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.save();
    ctx.translate(viewState.offsetX, viewState.offsetY);
    ctx.scale(viewState.scale, viewState.scale);

    // 2. Draw White CAD Card Artboards
    const artboardHeight = 600;

    // Subtle drop shadow for artboard sheet
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, artboardWidth, artboardHeight, 12);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Artboard Border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Subtle millimeter Grid on Artboard
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 20; x < artboardWidth; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, artboardHeight);
      ctx.stroke();
    }
    for (let y = 20; y < artboardHeight; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(artboardWidth, y);
      ctx.stroke();
    }

    // 3. Render Title & Specifications Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`${spec.name.toUpperCase()} / STYLE SKETCH`, 28, 36);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillText(
      `PANEL: ${spec.halfChestCm} × ${spec.bodyLengthCm} cm · FROM YOUR PATTERN`,
      28,
      52
    );

    // Centers for Front and Back views
    const frontCenter = { x: 235, y: 315 };
    const backCenter = { x: sketchView === 'back' ? 235 : 625, y: 315 };

    // View Labels
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 11px Inter, sans-serif';
    if (sketchView !== 'back') ctx.fillText(sketchView.includes('Sleeve') ? `[${sketchView === 'leftSleeve' ? 'LEFT' : 'RIGHT'} SLEEVE]` : '[FRONT VIEW]', frontCenter.x - 38, 92);
    if (sketchView === 'back' || sketchView === 'both') ctx.fillText('[BACK VIEW]', backCenter.x - 36, 92);

    // ==========================================
    // Helper function to draw garment silhouette
    // ==========================================
    const tracePiece = (piece: PatternPiece) => {
      if (piece.points.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(piece.points[0].x, piece.points[0].y);
      piece.points.forEach((a, i) => {
        const b = piece.points[(i + 1) % piece.points.length], curve = piece.edgeCurvatures?.[i];
        if (curve) ctx.quadraticCurveTo((a.x + b.x) / 2 + curve.cpx, (a.y + b.y) / 2 + curve.cpy, b.x, b.y);
        else ctx.lineTo(b.x, b.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    const drawGarment = (center: { x: number; y: number }, isBack: boolean) => {
      const sleeveView = sketchView === 'leftSleeve' || sketchView === 'rightSleeve';
      const body = (sleeveView ? pieces.find((p) => getPatternColorZone(p.id) === sketchView) : undefined) || pieces.find((piece) => piece.id === (isBack ? 'piece-back' : 'piece-front'))
        || pieces.find((piece) => piece.id.includes(isBack ? 'back' : 'front')) || pieces[0];
      if (!body) return;
      const bounds = getPatternBounds(body), scale = getGarmentSketchScale(body);
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.scale(scale, scale);
      ctx.lineWidth = 1.8 / scale;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#292524';
      const sleeves = pieces.filter((piece) => piece.id.includes('sleeve'));
      for (let i = 0; i < (sleeveView ? 0 : Math.min(2, sleeves.length)); i++) {
        const sleeve = sleeves[i], side = i === 0 ? -1 : 1;
        const sleeveBounds = getPatternBounds(sleeve);
        ctx.save();
        ctx.translate(side * bounds.width * 0.47, -bounds.height * 0.43);
        ctx.rotate(-side * (sleeveBounds.height > bounds.height * 0.45 ? Math.PI / 6 : Math.PI / 3));
        ctx.translate(0, -sleeveBounds.minY);
        ctx.fillStyle = colorZones[side < 0 ? 'leftSleeve' : 'rightSleeve'] || colorZones.sleeves || colorZones.body || '#262626';
        tracePiece(sleeve);
        ctx.restore();
      }
      ctx.translate(-(bounds.minX + bounds.maxX) / 2, -(bounds.minY + bounds.maxY) / 2);
      const hood = !sleeveView && pieces.find((piece) => getPatternColorZone(piece.id) === 'hood');
      const middle = (bounds.minX + bounds.maxX) / 2;
      if (hood) {
        const hoodBounds = getPatternBounds(hood);
        const width = Math.min(bounds.width * 0.8, hoodBounds.width);
        const top = bounds.minY - hoodBounds.height * 0.7;
        ctx.fillStyle = colorZones.hood || colorZones.body || '#262626';
        ctx.beginPath();
        ctx.moveTo(middle - width / 2, bounds.minY + 30);
        ctx.bezierCurveTo(middle - width * 0.65, top, middle + width * 0.65, top, middle + width / 2, bounds.minY + 30);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(middle, top + hoodBounds.height * 0.18);
        ctx.lineTo(middle, bounds.minY + 30); ctx.stroke();
      }
      ctx.fillStyle = colorZones[sleeveView ? sketchView : 'body'] || '#262626';
      tracePiece(body);
      if (!sleeveView) {
        ctx.save(); ctx.clip();
        for (const line of body.internalLines || []) {
          if (line.type !== 'pocket' || line.points.length < 3) continue;
          ctx.fillStyle = colorZones.pocket || colorZones.body || '#262626';
          ctx.beginPath(); ctx.moveTo(line.points[0].x, line.points[0].y);
          for (const point of line.points.slice(1)) ctx.lineTo(point.x, point.y);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
      if (hood && !isBack) {
        const neck = body.points.filter((point) => Math.abs(point.x - middle) < bounds.width * 0.25 && point.y < bounds.minY + bounds.height * 0.2);
        if (neck.length > 1) {
          ctx.beginPath(); ctx.moveTo(neck[0].x, neck[0].y);
          ctx.quadraticCurveTo(middle, bounds.minY - getPatternBounds(hood).height * 0.65, neck[neck.length - 1].x, neck[neck.length - 1].y);
          ctx.stroke();
        }
      }
      if (!sleeveView && pieces.some((piece) => getPatternColorZone(piece.id) === 'collar')) {
        const middle = (bounds.minX + bounds.maxX) / 2;
        const neckPoint = (p: { x: number; y: number }) => Math.abs(p.x - middle) < bounds.width * 0.3 && p.y < bounds.minY + bounds.height * 0.22;
        ctx.strokeStyle = colorZones.collar || colorZones.body || '#262626';
        ctx.lineWidth = 8;
        ctx.beginPath();
        body.points.forEach((a, i) => {
          const b = body.points[(i + 1) % body.points.length], curve = body.edgeCurvatures?.[i];
          if (!neckPoint(a) || !neckPoint(b)) return;
          ctx.moveTo(a.x, a.y);
          if (curve) ctx.quadraticCurveTo((a.x + b.x) / 2 + curve.cpx, (a.y + b.y) / 2 + curve.cpy, b.x, b.y);
          else ctx.lineTo(b.x, b.y);
        });
        ctx.stroke();
      }
      ctx.restore();
    };

    if (sketchView !== 'back') drawGarment(frontCenter, false);

    // Draw Back View
    if (sketchView === 'back' || sketchView === 'both') drawGarment(backCenter, true);

    const drawArtwork = (center: { x: number; y: number }, isBack: boolean) => {
      ctx.save();
      ctx.translate(center.x, center.y);
      const targetViewName = sketchView.includes('Sleeve') ? sketchView : isBack ? 'back' : 'front';
      const targetDecals = decals.filter((d) => d.viewTarget === targetViewName);

      targetDecals.forEach((decal) => {
        ctx.save();
        ctx.translate(decal.position.x, decal.position.y);
        ctx.rotate((decal.rotation * Math.PI) / 180);
        ctx.scale(decal.scale, decal.scale);
        ctx.globalAlpha = decal.opacity;

        // Apply blend mode
        if (decal.blendMode === 'multiply') {
          ctx.globalCompositeOperation = 'multiply';
        } else if (decal.blendMode === 'screen') {
          ctx.globalCompositeOperation = 'screen';
        } else if (decal.blendMode === 'overlay') {
          ctx.globalCompositeOperation = 'overlay';
        } else {
          ctx.globalCompositeOperation = 'source-over';
        }

        const w = decal.width;
        const h = decal.height;

        if (decal.type === 'text') {
          drawDecalText(ctx, decal);
        } else if (decal.type === 'preset') {
          // Render SVG Preset
          const preset = GRAPHIC_PRESETS.find((p) => p.id === decal.content);
          if (preset) {
            const imgKey = `preset-${preset.id}`;
            let img = imageCacheRef.current.get(imgKey);
            if (!img) {
              img = new Image();
              img.src = `data:image/svg+xml;utf8,${encodeURIComponent(preset.svg)}`;
              img.onload = () => {
                renderCanvasRef.current?.();
              };
              imageCacheRef.current.set(imgKey, img);
            }
            if (img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, -w / 2, -h / 2, w, h);
            }
          }
        } else if (decal.type === 'image') {
          // Render Uploaded Image
          let img = imageCacheRef.current.get(decal.content);
          if (!img) {
            img = new Image();
            img.src = decal.content;
            img.onload = () => {
              renderCanvasRef.current?.();
            };
            imageCacheRef.current.set(decal.content, img);
          }
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
          }
        }

        ctx.restore();

        // If selected, draw transform bounding box with 4 handles
        if (selectedDecalId === decal.id) {
          ctx.save();
          ctx.translate(decal.position.x, decal.position.y);
          ctx.rotate((decal.rotation * Math.PI) / 180);

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5 / viewState.scale;
          ctx.setLineDash([4 / viewState.scale, 3 / viewState.scale]);
          const selectedWidth = w * decal.scale, selectedHeight = h * decal.scale;
          ctx.strokeRect(-selectedWidth / 2, -selectedHeight / 2, selectedWidth, selectedHeight);
          ctx.setLineDash([]);

          // 4 corner handles
          const handleSize = 7 / viewState.scale;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 1.5 / viewState.scale;

          const handles = [
            { x: -selectedWidth / 2, y: -selectedHeight / 2 },
            { x: selectedWidth / 2, y: -selectedHeight / 2 },
            { x: selectedWidth / 2, y: selectedHeight / 2 },
            { x: -selectedWidth / 2, y: selectedHeight / 2 },
          ];
          handles.forEach((h) => {
            ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
          });

          // Top rotation handle stem & knob
          ctx.beginPath();
          ctx.moveTo(0, -selectedHeight / 2);
          ctx.lineTo(0, -selectedHeight / 2 - 20 / viewState.scale);
          ctx.strokeStyle = '#3b82f6';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, -selectedHeight / 2 - 20 / viewState.scale, 4.5 / viewState.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.restore();
        }
      });

      ctx.restore();
    };
    if (sketchView !== 'back') drawArtwork(frontCenter, false);
    if (sketchView === 'back' || sketchView === 'both') drawArtwork(backCenter, true);

    // ==========================================
    // 7. TECHNICAL MEASUREMENTS OVERLAY
    // ==========================================
    if (showMeasurements && !sketchView.includes('Sleeve')) {
      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = '#1d4ed8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);

      // Chest Width measurement line
      const body = pieces.find((piece) => piece.id === (sketchView === 'back' ? 'piece-back' : 'piece-front')) || pieces[0];
      if (!body) { ctx.restore(); ctx.restore(); return; }
      const bounds = getPatternBounds(body), scale = getGarmentSketchScale(body);
      const chestY = frontCenter.y + 10;
      const chestLeft = frontCenter.x - bounds.width * scale / 2;
      const chestRight = frontCenter.x + bounds.width * scale / 2;

      ctx.beginPath();
      ctx.moveTo(chestLeft, chestY);
      ctx.lineTo(chestRight, chestY);
      ctx.stroke();

      // Pill for Chest Width
      const chestText = `${spec.halfChestCm} cm (Panel width)`;
      ctx.font = 'bold 9px ui-monospace, monospace';
      const ctw = ctx.measureText(chestText).width;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.roundRect(frontCenter.x - ctw / 2 - 4, chestY - 7, ctw + 8, 14, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chestText, frontCenter.x, chestY);

      // Body Length measurement line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      const lenX = chestLeft - 16;
      const lenTop = frontCenter.y - bounds.height * scale / 2;
      const lenBottom = frontCenter.y + bounds.height * scale / 2;

      ctx.beginPath();
      ctx.moveTo(lenX, lenTop);
      ctx.lineTo(lenX, lenBottom);
      ctx.stroke();

      // Pill for Length
      const lenText = `${spec.bodyLengthCm} cm (Panel length)`;
      const ltw = ctx.measureText(lenText).width;
      ctx.save();
      ctx.translate(lenX - 8, (lenTop + lenBottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.roundRect(-ltw / 2 - 4, -7, ltw + 8, 14, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lenText, 0, 0);
      ctx.restore();

      ctx.restore();
    }

    ctx.restore();
  }, [dims, viewState, colorZones, decals, selectedDecalId, showMeasurements, spec, pieces, sketchView, artboardWidth]);

  // Re-render when state changes
  useEffect(() => {
    renderCanvasRef.current = renderCanvas;
    renderCanvas();
  }, [renderCanvas, decalTextureRevision]);

  // Mouse Handlers for Pan, Zoom, and Decal Drag/Transform
  const handleMouseDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse to world coordinates
    const worldX = (mouseX - viewState.offsetX) / viewState.scale;
    const worldY = (mouseY - viewState.offsetY) / viewState.scale;

    const frontCenter = { x: 235, y: 315 };
    const backCenter = { x: sketchView === 'back' ? 235 : 625, y: 315 };

    if (e.button === 1 || activeTool === 'move') {
      isDraggingCanvas.current = true;
      dragStart.current = { x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY };
      return;
    }
    if (e.button !== 0) return;

    const selected = decals.find((decal) => decal.id === selectedDecalId);
    if (selected && (sketchView === 'both' || selected.viewTarget === sketchView)) {
      const center = selected.viewTarget === 'back' ? backCenter : frontCenter;
      const handle = findDecalHandle(selected, center, { x: worldX, y: worldY }, viewState.scale);
      if (handle) {
        beginEdit();
        activeHandleRef.current = handle;
        decalDragStartRef.current = { mouseX: worldX, mouseY: worldY,
          initialPos: { ...selected.position }, initialScale: selected.scale, initialRot: selected.rotation };
        return;
      }
    }

    // Check hit on decals
    let hitDecal: GraphicDecal | null = null;

    for (let i = decals.length - 1; i >= 0; i--) {
      const d = decals[i];
      if (sketchView !== 'both' && d.viewTarget !== sketchView) continue;
      const center = d.viewTarget === 'back' ? backCenter : frontCenter;
      if (isPointInDecal(d, center, { x: worldX, y: worldY })) {
        hitDecal = d;
        break;
      }
    }

    if (hitDecal) {
      beginEdit();
      setSelectedDecalId(hitDecal.id);
      activeHandleRef.current = 'move';
      decalDragStartRef.current = {
        mouseX: worldX,
        mouseY: worldY,
        initialPos: { ...hitDecal.position },
        initialScale: hitDecal.scale,
        initialRot: hitDecal.rotation,
      };
      return;
    }

    // Otherwise deselect decal and begin canvas panning
    setSelectedDecalId(null);
    isDraggingCanvas.current = true;
    dragStart.current = { x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY };
  };

  const handleMouseMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeHandleRef.current && decalDragStartRef.current && selectedDecalId) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - viewState.offsetX) / viewState.scale;
      const worldY = (e.clientY - rect.top - viewState.offsetY) / viewState.scale;

      const dx = worldX - decalDragStartRef.current.mouseX;
      const dy = worldY - decalDragStartRef.current.mouseY;

      const initial = decalDragStartRef.current;
      if (activeHandleRef.current === 'move') {
        updateDecal(selectedDecalId, { position: { x: initial.initialPos.x + dx, y: initial.initialPos.y + dy } });
      } else {
        const decal = useCloStore.getState().decals.find((item) => item.id === selectedDecalId);
        if (!decal) return;
        const centerX = (decal.viewTarget === 'back' && sketchView !== 'back' ? 625 : 235) + initial.initialPos.x;
        const centerY = 315 + initial.initialPos.y;
        if (activeHandleRef.current === 'rot') {
          const rotation = initial.initialRot + rotationDelta(Math.atan2(worldY - centerY, worldX - centerX),
            Math.atan2(initial.mouseY - centerY, initial.mouseX - centerX)) * 180 / Math.PI;
          updateDecal(selectedDecalId, { rotation: e.shiftKey ? Math.round(rotation / 15) * 15 : rotation });
        } else {
          const initialDistance = Math.hypot(initial.mouseX - centerX, initial.mouseY - centerY);
          const scale = initial.initialScale * Math.hypot(worldX - centerX, worldY - centerY) / Math.max(1, initialDistance);
          updateDecal(selectedDecalId, { scale: Math.max(0.05, Math.min(5, scale)) });
        }
      }
      return;
    }

    if (isDraggingCanvas.current) {
      setViewState((prev) => ({
        ...prev,
        offsetX: e.clientX - dragStart.current.x,
        offsetY: e.clientY - dragStart.current.y,
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingCanvas.current = false;
    activeHandleRef.current = null;
    decalDragStartRef.current = null;
    endEdit();
  };

  const cancelDrag = () => {
    isDraggingCanvas.current = false;
    activeHandleRef.current = null;
    decalDragStartRef.current = null;
    cancelEdit();
  };
  const pointerHandlers = useCanvasPointers({ view: viewState, setView: setViewState,
    minScale: 0.2, maxScale: 2.5, onDown: handleMouseDown, onMove: handleMouseMove,
    onUp: handleMouseUp, onCancel: cancelDrag });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(), mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setViewState((prev) => {
      const scale = Math.max(0.2, Math.min(2.5, prev.scale * zoomFactor)), ratio = scale / prev.scale;
      return { scale, offsetX: mouseX - (mouseX - prev.offsetX) * ratio,
        offsetY: mouseY - (mouseY - prev.offsetY) * ratio };
    });
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas?.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas?.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div className="relative flex flex-col w-full h-full bg-[#f8fafc] overflow-hidden select-none">
      {/* Top Floating Control Toolbar */}
      <div className="relative shrink-0 m-2 z-20 flex flex-wrap items-center gap-2 bg-[#171a23]/90 backdrop-blur-md border border-slate-700/70 rounded-xl px-3 py-1.5 shadow-xl text-xs text-slate-300">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-slate-100">Style sketch</span>
        <span className="text-slate-600">|</span>

        {/* View Switcher: Assembled vs Edit pattern */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-[11px]">
          <button
            className="px-2.5 py-0.5 rounded-md font-semibold bg-blue-600 text-white shadow-sm"
            title="Assembled Front & Back Sketch"
          >
            Sketch
          </button>
          <button
            onClick={() => setCanvasViewMode('pieces')}
            className="px-2.5 py-0.5 rounded-md font-semibold text-slate-400 hover:text-white transition-colors"
            title="Switch to Edit pattern Cutting Canvas"
          >
            Edit pattern
          </button>
        </div>

        <span className="text-slate-600">|</span>

        <button
          onClick={() => setDecalModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
          title="Add Artwork, Typography or Presets [T]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Add artwork</span>
        </button>

        <div className="flex gap-1" role="group" aria-label="Sketch view">
          {(['front', 'back', 'both', ...pieces.some((p) => p.id.includes('sleeve-l')) ? ['leftSleeve' as const] : [], ...pieces.some((p) => p.id.includes('sleeve-r')) ? ['rightSleeve' as const] : []] as const).map((view) => <button key={view} onClick={() => setSketchView(view)}
            aria-pressed={sketchView === view} className={`px-2 py-1 rounded text-[11px] capitalize ${sketchView === view ? 'bg-slate-600 text-white' : 'hover:bg-slate-800'}`}>{view === 'leftSleeve' ? 'Left sleeve' : view === 'rightSleeve' ? 'Right sleeve' : view}</button>)}
        </div>

        {/* Color Zone Quick Picker */}
        <div className="static sm:relative">
          <button
            onClick={() => setActiveZonePicker(activeZonePicker ? null : 'body')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Color Blocking Zones"
          >
            <Palette className="w-3.5 h-3.5 text-blue-400" />
            <span>Color Zones</span>
          </button>

          {activeZonePicker && (
            <div className="absolute top-full sm:top-10 mt-2 sm:mt-0 left-0 bg-[#171a23]/95 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 shadow-2xl z-30 w-72 max-w-full space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>Color Blocking Zone</span>
                <span className="text-[10px] text-slate-400 uppercase">Select zone</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {getGarmentColorZones(pieces).map(({ key: zone, label }) => (
                  <button
                    key={zone}
                    onClick={() => setActiveZonePicker(zone)}
                    className={`px-2 py-1 text-[11px] rounded-lg font-semibold capitalize border ${
                      activeZonePicker === zone
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-semibold mb-1.5 uppercase">
                  Color palette
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {FASHION_COLOR_PALETTES.map((swatch) => (
                    <button
                      key={swatch.id}
                      onClick={() => {
                        setColorZone(activeZonePicker, swatch.hex);
                      }}
                      className="w-7 h-7 rounded-full border-2 border-slate-700 hover:scale-110 transition-transform relative group"
                      style={{ backgroundColor: swatch.hex }}
                      title={`${swatch.name} (${swatch.pantoneRef})`}
                    >
                      {colorZones[activeZonePicker] === swatch.hex && (
                        <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <span className="text-slate-600">|</span>

        {/* Toggle Measurements */}
        <button
          onClick={() => setShowMeasurements(!showMeasurements)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
            showMeasurements
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle Technical Measurements Overlay"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Sizes</span>
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
      {/* Zoom Controls Bottom-Right */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-[#14171f]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-xl">
        <button
          onClick={() =>
            setViewState((prev) => ({
              ...prev,
              scale: Math.min(2.5, prev.scale * 1.15),
            }))
          }
          className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono font-bold text-slate-400 px-1">
          {Math.round(viewState.scale * 100)}%
        </span>
        <button
          onClick={() =>
            setViewState((prev) => ({
              ...prev,
              scale: Math.max(0.2, prev.scale * 0.85),
            }))
          }
          className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitView}
          className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors ml-1"
          title="Fit Artboard to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main High-DPI HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        {...pointerHandlers}
        className="w-full h-full cursor-default touch-none"
      />
      </div>

      {/* Decal & Typography Studio Modal */}
      <DecalToolModal isOpen={decalModalOpen || activeTool === 'graphic'} onClose={() => { setDecalModalOpen(false); setActiveTool('select'); }} />
    </div>
  );
};
