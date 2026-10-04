import { create } from 'zustand';
import type { CloProject } from '../types/cad';
import { normalizeProject, parseProjectBackup } from '../utils/projectData';
import { setProjectPersistence, useCloStore } from './useCloStore';

export interface WorkspaceUser { id: string; name: string; email: string }
export interface DesignSummary { id: string; name: string; templateId: string; color: string; updated_at: number; version: number }
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function workspaceRequest<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  let response: Response;
  const expectedAccount = !path.startsWith('/auth/login') && !path.startsWith('/auth/register') && !path.startsWith('/auth/recover') && !path.startsWith('/auth/me') ? useWorkspaceStore.getState().user?.id : null;
  try { response = await fetch('/api' + path, { method, credentials: 'same-origin',
    headers: { ...(data === undefined ? {} : { 'Content-Type': data instanceof Blob ? 'application/octet-stream' : 'application/json' }), ...(expectedAccount ? { 'X-OpenCLO-Account': expectedAccount } : {}) }, body: data === undefined ? undefined : data instanceof Blob ? data : JSON.stringify(data) }); }
  catch { throw new ApiError(0, 'Cannot reach the server. Check your connection and retry. Your edits are still here.'); }
  const payload = await response.json().catch(() => null);
  if (!response.ok && expectedAccount && (response.status === 401 || payload?.error?.message?.includes('account changed'))) useWorkspaceStore.setState({ needsReauthentication: true });
  if (!response.ok) throw new ApiError(response.status, payload?.error?.message || 'The server could not complete this action. Try again.');
  return payload as T;
}
const savedProjects = new Map<string, { version: number; project: CloProject }>();
let saveQueue = Promise.resolve();
let accountGeneration = 0;
interface WorkspaceState {
  user: WorkspaceUser | null;
  status: 'checking' | 'signed-out' | 'signed-in' | 'unavailable';
  designs: DesignSummary[];
  page: 'workspace' | 'editor';
  busy: boolean;
  error: string | null;
  recoveryCode: string | null;
  legacyCount: number;
  needsReauthentication: boolean;
  reauthenticate: (password: string) => Promise<boolean>;
  initialize: () => Promise<void>;
  authenticate: (mode: 'login' | 'register' | 'recover', data: Record<string, string>) => Promise<boolean>;
  refreshDesigns: () => Promise<void>;
  openDesign: (id: string) => Promise<void>;
  createDesign: (name: string, templateId: string) => Promise<void>;
  returnToWorkspace: () => Promise<void>;
  signOut: () => Promise<void>;
  importLegacy: () => Promise<void>;
  dismissRecovery: () => void;
}
function legacyProjects() {
  try { const raw = localStorage.getItem('openclo_projects_v2'); return raw ? parseProjectBackup(raw) : []; }
  catch { return []; }
}
export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  async function enterAccount(user: WorkspaceUser, recoveryCode: string | null = null) {
    accountGeneration++; savedProjects.clear();
    useCloStore.getState().replaceWorkspace([]);
    set({ user, status: 'signed-in', page: 'workspace', error: null, recoveryCode,
      legacyCount: legacyProjects().length, designs: [], needsReauthentication: false });
    await get().refreshDesigns();
  }
  return {
    user: null, status: 'checking', designs: [], page: 'workspace', busy: false, error: null, recoveryCode: null, legacyCount: 0, needsReauthentication: false,
    reauthenticate: async (password) => {
      set({ busy: true, error: null });
      try {
        const original = get().user;
        const result = await workspaceRequest<{ user: WorkspaceUser }>('/auth/login', 'POST', { email: original?.email, password });
        if (result.user.id !== original?.id) throw new Error('Sign in to the account that owns this design.');
        set({ needsReauthentication: false });
        await useCloStore.getState().saveActiveProject();
        return true;
      } catch (error) { set({ error: (error as Error).message }); return false; }
      finally { set({ busy: false }); }
    },
    initialize: async () => {
      set({ status: 'checking', error: null });
      try { const response = await workspaceRequest<{ user: WorkspaceUser }>('/auth/me'); await enterAccount(response.user); }
      catch (error) { set({ status: error instanceof ApiError && error.status === 401 ? 'signed-out' : 'unavailable', error: error instanceof ApiError && error.status === 401 ? null : (error as Error).message }); }
    },
    authenticate: async (mode, data) => {
      if (get().busy) return false;
      set({ busy: true, error: null });
      try { const response = await workspaceRequest<{ user: WorkspaceUser; recoveryCode?: string }>('/auth/' + mode, 'POST', data);
        await enterAccount(response.user, response.recoveryCode || null); return true;
      } catch (error) { set({ error: (error as Error).message }); return false; }
      finally { set({ busy: false }); }
    },
    refreshDesigns: async () => {
      const generation = accountGeneration;
      const first = await workspaceRequest<{ items: DesignSummary[]; total: number }>('/projects');
      const second = first.total > 50 ? await workspaceRequest<{ items: DesignSummary[] }>('/projects?offset=50') : { items: [] };
      if (generation === accountGeneration) {
        const items = [...first.items, ...second.items];
        const versions = new Map(items.map((item) => [item.id, item.version]));
        for (const [id, saved] of savedProjects) if (versions.get(id) !== saved.version) savedProjects.delete(id);
        set({ designs: items });
      }
    },
    openDesign: async (id) => {
      if (get().busy) return;
      const generation = accountGeneration;
      set({ busy: true, error: null });
      try {
        if (get().page === 'editor') {
          await useCloStore.getState().saveActiveProject();
          if (!useCloStore.getState().isSaved) throw new Error('Save or download a backup of your current edits before changing designs.');
        }
        const { project: value, version } = await workspaceRequest<{ project: unknown; version: number }>('/projects/' + encodeURIComponent(id));
        if (generation !== accountGeneration) return;
        const project = normalizeProject(value); savedProjects.set(project.id, { project, version });
        const others = useCloStore.getState().projects.filter((p) => p.id !== id && savedProjects.has(p.id));
        useCloStore.getState().replaceWorkspace([project, ...others]);
        set({ page: 'editor' });
      } catch (error) { set({ error: (error as Error).message }); }
      finally { set({ busy: false }); }
    },
    createDesign: async (name, templateId) => {
      if (get().busy) return;
      set({ busy: true, error: null });
      try {
        const existing = useCloStore.getState().projects.filter((p) => savedProjects.has(p.id));
        // Empty accounts start with a template preview, which is replaced on explicit creation.
        useCloStore.setState({ projects: existing });
        useCloStore.getState().createNewProject(name, templateId);
        set({ page: 'editor' });
        await useCloStore.getState().saveActiveProject();
      } catch (error) { set({ error: (error as Error).message }); }
      finally { set({ busy: false }); }
    },
    returnToWorkspace: async () => {
      await useCloStore.getState().saveActiveProject();
      if (!useCloStore.getState().isSaved) { set({ error: 'Your edits are not saved yet. Retry Save or download a backup before leaving the editor.' }); return; }
      try { await get().refreshDesigns(); set({ page: 'workspace', error: null }); }
      catch (error) { set({ error: (error as Error).message }); }
    },
    signOut: async () => {
      set({ busy: true, error: null });
      try {
        if (get().page === 'editor') {
          await useCloStore.getState().saveActiveProject();
          if (!useCloStore.getState().isSaved) throw new Error('Save your edits or download a backup before signing out.');
        }
        await workspaceRequest('/auth/logout', 'POST', {});
        accountGeneration++; savedProjects.clear();
        useCloStore.getState().replaceWorkspace([]);
        set({ user: null, status: 'signed-out', page: 'workspace', designs: [], recoveryCode: null });
      } catch (error) { set({ error: (error as Error).message }); }
      finally { set({ busy: false }); }
    },
    importLegacy: async () => {
      try {
        const legacy = legacyProjects();
        if (!legacy.length) throw new Error('No readable browser designs were found. Use Import backup to recover a saved JSON file.');
        useCloStore.setState({ projects: useCloStore.getState().projects.filter((p) => savedProjects.has(p.id)) });
        useCloStore.getState().importProjectsData(legacy);
        set({ page: 'editor', legacyCount: 0 });
        await useCloStore.getState().saveActiveProject();
      } catch (error) { set({ error: (error as Error).message }); }
    },
    dismissRecovery: () => set({ recoveryCode: null }),
  };
});
setProjectPersistence((projects) => {
  const generation = accountGeneration;
  const account = useWorkspaceStore.getState().user;
  const run = async () => {
    if (!account || generation !== accountGeneration) throw new Error('Sign in again before saving your design.');
    const currentIds = new Set(projects.map((p) => p.id));
    const upserts = projects.filter((project) => savedProjects.get(project.id)?.project !== project)
      .map((project) => ({ project, version: savedProjects.get(project.id)?.version || 0 }));
    const deletes = [...savedProjects].filter(([id]) => !currentIds.has(id)).map(([id, saved]) => ({ id, version: saved.version }));
    if (!upserts.length && !deletes.length) return;
    const result = await workspaceRequest<{ saved: { id: string; version: number }[] }>('/projects/batch', 'POST', { upserts, deletes });
    if (generation !== accountGeneration) return;
    const byId = new Map(upserts.map((item) => [item.project.id, item.project]));
    for (const saved of result.saved) savedProjects.set(saved.id, { version: saved.version, project: byId.get(saved.id)! });
    for (const item of deletes) savedProjects.delete(item.id);
  };
  const task = saveQueue.catch(() => {}).then(run);
  saveQueue = task;
  return task;
});
