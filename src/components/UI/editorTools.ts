import type React from 'react';
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

export const TOOLS: ToolItem[] = [
  {
    id: 'select',
    name: 'Select',
    hotkey: 'V',
    icon: MousePointer,
    description: 'Click a piece to select it. Drag to move; use handles to resize or rotate.',
  },
  {
    id: 'graphic',
    name: 'Artwork',
    hotkey: 'T',
    icon: Sparkles,
    description: 'Add a graphic, text or your own logo to the garment.',
  },
  {
    id: 'vertex',
    name: 'Points',
    hotkey: 'A',
    icon: Edit3,
    description: 'Drag a point to change the outline of a piece.',
  },
  {
    id: 'pen',
    name: 'Add point',
    hotkey: 'P',
    icon: PenTool,
    description: 'Click an edge to add a point.',
  },
  {
    id: 'curve',
    name: 'Curve',
    hotkey: 'C',
    icon: Spline,
    description: 'Drag an edge to change its curve.',
  },
  {
    id: 'cut',
    name: 'Cut',
    hotkey: 'X',
    icon: Slice,
    description: 'Draw a cut line across a pattern piece to slice it into separate pieces with automatic seams',
  },
  {
    id: 'patch',
    name: 'Add piece',
    hotkey: 'K',
    icon: Shapes,
    description: 'Add pockets, patches, emblems, collar bands, cuffs, or extra fabric pieces',
  },
  {
    id: 'polygon',
    name: 'Draw piece',
    hotkey: 'N',
    icon: PlusCircle,
    description: 'Click on canvas to draw arbitrary polygon pattern pieces from scratch',
  },
  {
    id: 'sew',
    name: 'Sew',
    hotkey: 'S',
    icon: Scissors,
    description: 'Click an edge, then its matching edge, to sew them together.',
  },
  {
    id: 'free-sew',
    name: 'Partial sew',
    hotkey: 'F',
    icon: Link,
    description: 'Click two points on edges to sew partial segments — for precise control over seam start/end',
  },
  {
    id: 'edit-sew',
    name: 'Edit seams',
    hotkey: 'B',
    icon: Unlink,
    description: 'Select, inspect, reverse direction, or delete existing seams. Press Delete to remove.',
  },
  {
    id: 'move',
    name: 'Pan',
    hotkey: 'H',
    icon: Move,
    description: 'Pan across the 2D pattern cutting workspace',
  },
  {
    id: 'measure',
    name: 'Measure',
    hotkey: 'M',
    icon: Ruler,
    description: 'Select a piece to see its edge lengths in centimeters.',
  },
];

