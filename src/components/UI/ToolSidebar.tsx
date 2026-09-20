import React from 'react';
import { useCloStore } from '../../store/useCloStore';
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

export const ToolSidebar: React.FC = () => {
  const { activeTool, setActiveTool, undo, redo, undoStack, redoStack } = useCloStore();

  return (
    <aside className="w-14 bg-[#14171f] border-r border-slate-800/80 flex flex-col items-center py-3 justify-between z-20 select-none">
      <div className="flex flex-col items-center gap-1.5 w-full px-2">
        <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">
          Tools
        </div>

        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={`${tool.name} (${tool.hotkey})`}
            >
              <Icon className="w-5 h-5" />

              {/* Tooltip on hover */}
              <div className="absolute left-14 bg-[#1a1d26] border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <div className="font-semibold flex items-center gap-2 text-white">
                  {tool.name}
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded text-[10px]">
                    {tool.hotkey}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                  {tool.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Undo & Redo Buttons at Bottom */}
      <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-slate-800/80 w-full px-2">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            undoStack.length > 0
              ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            redoStack.length > 0
              ? 'text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
