import React, { useEffect } from 'react';
import { useCloStore } from './store/useCloStore';
import { TopNav } from './components/UI/TopNav';
import { ToolSidebar } from './components/UI/ToolSidebar';
import { PropertyInspector } from './components/UI/PropertyInspector';
import { PatternCanvas } from './components/PatternViewport/PatternCanvas';
import { StudioViewport } from './components/Studio3D/StudioViewport';
import { Activity, Scissors, Compass } from 'lucide-react';

export const App: React.FC = () => {
  const { layout, activeTool, setActiveTool, isSimulating, setIsSimulating, pieces, seams } =
    useCloStore();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in inputs
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
      if (key === 's') setActiveTool('sew');
      if (key === 'h') setActiveTool('move');
      if (key === 'm') setActiveTool('measure');
      if (key === ' ') {
        e.preventDefault();
        setIsSimulating(!isSimulating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, isSimulating, setActiveTool, setIsSimulating]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0e12] text-slate-100 font-sans">
      {/* Top Application Bar */}
      <TopNav />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left CAD Tool Palette */}
        <ToolSidebar />

        {/* Viewport Area */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* 2D Pattern Canvas */}
          {(layout === 'dual' || layout === 'pattern-only') && (
            <div
              className={`h-full relative ${
                layout === 'dual' ? 'w-1/2 border-r border-slate-800' : 'w-full'
              }`}
            >
              <PatternCanvas />
            </div>
          )}

          {/* 3D Studio & Simulation Viewport */}
          {(layout === 'dual' || layout === '3d-only') && (
            <div
              className={`h-full relative ${
                layout === 'dual' ? 'w-1/2' : 'w-full'
              }`}
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
            <Scissors className="w-3.5 h-3.5 text-indigo-400" /> Active Seams:{' '}
            <strong className="text-slate-200">{seams.length}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Pattern Pieces: <strong className="text-slate-200">{pieces.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Physics Engine:{' '}
            <span className="text-emerald-400 font-medium">
              {isSimulating ? 'Active (XPBD 60fps)' : 'Paused'}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">
            Shortcuts: [V] Select [A] Vertex [S] Sew [Space] Drape
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
