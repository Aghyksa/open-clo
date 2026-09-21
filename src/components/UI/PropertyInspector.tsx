import React, { useState, useRef } from 'react';
import { useCloStore } from '../../store/useCloStore';
import {
  FABRIC_PRESETS,
  GARMENT_TEMPLATES,
  STITCH_PRESETS,
  FASHION_COLOR_PALETTES,
  GRAPHIC_PRESETS,
  getAssembledSpec,
} from '../../utils/patternPresets';
import { DecalToolModal } from './DecalToolModal';
import {
  Shirt,
  Sparkles,
  Palette,
  FileText,
  Sliders,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Check,
  Upload,
  Copy,
  Layers,
  ChevronUp,
  ChevronDown,
  Crosshair,
} from 'lucide-react';
import type { GraphicDecal } from '../../types/cad';

type InspectorTab = 'style' | 'decals' | 'fabric' | 'specs' | 'seams';

export const PropertyInspector: React.FC = () => {
  const {
    activeTemplateId,
    loadPreset,
    colorZones,
    setColorZone,
    setColorZones,
    customColor,
    setCustomColor,
    decals,
    selectedDecalId,
    setSelectedDecalId,
    addDecal,
    updateDecal,
    removeDecal,
    reorderDecal,
    currentMaterial,
    setMaterial,
    stitchSettings,
    setDefaultStitchType,
    setDefaultThreadColor,
    toggleShowStitches,
    pieces,
    seams,
    selectedPieceId,
    scalePiece,
    removeSeam,
    canvasViewMode,
    sublimationPrint,
    setSublimationPrint,
    tataBusanaMode,
    setTataBusanaMode,
  } = useCloStore();

  const [activeTab, setActiveTab] = useState<InspectorTab>('style');
  const [selectedZone, setSelectedZone] = useState<string>('body');
  const [isDecalModalOpen, setIsDecalModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL'>('M');
  const [copiedTechPack, setCopiedTechPack] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const spec = getAssembledSpec(activeTemplateId);
  const currentTemplate = GARMENT_TEMPLATES.find((t) => t.id === activeTemplateId) || GARMENT_TEMPLATES[0];
  const selectedDecal = decals.find((d) => d.id === selectedDecalId);

  // Define relevant color zones based on active garment features
  const availableZones: { key: string; label: string }[] = [
    { key: 'body', label: 'Main Body (Torso)' },
    { key: 'collar', label: spec.hasPoloCollar ? 'Polo Rib Collar' : spec.hasCampCollar ? 'Camp Notch Collar' : 'Collar / Neck Rib' },
    { key: 'sleeves', label: 'Sleeves (Both)' },
    { key: 'leftSleeve', label: 'Left Sleeve' },
    { key: 'rightSleeve', label: 'Right Sleeve' },
  ];

  if (spec.hasHood) {
    availableZones.push({ key: 'hood', label: 'Hood & Drawstrings' });
  }
  if (spec.hasKangarooPocket) {
    availableZones.push({ key: 'pocket', label: 'Kangaroo Pocket' });
  } else if (spec.hasChestPocket) {
    availableZones.push({ key: 'pocket', label: 'Chest Pocket' });
  }
  if (!spec.isPants) {
    availableZones.push({ key: 'hem', label: 'Bottom Hem / Waist Rib' });
    availableZones.push({ key: 'cuffs', label: 'Sleeve Rib Cuffs' });
  } else {
    availableZones.push({ key: 'hem', label: 'Ankle Cuff Elastic' });
    availableZones.push({ key: 'cuffs', label: 'Waistband Rib' });
  }

  const activeZoneColor = colorZones[selectedZone] || customColor || '#262626';

  // Apply color to all zones
  const handleApplyToAllZones = (hex: string) => {
    const updated: Record<string, string> = {};
    availableZones.forEach((z) => {
      updated[z.key] = hex;
    });
    setColorZones(updated);
    setCustomColor(hex);
  };

  // Direct file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || 120;
        let h = img.naturalHeight || 120;
        const maxDim = 120;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = (h / w) * maxDim;
            w = maxDim;
          } else {
            w = (w / h) * maxDim;
            h = maxDim;
          }
        }

        const newId = addDecal({
          type: 'image',
          content: dataUrl,
          name: file.name.replace(/\.[^/.]+$/, '').slice(0, 18),
          position: { x: 0, y: -20 },
          scale: 1,
          rotation: 0,
          viewTarget: 'front',
          blendMode: 'normal',
          opacity: 0.95,
          width: Math.round(w),
          height: Math.round(h),
        });
        setSelectedDecalId(newId);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 1-Click Preset Add
  const handleAddPresetDecal = (presetId: string) => {
    const preset = GRAPHIC_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newId = addDecal({
      type: 'preset',
      content: preset.id,
      name: preset.name,
      position: { x: 0, y: -20 },
      scale: 1,
      rotation: 0,
      viewTarget: 'front',
      blendMode: 'normal',
      opacity: 0.95,
      width: preset.defaultWidth,
      height: preset.defaultHeight,
    });
    setSelectedDecalId(newId);
  };

  // Size grading deltas
  const sizeDeltas: Record<'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL', { chest: number; length: number; shoulder: number; sleeve: number }> = {
    XS: { chest: -5.0, length: -3.0, shoulder: -3.0, sleeve: -2.0 },
    S: { chest: -2.5, length: -1.5, shoulder: -1.5, sleeve: -1.0 },
    M: { chest: 0, length: 0, shoulder: 0, sleeve: 0 },
    L: { chest: +2.5, length: +1.5, shoulder: +1.5, sleeve: +1.0 },
    XL: { chest: +5.0, length: +3.0, shoulder: +3.0, sleeve: +2.0 },
    '2XL': { chest: +7.5, length: +4.5, shoulder: +4.5, sleeve: +3.0 },
  };
  const curDelta = sizeDeltas[selectedSize];
  const gradedHalfChest = spec.halfChestCm + curDelta.chest;
  const gradedBodyLength = spec.bodyLengthCm + curDelta.length;
  const gradedShoulder = spec.shoulderDropCm + curDelta.shoulder;
  const gradedSleeve = spec.sleeveLengthCm + curDelta.sleeve;

  // Copy Tech Pack spec to clipboard
  const handleCopyTechPack = () => {
    const text = `========================================
TECH PACK SPECIFICATION: ${spec.name.toUpperCase()}
Style Code: SKU-OC-${activeTemplateId.toUpperCase().slice(0, 8)}
Size Grade: ${selectedSize} (Baseline: M)
----------------------------------------
MEASUREMENTS:
• Half-Chest Width: ${gradedHalfChest} cm
• Total Body Length: ${gradedBodyLength} cm
• Shoulder Drop Width: ${gradedShoulder} cm
• Sleeve Length: ${gradedSleeve} cm
• Seam Allowance: ${stitchSettings.seamAllowanceMm} mm
• Manufacturing Tolerance: ±1.5 cm

FABRIC & TEXTILE:
• Material: ${currentMaterial.name}
• Weight / Density: ${currentMaterial.density} g/m²
• Seam Construction: ${stitchSettings.defaultType} (${stitchSettings.defaultColor})

COLORWAY PALETTE:
• Body: ${colorZones.body || customColor}
• Collar/Rib: ${colorZones.collar || customColor}
• Sleeves: ${colorZones.sleeves || customColor}
• Pockets/Accents: ${colorZones.pocket || customColor}

GRAPHICS & ARTWORKS (${decals.length} elements):
${decals
  .map(
    (d, i) =>
      `#${i + 1} [${d.viewTarget.toUpperCase()}] ${d.name} (${d.type}) | Pos: (${d.position.x}, ${d.position.y}) | Scale: ${(
        d.scale * 100
      ).toFixed(0)}% | Blend: ${d.blendMode}`
  )
  .join('\n')}
========================================`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch {
          // Ignore
        }
      });
    }
    setCopiedTechPack(true);
    setTimeout(() => setCopiedTechPack(false), 2000);
  };

  return (
    <aside className="w-72 bg-[#13151c] border-l border-slate-800 flex flex-col h-full z-20 select-none text-xs text-slate-300">
      {/* Decal Tool Modal */}
      <DecalToolModal isOpen={isDecalModalOpen} onClose={() => setIsDecalModalOpen(false)} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
      />

      {/* Tabs Header */}
      <div className="flex border-b border-slate-800 bg-[#0e1015]">
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-2.5 flex flex-col items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[10px] ${
            activeTab === 'style'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Garment Silhouette & Color Blocking"
        >
          <Shirt className="w-3.5 h-3.5" />
          <span>Style</span>
        </button>

        <button
          onClick={() => setActiveTab('decals')}
          className={`flex-1 py-2.5 flex flex-col items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[10px] relative ${
            activeTab === 'decals'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Graphics, Logos & Typography Decals"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="flex items-center gap-1">
            <span>Decals</span>
            {decals.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold">
                {decals.length}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fabric')}
          className={`flex-1 py-2.5 flex flex-col items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[10px] ${
            activeTab === 'fabric'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Fabric Textile & Seam Finishes"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Fabric</span>
        </button>

        <button
          onClick={() => setActiveTab('specs')}
          className={`flex-1 py-2.5 flex flex-col items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[10px] ${
            activeTab === 'specs'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Production Sizing & Tech Pack"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Tech Pack</span>
        </button>

        {canvasViewMode === 'pieces' && (
          <button
            onClick={() => setActiveTab('seams')}
            className={`flex-1 py-2.5 flex flex-col items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[10px] ${
              activeTab === 'seams'
                ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            title="Pattern Seam Stitching"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Seams</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========================================== */}
        {/* TAB 1: STYLE & COLOR ZONES */}
        {/* ========================================== */}
        {activeTab === 'style' && (
          <div className="space-y-4">
            {/* Active Garment Card & Switcher */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Commercial Cut
                </label>
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-medium">
                  {currentTemplate.category}
                </span>
              </div>

              <select
                value={activeTemplateId}
                onChange={(e) => loadPreset(e.target.value)}
                className="w-full bg-[#1c202b] text-slate-200 p-2.5 rounded-lg border border-slate-700/80 focus:outline-none focus:border-blue-500 text-xs font-medium"
              >
                {GARMENT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tata Busana (Indonesian Garment Standard) Toggle */}
            <div className="bg-[#181b24] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Tata Busana Standard</span>
                <span className="text-[10px] text-slate-400">Garis Merah TM / Garis Biru TB & Arah Serat</span>
              </div>
              <button
                onClick={() => setTataBusanaMode(!tataBusanaMode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  tataBusanaMode
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {tataBusanaMode ? 'Active' : 'Off'}
              </button>
            </div>

            {/* Multi-Zone Color Blocking */}
            <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-400" />
                  Color Blocking Zones
                </span>
                <button
                  onClick={() => handleApplyToAllZones(activeZoneColor)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                  title="Color entire garment with selected color"
                >
                  Apply All
                </button>
              </div>

              {/* Zone Selector Chips */}
              <div className="flex flex-wrap gap-1.5">
                {availableZones.map((z) => {
                  const isCur = selectedZone === z.key;
                  const zoneCol = colorZones[z.key] || customColor || '#262626';
                  return (
                    <button
                      key={z.key}
                      onClick={() => setSelectedZone(z.key)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border transition-all ${
                        isCur
                          ? 'bg-blue-600/20 border-blue-500 text-blue-200 font-medium'
                          : 'bg-[#12141a] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: zoneCol }}
                      />
                      <span>{z.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Color Controls for Selected Zone */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Zone: <strong className="text-slate-200">{availableZones.find((z) => z.key === selectedZone)?.label}</strong>
                  </span>
                  <button
                    onClick={() => setColorZone(selectedZone, colorZones.body || customColor)}
                    className="text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    Match Body
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-[#1c202b] p-2 rounded-lg border border-slate-700/80">
                  <input
                    type="color"
                    value={activeZoneColor}
                    onChange={(e) => {
                      setColorZone(selectedZone, e.target.value);
                      if (selectedZone === 'body') setCustomColor(e.target.value);
                    }}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={activeZoneColor}
                    onChange={(e) => {
                      setColorZone(selectedZone, e.target.value);
                      if (selectedZone === 'body') setCustomColor(e.target.value);
                    }}
                    className="flex-1 bg-transparent text-slate-200 uppercase font-mono text-xs focus:outline-none"
                    placeholder="#HEX"
                  />
                </div>
              </div>
            </div>

            {/* Trending Streetwear & Lifewear Swatches */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Fashion Palette (Pantone TCX)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {FASHION_COLOR_PALETTES.map((swatch) => {
                  const isActive = activeZoneColor.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.id}
                      onClick={() => {
                        setColorZone(selectedZone, swatch.hex);
                        if (selectedZone === 'body') setCustomColor(swatch.hex);
                      }}
                      className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-blue-950/40 border-blue-500 scale-105 shadow-md shadow-blue-500/20'
                          : 'bg-[#181b24] border-slate-800 hover:border-slate-700'
                      }`}
                      title={`${swatch.name} (${swatch.pantoneRef})`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-black/20 shadow-inner"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="text-[9px] text-slate-300 truncate w-full text-center mt-1">
                        {swatch.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sublimation & Pattern Prints (Diana's Portfolio & PT. Maxxbrother) */}
            <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Sublimation Pattern Prints
                </span>
                {sublimationPrint !== 'none' && (
                  <button
                    onClick={() => setSublimationPrint('none')}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Clear Pattern
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                All-over digital fabric prints (PT. Maxxbrother sublimation standard):
              </p>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { id: 'none', label: 'Solid Color', icon: '◻️' },
                  { id: 'retro-check', label: 'Wavy Check', icon: '🏁' },
                  { id: 'meadow-floral', label: 'Retro Floral', icon: '🌸' },
                  { id: 'sunset-ombre', label: 'Sunset Ombré', icon: '🌅' },
                  { id: 'ocean-marble', label: 'Ocean Marble', icon: '🌊' },
                  { id: 'street-stars', label: 'Graffiti Stars', icon: '⭐' },
                ].map((p) => {
                  const isCur = sublimationPrint === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSublimationPrint(p.id as any)}
                      className={`p-2 rounded-lg text-left border transition-all flex flex-col items-center justify-center gap-1 ${
                        isCur
                          ? 'bg-purple-950/40 border-purple-500 text-purple-200 font-medium'
                          : 'bg-[#12141a] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">{p.icon}</span>
                      <span className="text-[10px] text-center">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: GRAPHICS & DECALS STUDIO */}
        {/* ========================================== */}
        {activeTab === 'decals' && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsDecalModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Decal Studio</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
                title="Upload PNG / SVG / JPG"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Layer Stack */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Garment Layers ({decals.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">Drag on 2D Artboard</span>
              </div>

              {decals.length === 0 ? (
                <div className="p-4 bg-[#181b24] rounded-xl border border-slate-800 text-center space-y-2.5">
                  <p className="text-[11px] text-slate-400">
                    No graphics or typography on garment yet.
                  </p>
                  <div className="text-[10px] text-slate-500">Quick-Add Trending Streetwear Presets:</div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => handleAddPresetDecal('tokyo-box-logo')}
                      className="p-2 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-medium"
                    >
                      + Tokyo Box Logo
                    </button>
                    <button
                      onClick={() => handleAddPresetDecal('care-label-barcode')}
                      className="p-2 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-medium"
                    >
                      + Care Barcode
                    </button>
                    <button
                      onClick={() => handleAddPresetDecal('vintage-athletics-crest')}
                      className="p-2 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-medium"
                    >
                      + Varsity Crest
                    </button>
                    <button
                      onClick={() => handleAddPresetDecal('cyber-barcode-stamp')}
                      className="p-2 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-medium"
                    >
                      + Cyber Stamp
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {decals.map((decal, idx) => {
                    const isSel = selectedDecalId === decal.id;
                    return (
                      <div
                        key={decal.id}
                        onClick={() => setSelectedDecalId(decal.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-blue-950/40 border-blue-500 text-slate-100 shadow-sm shadow-blue-500/10'
                            : 'bg-[#181b24] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                          <span className="text-[11px] font-medium truncate">{decal.name}</span>
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                            {decal.viewTarget}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => reorderDecal(decal.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 hover:text-white disabled:opacity-30"
                            title="Bring forward"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => reorderDecal(decal.id, 'down')}
                            disabled={idx === decals.length - 1}
                            className="p-1 hover:text-white disabled:opacity-30"
                            title="Send backward"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeDecal(decal.id)}
                            className="p-1 text-slate-500 hover:text-red-400"
                            title="Delete decal"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Decal Inspector Controls */}
            {selectedDecal && (
              <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 text-xs">
                    Transform & Appearance
                  </span>
                  <button
                    onClick={() => updateDecal(selectedDecal.id, { position: { x: 0, y: 0 } })}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    title="Center on garment"
                  >
                    <Crosshair className="w-3 h-3" /> Center
                  </button>
                </div>

                {/* Placement Face (Front / Back) */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Placement Face</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#12141a] p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => updateDecal(selectedDecal.id, { viewTarget: 'front' })}
                      className={`py-1 rounded text-[11px] font-medium transition-all ${
                        selectedDecal.viewTarget === 'front'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Front Bodice
                    </button>
                    <button
                      onClick={() => updateDecal(selectedDecal.id, { viewTarget: 'back' })}
                      className={`py-1 rounded text-[11px] font-medium transition-all ${
                        selectedDecal.viewTarget === 'back'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Back Bodice
                    </button>
                  </div>
                </div>

                {/* Blend Mode (Crucial for authentic screenprint ink absorption) */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Print Inking / Blend Mode</span>
                    <span className="text-blue-400 font-medium">
                      {selectedDecal.blendMode === 'multiply' ? 'Fabric Inked' : selectedDecal.blendMode}
                    </span>
                  </div>
                  <select
                    value={selectedDecal.blendMode}
                    onChange={(e) =>
                      updateDecal(selectedDecal.id, {
                        blendMode: e.target.value as GraphicDecal['blendMode'],
                      })
                    }
                    className="w-full bg-[#1c202b] text-slate-200 p-2 rounded-lg border border-slate-700/80 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="multiply">Multiply (Realistic Screenprint Ink)</option>
                    <option value="normal">Normal (Solid Vinyl / Heat Transfer)</option>
                    <option value="screen">Screen (Discharge Ink / Glow)</option>
                    <option value="overlay">Overlay (Vintage Faded Wash)</option>
                  </select>
                </div>

                {/* Scale Slider */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Scale / Dimension</span>
                    <span className="font-mono text-slate-200">
                      {(selectedDecal.scale * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={selectedDecal.scale}
                    onChange={(e) =>
                      updateDecal(selectedDecal.id, { scale: parseFloat(e.target.value) })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Rotation Slider */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Rotation Angle</span>
                    <span className="font-mono text-slate-200">{Math.round(selectedDecal.rotation)}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={selectedDecal.rotation}
                      onChange={(e) =>
                        updateDecal(selectedDecal.id, { rotation: parseInt(e.target.value, 10) })
                      }
                      className="flex-1 accent-blue-500"
                    />
                    <button
                      onClick={() => updateDecal(selectedDecal.id, { rotation: 0 })}
                      className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                      title="Reset rotation to 0°"
                    >
                      0°
                    </button>
                  </div>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Ink Density / Opacity</span>
                    <span className="font-mono text-slate-200">
                      {(selectedDecal.opacity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={selectedDecal.opacity}
                    onChange={(e) =>
                      updateDecal(selectedDecal.id, { opacity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Delete / Clone buttons */}
                <div className="flex gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      const clonedId = addDecal({
                        ...selectedDecal,
                        name: `${selectedDecal.name} (Copy)`,
                        position: {
                          x: selectedDecal.position.x + 10,
                          y: selectedDecal.position.y + 10,
                        },
                      });
                      setSelectedDecalId(clonedId);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-center text-[11px] font-medium"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => removeDecal(selectedDecal.id)}
                    className="flex-1 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-800/60 text-red-300 text-center text-[11px] font-medium"
                  >
                    Delete Decal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: FABRIC TEXTILE & FINISHES */}
        {/* ========================================== */}
        {activeTab === 'fabric' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Fabric Material Preset
              </label>
              <select
                value={currentMaterial.id}
                onChange={(e) => {
                  const found = FABRIC_PRESETS.find((m) => m.id === e.target.value);
                  if (found) setMaterial(found);
                }}
                className="w-full bg-[#1c202b] text-slate-200 p-2.5 rounded-lg border border-slate-700/80 focus:outline-none focus:border-blue-500 text-xs"
              >
                {FABRIC_PRESETS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.density} g/m²)
                  </option>
                ))}
              </select>
            </div>

            {/* Textile Properties */}
            <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  Textile Specifications
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentMaterial.density} GSM
                </span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Fabric Weight (Density)</span>
                  <span className="text-slate-200 font-mono">{currentMaterial.density} g/m²</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="600"
                  step="10"
                  value={currentMaterial.density}
                  onChange={(e) =>
                    setMaterial({
                      ...currentMaterial,
                      density: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Drape Flexibility</span>
                  <span className="text-slate-200 font-mono">
                    {Math.round((1 - currentMaterial.bendingStiffness) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.9"
                  step="0.02"
                  value={currentMaterial.bendingStiffness}
                  onChange={(e) =>
                    setMaterial({
                      ...currentMaterial,
                      bendingStiffness: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Stretch Recovery</span>
                  <span className="text-slate-200 font-mono">
                    {Math.round(currentMaterial.stretchStiffness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={currentMaterial.stretchStiffness}
                  onChange={(e) =>
                    setMaterial({
                      ...currentMaterial,
                      stretchStiffness: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            {/* Industrial Stitching Finishes */}
            <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-blue-400" />
                  Industrial Topstitching
                </span>
                <button
                  onClick={toggleShowStitches}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    stitchSettings.showStitches
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {stitchSettings.showStitches ? 'Visible' : 'Hidden'}
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Stitch Type (ISO)</label>
                <select
                  value={stitchSettings.defaultType}
                  onChange={(e) => setDefaultStitchType(e.target.value as any)}
                  className="w-full bg-[#1c202b] text-slate-200 p-2 rounded-lg border border-slate-700/80 text-xs focus:outline-none"
                >
                  {STITCH_PRESETS.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Thread Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={stitchSettings.defaultColor}
                    onChange={(e) => setDefaultThreadColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="font-mono text-xs text-slate-300 uppercase">
                    {stitchSettings.defaultColor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: PRODUCTION TECH PACK & MEASUREMENTS */}
        {/* ========================================== */}
        {activeTab === 'specs' && (
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Tech Pack Sizing
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  SKU-OC-{activeTemplateId.toUpperCase().slice(0, 6)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Grade scale and production cut measurements for manufacturing:
              </p>
            </div>

            {/* Size Grader Buttons */}
            <div className="grid grid-cols-6 gap-1 bg-[#12141a] p-1 rounded-xl border border-slate-800">
              {(['XS', 'S', 'M', 'L', 'XL', '2XL'] as const).map((sz) => {
                const isCur = selectedSize === sz;
                return (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`py-1.5 rounded-lg text-center font-bold text-xs transition-all ${
                      isCur
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>

            {/* Spec Sheet Table */}
            <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 font-sans font-semibold text-slate-200">
                <span>Measurement Point</span>
                <span>Size {selectedSize} (cm)</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans text-slate-400">Half-Chest Width</span>
                <span className="font-bold text-blue-400">{gradedHalfChest} cm</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans text-slate-400">Total Body Length (HSP)</span>
                <span className="font-bold text-slate-200">{gradedBodyLength} cm</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans text-slate-400">Shoulder Drop Width</span>
                <span className="font-bold text-slate-200">{gradedShoulder} cm</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans text-slate-400">Sleeve Length</span>
                <span className="font-bold text-slate-200">{gradedSleeve} cm</span>
              </div>

              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800/80">
                <span className="font-sans text-slate-400">Seam Allowance</span>
                <span className="text-slate-400">{stitchSettings.seamAllowanceMm} mm</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans text-slate-400">Manufacturing Tolerance</span>
                <span className="text-slate-400">±1.5 cm</span>
              </div>
            </div>

            {/* Tech Summary Cards */}
            <div className="p-3 bg-[#181b24] rounded-xl border border-slate-800 space-y-2 text-[11px]">
              <div className="font-semibold text-slate-300 font-sans">Material & Colorway</div>
              <div className="text-slate-400 leading-relaxed">
                Fabric: <strong className="text-slate-200">{currentMaterial.name}</strong> ({currentMaterial.density} g/m²).
              </div>
              <div className="text-slate-400">
                Body: <span className="font-mono text-slate-200">{colorZones.body || customColor}</span> | Collar:{' '}
                <span className="font-mono text-slate-200">{colorZones.collar || customColor}</span>
              </div>
            </div>

            {/* Copy / Export Actions */}
            <button
              onClick={handleCopyTechPack}
              className={`w-full py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 font-medium text-xs transition-all ${
                copiedTechPack
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copiedTechPack ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Spec Sheet Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Factory Tech Pack (Text)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: SEAMS (For Pattern Pieces View) */}
        {/* ========================================== */}
        {activeTab === 'seams' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Virtual stitches binding 2D pattern edges together in 3D:
            </p>

            {selectedPieceId && (
              <div className="bg-[#181b24] p-3 rounded-xl border border-slate-800 space-y-2 mb-2">
                <span className="font-semibold text-slate-200 block">Scale Selected Piece</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => scalePiece(selectedPieceId, 0.95)}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 py-1.5 rounded-lg border border-slate-700 text-slate-200 font-medium"
                  >
                    <ZoomOut className="w-3 h-3" /> -5%
                  </button>
                  <button
                    onClick={() => scalePiece(selectedPieceId, 1.05)}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 py-1.5 rounded-lg border border-slate-700 text-slate-200 font-medium"
                  >
                    <ZoomIn className="w-3 h-3" /> +5%
                  </button>
                </div>
              </div>
            )}

            {seams.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No active seams. Use the <strong>Virtual Sewing Tool (S)</strong> on the 2D
                Canvas to pair edges.
              </div>
            ) : (
              seams.map((seam, idx) => {
                const pA = pieces.find((p) => p.id === seam.edgeA.pieceId);
                const pB = pieces.find((p) => p.id === seam.edgeB.pieceId);

                return (
                  <div
                    key={seam.id}
                    className="flex items-center justify-between bg-[#181b24] p-3 rounded-xl border border-slate-800"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>Seam #{idx + 1}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {pA?.name || 'Piece A'} (Edge {seam.edgeA.edgeIndex}) ⟷{' '}
                        {pB?.name || 'Piece B'} (Edge {seam.edgeB.edgeIndex})
                      </div>
                    </div>

                    <button
                      onClick={() => removeSeam(seam.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Rip / Delete Seam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
