import React, { useState } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { Undo2, Redo2 } from 'lucide-react';
import { TOOLS } from './editorTools';

export const ToolSidebar: React.FC = () => {
  const { activeTool, setActiveTool, undo, redo, undoStack, redoStack, canvasViewMode, layout } = useCloStore();
  const [advanced, setAdvanced] = useState(false);
  if (layout === '3d-only') return null;
  const primary = canvasViewMode === 'assembled' ? ['select', 'graphic', 'move']
    : ['select', 'vertex', 'curve', 'sew', 'measure', 'move'];
  const visible = TOOLS.filter((tool) => primary.includes(tool.id) ||
    (canvasViewMode === 'pieces' && (advanced || tool.id === activeTool) && tool.id !== 'graphic'));
  return (
    <aside className="w-[76px] shrink-0 bg-[#14171f] border-r border-slate-800 flex flex-col py-3 z-20 select-none">
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        <div className="text-[10px] text-center text-slate-500 mb-3">{canvasViewMode === 'pieces' ? 'Pattern tools' : 'Design tools'}</div>
        {visible.map((tool) => {
          const Icon = tool.icon;
          return <button key={tool.id} onClick={() => setActiveTool(tool.id)} aria-pressed={activeTool === tool.id}
            className={`w-full min-h-14 rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${activeTool === tool.id
              ? 'bg-amber-300/15 text-amber-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title={`${tool.description} (${tool.hotkey})`}>
            <Icon className="w-[18px] h-[18px]" /><span>{tool.name}</span>
          </button>;
        })}
        {canvasViewMode === 'pieces' && <button onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}
          className="w-full py-3 text-[10px] text-slate-500 hover:text-white">{advanced ? 'Less tools' : 'More tools'}</button>}
      </div>
      <div className="border-t border-slate-800 pt-2 px-2 flex justify-center gap-1">
        <button onClick={undo} disabled={!undoStack.length} title="Undo (Ctrl+Z)" aria-label="Undo"
          className="p-2 text-slate-400 disabled:opacity-30 hover:text-white"><Undo2 className="w-4 h-4" /></button>
        <button onClick={redo} disabled={!redoStack.length} title="Redo (Ctrl+Y)" aria-label="Redo"
          className="p-2 text-slate-400 disabled:opacity-30 hover:text-white"><Redo2 className="w-4 h-4" /></button>
      </div>
    </aside>
  );
};
