import React, { useState } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { useAuthStore } from '../../store/useAuthStore';
import { exportPatternsToSvg, GARMENT_TEMPLATES, FABRIC_PRESETS } from '../../utils/patternPresets';
import {
  Shirt,
  Download,
  Columns,
  Square,
  Box,
  Check,
  ChevronDown,
  FolderKanban,
  Save,
  Palette,
  Crown,
  Lock,
} from 'lucide-react';

interface TopNavProps {
  onOpenControlPanel: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenControlPanel }) => {
  const { currentUser, isAuthenticated, setUcpModalOpen, setLoginModalOpen } = useAuthStore();
  const {
    layout,
    setLayout,
    pieces,
    loadPreset,
    activeTemplateId,
    currentMaterial,
    setMaterial,
    customColor,
    setCustomColor,
    saveActiveProject,
    isSaved,
  } = useCloStore();

  const [exportOpen, setExportOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'warn'; message: string } | null>(null);
  const [fabricOpen, setFabricOpen] = useState(false);

  const handleSaveClick = () => {
    if (!isAuthenticated || !currentUser) {
      setSaveFeedback({ type: 'warn', message: 'Silakan masuk untuk menyimpan proyek ke akun Anda!' });
      setLoginModalOpen(true);
      setTimeout(() => setSaveFeedback(null), 4000);
      return;
    }

    saveActiveProject(currentUser.id, currentUser.username);
    setSaveFeedback({ type: 'success', message: `Proyek tersimpan di akun @${currentUser.username}` });
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleExportSvg = () => {
    const svgData = exportPatternsToSvg(pieces);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `openclo-pattern-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess('2D SVG Pattern Downloaded');
    setTimeout(() => setDownloadSuccess(null), 3000);
    setExportOpen(false);
  };

  const handleExportJson = () => {
    const data = JSON.stringify({ pieces }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `openclo-project-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess('CAD Project JSON Exported');
    setTimeout(() => setDownloadSuccess(null), 3000);
    setExportOpen(false);
  };

  return (
    <header className="h-14 bg-[#12141a] border-b border-slate-800 px-4 flex items-center justify-between z-20 select-none">
      {/* Brand & Version Badge */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Shirt className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-white">OpenCLO</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
              Pro CAD
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Open-Source 3D Garment CAD & Cloth Simulation
          </p>
        </div>
      </div>

      {/* Center: Layout & Mode Switcher */}
      <div className="flex items-center gap-2">
        {/* Viewport Layout Switcher */}
        <div className="flex items-center bg-[#191c24] p-1 rounded-xl border border-slate-700/60 text-xs">
          <button
            onClick={() => setLayout('pattern-only')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              layout === 'pattern-only'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="2D Fashion CAD Canvas"
          >
            <Square className="w-3.5 h-3.5" />
            <span>2D CAD Flat</span>
          </button>

          <button
            onClick={() => setLayout('dual')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              layout === 'dual'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Dual Studio (2D CAD + 3D Showroom)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Dual Studio</span>
          </button>

          <button
            onClick={() => setLayout('3d-only')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
              layout === '3d-only'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D Multi-Scene Showroom"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Showroom</span>
          </button>
        </div>
      </div>

      {/* Right: Projects, Template, Fabric, Color, Save, Export */}
      <div className="flex items-center gap-2 relative">
        {downloadSuccess && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <Check className="w-3.5 h-3.5" /> {downloadSuccess}
          </div>
        )}

        {/* Projects Button */}
        <button
          onClick={onOpenControlPanel}
          className="flex items-center gap-1.5 bg-[#1a1d26] hover:bg-slate-700/60 text-slate-300 hover:text-white text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
          title="Manage Projects (Create, Delete, Switch)"
        >
          <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
        </button>

        {/* Garment Template Select */}
        <select
          value={activeTemplateId}
          onChange={(e) => loadPreset(e.target.value)}
          className="bg-[#1a1d26] text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700/80 focus:outline-none focus:border-blue-500 font-medium cursor-pointer max-w-[210px]"
          title="Switch Garment Template"
        >
          {GARMENT_TEMPLATES.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>
              {tmpl.icon} {tmpl.name}
            </option>
          ))}
        </select>

        {/* Fabric / Material Picker */}
        <div className="relative">
          <button
            onClick={() => setFabricOpen(!fabricOpen)}
            className="flex items-center gap-1 bg-[#1a1d26] hover:bg-slate-700/60 text-slate-300 hover:text-white text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
            title={`Fabric: ${currentMaterial.name}`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <ChevronDown className="w-3 h-3" />
          </button>

          {fabricOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#181b24] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Fabric Material
              </div>
              {FABRIC_PRESETS.map((fab) => (
                <button
                  key={fab.id}
                  onClick={() => {
                    setMaterial(fab);
                    setFabricOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                    currentMaterial.id === fab.id
                      ? 'bg-blue-600/20 text-blue-300'
                      : 'hover:bg-blue-600/10 hover:text-blue-300 text-slate-200'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded border border-white/20 flex-shrink-0"
                    style={{ backgroundColor: fab.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{fab.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {fab.category} • {fab.density}gsm • Stretch: {(fab.stretchStiffness * 100).toFixed(0)}%
                    </div>
                  </div>
                  {currentMaterial.id === fab.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}

              <div className="px-3 pt-3 pb-2 border-t border-slate-700/60 mt-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Custom Color
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
                    title="Pick custom garment color"
                  />
                  <span className="text-slate-300 font-mono text-[11px]">{customColor}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Feedback Banner */}
        {saveFeedback && (
          <div
            className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md animate-in fade-in duration-150 ${
              saveFeedback.type === 'success'
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                : 'text-amber-300 bg-amber-500/10 border border-amber-500/30'
            }`}
          >
            <span>{saveFeedback.message}</span>
          </div>
        )}

        {/* Save Button (Requires Login to Commit) */}
        <button
          onClick={handleSaveClick}
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border transition-colors ${
            !isAuthenticated
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
              : isSaved
              ? 'bg-[#1a1d26] text-slate-400 border-slate-700/60'
              : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
          }`}
          title={
            !isAuthenticated
              ? 'Masuk untuk menyimpan proyek ke akun Anda'
              : isSaved
              ? `Semua perubahan tersimpan di akun @${currentUser?.username}`
              : 'Simpan perubahan ke akun Anda (Ctrl+S)'
          }
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        {/* Export Button */}
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {exportOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#181b24] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Production Export
              </div>
              <button
                onClick={handleExportSvg}
                className="w-full text-left px-3 py-2 hover:bg-blue-600/20 hover:text-blue-400 text-slate-200 flex flex-col"
              >
                <span className="font-medium">2D Pattern (.SVG)</span>
                <span className="text-[10px] text-slate-400">
                  1:1 Scale Vector for plotter & pattern cutter
                </span>
              </button>

              <button
                onClick={handleExportJson}
                className="w-full text-left px-3 py-2 hover:bg-blue-600/20 hover:text-blue-400 text-slate-200 flex flex-col"
              >
                <span className="font-medium">Project File (.JSON)</span>
                <span className="text-[10px] text-slate-400">
                  Full CAD specs, seams & textile physics
                </span>
              </button>
            </div>
          )}
        </div>

        {/* User Profile / UCP Trigger Button */}
        {isAuthenticated && currentUser ? (
          <button
            onClick={() => setUcpModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-950/70 to-blue-950/70 hover:from-purple-900 hover:to-blue-900 border border-purple-500/40 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-md shadow-purple-950/40 transition-all cursor-pointer"
            title="Buka UCP (User Control Panel)"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              {currentUser.role === 'superadmin' ? (
                <Crown className="w-3 h-3 text-amber-300" />
              ) : (
                currentUser.username.substring(0, 1).toUpperCase()
              )}
            </div>
            <span className="font-bold text-purple-200">@{currentUser.username}</span>
            {currentUser.role === 'superadmin' && (
              <span className="text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40 hidden sm:inline-block">
                Superadmin
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => setLoginModalOpen(true)}
            className="flex items-center gap-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
            title="Masuk ke Akun OpenCLO"
          >
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>Masuk</span>
          </button>
        )}

        <a
          href="https://github.com/Aghyksa/open-clo"
          target="_blank"
          rel="noreferrer"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
          title="View on GitHub"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      </div>
    </header>
  );
};
