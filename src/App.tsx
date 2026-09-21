import React, { useEffect, useState, useRef } from 'react';
import { useCloStore } from './store/useCloStore';
import { TopNav } from './components/UI/TopNav';
import { ToolSidebar } from './components/UI/ToolSidebar';
import { PropertyInspector } from './components/UI/PropertyInspector';
import { PatternCanvas } from './components/PatternViewport/PatternCanvas';
import { AssembledFlatCanvas } from './components/PatternViewport/AssembledFlatCanvas';
import { StudioViewport } from './components/Studio3D/StudioViewport';
import { ControlPanelModal } from './components/UI/ControlPanelModal';
import { LoginModal } from './components/UI/LoginModal';
import { UCPModal } from './components/UI/UCPModal';
import { Activity, Scissors, Compass } from 'lucide-react';

export const App: React.FC = () => {
  const { layout, canvasViewMode, activeTool, setActiveTool, undo, redo, activeTemplateId, decals } =
    useCloStore();

  const [splitRatio, setSplitRatio] = useState(0.48); // 48% 2D Pattern, 52% 3D Studio
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const isDraggingSplitter = useRef(false);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      const containerWidth = window.innerWidth - 56 - 256; // sidebar(56) + inspector(256)
      if (containerWidth <= 0) return;
      const newRatio = Math.max(0.2, Math.min(0.8, (e.clientX - 56) / containerWidth));
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      if (isDraggingSplitter.current) {
        isDraggingSplitter.current = false;
        document.body.style.cursor = 'default';
        window.dispatchEvent(new Event('resize'));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'v') setActiveTool('select');
      if (key === 'a') setActiveTool('vertex');
      if (key === 'p') setActiveTool('pen');
      if (key === 'c') setActiveTool('curve');
      if (key === 's') setActiveTool('sew');
      if (key === 'f') setActiveTool('free-sew');
      if (key === 'b') setActiveTool('edit-sew');
      if (key === 'h') setActiveTool('move');
      if (key === 'm') setActiveTool('measure');
      if (key === 't') setActiveTool('graphic');
      if (key === 'x') setActiveTool('cut');
      if (key === 'n') setActiveTool('polygon');
      // Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, setActiveTool, undo, redo]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0e12] text-slate-100 font-sans">
      {/* Top Application Bar */}
      <TopNav onOpenControlPanel={() => setControlPanelOpen(true)} />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left CAD Tool Palette */}
        <ToolSidebar />

        {/* Viewport Area with Resizable Splitter */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* 2D Pattern Workspace */}
          <div
            style={{
              display: layout === '3d-only' ? 'none' : 'block',
              width: layout === 'dual' ? `${splitRatio * 100}%` : '100%',
            }}
            className="h-full relative overflow-hidden flex-shrink-0"
          >
            {canvasViewMode === 'assembled' ? <AssembledFlatCanvas /> : <PatternCanvas />}
          </div>

          {/* Interactive Resizable Divider (like CLO3D) */}
          {layout === 'dual' && (
            <div
              onMouseDown={handleSplitterMouseDown}
              className="w-1.5 h-full bg-[#1c202a] hover:bg-blue-500 active:bg-blue-600 cursor-col-resize z-30 transition-colors flex items-center justify-center group select-none flex-shrink-0"
              title="Drag to resize 2D & 3D viewports"
            >
              <div className="w-0.5 h-8 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
            </div>
          )}

          {/* 3D Studio & Simulation Viewport */}
          {layout !== 'pattern-only' && (
            <div
              style={{
                width: layout === 'dual' ? `${(1 - splitRatio) * 100}%` : '100%',
              }}
              className="h-full relative overflow-hidden flex-1"
            >
              <StudioViewport />
            </div>
          )}
        </main>

        {/* Right Property Inspector Panel */}
        <PropertyInspector />
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 bg-[#0f1116] border-t border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400 select-none z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" /> Tool:{' '}
            <strong className="text-slate-200 uppercase">{activeTool}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-indigo-400" /> Template:{' '}
            <strong className="text-slate-200">{activeTemplateId}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Decals Placed: <strong className="text-slate-200">{decals.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> 3D Engine:{' '}
            <span className="text-emerald-400 font-medium">
              Three.js PBR Studio (60fps)
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">
            Shortcuts: [V] Select [T] Decals & Text [A] Vertex [Ctrl+Z] Undo
          </span>
        </div>
      </footer>

      {/* Modals: Control Panel, Auth, UCP */}
      <ControlPanelModal isOpen={controlPanelOpen} onClose={() => setControlPanelOpen(false)} />
      <LoginModal />
      <UCPModal />
    </div>
  );
};

export default App;
