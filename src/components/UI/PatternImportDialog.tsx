import { useRef, useState } from 'react';
import { Upload, Ruler, Check } from 'lucide-react';
import { Dialog } from './Dialog';
import { parsePatternSvg, candidatesToPatternPieces, type PatternImportResult, type PatternImportCandidate } from '../../utils/patternImport';
import { createDefaultProject, normalizeProject } from '../../utils/projectData';
import { useWorkspaceStore, workspaceRequest } from '../../store/useWorkspaceStore';
import { useCloStore } from '../../store/useCloStore';
import type { CloProject } from '../../types/cad';

function PanelPreview({ panel }: { panel: PatternImportCandidate }) {
  const xs = panel.points.map((point) => point.x), ys = panel.points.map((point) => point.y);
  const minX = Math.min(...xs), minY = Math.min(...ys), width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
  const pad = Math.max(width, height) * .07 + 1;
  return <svg aria-hidden="true" viewBox={`${minX - pad} ${minY - pad} ${width + pad * 2} ${height + pad * 2}`} className="h-28 w-full">
    <polygon points={panel.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="#d5e4dc" stroke="#245d4c" strokeWidth={Math.max(width, height) / 100} />
  </svg>;
}

export function PatternImportDialog({ onClose }: { onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [source, setSource] = useState(''), [filename, setFilename] = useState(''), [format, setFormat] = useState<'svg' | 'cdr'>('svg');
  const [result, setResult] = useState<PatternImportResult | null>(null), [conversionWarnings, setConversionWarnings] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set()), [query, setQuery] = useState('');
  const [name, setName] = useState(''), [widthCm, setWidthCm] = useState(''), [checkedScale, setCheckedScale] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [preparedProject, setPreparedProject] = useState<CloProject | null>(null);
  const accountId = useWorkspaceStore((state) => state.user?.id);
  const owner = useRef(accountId);
  const selectedPanels = result?.candidates.filter((panel) => selected.has(panel.id)) || [];
  const visible = result?.candidates.filter((panel) => panel.name.toLowerCase().includes(query.toLowerCase())) || [];

  async function readFile(file?: File) {
    if (!file || busy) return;
    setBusy(true); setError(''); setResult(null); setCheckedScale(false); setSavedId(null); setPreparedProject(null); setWidthCm(''); setSelected(new Set());
    try {
      const kind = /\.cdr$/i.test(file.name) ? 'cdr' : /\.svg$/i.test(file.name) ? 'svg' : null;
      if (!kind) throw new Error('Choose a .svg or CorelDRAW 2020 .cdr file.');
      if (file.size > (kind === 'cdr' ? 32 : 12) * 1024 * 1024) throw new Error(`Choose a ${kind.toUpperCase()} smaller than ${kind === 'cdr' ? 32 : 12} MB.`);
      let svg: string, warnings: string[] = [];
      if (kind === 'cdr') {
        const converted = await workspaceRequest<{ svg: string; warnings: string[] }>('/patterns/cdr', 'POST', file);
        svg = converted.svg; warnings = converted.warnings;
      } else svg = await file.text();
      if (useWorkspaceStore.getState().user?.id !== owner.current) throw new Error('Your account changed. Open import again in your workspace.');
      const parsed = parsePatternSvg(svg);
      setSource(svg); setFilename(file.name); setFormat(kind); setConversionWarnings(warnings); setResult(parsed);
      setName(file.name.replace(/\.(cdr|svg)$/i, '').slice(0, 120));
      if (!parsed.candidates.length) setError('No supported closed panels found. Expand the outlines or export individual panels as SVG.');
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  function applyScale() {
    try {
      const width = Number(widthCm);
      if (!Number.isFinite(width) || width <= 0 || width > 100000) throw new Error('Enter a valid full document width in centimeters.');
      setResult(parsePatternSvg(source, width * 10)); setSelected(new Set()); setCheckedScale(false); setSavedId(null); setPreparedProject(null); setError('');
    } catch (failure) { setError((failure as Error).message); }
  }
  async function createDesign() {
    if (busy || !result?.hasPhysicalScale || !checkedScale || !selectedPanels.length) return;
    setBusy(true); setError('');
    try {
      if (useWorkspaceStore.getState().user?.id !== owner.current) throw new Error('Your account changed. Open import again in your workspace.');
      let id = savedId;
      if (!id) {
        const project = preparedProject || normalizeProject({ ...createDefaultProject('tshirt', name.trim()), id: crypto.randomUUID(),
          templateId: 'custom-pattern', pieces: candidatesToPatternPieces(selectedPanels), seams: [], decals: [],
          canvasViewMode: 'pieces', patternSource: { name: filename, format } });
        setPreparedProject(project);
        try { await workspaceRequest('/projects/batch', 'POST', { upserts: [{ project, version: 0 }], deletes: [] }); }
        catch (failure) {
          // A lost response can follow a successful save; reuse the original ID on every retry.
          const existing = await workspaceRequest<{ project: unknown }>('/projects/' + encodeURIComponent(project.id)).catch(() => null);
          if (!existing || normalizeProject(existing.project).id !== project.id) throw failure;
        }
        id = project.id; setSavedId(id);
      }
      if (useWorkspaceStore.getState().user?.id !== owner.current) throw new Error('Your account changed. Open the design in its original workspace.');
      await useWorkspaceStore.getState().refreshDesigns();
      await useWorkspaceStore.getState().openDesign(id);
      if (useWorkspaceStore.getState().user?.id === owner.current && useCloStore.getState().activeProjectId === id && useWorkspaceStore.getState().page === 'editor') {
        useCloStore.getState().setLayout('pattern-only'); onClose();
      } else throw new Error('Design saved. Open it from your workspace when your connection is ready.');
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <Dialog open onClose={() => { if (!busy) onClose(); }} wide title="Import your pattern">
    <p className="text-sm text-stone-600 mb-4">Bring in SVG or CorelDRAW 2020 outlines. Choose the panels for one garment and one size; leave charts, artwork and other sizes out.</p>
    <input ref={input} type="file" accept=".svg,.cdr,image/svg+xml" aria-label="Choose pattern file" className="hidden" onChange={(event) => { void readFile(event.target.files?.[0]); }} />
    <button disabled={busy || !!preparedProject} onClick={() => input.current?.click()} className="flex gap-2 items-center border border-stone-300 bg-white rounded-lg px-4 py-2 text-sm"><Upload size={16} />{filename || 'Choose SVG or CDR'}</button>
    {busy && <p role="status" className="text-sm text-teal-800 mt-3">{savedId ? 'Opening your saved design…' : 'Processing your pattern…'}</p>}
    {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mt-4">{error}</p>}
    {result && <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm mt-5">
        <strong>What comes in</strong><p className="mt-1">Editable outlines at the file’s scale. Sewing connections, size labels, motifs and grading are not imported. Inner and outer outlines may both be present; pick your intended stitching or cutting line.</p>
        <details className="mt-2"><summary className="cursor-pointer text-amber-900">Import notes ({conversionWarnings.length + result.warnings.length})</summary><ul className="list-disc pl-5 mt-2 space-y-1">{[...conversionWarnings, ...result.warnings].map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>
      </div>
      <section className="mt-5" aria-label="Verify pattern scale"><h3 className="font-semibold flex gap-2 items-center"><Ruler size={18} />1. Check the scale</h3>
        <p className="text-sm text-stone-600 mt-2">{result.hasPhysicalScale ? `Document width: ${(result.widthMm! / 10).toFixed(1)} cm${result.heightMm === undefined ? "" : ` · height: ${(result.heightMm / 10).toFixed(1)} cm`}. Compare a panel below with a known measurement.` : 'This SVG has no physical units. Enter its full document width to set the scale.'}</p>
        <details className="mt-3" open={!result.hasPhysicalScale}><summary className="text-sm cursor-pointer">Set or correct document width</summary><div className="flex flex-wrap gap-2 items-end mt-2"><label className="text-sm">Full document width (cm)<input type="number" min=".01" max="100000" step="any" value={widthCm} onChange={(event) => setWidthCm(event.target.value)} className="account-input w-44" /></label><button disabled={busy || !!preparedProject} onClick={applyScale} className="border border-stone-300 rounded-lg px-3 py-2 text-sm">Apply scale</button></div></details>
      </section>
      <section className="mt-6" aria-label="Choose pattern panels"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">2. Choose your panels ({selected.size} selected)</h3><input aria-label="Find an imported panel" placeholder="Find panel or page" value={query} onChange={(event) => setQuery(event.target.value)} className="account-input max-w-56 !mt-0" /></div>
        <div className="flex gap-4 mt-2 text-xs"><button disabled={busy || !!preparedProject} className="underline text-teal-800" onClick={() => setSelected((old) => new Set([...old, ...visible.map((panel) => panel.id)]))}>Select visible panels</button><button disabled={busy || !!preparedProject} className="underline text-stone-500" onClick={() => setSelected(new Set())}>Clear selection</button></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3 max-h-[40dvh] overflow-y-auto p-1">{visible.map((panel) => <label key={panel.id} className={`relative cursor-pointer rounded-xl border p-3 ${selected.has(panel.id) ? 'border-teal-700 bg-teal-50' : 'border-stone-300 bg-white'}`}><input type="checkbox" disabled={busy || !!preparedProject} checked={selected.has(panel.id)} aria-label={`Select ${panel.name}`} onChange={() => setSelected((old) => { const next = new Set(old); if (next.has(panel.id)) next.delete(panel.id); else next.add(panel.id); return next; })} className="absolute top-3 left-3 accent-teal-800" /><PanelPreview panel={panel} /><p className="text-xs font-medium break-words mt-2">{panel.name}</p><p className="text-xs text-stone-500 mt-1">{panel.widthCm.toFixed(1)} × {panel.heightCm.toFixed(1)} cm</p></label>)}</div>
      </section>
      <section className="mt-6 border-t border-stone-200 pt-5"><h3 className="font-semibold">3. Save to your private workspace</h3><label className="text-sm block mt-3">Design name and size<input maxLength={120} value={name} disabled={busy || !!preparedProject} onChange={(event) => setName(event.target.value)} className="account-input" placeholder="Kids blazer · size 6" /></label>
        <label className="flex gap-2 items-start text-sm mt-4"><input type="checkbox" disabled={!result.hasPhysicalScale || busy || !!preparedProject} checked={checkedScale} onChange={(event) => setCheckedScale(event.target.checked)} className="mt-1 accent-teal-800" /><span>I compared the panel dimensions with my original pattern and chose panels for one size.</span></label>
        <p className="text-xs text-stone-500 mt-3">In the editor, select a panel to name it, set cutting details and assign a 3D role. Connect sewing edges before using the garment preview. Keep a physical sample as your fit reference.</p>
        <button disabled={busy || !name.trim() || !checkedScale || !result.hasPhysicalScale || !selected.size} onClick={() => { void createDesign(); }} className="flex items-center gap-2 bg-teal-800 text-white disabled:opacity-40 rounded-lg px-5 py-3 mt-4 text-sm"><Check size={16} />{savedId ? 'Open saved design' : `Import ${selected.size || ''} panel${selected.size === 1 ? '' : 's'} & open editor`}</button>
      </section>
    </>}
  </Dialog>;
}
