import type { PatternPiece } from '../../types/cad';
import { getPatternBounds } from '../../utils/patternGeometry';
import { GARMENT_TEMPLATES } from '../../utils/patternPresets';

function path(piece: PatternPiece) {
  return piece.points.map((p, i) => {
    const next = piece.points[(i + 1) % piece.points.length], curve = piece.edgeCurvatures?.[i];
    return `${i ? '' : `M${p.x},${p.y} `}${curve ? `Q${(p.x + next.x) / 2 + curve.cpx},${(p.y + next.y) / 2 + curve.cpy} ${next.x},${next.y}` : `L${next.x},${next.y}`}`;
  }).join(' ') + 'Z';
}
const examples = new Map(GARMENT_TEMPLATES.map((template) => [template.id, template.generator().pieces]));
export function DesignThumbnail({ templateId, color = '#262626' }: { templateId: string; color?: string }) {
  if (templateId === 'custom-pattern') return <svg aria-hidden="true" viewBox="0 0 220 140" className="w-full h-full p-4"><path d="M24 30L50 18Q64 42 77 22L98 32L90 115L22 115Z M126 23L187 23L203 115L117 115Z" fill={color} fillOpacity=".7" stroke="#466554" strokeWidth="2" /><path d="M57 51V98M155 42V99" stroke="#f4f2eb" strokeWidth="2" strokeDasharray="4 4" /></svg>;
  const pieces = examples.get(templateId) || examples.values().next().value || [];
  const body = pieces.find((p) => p.id.includes('front')) || pieces[0];
  if (!body) return null;
  const bounds = getPatternBounds(body);
  return <svg aria-hidden="true" viewBox={`${bounds.minX - 55} ${bounds.minY - 35} ${bounds.width + 110} ${bounds.height + 70}`} className="w-full h-full p-4">
    <path d={path(body)} fill={color} stroke="rgba(0,0,0,.2)" strokeWidth={2} />
    <path d={path(body)} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={1} strokeDasharray="3 4" transform={`translate(0,2) scale(.995)`} />
  </svg>;
}
