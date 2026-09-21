import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCloStore } from '../../store/useCloStore';
import {
  getAssembledSpec,
  GRAPHIC_PRESETS,
  FASHION_COLOR_PALETTES,
  drawSublimationPattern,
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
    colorZones,
    setColorZone,
    decals,
    selectedDecalId,
    setSelectedDecalId,
    updateDecal,
    removeDecal,
    setCanvasViewMode,
    sublimationPrint,
    decalTextureRevision,
  } = useCloStore();

  const [decalModalOpen, setDecalModalOpen] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);
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

  const spec = getAssembledSpec(activeTemplateId);

  // Keyboard Delete shortcut for selected decal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDecalId) {
        e.preventDefault();
        removeDecal(selectedDecalId);
      }
      if (e.key.toLowerCase() === 't') {
        setDecalModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDecalId, removeDecal]);

  // Handle Resize
  const [dims, setDims] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const updateSize = () => {
      if (!canvasRef.current?.parentElement) return;
      const rect = canvasRef.current.parentElement.getBoundingClientRect();
      setDims({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const renderCanvasRef = useRef<(() => void) | null>(null);

  // Center view on mount or template change
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setViewState(() => {
      const artboardW = 860;
      const artboardH = 600;
      const targetScale = Math.max(0.65, Math.min(1.05, Math.min((dims.width - 60) / artboardW, (dims.height - 110) / artboardH)));
      const offX = Math.max(30, (dims.width - artboardW * targetScale) / 2);
      const offY = Math.max(72, (dims.height - artboardH * targetScale) / 2);
      return {
        scale: targetScale,
        offsetX: offX,
        offsetY: offY,
      };
    });
  }, [activeTemplateId, dims.width, dims.height]);

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
    const artboardWidth = 860;
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
    ctx.fillText(`${spec.name.toUpperCase()} // COMMERCIAL SPEC`, 28, 36);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillText(
      `HALF-CHEST: ${spec.halfChestCm} cm | BODY LENGTH: ${spec.bodyLengthCm} cm | SHOULDER: ${spec.shoulderDropCm} cm | CAD SCALE: 1:1`,
      28,
      52
    );

    // Centers for Front and Back views
    const frontCenter = { x: 235, y: 315 };
    const backCenter = { x: 625, y: 315 };

    // View Labels
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('[FRONT VIEW]', frontCenter.x - 38, 92);
    ctx.fillText('[BACK VIEW]', backCenter.x - 36, 92);

    // ==========================================
    // Helper function to draw garment silhouette
    // ==========================================
    const drawGarment = (center: { x: number; y: number }, isBack: boolean) => {
      ctx.save();
      ctx.translate(center.x, center.y);

      const bodyColor = colorZones.body || '#262626';
      const collarColor = colorZones.collar || bodyColor;
      const sleeveColor = colorZones.sleeves || bodyColor;
      const pocketColor = colorZones.pocket || bodyColor;
      const hemColor = colorZones.hem || bodyColor;
      const cuffColor = colorZones.cuffs || bodyColor;

      const isBoxy = spec.templateId === 'uniqlo-u-boxy-tee';
      const isHoodie = spec.hasHood;
      const isJacket = spec.hasCampCollar;
      const isPolo = spec.hasPoloCollar;
      const isPants = spec.isPants;
      const isKidsSet = spec.isKidsSet;
      const isBolero = spec.isBolero;

      if (isKidsSet) {
        // Draw SBL Kids 2-Piece Set: Ruched Crop Top + Cutbray Flared Pants (PT. Maxxbrother Indonesia)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';

        // 1. Ruched Crop Top
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-58, -115); // left shoulder
        ctx.lineTo(-24, -125); // left neck
        if (isBack) {
          ctx.quadraticCurveTo(0, -118, 24, -125);
        } else {
          ctx.quadraticCurveTo(0, -95, 24, -125); // scoop neck
        }
        ctx.lineTo(58, -115); // right shoulder
        ctx.lineTo(50, -50);  // right armhole
        ctx.lineTo(44, -15);  // right hem
        ctx.lineTo(-44, -15); // left hem
        ctx.lineTo(-50, -50); // left armhole
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Top Sublimation pattern
        if (sublimationPrint && sublimationPrint !== 'none') {
          ctx.save();
          ctx.clip();
          drawSublimationPattern(ctx, sublimationPrint, { minX: -58, minY: -125, maxX: 58, maxY: -15 });
          ctx.restore();
        }

        // Center ruching (serut) channel & gathers on front
        if (!isBack) {
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(0, -95);
          ctx.lineTo(0, -15);
          ctx.stroke();
          ctx.setLineDash([]);

          // Gather horizontal creases
          for (let gy = -85; gy <= -25; gy += 15) {
            ctx.beginPath();
            ctx.moveTo(-14, gy - 2);
            ctx.quadraticCurveTo(0, gy + 3, 14, gy - 2);
            ctx.stroke();
          }

          // Drawstring cords hanging below hem
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(-4, -15);
          ctx.quadraticCurveTo(-10, 5, -6, 20);
          ctx.moveTo(4, -15);
          ctx.quadraticCurveTo(10, 5, 6, 20);
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(-6, 20, 2.5, 0, Math.PI * 2);
          ctx.arc(6, 20, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // 2. High-Waisted Cutbray Flared Pants
        // Waistband
        ctx.fillStyle = sleeveColor || '#38bdf8';
        ctx.beginPath();
        ctx.rect(-52, 5, 104, 16);
        ctx.fill();
        ctx.stroke();

        // Pants Flare Legs
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-52, 21);
        ctx.lineTo(-56, 60);  // hip
        ctx.lineTo(-30, 105); // knee taper in
        ctx.lineTo(-68, 165); // bell-bottom flare hem out
        ctx.lineTo(-14, 165); // inner bell hem
        ctx.lineTo(-6, 75);   // inner crotch
        ctx.lineTo(6, 75);
        ctx.lineTo(14, 165);
        ctx.lineTo(68, 165);
        ctx.lineTo(30, 105);
        ctx.lineTo(56, 60);
        ctx.lineTo(52, 21);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pants Sublimation pattern
        if (sublimationPrint && sublimationPrint !== 'none') {
          ctx.save();
          ctx.clip();
          drawSublimationPattern(ctx, sublimationPrint, { minX: -68, minY: 21, maxX: 68, maxY: 165 });
          ctx.restore();
        }

        // Drawstring tie accents on outer flared hem
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-68, 160);
        ctx.lineTo(-74, 172);
        ctx.moveTo(68, 160);
        ctx.lineTo(74, 172);
        ctx.stroke();

        ctx.restore();
        return;
      }

      if (isBolero) {
        // Draw Cropped Bolero Shrug with Dramatic Puff Sleeves (PT. Maxxbrother Indonesia)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';

        // 1. Exaggerated Puff Sleeves
        ctx.fillStyle = sleeveColor || '#f43f5e';

        // Left Puff Sleeve
        ctx.beginPath();
        ctx.moveTo(-60, -95);
        ctx.quadraticCurveTo(-145, -120, -135, -45); // high puff shoulder
        ctx.lineTo(-55, 15); // tapered forearm
        ctx.lineTo(-45, -25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Puff Sleeve
        ctx.beginPath();
        ctx.moveTo(60, -95);
        ctx.quadraticCurveTo(145, -120, 135, -45);
        ctx.lineTo(55, 15);
        ctx.lineTo(45, -25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wrist cuffs
        ctx.fillStyle = collarColor || '#1e3a8a';
        ctx.beginPath();
        ctx.rect(-60, 15, 18, 16);
        ctx.rect(42, 15, 18, 16);
        ctx.fill();
        ctx.stroke();

        // 2. Cropped Center Bodice (Chest level)
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-60, -95);
        ctx.lineTo(-25, -105);
        if (isBack) {
          ctx.quadraticCurveTo(0, -98, 25, -105);
        } else {
          ctx.quadraticCurveTo(0, -80, 25, -105);
        }
        ctx.lineTo(60, -95);
        ctx.lineTo(50, -35);
        ctx.lineTo(-50, -35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (sublimationPrint && sublimationPrint !== 'none') {
          ctx.save();
          ctx.clip();
          drawSublimationPattern(ctx, sublimationPrint, { minX: -145, minY: -125, maxX: 145, maxY: 35 });
          ctx.restore();
        }

        ctx.restore();
        return;
      }

      if (isPants) {
        // Draw Cargo Pants Silhouette
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';

        // Waistband
        ctx.fillStyle = hemColor;
        ctx.beginPath();
        ctx.rect(-90, -160, 180, 24);
        ctx.fill();
        ctx.stroke();

        // Pants Legs
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-90, -136);
        ctx.lineTo(-85, 140);
        ctx.lineTo(-20, 140);
        ctx.lineTo(0, -20); // crotch
        ctx.lineTo(20, 140);
        ctx.lineTo(85, 140);
        ctx.lineTo(90, -136);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cargo Pockets
        ctx.fillStyle = pocketColor;
        ctx.beginPath();
        ctx.roundRect(-80, -20, 30, 45, 4);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(50, -20, 30, 45, 4);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        return;
      }

      // 1. SLEEVES (Drawn first so body overlaps armhole cleanly)
      ctx.fillStyle = sleeveColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';

      const sleeveLength = isHoodie || isJacket ? 155 : isBoxy ? 85 : 65;
      const sleeveWidth = isBoxy ? 56 : 46;

      // Left Sleeve
      ctx.beginPath();
      ctx.moveTo(-75, -100);
      ctx.lineTo(-145, -75 + (isHoodie ? 60 : 20));
      ctx.lineTo(-145 + (isHoodie ? 20 : 15), -75 + sleeveLength);
      ctx.lineTo(-75 + 10, -35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Sleeve
      ctx.beginPath();
      ctx.moveTo(75, -100);
      ctx.lineTo(145, -75 + (isHoodie ? 60 : 20));
      ctx.lineTo(145 - (isHoodie ? 20 : 15), -75 + sleeveLength);
      ctx.lineTo(75 - 10, -35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wrist Cuffs (for Hoodie/Jackets)
      if (isHoodie || isJacket) {
        ctx.fillStyle = cuffColor;
        ctx.beginPath();
        ctx.rect(-145, -75 + sleeveLength - 16, sleeveWidth, 16);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.rect(145 - sleeveWidth, -75 + sleeveLength - 16, sleeveWidth, 16);
        ctx.fill();
        ctx.stroke();
      }

      // 2. MAIN BODY
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-75, -100); // left shoulder
      ctx.lineTo(-35, -112); // left neck
      if (isBack) {
        // High back neck curve
        ctx.quadraticCurveTo(0, -106, 35, -112);
      } else if (isPolo || isJacket) {
        // V cut for placket
        ctx.lineTo(0, -75);
        ctx.lineTo(35, -112);
      } else {
        // Deep front crew neckline
        ctx.quadraticCurveTo(0, -90, 35, -112);
      }
      ctx.lineTo(75, -100); // right shoulder
      ctx.lineTo(68, -40);  // right armhole
      ctx.lineTo(isBoxy ? 78 : 66, 125); // right hem
      ctx.lineTo(isBoxy ? -78 : -66, 125); // left hem
      ctx.lineTo(-68, -40); // left armhole
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Body Sublimation pattern
      if (sublimationPrint && sublimationPrint !== 'none') {
        ctx.save();
        ctx.clip();
        drawSublimationPattern(ctx, sublimationPrint, { minX: -80, minY: -115, maxX: 80, maxY: 125 });
        ctx.restore();
      }

      // 3. BOTTOM HEM RIB
      ctx.fillStyle = hemColor;
      const hemW = isBoxy ? 156 : 132;
      ctx.beginPath();
      ctx.rect(-hemW / 2, 110, hemW, 16);
      ctx.fill();
      ctx.stroke();

      // Double-needle stitch line on hem
      ctx.strokeStyle = '#ffffff88';
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(-hemW / 2 + 4, 114);
      ctx.lineTo(hemW / 2 - 4, 114);
      ctx.moveTo(-hemW / 2 + 4, 118);
      ctx.lineTo(hemW / 2 - 4, 118);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#0f172a';

      // 4. COLLAR / HOOD / DETAILS
      if (isHoodie) {
        // Heavy Structured Hood
        ctx.fillStyle = collarColor;
        ctx.beginPath();
        ctx.moveTo(-45, -105);
        ctx.bezierCurveTo(-60, -170, 60, -170, 45, -105);
        ctx.quadraticCurveTo(0, isBack ? -108 : -80, -45, -105);
        ctx.fill();
        ctx.stroke();

        if (!isBack) {
          // Drawcords
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-15, -82);
          ctx.lineTo(-18, -40);
          ctx.moveTo(15, -82);
          ctx.lineTo(18, -40);
          ctx.stroke();
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = '#0f172a';
        }
      } else if (isPolo) {
        // Polo Collar
        ctx.fillStyle = collarColor;
        ctx.beginPath();
        ctx.moveTo(-38, -112);
        ctx.lineTo(-45, -85);
        ctx.lineTo(0, -95);
        ctx.lineTo(45, -85);
        ctx.lineTo(38, -112);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (!isBack) {
          // 2-Button Placket
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.rect(-10, -95, 20, 48);
          ctx.fill();
          ctx.stroke();
          // Buttons
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(0, -82, 3, 0, Math.PI * 2);
          ctx.arc(0, -62, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (isJacket) {
        // Camp Collar
        ctx.fillStyle = collarColor;
        ctx.beginPath();
        ctx.moveTo(-38, -112);
        ctx.lineTo(-50, -78);
        ctx.lineTo(0, -86);
        ctx.lineTo(50, -78);
        ctx.lineTo(38, -112);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (!isBack) {
          // Center Zipper
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -86);
          ctx.lineTo(0, 125);
          ctx.stroke();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.2;
        }
      } else {
        // Standard / Thick Crewneck Rib
        ctx.fillStyle = collarColor;
        ctx.beginPath();
        if (isBack) {
          ctx.moveTo(-35, -112);
          ctx.quadraticCurveTo(0, -118, 35, -112);
          ctx.quadraticCurveTo(0, -106, -35, -112);
        } else {
          ctx.moveTo(-35, -112);
          ctx.quadraticCurveTo(0, -90, 35, -112);
          ctx.quadraticCurveTo(0, -102, -35, -112);
        }
        ctx.fill();
        ctx.stroke();
      }

      // 5. POCKETS (Front view only)
      if (!isBack) {
        if (spec.hasKangarooPocket) {
          ctx.fillStyle = pocketColor;
          ctx.beginPath();
          ctx.moveTo(-48, 15);
          ctx.lineTo(48, 15);
          ctx.lineTo(58, 110);
          ctx.lineTo(-58, 110);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Bar-tack stitches at top corners
          ctx.strokeStyle = '#ffffffaa';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-48, 15);
          ctx.lineTo(-42, 15);
          ctx.moveTo(48, 15);
          ctx.lineTo(42, 15);
          ctx.stroke();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.2;
        } else if (spec.hasChestPocket) {
          ctx.fillStyle = pocketColor;
          ctx.beginPath();
          ctx.roundRect(-42, -50, 26, 32, 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // ==========================================
      // 6. RENDER PLACED DECALS ON THIS VIEW
      // ==========================================
      const targetViewName = isBack ? 'back' : 'front';
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

        if (decal.type === 'text' && decal.fontProps) {
          // Render Typography
          ctx.fillStyle = decal.fontProps.color || '#ffffff';
          ctx.font = `${decal.fontProps.fontWeight || 'bold'} ${decal.fontProps.fontSize || 24}px ${
            decal.fontProps.fontFamily || 'Inter, sans-serif'
          }`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Circular arc text support
          const curvature = decal.fontProps.arcCurvature || 0;
          if (curvature !== 0) {
            const radius = 200 / (curvature / 10);
            const chars = decal.content.split('');
            const angleStep = 0.08 * Math.sign(curvature);
            const startAngle = -((chars.length - 1) * angleStep) / 2;

            chars.forEach((ch, idx) => {
              ctx.save();
              const theta = startAngle + idx * angleStep;
              ctx.translate(Math.sin(theta) * radius, -Math.cos(theta) * radius + radius);
              ctx.rotate(theta);
              ctx.fillText(ch, 0, 0);
              ctx.restore();
            });
          } else {
            ctx.fillText(decal.content, 0, 0);
          }
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
            if (img.complete) {
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
          if (img.complete) {
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
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.setLineDash([]);

          // 4 corner handles
          const handleSize = 7 / viewState.scale;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 1.5 / viewState.scale;

          const handles = [
            { x: -w / 2, y: -h / 2 },
            { x: w / 2, y: -h / 2 },
            { x: w / 2, y: h / 2 },
            { x: -w / 2, y: h / 2 },
          ];
          handles.forEach((h) => {
            ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
          });

          // Top rotation handle stem & knob
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(0, -h / 2 - 20 / viewState.scale);
          ctx.strokeStyle = '#3b82f6';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, -h / 2 - 20 / viewState.scale, 4.5 / viewState.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.restore();
        }
      });

      ctx.restore();
    };

    // Draw Front View
    drawGarment(frontCenter, false);

    // Draw Back View
    drawGarment(backCenter, true);

    // ==========================================
    // 7. TECHNICAL MEASUREMENTS OVERLAY
    // ==========================================
    if (showMeasurements) {
      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = '#1d4ed8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);

      // Chest Width measurement line
      const chestY = frontCenter.y + 10;
      const chestLeft = frontCenter.x - 72;
      const chestRight = frontCenter.x + 72;

      ctx.beginPath();
      ctx.moveTo(chestLeft, chestY);
      ctx.lineTo(chestRight, chestY);
      ctx.stroke();

      // Pill for Chest Width
      const chestText = `${spec.halfChestCm} cm (Chest)`;
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
      const lenX = frontCenter.x - 90;
      const lenTop = frontCenter.y - 110;
      const lenBottom = frontCenter.y + 125;

      ctx.beginPath();
      ctx.moveTo(lenX, lenTop);
      ctx.lineTo(lenX, lenBottom);
      ctx.stroke();

      // Pill for Length
      const lenText = `${spec.bodyLengthCm} cm (Length)`;
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
  }, [dims, viewState, colorZones, decals, selectedDecalId, showMeasurements, spec, sublimationPrint]);

  // Re-render when state changes
  useEffect(() => {
    renderCanvasRef.current = renderCanvas;
    renderCanvas();
  }, [renderCanvas, decalTextureRevision]);

  // Mouse Handlers for Pan, Zoom, and Decal Drag/Transform
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse to world coordinates
    const worldX = (mouseX - viewState.offsetX) / viewState.scale;
    const worldY = (mouseY - viewState.offsetY) / viewState.scale;

    const frontCenter = { x: 210, y: 280 };
    const backCenter = { x: 570, y: 280 };

    // Check hit on decals
    let hitDecal: GraphicDecal | null = null;

    for (let i = decals.length - 1; i >= 0; i--) {
      const d = decals[i];
      const center = d.viewTarget === 'back' ? backCenter : frontCenter;
      const decalWorldX = center.x + d.position.x;
      const decalWorldY = center.y + d.position.y;

      const halfW = (d.width * d.scale) / 2;
      const halfH = (d.height * d.scale) / 2;

      if (
        worldX >= decalWorldX - halfW &&
        worldX <= decalWorldX + halfW &&
        worldY >= decalWorldY - halfH &&
        worldY <= decalWorldY + halfH
      ) {
        hitDecal = d;
        break;
      }
    }

    if (hitDecal) {
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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeHandleRef.current === 'move' && decalDragStartRef.current && selectedDecalId) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - viewState.offsetX) / viewState.scale;
      const worldY = (e.clientY - rect.top - viewState.offsetY) / viewState.scale;

      const dx = worldX - decalDragStartRef.current.mouseX;
      const dy = worldY - decalDragStartRef.current.mouseY;

      updateDecal(selectedDecalId, {
        position: {
          x: Math.round(decalDragStartRef.current.initialPos.x + dx),
          y: Math.round(decalDragStartRef.current.initialPos.y + dy),
        },
      });
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
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setViewState((prev) => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.5, prev.scale * zoomFactor)),
    }));
  };

  return (
    <div className="relative w-full h-full bg-[#f8fafc] overflow-hidden select-none">
      {/* Top Floating Control Toolbar */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-[#171a23]/90 backdrop-blur-md border border-slate-700/70 rounded-xl px-3 py-1.5 shadow-xl text-xs text-slate-300">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-slate-100">2D Flat Tech Spec</span>
        <span className="text-slate-600">|</span>

        {/* View Switcher: Assembled vs Pattern Pieces */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-[11px]">
          <button
            className="px-2.5 py-0.5 rounded-md font-semibold bg-blue-600 text-white shadow-sm"
            title="Assembled Front & Back Flat Sketch"
          >
            Flat Sketch
          </button>
          <button
            onClick={() => setCanvasViewMode('pieces')}
            className="px-2.5 py-0.5 rounded-md font-semibold text-slate-400 hover:text-white transition-colors"
            title="Switch to Pattern Pieces Cutting Canvas"
          >
            Pattern Pieces
          </button>
        </div>

        <span className="text-slate-600">|</span>

        <button
          onClick={() => setDecalModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
          title="Add Artwork, Typography or Presets [T]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Decal Studio</span>
        </button>

        <span className="text-slate-600">|</span>

        {/* Color Zone Quick Picker */}
        <div className="relative">
          <button
            onClick={() => setActiveZonePicker(activeZonePicker ? null : 'body')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Color Blocking Zones"
          >
            <Palette className="w-3.5 h-3.5 text-blue-400" />
            <span>Color Zones</span>
          </button>

          {activeZonePicker && (
            <div className="absolute top-10 left-0 bg-[#171a23]/95 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 shadow-2xl z-30 w-72 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>Color Blocking Zone</span>
                <span className="text-[10px] text-slate-400 uppercase">Select zone</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {['body', 'collar', 'sleeves', 'pocket', 'hem', 'cuffs'].map((zone) => (
                  <button
                    key={zone}
                    onClick={() => setActiveZonePicker(zone)}
                    className={`px-2 py-1 text-[11px] rounded-lg font-semibold capitalize border ${
                      activeZonePicker === zone
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-semibold mb-1.5 uppercase">
                  Curated Uniqlo / Streetwear Swatches
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
          <span>Dims</span>
        </button>
      </div>

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
              scale: Math.max(0.4, prev.scale * 0.85),
            }))
          }
          className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            setViewState({
              scale: Math.max(0.7, Math.min(1.1, dims.width / 950)),
              offsetX: Math.max(40, (dims.width - 760) / 2),
              offsetY: Math.max(30, (dims.height - 520) / 2),
            })
          }
          className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors ml-1"
          title="Fit Artboard to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main High-DPI HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-default"
      />

      {/* Decal & Typography Studio Modal */}
      <DecalToolModal isOpen={decalModalOpen} onClose={() => setDecalModalOpen(false)} />
    </div>
  );
};
