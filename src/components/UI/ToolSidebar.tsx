import React from 'react';
import { useCloStore } from '../../store/useCloStore';
import type { CadTool } from '../../types/cad';
import {
  MousePointer,
  Move,
  Edit3,
  Scissors,
  Ruler,
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
    name: 'Transform / Move Piece',
    hotkey: 'V',
    icon: MousePointer,
    description: 'Select & position pattern pieces on the 2D cutting table',
  },
  {
    id: 'vertex',
    name: 'Edit Pattern Vertices',
    hotkey: 'A',
    icon: Edit3,
    description: 'Directly modify vertex curves, neckline drop & shoulder slope',
  },
  {
    id: 'sew',
    name: 'Virtual Sewing Tool',
    hotkey: 'S',
    icon: Scissors,
    description: 'Click two pattern edges to create a 3D sewing seam connection',
  },
  {
    id: 'move',
    name: 'Pan Viewport',
    hotkey: 'H',
    icon: Move,
    description: 'Pan around the 2D pattern workspace',
  },
  {
    id: 'measure',
    name: 'Measure Segment',
    hotkey: 'M',
    icon: Ruler,
    description: 'Inspect edge lengths and seam circumference matching',
  },
];

export const ToolSidebar: React.FC = () => {
  const { activeTool, setActiveTool } = useCloStore();

  return (
    <aside className="w-14 bg-[#14171f] border-r border-slate-800/80 flex flex-col items-center py-3 gap-2 z-20 select-none">
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
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={`${tool.name} (${tool.hotkey})`}
          >
            <Icon className="w-5 h-5" />

            {/* Tooltip on hover */}
            <div className="absolute left-14 bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              <div className="font-semibold flex items-center gap-2">
                {tool.name}
                <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                  {tool.hotkey}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-normal">
                {tool.description}
              </div>
            </div>
          </button>
        );
      })}
    </aside>
  );
};
