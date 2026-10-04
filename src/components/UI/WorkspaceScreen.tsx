import { useRef, useState } from 'react';
import { Shirt, Plus, ArrowRight, Upload, LogOut, Search, Copy, Trash2, Pencil, HelpCircle, Settings } from 'lucide-react';
import { useWorkspaceStore, workspaceRequest, type DesignSummary } from '../../store/useWorkspaceStore';
import { GARMENT_TEMPLATES } from '../../utils/patternPresets';
import { normalizeProject, parseProjectBackup, MAX_BACKUP_BYTES } from '../../utils/projectData';
import { downloadFile } from '../../utils/download';
import type { CloProject } from '../../types/cad';
import { DesignThumbnail } from './DesignThumbnail';
import { Dialog } from './Dialog';
import { PatternImportDialog } from './PatternImportDialog';

export function WorkspaceScreen({ onHelp }: { onHelp: () => void }) {
  const { user, designs, openDesign, createDesign, busy, error, signOut, legacyCount, importLegacy, recoveryCode, dismissRecovery, refreshDesigns } = useWorkspaceStore();
  const [query, setQuery] = useState(''); const [template, setTemplate] = useState<string | null>(null);
  const [name, setName] = useState(''); const [actionError, setActionError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false); const [editing, setEditing] = useState<DesignSummary | null>(null);
  const [deleting, setDeleting] = useState<DesignSummary | null>(null); const [settings, setSettings] = useState(false);
  const [patternImport, setPatternImport] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [passwordMessage, setPasswordMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const filtered = designs.filter((design) => design.name.toLowerCase().includes(query.toLowerCase()));
  async function mutate(design: DesignSummary, type: 'rename' | 'duplicate' | 'delete') {
    if (changing) return;
    setChanging(true); setActionError(null);
    try {
      if (type === 'delete') {
        await workspaceRequest('/projects/batch', 'POST', { upserts: [], deletes: [{ id: design.id, version: design.version }] });
      } else {
        const { project: value, version } = await workspaceRequest<{ project: unknown; version: number }>('/projects/' + encodeURIComponent(design.id));
        const project = normalizeProject(value);
        const updated = { ...project, name: type === 'rename' ? name.trim() : `${project.name} (Copy)`.slice(0,120),
          ...(type === 'duplicate' ? { id: crypto.randomUUID(), createdAt: Date.now() } : {}), updatedAt: Date.now() };
        await workspaceRequest('/projects/batch', 'POST', { upserts: [{ project: updated, version: type === 'duplicate' ? 0 : version }], deletes: [] });
      }
      await refreshDesigns(); setEditing(null); setDeleting(null);
    } catch (failure) { setActionError((failure as Error).message); }
    finally { setChanging(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setActionError(null); setChanging(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Choose a backup smaller than 24 MB.');
      const projects = parseProjectBackup(await file.text()).map((project) => ({ ...project, id: crypto.randomUUID() }));
      await workspaceRequest('/projects/batch', 'POST', { upserts: projects.map((project) => ({ project, version: 0 })), deletes: [] });
      await refreshDesigns();
    } catch (failure) { setActionError((failure as Error).message); }
    finally { setChanging(false); if (input.current) input.current.value = ''; }
  }
  async function exportAll() {
    setChanging(true); setActionError(null);
    try {
      const projects: CloProject[] = [];
      // Read at most four full designs at once; the workspace list contains metadata only.
      for (let offset = 0; offset < designs.length; offset += 4) {
        const batch = await Promise.all(designs.slice(offset, offset + 4).map(async (design) => {
          const result = await workspaceRequest<{ project: unknown }>('/projects/' + encodeURIComponent(design.id));
          return normalizeProject(result.project);
        })); projects.push(...batch);
      }
      downloadFile(JSON.stringify(projects), 'openclo-workspace-backup.json');
    } catch (failure) { setActionError((failure as Error).message); }
    finally { setChanging(false); }
  }
  return <main className="h-dvh overflow-y-auto bg-[#f4f2eb] text-stone-900">
    <header className="border-b border-stone-200 px-5 md:px-10 py-4 flex flex-wrap gap-4 items-center justify-between bg-[#faf9f5]">
      <div className="flex gap-2 items-center"><Shirt className="text-teal-800" /><strong className="text-xl">OpenCLO</strong><span className="text-xs text-stone-500 border-l border-stone-300 pl-3 ml-2">Private workspace</span></div>
      <div className="flex gap-3 items-center text-sm"><span className="hidden sm:inline text-stone-500">{user?.name}</span><button onClick={onHelp} className="workspace-icon" aria-label="How to use OpenCLO"><HelpCircle size={19} /></button><button onClick={() => setSettings(true)} className="workspace-icon" aria-label="Account settings"><Settings size={19} /></button><button disabled={busy} onClick={signOut} className="flex gap-2 items-center px-3 py-2 rounded-lg hover:bg-stone-200"><LogOut size={16} />Sign out</button></div>
    </header>
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5 mb-8"><div><p className="text-xs uppercase tracking-[.15em] text-teal-800 mb-2">A space for your next idea</p><h1 className="font-serif text-4xl md:text-5xl">My workspace</h1><p className="text-stone-500 mt-3">{designs.length ? `${designs.length} private design${designs.length === 1 ? '' : 's'}. Pick up where you left off.` : 'Choose a template below to create your first design.'}</p></div><div className="flex gap-2"><button onClick={() => input.current?.click()} disabled={changing} className="border border-stone-300 rounded-lg px-4 py-2.5 flex gap-2 items-center text-sm bg-white"><Upload size={16} />Import backup</button>{designs.length > 0 && <button onClick={exportAll} disabled={changing} className="border border-stone-300 rounded-lg px-4 py-2.5 text-sm">Export all</button>}</div></div>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label="Import project JSON" onChange={(e) => importFile(e.target.files?.[0])} />
      {(error || actionError) && <p role="alert" className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{actionError || error}</p>}
      {legacyCount > 0 && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm"><p>{legacyCount} design{legacyCount === 1 ? '' : 's'} found in this browser. Import them only if they belong to you.</p><button disabled={busy} onClick={importLegacy} className="font-semibold text-teal-800 underline">Import my browser designs</button></div>}
      {designs.length > 0 && <section className="mb-12" aria-label="Your designs"><div className="flex flex-wrap items-center justify-between gap-4 mb-5"><h2 className="text-lg font-semibold">Your designs</h2><label className="flex gap-2 items-center bg-white border border-stone-300 px-3 py-2 rounded-lg"><Search size={16} className="text-stone-400" /><input aria-label="Search your designs" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a design" className="text-sm bg-transparent outline-none w-44" /></label></div>
        {!filtered.length && <p className="text-stone-500 py-8">No designs match “{query}”.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map((design) => <article key={design.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <button disabled={busy || changing} onClick={() => openDesign(design.id)} className="w-full text-left group"><div className="h-44 bg-[#e9e7de] group-hover:bg-[#e1e5db] transition-colors"><DesignThumbnail templateId={design.templateId} color={design.color} /></div><div className="p-4"><h3 className="font-semibold truncate">{design.name}</h3><p className="text-xs text-stone-500 mt-1">{GARMENT_TEMPLATES.find((t) => t.id === design.templateId)?.name || 'Imported pattern'} · {new Date(design.updated_at).toLocaleDateString()}</p></div></button>
          <div className="px-3 pb-3 flex justify-between border-t border-stone-100 pt-2"><button disabled={busy || changing} onClick={() => openDesign(design.id)} className="text-xs font-semibold text-teal-800 flex gap-1 items-center px-2 py-2">Open design<ArrowRight size={14} /></button><div className="flex"><button disabled={changing} className="workspace-icon" aria-label={`Rename ${design.name}`} onClick={() => { setEditing(design); setName(design.name); }}><Pencil size={15} /></button><button disabled={changing} className="workspace-icon" aria-label={`Duplicate ${design.name}`} onClick={() => mutate(design,'duplicate')}><Copy size={15} /></button><button disabled={changing} className="workspace-icon" aria-label={`Delete ${design.name}`} onClick={() => setDeleting(design)}><Trash2 size={15} /></button></div></div>
        </article>)}</div>
      </section>}
      <section className="mb-8 border border-teal-800/20 bg-[#e6eee6] rounded-xl p-5 flex flex-wrap justify-between items-center gap-4" aria-label="Use an existing pattern"><div><h2 className="text-lg font-semibold">Already have a pattern?</h2><p className="text-sm text-stone-600 mt-1">Bring in SVG or CorelDRAW 2020 panels, check their scale, then add sewing and cutting details.</p></div><button disabled={busy || changing} onClick={() => setPatternImport(true)} className="flex gap-2 items-center bg-teal-800 text-white rounded-lg px-4 py-3 text-sm"><Upload size={16} />Import pattern</button></section>
      <section aria-label="Start from a garment template"><div className="flex flex-wrap justify-between items-end gap-2 mb-5"><div><h2 className="text-xl font-semibold">Start with a template</h2><p className="text-sm text-stone-500 mt-1">A ready-sewn pattern you can make your own. Your edits create a separate design.</p></div><button onClick={onHelp} className="text-sm text-teal-800 underline">See how it works</button></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{GARMENT_TEMPLATES.map((item) => <button key={item.id} onClick={() => { setTemplate(item.id); setName(`${item.name} design`); }} disabled={busy || changing} className="bg-[#faf9f5] text-left border border-stone-300 rounded-xl overflow-hidden hover:border-teal-700 group"><div className="h-40 bg-[#e7e5db] group-hover:bg-[#dde3d8]"><DesignThumbnail templateId={item.id} color={item.recommendedColor} /></div><div className="p-3"><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-stone-500 mt-1 flex gap-1 items-center"><Plus size={13} />Create a design</p></div></button>)}</div>
      </section>
      <p className="text-xs text-stone-500 mt-8">3D previews help explore shape and styling. Check a physical sample before production.</p>
    </div>
    <Dialog open={template !== null} onClose={() => setTemplate(null)} title="Start your design"><p className="text-sm text-stone-500 mb-5">Your template becomes a private, editable design in your workspace.</p><form onSubmit={async (e) => { e.preventDefault(); if (template) { await createDesign(name, template); setTemplate(null); if (useWorkspaceStore.getState().page === 'editor') { try { const key = `openclo_onboarding_${user?.id}`; if (!localStorage.getItem(key)) { onHelp(); localStorage.setItem(key, '1'); } } catch { onHelp(); } } } }}><label className="text-sm font-medium">Design name<input autoFocus required maxLength={120} className="account-input mb-5" value={name} onChange={(e) => setName(e.target.value)} /></label><button disabled={busy} className="bg-teal-800 text-white px-5 py-3 rounded-lg w-full">{busy ? 'Creating…' : 'Create & open editor'}</button></form></Dialog>
    <Dialog open={editing !== null} onClose={() => setEditing(null)} title="Rename design"><form onSubmit={(e) => { e.preventDefault(); if (editing) mutate(editing,'rename'); }}><label className="text-sm">Design name<input autoFocus required maxLength={120} className="account-input mb-4" value={name} onChange={(e) => setName(e.target.value)} /></label><button disabled={changing} className="bg-teal-800 text-white rounded-lg px-4 py-2">Save name</button>{actionError && <p role="alert" className="text-red-700 mt-3">{actionError}</p>}</form></Dialog>
    <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title="Delete this design?"><p className="text-sm mb-5">“{deleting?.name}” will be removed from your account. Export a backup first if you want to keep a copy.</p><button disabled={changing} onClick={() => deleting && mutate(deleting,'delete')} className="bg-red-700 text-white px-4 py-2 rounded-lg">Delete design</button>{actionError && <p role="alert" className="text-red-700 mt-3">{actionError}</p>}</Dialog>
    <Dialog open={!!recoveryCode} onClose={() => {}} title="Save your recovery code"><p className="text-sm text-stone-600 mb-4">This code lets you reset your password. Keep it somewhere safe. It is shown once and gives access to your account.</p><code className="block p-4 bg-white border border-stone-300 rounded-lg break-all select-all">{recoveryCode}</code><div className="flex flex-wrap gap-3 mt-5"><button onClick={() => downloadFile(`OpenCLO account recovery\nEmail: ${user?.email}\nRecovery code: ${recoveryCode}\nKeep this private.\n`, 'openclo-recovery-code.txt', 'text/plain')} className="bg-teal-800 text-white rounded-lg px-4 py-2">Download code</button><button onClick={dismissRecovery} className="border border-stone-300 px-4 py-2 rounded-lg">I saved it safely</button></div></Dialog>
    <Dialog open={settings} onClose={() => setSettings(false)} title="Account settings"><p className="text-sm text-stone-600 mb-5">Signed in as {user?.email}. Password changes sign out your other devices.</p><form onSubmit={async (e) => { e.preventDefault(); setChanging(true); setPasswordMessage(''); try { await workspaceRequest('/auth/password','POST',{ currentPassword, password: newPassword }); setCurrentPassword(''); setNewPassword(''); setPasswordMessage('Password updated.'); } catch (failure) { setPasswordMessage((failure as Error).message); } finally { setChanging(false); } }} className="space-y-4"><label className="block text-sm">Current password<input required type="password" autoComplete="current-password" minLength={12} className="account-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label className="block text-sm">New password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} className="account-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><button disabled={changing} className="bg-teal-800 text-white px-4 py-2 rounded-lg">Change password</button><p role="status" className="text-sm">{passwordMessage}</p></form></Dialog>
    {patternImport && <PatternImportDialog onClose={() => setPatternImport(false)} />}
  </main>;
}
