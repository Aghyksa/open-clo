import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { GARMENT_TEMPLATES } from './utils/patternPresets';
import { useCloStore } from './store/useCloStore';
import { useAuthStore } from './store/useAuthStore';
import { TopNav } from './components/UI/TopNav';
import { ToolSidebar } from './components/UI/ToolSidebar';
import { TOOLS } from './components/UI/editorTools';
import { PatternInspector } from './components/UI/PatternInspector';
import { PropertyInspector } from './components/UI/PropertyInspector';
<<<<<<< Updated upstream
import { PatternCanvas } from './components/PatternViewport/PatternCanvas';
import { AssembledFlatCanvas } from './components/PatternViewport/AssembledFlatCanvas';
import { StudioViewport } from './components/Studio3D/StudioViewport';
import { ControlPanelModal } from './components/UI/ControlPanelModal';
import { LoginModal } from './components/UI/LoginModal';
import { UCPModal } from './components/UI/UCPModal';
import { Activity, Scissors, Compass } from 'lucide-react';
=======
const PatternCanvas = lazy(() => import('./components/PatternViewport/PatternCanvas').then((module) => ({ default: module.PatternCanvas })));
const AssembledFlatCanvas = lazy(() => import('./components/PatternViewport/AssembledFlatCanvas').then((module) => ({ default: module.AssembledFlatCanvas })));
const StudioViewport = lazy(() => import('./components/Studio3D/StudioViewport').then((module) => ({ default: module.StudioViewport })));
import { AuthScreen } from './components/UI/AuthScreen';
import { WorkspaceScreen } from './components/UI/WorkspaceScreen';
import { CanvasBoundary } from './components/UI/CanvasBoundary';
import { Dialog } from './components/UI/Dialog';
import { HelpGuide } from './components/UI/HelpGuide';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { downloadFile } from './utils/download';
import { Scissors, Compass, PanelRight, X, HelpCircle } from 'lucide-react';
>>>>>>> Stashed changes

export const App: React.FC = () => {
  const { layout, canvasViewMode, activeTool, setActiveTool, undo, redo, activeTemplateId, decals } =
    useCloStore();

  const [splitRatio, setSplitRatio] = useState(0.5);
  const { status: accountStatus, page, initialize, returnToWorkspace, user, needsReauthentication, reauthenticate, busy: accountBusy, error: workspaceError } = useWorkspaceStore();
  const { saveError, recoveryBackup, isSaved, projects, activeProjectId } = useCloStore();
  const [sessionPassword, setSessionPassword] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const designName = projects.find((project) => project.id === activeProjectId)?.name;
  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (accountStatus !== 'signed-in' || page !== 'editor' || useCloStore.getState().isSaved) return;
      void useCloStore.getState().saveActiveProject(); event.preventDefault();
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, [accountStatus, page]);
  const [isCompact, setIsCompact] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const isDraggingSplitter = useRef(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const update = () => { setIsCompact(query.matches); setInspectorOpen(!query.matches); if (query.matches && useCloStore.getState().layout === 'dual') useCloStore.getState().setLayout('pattern-only'); };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      const bounds = workspaceRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width <= 0) return;
      const newRatio = Math.max(0.2, Math.min(0.8, (e.clientX - bounds.left) / (bounds.width - 6)));
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
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable) ||
        document.querySelector('dialog[open]') || page !== 'editor'
      ) {
        return;
      }

      const key = e.key.toLowerCase();
<<<<<<< Updated upstream
      if (key === 'v') setActiveTool('select');
      if (key === 'a') setActiveTool('vertex');
      if (key === 'p') setActiveTool('pen');
      if (key === 'c') setActiveTool('curve');
      if (key === 's' && !e.ctrlKey && !e.metaKey) setActiveTool('sew');
      if (key === 'f') setActiveTool('free-sew');
      if (key === 'b') setActiveTool('edit-sew');
      if (key === 'h') setActiveTool('move');
      if (key === 'm') setActiveTool('measure');
      if (key === 't') setActiveTool('graphic');
      if (key === 'x') setActiveTool('cut');
      if (key === 'n') setActiveTool('polygon');

      // Ctrl+S / Cmd+S = Save Project (requires auth)
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        const auth = useAuthStore.getState();
        if (!auth.isAuthenticated || !auth.currentUser) {
          auth.setLoginModalOpen(true);
        } else {
          useCloStore.getState().saveActiveProject(auth.currentUser.id, auth.currentUser.username);
        }
        return;
      }

=======
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
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
        if (key === 'k') setActiveTool('patch');
      }
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        useCloStore.getState().saveActiveProject();
        return;
      }
>>>>>>> Stashed changes
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
  }, [activeTool, setActiveTool, undo, redo, page]);

  if (accountStatus === 'checking') return <main className="h-dvh flex items-center justify-center bg-[#f4f2eb] text-stone-600" role="status">Opening your workspace…</main>;
  if (accountStatus !== 'signed-in') return <AuthScreen />;
  if (page === 'workspace') return <><WorkspaceScreen onHelp={() => setHelpOpen(true)} /><HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} /></>;
  return (
    <div className="flex flex-col h-dvh w-screen overflow-hidden bg-[#0c0e12] text-slate-100 font-sans">
      {/* Top Application Bar */}
      <TopNav onOpenControlPanel={returnToWorkspace} onOpenHelp={() => setHelpOpen(true)} />
      {(saveError || workspaceError) && <div className="bg-red-950 text-red-100 px-4 py-2 text-xs flex flex-wrap gap-3 items-center" role="alert"><span>{saveError || workspaceError}</span><button onClick={() => useCloStore.getState().saveActiveProject()} className="underline">Retry Save</button><button onClick={() => downloadFile(JSON.stringify(projects.find((p) => p.id === activeProjectId)), 'openclo-unsaved-design.json')} className="underline">Download backup</button></div>}
      {recoveryBackup && <div className="bg-amber-950 text-amber-100 px-4 py-2 text-xs">An older browser workspace could not be read. <button className="underline" onClick={() => { downloadFile(recoveryBackup, 'openclo-recovery-backup.json'); useCloStore.setState({ recoveryBackup: null }); }}>Download recovery backup</button></div>}

      <div className="min-h-10 border-b border-slate-800 bg-[#171920] px-4 py-2 flex items-center justify-between gap-3 text-[11px]">
        <p className="text-slate-400"><strong className="text-slate-200 mr-2">{designName}</strong>{activeTemplateId === 'custom-pattern' ? 'Imported outlines: name panels in Details, assign 3D roles, then connect sewing edges. Check fit with a physical sample.' : layout === '3d-only' ? 'Check the silhouette from every angle. Drag to orbit; scroll to zoom.'
          : canvasViewMode === 'pieces' ? 'Choose a piece, adjust its shape or size, then check the result in 3D.'
          : 'Choose your fabric, colors and artwork. Use Pattern to change the garment shape.'}</p>
        <div className="flex gap-3 shrink-0"><button onClick={() => setHelpOpen(true)} className="flex gap-1 items-center text-slate-300 hover:text-white"><HelpCircle size={14} />Help</button>
          {layout !== '3d-only' && <button onClick={() => useCloStore.getState().setLayout(layout === 'dual' ? 'pattern-only' : 'dual')}
            className="text-slate-300 hover:text-white">{layout === 'dual' ? '2D only' : 'Show 3D'}</button>}
          <button onClick={() => setInspectorOpen(!inspectorOpen)} aria-pressed={inspectorOpen}
            className="flex items-center gap-1 text-slate-300 hover:text-white"><PanelRight className="w-3.5 h-3.5" />Details</button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left CAD Tool Palette */}
        <ToolSidebar />

        {/* Viewport Area with Resizable Splitter */}
        <main ref={workspaceRef} className={`flex-1 min-w-0 flex overflow-hidden relative ${isCompact ? 'flex-col' : 'flex-row'}`}>
          {/* 2D Pattern Workspace */}
          <div
            style={{
              display: layout === '3d-only' ? 'none' : 'block',
              width: layout === 'dual' && !isCompact ? `${splitRatio * 100}%` : '100%',
              height: layout === 'dual' && isCompact ? '50%' : '100%',
            }}
            className="h-full relative overflow-hidden shrink-0"
          >
            <CanvasBoundary><Suspense fallback={<div role="status" className="p-6 text-stone-600 bg-[#f4f2eb] h-full">Opening design canvas…</div>}>{canvasViewMode === 'assembled' ? <AssembledFlatCanvas /> : <PatternCanvas />}</Suspense></CanvasBoundary>
          </div>

          {/* Interactive Resizable Divider (like CLO3D) */}
          {layout === 'dual' && !isCompact && (
            <div
              onMouseDown={handleSplitterMouseDown}
              className="w-1.5 h-full bg-[#1c202a] hover:bg-blue-500 active:bg-blue-600 cursor-col-resize z-30 transition-colors flex items-center justify-center group select-none shrink-0"
              title="Drag to resize 2D & 3D viewports"
            >
              <div className="w-0.5 h-8 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
            </div>
          )}

          {/* 3D Studio & Simulation Viewport */}
          {layout !== 'pattern-only' && (
            <div
              style={{
                width: layout === 'dual' && !isCompact ? `${(1 - splitRatio) * 100}%` : '100%',
                height: layout === 'dual' && isCompact ? '50%' : '100%',
              }}
              className="h-full relative overflow-hidden flex-1"
            >
              <CanvasBoundary><Suspense fallback={<div role="status" className="p-6 text-stone-600 bg-[#f4f2eb] h-full">Opening 3D preview…</div>}><StudioViewport /></Suspense></CanvasBoundary>
            </div>
          )}
        </main>

        {/* Right Property Inspector Panel */}
        {inspectorOpen && <div className={isCompact ? 'absolute right-0 top-0 bottom-0 z-40 shadow-2xl' : 'shrink-0'}>
          {isCompact && <button onClick={() => setInspectorOpen(false)} aria-label="Close details"
            className="absolute top-2 right-2 z-50 bg-slate-800 rounded p-1"><X className="w-4 h-4" /></button>}
          {canvasViewMode === 'pieces' ? <PatternInspector /> : <PropertyInspector />}
        </div>}
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-7 shrink-0 bg-[#0f1116] border-t border-slate-800 px-4 flex items-center justify-between gap-4 text-[11px] text-slate-400 select-none z-20 overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" /> Tool:{' '}
            <strong className="text-slate-200">{TOOLS.find((tool) => tool.id === activeTool)?.name}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-indigo-400" /> Template:{' '}
            <strong className="text-slate-200">{GARMENT_TEMPLATES.find((template) => template.id === activeTemplateId)?.name || 'Imported pattern'}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Artwork: <strong className="text-slate-200">{decals.length}</strong>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-slate-500">
          <span>{isSaved ? 'Saved to your account' : 'Saving your edits…'}</span>
          <span>Ctrl / ⌘ Z to undo</span>
        </div>
      </footer>

<<<<<<< Updated upstream
      {/* Modals: Control Panel, Auth, UCP */}
      <ControlPanelModal isOpen={controlPanelOpen} onClose={() => setControlPanelOpen(false)} />
      <LoginModal />
      <UCPModal />
=======
      {/* Control Panel Modal */}
      <Dialog open={needsReauthentication} onClose={() => {}} title="Sign in to keep your edits"><p className="text-sm text-stone-600 mb-4">Your session changed or expired. Your edits are still here. Sign in as {user?.email} to save them to the right workspace.</p><form onSubmit={async (e) => { e.preventDefault(); if (await reauthenticate(sessionPassword)) setSessionPassword(''); }}><label className="text-sm">Password<input required type="password" autoComplete="current-password" minLength={12} maxLength={128} value={sessionPassword} onChange={(e) => setSessionPassword(e.target.value)} className="account-input mb-4" /></label><button disabled={accountBusy} className="bg-teal-800 text-white rounded-lg px-4 py-2">Sign in & save</button></form>{workspaceError && <p className="text-sm text-red-700 mt-3" role="alert">{workspaceError}</p>}<button className="underline text-sm mt-4" onClick={() => downloadFile(JSON.stringify(projects.find((p) => p.id === activeProjectId)), 'openclo-unsaved-design.json')}>Download a backup of my edits</button></Dialog>
      <HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} />
>>>>>>> Stashed changes
    </div>
  );
};

export default App;
