import { Component, type ReactNode } from 'react';
import { useCloStore } from '../../store/useCloStore';
import { downloadFile } from '../../utils/download';

export class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="h-full bg-[#f4f2eb] text-stone-700 p-6 flex flex-col items-start justify-center gap-4"><h2 className="text-lg font-semibold">This view could not open</h2><p className="text-sm">The app may have updated or your connection was interrupted. Your design is still available. Save or download a backup, then reload.</p><button onClick={() => { const state = useCloStore.getState(); downloadFile(JSON.stringify(state.projects.find((p) => p.id === state.activeProjectId)), 'openclo-design-backup.json'); }} className="px-4 py-2 bg-teal-800 text-white rounded-lg">Download my design</button><button onClick={async () => { await useCloStore.getState().saveActiveProject(); if (useCloStore.getState().isSaved) window.location.reload(); }} className="underline text-sm">Save & reload</button></div>;
  }
}
