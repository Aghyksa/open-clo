import React from 'react';
import { useCloStore } from '../../store/useCloStore';
import { getPatternBounds, getPatternEdgeLength, PATTERN_UNITS_PER_CM } from '../../utils/patternGeometry';
import { getPieceCuttingGeometry } from '../../utils/cuttingGeometry';
import type { AvatarConfig, CuttingDetails, PanelRole, PatternPiece } from '../../types/cad';
import { Layers, Lock, Scissors, Ruler } from 'lucide-react';

const detailInput = 'w-full bg-[#1d2029] border border-slate-700 rounded-md px-2 py-2 text-white disabled:opacity-40';
const panelRoles: [PanelRole, string][] = [['front', 'Front body'], ['back', 'Back body'],
  ['leftSleeve', 'Left sleeve'], ['rightSleeve', 'Right sleeve'], ['hood', 'Hood'], ['pocket', 'Pocket'],
  ['waistFront', 'Front skirt / waist'], ['waistBack', 'Back skirt / waist'], ['other', 'Other / keep placement']];
const resizeGroup = (piece: PatternPiece): 'sleeve' | 'body' | null => piece.role
  ? piece.role === 'leftSleeve' || piece.role === 'rightSleeve' ? 'sleeve'
    : piece.role === 'front' || piece.role === 'back' ? 'body' : null
  : piece.id.includes('sleeve') ? 'sleeve' : /front|back/.test(piece.id) ? 'body' : null;

const PieceDetailsForm: React.FC<{ piece: PatternPiece; avatar: AvatarConfig }> = ({ piece, avatar }) => {
  const { updatePieceDetails, setActiveTool } = useCloStore();
  const [withCutting, setWithCutting] = React.useState(Boolean(piece.cutting));
  const [notches, setNotches] = React.useState(() => (piece.cutting?.notches || []).map((notch, key) => ({ ...notch, key })));
  const nextNotch = React.useRef(notches.length);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const cutting = getPieceCuttingGeometry(piece);
  const apply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('pieceName') || '').trim();
    if (!name) { setError('Enter a piece name.'); return; }
    const role = (data.get('panelRole') || undefined) as PanelRole | undefined;
    const details: CuttingDetails | undefined = withCutting ? {
      quantity: Number(data.get('quantity')), onFold: data.get('onFold') === 'on',
      grainlineAngle: Number(data.get('grainlineAngle')), seamAllowanceMm: Number(data.get('seamAllowanceMm')),
      notches: notches.map((notch) => ({ edgeIndex: Number(data.get(`notchEdge${notch.key}`)) - 1,
        param: Number(data.get(`notchPosition${notch.key}`)) / 100,
        count: Number(data.get(`notchCount${notch.key}`)) as 1 | 2 })),
    } : undefined;
    setBusy(true); setError(null);
    try {
      const placement = !role || role === 'other' || role === piece.role ? piece.placement
        : (await import('../../utils/panelPlacement')).getPanelPlacement(piece, role, avatar);
      updatePieceDetails(piece.id, { name, role, cutting: details, placement });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this piece.');
    } finally { setBusy(false); }
  };
  return <form onSubmit={apply} className="space-y-3 mt-3">
    <fieldset disabled={piece.locked || busy} className="space-y-3">
      <label className="block space-y-1.5">Piece name
        <input name="pieceName" required maxLength={120} defaultValue={piece.name} className={detailInput} />
      </label>
      <label className="block space-y-1.5">3D placement
        <select name="panelRole" defaultValue={piece.role || ''} className={detailInput}>
          <option value="">Keep current placement</option>
          {panelRoles.map(([role, label]) => <option key={role} value={role}>{label}</option>)}
        </select>
      </label>
      <p className="text-[11px] text-slate-400 leading-relaxed">Placement starts the panel near the body part. Connect matching edges with Sew to assemble it.</p>
      <label className="flex gap-2 items-start">
        <input type="checkbox" checked={withCutting} onChange={(event) => setWithCutting(event.currentTarget.checked)} className="mt-0.5 accent-amber-400" />
        Record cutting instructions
      </label>
      <fieldset disabled={!withCutting} className={`space-y-3 ${withCutting ? '' : 'hidden'}`}>
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1.5">Cut quantity
            <input name="quantity" type="number" min={1} max={20} step={1} required defaultValue={piece.cutting?.quantity ?? 1} className={detailInput} />
          </label>
          <label className="block space-y-1.5">Allowance (mm)
            <input name="seamAllowanceMm" type="number" min={0} max={100} step={0.5} required defaultValue={piece.cutting?.seamAllowanceMm ?? 0} className={detailInput} />
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input name="onFold" type="checkbox" defaultChecked={piece.cutting?.onFold} className="accent-amber-400" />Cut on fold
        </label>
        <label className="block space-y-1.5">Grainline angle (°)
          <input name="grainlineAngle" type="number" min={-360} max={360} step={1} required defaultValue={piece.cutting?.grainlineAngle ?? 0} className={detailInput} />
          <span className="block text-[11px] text-slate-400">0° = panel vertical. 90° = clockwise to the right.</span>
        </label>
        <p className="text-[11px] text-slate-400 leading-relaxed">Check that your original outline is the sewing line before adding allowance. An outer blue cut line is generated only for straight convex panels. Curves, concave shapes and fold pieces keep the allowance as a recorded value.</p>
        {piece.cutting && <p className="text-[11px] text-amber-200 leading-relaxed">Current outline: {cutting.allowanceMessage}.</p>}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white">Notch registration</h4>
          <button type="button" onClick={() => setActiveTool('measure')} className="text-amber-300 hover:text-amber-200">Show edge numbers</button>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">Position follows the numbered edge, from 0% at its start to 100% at its end. Marks follow the actual curve.</p>
        {notches.map((notch, index) => <div key={notch.key} className="border border-slate-700 rounded-lg p-2 space-y-2">
          <div className="flex justify-between items-center"><span>Notch {index + 1}</span>
            <button type="button" aria-label={`Remove notch ${index + 1}`} className="text-slate-400 hover:text-red-300"
              onClick={() => setNotches((items) => items.filter((item) => item.key !== notch.key))}>Remove</button>
          </div>
          <label className="block space-y-1">Edge number
            <input name={`notchEdge${notch.key}`} type="number" required min={1} max={piece.points.length} step={1}
              defaultValue={notch.edgeIndex + 1} className={detailInput} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">Position (%)
              <input name={`notchPosition${notch.key}`} type="number" required min={0} max={100} step={0.1} defaultValue={Number((notch.param * 100).toFixed(1))} className={detailInput} />
            </label>
            <label className="block space-y-1">Marks
              <select name={`notchCount${notch.key}`} defaultValue={notch.count} className={detailInput}><option value={1}>Single</option><option value={2}>Double</option></select>
            </label>
          </div>
        </div>)}
        <button type="button" disabled={notches.length >= 64}
          onClick={() => setNotches((items) => [...items, { key: nextNotch.current++, edgeIndex: 0, param: .5, count: 1 }])}
          className="w-full border border-slate-700 rounded-md px-3 py-2 hover:bg-slate-800 disabled:opacity-40">Add notch</button>
      </fieldset>
      <button type="submit" className="w-full rounded-lg py-2.5 bg-amber-300 text-slate-950 font-semibold hover:bg-amber-200 disabled:opacity-40">
        {busy ? 'Applying…' : 'Apply piece details'}
      </button>
    </fieldset>
    {error && <p role="alert" className="text-red-300 text-[11px] leading-relaxed">{error}</p>}
  </form>;
};

export const PatternInspector: React.FC = () => {
  const { pieces, seams, selectedPieceId, selectPiece, scalePieces, activeTool, setActiveTool,
    avatar, setAvatarMeasurement, arrangePieces } = useCloStore();
  const selected = pieces.find((piece) => piece.id === selectedPieceId);
  const bounds = selected ? getPatternBounds(selected) : null;
  const group = selected ? resizeGroup(selected) : null;
  const matching = group ? pieces.filter((piece) => resizeGroup(piece) === group).map((piece) => piece.id) : [];

  const resize = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !bounds || bounds.width === 0 || bounds.height === 0) return;
    const data = new FormData(event.currentTarget);
    const width = Number(data.get('width')), length = Number(data.get('length'));
    if (!Number.isFinite(width) || !Number.isFinite(length) || width <= 0 || length <= 0) return;
    scalePieces(data.get('matching') ? matching : [selected.id],
      width * PATTERN_UNITS_PER_CM / bounds.width, length * PATTERN_UNITS_PER_CM / bounds.height);
  };

  return (
    <aside className="w-72 shrink-0 bg-[#13151c] border-l border-slate-800 flex flex-col h-full text-xs text-slate-300">
      <div className="px-4 py-4 border-b border-slate-800">
        <h2 className="font-semibold text-sm text-white flex items-center gap-2"><Layers className="w-4 h-4 text-amber-300" /> Your pattern</h2>
        <p className="mt-1 text-slate-400 leading-relaxed">Choose a piece to adjust its size or outline. Watch the result in 3D.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <section aria-label="Pattern pieces">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400">{pieces.length} pieces</span>
            <button onClick={arrangePieces} className="text-amber-300 hover:text-amber-200">Tidy layout</button>
          </div>
          <div className="space-y-1">
            {pieces.map((piece) => (
              <button key={piece.id} onClick={() => selectPiece(piece.id)} aria-pressed={selectedPieceId === piece.id}
                className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg border ${selectedPieceId === piece.id
                  ? 'bg-amber-400/10 border-amber-400/50 text-amber-200' : 'border-transparent hover:bg-slate-800 text-slate-300'}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: piece.color || '#94a3b8' }} />
                <span className="flex-1">{piece.name}</span>{piece.locked && <Lock className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </section>
        {selected && bounds ? (
          <section className="border-t border-slate-800 pt-4">
            <h3 className="font-semibold text-white mb-1">{selected.name}</h3>
            <p className="text-[11px] text-slate-400 mb-3">Flat piece size, before sewing.</p>
            <form key={`${selected.id}:${bounds.width}:${bounds.height}`} onSubmit={resize} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 block">Width (cm)
                  <input name="width" type="number" step="0.1" min="0.1" max="300" required disabled={selected.locked}
                    defaultValue={(bounds.width / PATTERN_UNITS_PER_CM).toFixed(1)}
                    className="w-full bg-[#1d2029] border border-slate-700 rounded-md px-2 py-2 text-white" />
                </label>
                <label className="space-y-1.5 block">Length (cm)
                  <input name="length" type="number" step="0.1" min="0.1" max="300" required disabled={selected.locked}
                    defaultValue={(bounds.height / PATTERN_UNITS_PER_CM).toFixed(1)}
                    className="w-full bg-[#1d2029] border border-slate-700 rounded-md px-2 py-2 text-white" />
                </label>
              </div>
              {matching.length > 1 && <label className="flex items-start gap-2 text-[11px] text-slate-400">
                <input name="matching" type="checkbox" defaultChecked className="mt-0.5 accent-amber-400" />
                Resize {group === 'sleeve' ? 'both sleeves' : 'front and back'} together
              </label>}
              <button type="submit" disabled={selected.locked}
                className="w-full rounded-lg py-2.5 bg-amber-300 text-slate-950 font-semibold hover:bg-amber-200 disabled:opacity-40">Apply size</button>
            </form>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setActiveTool('vertex')} className="flex-1 py-2 border border-slate-700 rounded-md hover:bg-slate-800">Edit points</button>
              <button onClick={() => setActiveTool('curve')} className="flex-1 py-2 border border-slate-700 rounded-md hover:bg-slate-800">Bend an edge</button>
            </div>
            <details className="border-t border-slate-800 mt-4 pt-3">
              <summary className="cursor-pointer text-slate-300">Piece details &amp; cutting</summary>
              <PieceDetailsForm key={`${selected.id}:${selected.name}:${selected.role}:${JSON.stringify(selected.cutting)}`} piece={selected} avatar={avatar} />
            </details>
            {activeTool === 'measure' && <div className="mt-4 space-y-1">
              <h4 className="flex items-center gap-1 text-slate-400 mb-2"><Ruler className="w-3 h-3" /> Edge lengths</h4>
              {selected.points.map((point, index) => <div key={point.id} className="flex justify-between text-[11px]">
                <span>Edge {index + 1}</span><span>{getPatternEdgeLength(selected, index).toFixed(1)} cm</span>
              </div>)}
            </div>}
          </section>
        ) : <p className="border border-dashed border-slate-700 rounded-lg p-4 leading-relaxed text-slate-400">
          Select a piece on the canvas or in the list above to start editing.
        </p>}
        <section className="border-t border-slate-800 pt-4">
          <div className="flex justify-between items-center mb-2"><h3 className="text-white font-semibold flex gap-2 items-center"><Scissors className="w-4 h-4" /> Sewing</h3>
            <span className="text-slate-500">{seams.length} connections</span></div>
          <p className="text-[11px] text-slate-400 leading-relaxed">Templates come sewn. Use Sew to connect two edges, or Edit seams to inspect a connection.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setActiveTool('sew')} className="flex-1 py-2 border border-slate-700 rounded-md hover:bg-slate-800">Sew</button>
            <button onClick={() => setActiveTool('edit-sew')} className="flex-1 py-2 border border-slate-700 rounded-md hover:bg-slate-800">Edit seams</button>
          </div>
        </section>
        <details className="border-t border-slate-800 pt-4">
          <summary className="cursor-pointer text-slate-300">Body measurements</summary>
          <p className="text-[11px] text-slate-500 mt-2">Changes the body used for the 3D fit. Enter the actual measurements, including for children. This does not resize or grade the pattern.</p>
          <label className="block space-y-1 mt-3">Mannequin
            <select value={avatar.gender} onChange={(event) => setAvatarMeasurement('gender', event.currentTarget.value)} className={detailInput}>
              <option value="female">Female</option><option value="male">Male</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {([['height', 'Height'], ['chestCircumference', 'Chest'], ['waistCircumference', 'Waist'], ['hipsCircumference', 'Hips'], ['shoulderWidth', 'Shoulders']] as const)
              .map(([key, label]) => <label key={key} className="block space-y-1">{label} (cm)
                <input type="number" min={key === 'height' ? 80 : key === 'shoulderWidth' ? 15 : key === 'waistCircumference' ? 25 : key === 'hipsCircumference' ? 35 : 30} max={key === 'height' ? 230 : key === 'shoulderWidth' ? 75 : key === 'hipsCircumference' ? 240 : 220} defaultValue={avatar[key]} key={`${key}:${avatar[key]}`}
                  onBlur={(e) => { if (e.currentTarget.checkValidity() && e.currentTarget.value) setAvatarMeasurement(key, Number(e.currentTarget.value)); }}
                  className="w-full bg-[#1d2029] border border-slate-700 rounded-md px-2 py-2 text-white" />
              </label>)}
          </div>
        </details>
      </div>
    </aside>
  );
};
