import React, { useState } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { FABRIC_PRESETS } from '../../utils/patternPresets';
import {
  Palette,
  Sliders,
  User,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from 'lucide-react';

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
  } = useCloStore();

  const [activeTab, setActiveTab] = useState<'fabric' | 'avatar' | 'seams'>('fabric');

  return (
    <aside className="w-80 bg-[#14171f] border-l border-slate-800/80 flex flex-col h-full z-20 select-none text-xs text-slate-300">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-800 bg-[#101218]">
        <button
          onClick={() => setActiveTab('fabric')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 font-medium transition-colors border-b-2 ${
            activeTab === 'fabric'
              ? 'border-blue-500 text-blue-400 bg-slate-800/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Fabric</span>
        </button>

        <button
          onClick={() => setActiveTab('avatar')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 font-medium transition-colors border-b-2 ${
            activeTab === 'avatar'
              ? 'border-blue-500 text-blue-400 bg-slate-800/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Avatar</span>
        </button>

        <button
          onClick={() => setActiveTab('seams')}
          className={`flex-1 py-3 flex items-center justify-center gap-1.5 font-medium transition-colors border-b-2 ${
            activeTab === 'seams'
              ? 'border-blue-500 text-blue-400 bg-slate-800/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Seams ({seams.length})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TAB 1: FABRIC & TEXTILE PHYSICS */}
        {activeTab === 'fabric' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Fabric Preset
              </label>
              <select
                value={currentMaterial.id}
                onChange={(e) => {
                  const found = FABRIC_PRESETS.find((m) => m.id === e.target.value);
                  if (found) setMaterial(found);
                }}
                className="w-full bg-[#1c202a] text-slate-200 p-2 rounded-lg border border-slate-700/80 focus:outline-none focus:border-blue-500"
              >
                {FABRIC_PRESETS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Garment Color & Tone
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="flex-1 bg-[#1c202a] text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700/80 uppercase font-mono text-xs"
                />
              </div>
            </div>

            {/* Physical Simulation Parameters */}
            <div className="bg-[#191d26] p-3 rounded-xl border border-slate-800/90 space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Textile Physics (Verlet / XPBD)</span>
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
                  min="0.1"
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
                  <span className="text-slate-400">Bending Stiffness (Drape)</span>
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
              <div className="bg-[#191d26] p-3 rounded-xl border border-slate-800/90 space-y-2">
                <span className="font-semibold text-slate-200 block">
                  Piece Scaling (Selected)
                </span>
                <p className="text-[11px] text-slate-400">
                  Scale this pattern piece by ±5% to adjust garment fit:
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => scalePiece(selectedPieceId, 0.95)}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 py-1.5 rounded-lg border border-slate-700 text-slate-200"
                  >
                    <ZoomOut className="w-3 h-3" /> -5%
                  </button>
                  <button
                    onClick={() => scalePiece(selectedPieceId, 1.05)}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 py-1.5 rounded-lg border border-slate-700 text-slate-200"
                  >
                    <ZoomIn className="w-3 h-3" /> +5%
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AVATAR & MANNEQUIN */}
        {activeTab === 'avatar' && (
          <div className="space-y-4">
            <div className="bg-[#191d26] p-3 rounded-xl border border-slate-800/90 space-y-3">
              <span className="font-semibold text-slate-200 block">
                Mannequin Measurements (cm)
              </span>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Chest Circumference</span>
                  <span className="text-slate-200 font-mono">
                    {avatar.chestCircumference} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="120"
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
                  max="105"
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

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Height</span>
                  <span className="text-slate-200 font-mono">{avatar.height} cm</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="195"
                  value={avatar.height}
                  onChange={(e) =>
                    setAvatarMeasurement('height', parseInt(e.target.value, 10))
                  }
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl text-slate-300 space-y-1">
              <div className="font-semibold text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Virtual Fit Analysis
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Adjusting the avatar measurements immediately recalculates fabric
                tension on the 3D model. Enable the <strong>Heatmap</strong> button
                to see pressure points.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: SEAM STITCHING CONNECTIONS */}
        {activeTab === 'seams' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400">
              Active virtual stitches holding pattern pieces together in 3D:
            </p>

            {seams.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No seams connected. Use the <strong>Sewing Tool (S)</strong> on the 2D
                Canvas to pair edges.
              </div>
            ) : (
              seams.map((seam, idx) => {
                const pA = pieces.find((p) => p.id === seam.edgeA.pieceId);
                const pB = pieces.find((p) => p.id === seam.edgeB.pieceId);

                return (
                  <div
                    key={seam.id}
                    className="flex items-center justify-between bg-[#191d26] p-2.5 rounded-lg border border-slate-800"
                  >
                    <div>
                      <div className="font-medium text-slate-200">
                        Seam #{idx + 1}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {pA?.name || 'Piece A'} (Edge {seam.edgeA.edgeIndex}) ⟷{' '}
                        {pB?.name || 'Piece B'} (Edge {seam.edgeB.edgeIndex})
                      </div>
                    </div>

                    <button
                      onClick={() => removeSeam(seam.id)}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
