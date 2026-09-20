import React, { useState, useRef } from 'react';
import { useCloStore } from '../../store/useCloStore';
import {
  GRAPHIC_PRESETS,
  FASHION_FONTS,
  FASHION_COLOR_PALETTES,
} from '../../utils/patternPresets';
import {
  Upload,
  Type,
  Sparkles,
  Layers,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Sliders,
} from 'lucide-react';

interface DecalToolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DecalToolModal: React.FC<DecalToolModalProps> = ({ isOpen, onClose }) => {
  const {
    decals,
    selectedDecalId,
    setSelectedDecalId,
    addDecal,
    updateDecal,
    removeDecal,
    reorderDecal,
  } = useCloStore();

  const [activeTab, setActiveTab] = useState<'upload' | 'typography' | 'presets' | 'layers'>('presets');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Typography state
  const [textInput, setTextInput] = useState('TOKYO 2026');
  const [selectedFontId, setSelectedFontId] = useState(FASHION_FONTS[0].id);
  const [fontSize, setFontSize] = useState(36);
  const [letterSpacing, setLetterSpacing] = useState(4);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textCurvature, setTextCurvature] = useState(0);
  const [textTargetView, setTextTargetView] = useState<'front' | 'back' | 'leftSleeve' | 'rightSleeve'>('front');

  if (!isOpen) return null;

  const selectedDecal = decals.find((d) => d.id === selectedDecalId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        const targetWidth = 140;
        const targetHeight = targetWidth / aspect;

        addDecal({
          type: 'image',
          content: dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ''),
          position: { x: 0, y: -20 },
          scale: 1,
          rotation: 0,
          viewTarget: 'front',
          blendMode: 'multiply',
          opacity: 0.95,
          width: targetWidth,
          height: targetHeight,
        });

        setActiveTab('layers');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddTypography = () => {
    const font = FASHION_FONTS.find((f) => f.id === selectedFontId) || FASHION_FONTS[0];

    addDecal({
      type: 'text',
      content: textInput,
      name: `Text: ${textInput.slice(0, 12)}`,
      position: { x: 0, y: -20 },
      scale: 1,
      rotation: 0,
      viewTarget: textTargetView,
      blendMode: 'normal',
      opacity: 1,
      width: Math.max(120, textInput.length * (fontSize * 0.6)),
      height: fontSize * 1.5,
      fontProps: {
        fontFamily: font.family,
        fontSize,
        letterSpacing,
        fontWeight: 'bold',
        arcCurvature: textCurvature,
        color: textColor,
      },
    });

    setActiveTab('layers');
  };

  const handleAddPreset = (presetId: string) => {
    const preset = GRAPHIC_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    addDecal({
      type: 'preset',
      content: preset.id,
      name: preset.name,
      position: { x: 0, y: -20 },
      scale: 1,
      rotation: 0,
      viewTarget: 'front',
      blendMode: 'multiply',
      opacity: 0.95,
      width: preset.defaultWidth,
      height: preset.defaultHeight,
    });

    setActiveTab('layers');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#14171f] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#11131a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Graphic, Decal & Typography Studio
              </h2>
              <p className="text-xs text-slate-400">
                Place streetwear graphics, typography, or upload transparent logos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close Modal"
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#161922] px-6">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Graphic Presets
          </button>
          <button
            onClick={() => setActiveTab('typography')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'typography'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-4 h-4" /> Typography & Text
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" /> Upload Image
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'layers'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> Placed Layers ({decals.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: GRAPHIC PRESETS */}
          {activeTab === 'presets' && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Curated Streetwear Marks & Badges
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {GRAPHIC_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleAddPreset(preset.id)}
                    className="p-4 rounded-xl bg-[#1c202a] border border-slate-800 hover:border-blue-500/60 hover:bg-slate-800/60 cursor-pointer transition-all flex flex-col items-center justify-between group text-center"
                  >
                    <div
                      className="w-full h-24 flex items-center justify-center p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors"
                      dangerouslySetInnerHTML={{ __html: preset.svg }}
                    />
                    <div className="mt-3 text-xs font-bold text-slate-200 group-hover:text-blue-400">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                      {preset.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY & TEXT */}
          {activeTab === 'typography' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Text Content
                </label>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g. TOKYO ARCHIVE 26"
                  className="w-full px-3 py-2 bg-[#1c202a] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Fashion Font Style
                  </label>
                  <select
                    value={selectedFontId}
                    onChange={(e) => setSelectedFontId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1c202a] border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    {FASHION_FONTS.map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Target View
                  </label>
                  <select
                    value={textTargetView}
                    onChange={(e) => setTextTargetView(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#1c202a] border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="front">Front Chest / Center</option>
                    <option value="back">Back Upper / Center</option>
                    <option value="leftSleeve">Left Sleeve</option>
                    <option value="rightSleeve">Right Sleeve</option>
                  </select>
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                    <span>Font Size</span>
                    <span className="text-blue-400">{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={96}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                    <span>Letter Spacing</span>
                    <span className="text-blue-400">{letterSpacing}px</span>
                  </div>
                  <input
                    type="range"
                    min={-2}
                    max={20}
                    value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                    <span>Arc Curvature</span>
                    <span className="text-blue-400">{textCurvature}°</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={textCurvature}
                    onChange={(e) => setTextCurvature(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Text Ink Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {FASHION_COLOR_PALETTES.map((swatch) => (
                    <button
                      key={swatch.id}
                      onClick={() => setTextColor(swatch.hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        textColor === swatch.hex
                          ? 'scale-125 border-blue-400 shadow-md'
                          : 'border-slate-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-7 h-7 rounded-lg bg-transparent border border-slate-700 cursor-pointer ml-2"
                    title="Custom HEX Color"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl bg-[#1c202a] border border-slate-800 flex items-center justify-center min-h-[90px]">
                <span
                  style={{
                    fontFamily: FASHION_FONTS.find((f) => f.id === selectedFontId)?.family,
                    fontSize: `${Math.min(36, fontSize)}px`,
                    letterSpacing: `${letterSpacing}px`,
                    color: textColor,
                    fontWeight: 'bold',
                  }}
                >
                  {textInput || 'SAMPLE TEXT'}
                </span>
              </div>

              <button
                onClick={handleAddTypography}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
              >
                Insert Typography to Garment
              </button>
            </div>
          )}

          {/* TAB 3: UPLOAD CUSTOM IMAGE */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-10 cursor-pointer bg-[#1c202a]/60 hover:bg-slate-800/40 transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-200">
                    Click or Drag & Drop Image Here
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Supports transparent PNG, SVG, JPG or WEBP (Max 10MB)
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/svg+xml, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="text-xs text-slate-400 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-left">
                <strong>💡 Pro-Tip for Designers:</strong> Use transparent PNG or SVG vectors. In the Layers tab, you can set the blend mode to <em>Multiply</em> so the ink realistically absorbs the fabric's micro-shadows and creases.
              </div>
            </div>
          )}

          {/* TAB 4: LAYERS MANAGEMENT */}
          {activeTab === 'layers' && (
            <div className="space-y-4">
              {decals.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No decals placed yet. Add presets, typography, or upload an image!
                </div>
              ) : (
                <div className="space-y-2">
                  {decals.map((decal, index) => {
                    const isSelected = selectedDecalId === decal.id;

                    return (
                      <div
                        key={decal.id}
                        onClick={() => setSelectedDecalId(decal.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500 shadow-md'
                            : 'bg-[#1c202a] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                            {decal.type === 'text' ? (
                              <Type className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{decal.name}</div>
                            <div className="text-[10px] text-slate-500">
                              Target: <span className="capitalize">{decal.viewTarget}</span> | Blend: {decal.blendMode}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              reorderDecal(decal.id, 'up');
                            }}
                            disabled={index === decals.length - 1}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20"
                            title="Bring Forward"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              reorderDecal(decal.id, 'down');
                            }}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20"
                            title="Send Backward"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDecal(decal.id);
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 ml-2"
                            title="Delete Decal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inspector for selected decal */}
              {selectedDecal && (
                <div className="mt-4 p-4 rounded-xl bg-[#11131a] border border-slate-700/80 space-y-3">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    Edit Selected: {selectedDecal.name}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Blend Mode</label>
                      <select
                        value={selectedDecal.blendMode}
                        onChange={(e) =>
                          updateDecal(selectedDecal.id, { blendMode: e.target.value as any })
                        }
                        className="w-full px-2 py-1.5 bg-[#1c202a] border border-slate-700 rounded-lg text-xs text-white"
                      >
                        <option value="normal">Normal</option>
                        <option value="multiply">Multiply (Fabric Inset)</option>
                        <option value="screen">Screen (Light Tint)</option>
                        <option value="overlay">Overlay</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Opacity</span>
                        <span className="text-blue-400">{Math.round(selectedDecal.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={selectedDecal.opacity}
                        onChange={(e) =>
                          updateDecal(selectedDecal.id, { opacity: Number(e.target.value) })
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Scale</span>
                        <span className="text-blue-400">{selectedDecal.scale.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.3}
                        max={3}
                        step={0.1}
                        value={selectedDecal.scale}
                        onChange={(e) =>
                          updateDecal(selectedDecal.id, { scale: Number(e.target.value) })
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#11131a] flex items-center justify-between text-xs text-slate-400">
          <span>Shortcuts: Press [T] to toggle this panel</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
