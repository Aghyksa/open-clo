import React, { useState } from 'react';
import { useCloStore } from '../../store/useCloStore';
<<<<<<< Updated upstream
import type { CadTool } from '../../types/cad';
import {
  MousePointer,
  Move,
  Edit3,
  Scissors,
  Ruler,
  PenTool,
  Spline,
  Slice,
  Shapes,
  PlusCircle,
  Undo2,
  Redo2,
  Link,
  Unlink,
  Sparkles,
  Bookmark,
  Type,
} from 'lucide-react';

interface ToolItem {
  id: CadTool;
  name: string;
  hotkey: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TOOLS: ToolItem[] = [
  {
    id: 'select',
    name: 'Transform & Move',
    hotkey: 'V',
    icon: MousePointer,
    description: 'Select, scale, rotate and move pattern pieces and decals',
  },
  {
    id: 'text',
    name: 'Text Annotation (F8)',
    hotkey: 'T',
    icon: Type,
    description: 'Click anywhere on canvas to type production labels, cutting counts, or size specifications',
  },
  {
    id: 'graphic',
    name: 'Decal & Text Studio',
    hotkey: 'T',
    icon: Sparkles,
    description: 'Place streetwear graphics, typography, or upload transparent logos',
  },
  {
    id: 'vertex',
    name: 'Direct Select (Points)',
    hotkey: 'A',
    icon: Edit3,
    description: 'Select and manipulate individual polygon vertices and curvature points',
  },
  {
    id: 'pen',
    name: 'Pen Tool (Add Points)',
    hotkey: 'P',
    icon: PenTool,
    description: 'Click anywhere along a pattern edge to insert a new vertex point',
  },
  {
    id: 'curve',
    name: 'Curvature Tool (Bend Edges)',
    hotkey: 'C',
    icon: Spline,
    description: 'Click and drag an edge to pull it into an anatomical curved line',
  },
  {
    id: 'notch',
    name: 'Notch Tool (Tanda Pas)',
    hotkey: 'U',
    icon: Bookmark,
    description: 'Click along any pattern edge to insert a sewing balance notch (tanda pas / cekikan)',
  },
  {
    id: 'cut',
    name: 'Cut / Slice Pattern',
    hotkey: 'X',
    icon: Slice,
    description: 'Draw a cut line across a pattern piece to slice it into separate pieces with automatic seams',
  },
  {
    id: 'patch',
    name: 'Fabric Patch Library',
    hotkey: 'K',
    icon: Shapes,
    description: 'Add pockets, patches, emblems, collar bands, cuffs, or extra fabric pieces',
  },
  {
    id: 'polygon',
    name: 'Create Polygon Pattern',
    hotkey: 'N',
    icon: PlusCircle,
    description: 'Click on canvas to draw arbitrary polygon pattern pieces from scratch',
  },
  {
    id: 'sew',
    name: 'Virtual Sewing Seams',
    hotkey: 'S',
    icon: Scissors,
    description: 'Click two pattern edge segments to generate a 3D sewing seam constraint',
  },
  {
    id: 'free-sew',
    name: 'Free Sewing (Partial Edge)',
    hotkey: 'F',
    icon: Link,
    description: 'Click two points on edges to sew partial segments — for precise control over seam start/end',
  },
  {
    id: 'edit-sew',
    name: 'Edit Seams',
    hotkey: 'B',
    icon: Unlink,
    description: 'Select, inspect, reverse direction, or delete existing seams. Press Delete to remove.',
  },
  {
    id: 'move',
    name: 'Pan Hand Tool',
    hotkey: 'H',
    icon: Move,
    description: 'Pan across the 2D pattern cutting workspace',
  },
  {
    id: 'measure',
    name: 'Measure Segment',
    hotkey: 'M',
    icon: Ruler,
    description: 'Inspect edge lengths and seam matching dimensions',
  },
];
=======
import { Undo2, Redo2 } from 'lucide-react';
import { TOOLS } from './editorTools';
>>>>>>> Stashed changes

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
