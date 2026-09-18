import React, { useState, useRef } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { GARMENT_TEMPLATES } from '../../utils/patternPresets';
import type { CloProject } from '../../types/cad';
import {
  FolderKanban,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Check,
  X,
  Upload,
  Download,
  Clock,
  Shirt,
  Sparkles,
  Layers,
  Scissors,
  Save,
} from 'lucide-react';

interface ControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlPanelModal: React.FC<ControlPanelModalProps> = ({ isOpen, onClose }) => {
  const {
    projects,
    activeProjectId,
    switchProject,
    createNewProject,
    saveActiveProject,
    saveProjectAs,
    renameProject,
    deleteProject,
    duplicateProject,
    importProjectData,
    pieces,
    seams,
    currentMaterial,
  } = useCloStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('tshirt');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewProjectName('New Collection Garment');
    setSelectedTemplate('tshirt');
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createNewProject(newProjectName.trim(), selectedTemplate);
    setIsCreating(false);
  };

  const handleStartRename = (proj: CloProject) => {
    setEditingId(proj.id);
    setEditName(proj.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      renameProject(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleExportSingle = (proj: CloProject) => {
    const data = JSON.stringify(proj, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const data = JSON.stringify(projects, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openclo-all-projects-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.pieces && Array.isArray(parsed.pieces)) {
          importProjectData(parsed);
        } else if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            if (p.pieces) importProjectData(p);
          });
        }
      } catch (err) {
        alert('Invalid CAD project JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#13151b] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#171a22]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                User Project Control Panel
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Auto-Saved
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage garment designs, user projects, multi-block drapes, and backup archives
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="bg-[#0f1116] px-6 py-2.5 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-6">
            <span>
              Total Projects: <strong className="text-slate-200">{projects.length}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Active Pieces: <strong className="text-slate-200">{pieces.length} Panels</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Seam Selections: <strong className="text-slate-200">{seams.length} Seams</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Textile: <strong className="text-slate-200">{currentMaterial.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={saveActiveProject}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 rounded-md border border-slate-700/60 transition-colors"
              title="Commit active project now"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span>Save Changes</span>
            </button>

            <button
              onClick={() => {
                setSaveAsName('');
                setSaveAsOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 rounded-md border border-slate-700/60 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Save As...</span>
            </button>
          </div>
        </div>

        {/* Create Project Form Dropdown */}
        {isCreating && (
          <div className="bg-[#1b1e28] p-4 border-b border-slate-700 animate-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleConfirmCreate} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Create New Garment Project
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Summer Capsule Hoodie 01"
                    className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Starting Fashion Block / Garment
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {GARMENT_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category}) — {t.piecesCount} Pieces
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-md transition-colors"
                >
                  Initialize Project
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Save As Modal Overlay */}
        {saveAsOpen && (
          <div className="bg-[#1c202d] p-4 border-b border-blue-500/40">
            <div className="max-w-md mx-auto space-y-3">
              <h3 className="text-xs font-bold text-white">Save Current Workspace As New Project</h3>
              <input
                type="text"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="Enter new project title..."
                className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSaveAsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (saveAsName.trim()) {
                      saveProjectAs(saveAsName.trim());
                      setSaveAsOpen(false);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-md"
                >
                  Confirm Save As
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project List / Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Your Saved Projects ({projects.length})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isEditing = editingId === proj.id;
              const tmpl = GARMENT_TEMPLATES.find((t) => t.id === proj.templateId);

              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                    isActive
                      ? 'bg-blue-950/20 border-blue-500/80 shadow-lg shadow-blue-500/10'
                      : 'bg-[#181b24] border-slate-800 hover:border-slate-700 hover:bg-[#1a1e28]'
                  }`}
                >
                  {/* Top row */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-[#12141a] border border-blue-500 px-2 py-1 rounded text-xs text-white w-full focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(proj.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveRename(proj.id)}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-700 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                            style={{ backgroundColor: proj.customColor || '#38bdf8' }}
                          />
                          <h4 className="font-bold text-sm text-white truncate">{proj.name}</h4>
                          <button
                            onClick={() => handleStartRename(proj)}
                            className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {isActive && (
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Shirt className="w-3 h-3 text-slate-500" />
                        {tmpl ? tmpl.name : 'Custom CAD Block'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {proj.pieces?.length || 0} Panels
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-slate-500" />
                        {proj.seams?.length || 0} Seams
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>Updated {formatTimestamp(proj.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => duplicateProject(proj.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="Duplicate Project"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleExportSingle(proj)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="Download Project JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${proj.name}"?`)) {
                            deleteProject(proj.id);
                          }
                        }}
                        className="p-1.5 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => {
                          switchProject(proj.id);
                          onClose();
                        }}
                        className="bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                      >
                        Load Project
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with Import / Export All */}
        <div className="p-4 border-t border-slate-800 bg-[#15171f] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Import Project (.json)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />

            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export All Projects</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg shadow-md transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
