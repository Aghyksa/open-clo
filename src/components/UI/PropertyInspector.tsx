import React, { useState } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { FABRIC_PRESETS, GARMENT_TEMPLATES } from '../../utils/patternPresets';
import {
  Palette,
  Sliders,
  User,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  LayoutGrid,
  Check,
  RotateCcw,
} from 'lucide-react';

const FASHION_PALETTE = [
  { name: 'Chalk White', hex: '#f8fafc' },
  { name: 'Onyx Black', hex: '#18181b' },
  { name: 'Dusty Rose', hex: '#f43f5e' },
  { name: 'Sage Green', hex: '#10b981' },
  { name: 'Denim Indigo', hex: '#2563eb' },
  { name: 'Sunset Ochre', hex: '#d97706' },
  { name: 'Lilac Violet', hex: '#a855f7' },
  { name: 'Warm Cream', hex: '#fef3c7' },
];

export const PropertyInspector: React.FC = () => {
  const {
    currentMaterial,
    customColor,
    pieces,
    seams,
    avatar,
    selectedPieceId,
    setMaterial,
    setCustomColor,
    scalePiece,
    removeSeam,
    setAvatarMeasurement,
    loadPreset,
    resetSimulation,
    activeTemplateId,
  } = useCloStore();

  const [activeTab, setActiveTab] = useState<'templates' | 'fabric' | 'avatar' | 'seams'>('templates');

  const handleSelectTemplate = (id: string) => {
    loadPreset(id);
  };

  return (
    <aside className="w-64 bg-[#13151c] border-l border-slate-800 flex flex-col h-full z-20 select-none text-xs text-slate-300">
      {/* 4 Tabs Header */}
      <div className="flex border-b border-slate-800 bg-[#0e1015]">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 flex items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[11px] ${
            activeTab === 'templates'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Garment Pattern Templates"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Library</span>
        </button>

        <button
          onClick={() => setActiveTab('fabric')}
          className={`flex-1 py-3 flex items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[11px] ${
            activeTab === 'fabric'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Fabric & Textile Physics"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Fabric</span>
        </button>

        <button
          onClick={() => setActiveTab('avatar')}
          className={`flex-1 py-3 flex items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[11px] ${
            activeTab === 'avatar'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Mannequin Measurements & Sizing"
        >
          <User className="w-3.5 h-3.5" />
          <span>Avatar</span>
        </button>

        <button
          onClick={() => setActiveTab('seams')}
          className={`flex-1 py-3 flex items-center justify-center gap-1 font-medium transition-colors border-b-2 text-[11px] ${
            activeTab === 'seams'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Virtual Seam Connections"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Seams ({seams.length})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: GARMENT TEMPLATES LIBRARY */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Garment Presets
              </span>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                Ready-to-Drape
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Select a fashion block to load 2D pattern cutting pieces and automatic 3D sewing seams:
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {GARMENT_TEMPLATES.map((tmpl) => {
                const isSelected = activeTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`text-left p-3 rounded-xl border transition-all relative flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-950/30 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-[#181b24] border-slate-800 hover:border-slate-700 hover:bg-[#1e222d]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: tmpl.recommendedColor }}
                        />
                        <span className="font-semibold text-slate-100 text-xs">
                          {tmpl.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-800">
                        {tmpl.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {tmpl.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>{tmpl.piecesCount} Panels • Auto Seamed</span>
                      {isSelected ? (
                        <span className="text-blue-400 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active Garment
                        </span>
                      ) : (
                        <span className="text-slate-400 hover:text-white">Load Block →</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: FABRIC & TEXTILE PHYSICS */}
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

            {/* Quick Fashion Color Palette */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Fashion Color Palette
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {FASHION_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setCustomColor(c.hex)}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                    title={c.name}
                  >
                    <div
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        customColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-blue-400 scale-110 shadow-lg shadow-blue-500/30'
                          : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[9px] text-slate-400 truncate w-full text-center">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2 bg-[#1c202b] p-2 rounded-lg border border-slate-700/80">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="flex-1 bg-transparent text-slate-200 uppercase font-mono text-xs focus:outline-none"
                  placeholder="#HEX"
                />
              </div>
            </div>

            {/* Physical Simulation Parameters */}
            <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Textile Physics (PBD)</span>
                </div>
                <button
                  onClick={resetSimulation}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Re-Drape
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Stretch Stiffness</span>
                  <span className="text-slate-200 font-mono">
                    {(currentMaterial.stretchStiffness * 100).toFixed(0)}%
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

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Drape Softness (Flexibility)</span>
                  <span className="text-slate-200 font-mono">
                    {(currentMaterial.bendingStiffness * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
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
                  <span className="text-slate-400">Fabric Weight (Density)</span>
                  <span className="text-slate-200 font-mono">
                    {currentMaterial.density} g/m²
                  </span>
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
            </div>

            {/* Pattern Piece Scaling & Sizing */}
            {selectedPieceId && (
              <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-200 block">
                  Scale Selected Piece
                </span>
                <p className="text-[11px] text-slate-400">
                  Resize pattern panel by ±5% to adjust garment fit:
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => scalePiece(selectedPieceId, 0.95)}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 py-1.5 rounded-lg border border-slate-700 text-slate-200 font-medium"
                  >
                    <ZoomOut className="w-3 h-3" /> -5% Ease
                  </button>
                  <button
                    onClick={() => scalePiece(selectedPieceId, 1.05)}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 py-1.5 rounded-lg border border-slate-700 text-slate-200 font-medium"
                  >
                    <ZoomIn className="w-3 h-3" /> +5% Ease
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AVATAR & MANNEQUIN */}
        {activeTab === 'avatar' && (
          <div className="space-y-4">
            <div className="bg-[#181b24] p-3.5 rounded-xl border border-slate-800 space-y-3.5">
              <span className="font-semibold text-slate-200 block">
                Mannequin Measurements (cm)
              </span>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Height</span>
                  <span className="text-slate-200 font-mono">{avatar.height} cm</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="190"
                  value={avatar.height}
                  onChange={(e) =>
                    setAvatarMeasurement('height', parseInt(e.target.value, 10))
                  }
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Chest Circumference</span>
                  <span className="text-slate-200 font-mono">
                    {avatar.chestCircumference} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="78"
                  max="115"
                  value={avatar.chestCircumference}
                  onChange={(e) =>
                    setAvatarMeasurement(
                      'chestCircumference',
                      parseInt(e.target.value, 10)
                    )
                  }
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Waist Circumference</span>
                  <span className="text-slate-200 font-mono">
                    {avatar.waistCircumference} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="100"
                  value={avatar.waistCircumference}
                  onChange={(e) =>
                    setAvatarMeasurement(
                      'waistCircumference',
                      parseInt(e.target.value, 10)
                    )
                  }
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Hips Circumference</span>
                  <span className="text-slate-200 font-mono">
                    {avatar.hipsCircumference} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="125"
                  value={avatar.hipsCircumference}
                  onChange={(e) =>
                    setAvatarMeasurement(
                      'hipsCircumference',
                      parseInt(e.target.value, 10)
                    )
                  }
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <div className="p-3.5 bg-blue-950/20 border border-blue-900/40 rounded-xl text-slate-300 space-y-1.5">
              <div className="font-semibold text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> CLO3D Fit & Tension Analysis
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Modifying avatar measurements dynamically recalculates the fabric pressure around the mannequin.
                Turn on <strong>Fit Tension Heatmap</strong> to check pressure points!
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: SEAMS MANAGER */}
        {activeTab === 'seams' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Virtual stitches binding 2D pattern edges together in 3D:
            </p>

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
