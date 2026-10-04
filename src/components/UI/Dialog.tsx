import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({ open, onClose, title, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) { dialog.showModal(); dialog.querySelector<HTMLInputElement>('input:not([type=hidden]):not([type=file])')?.focus(); }
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);
  return <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose} aria-label={title}
    className={`rounded-2xl bg-[#f7f6f2] text-stone-900 p-0 shadow-2xl border border-stone-300 max-h-[90dvh] ${wide ? 'w-[960px]' : 'w-[560px]'}`}>
    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 sticky top-0 bg-[#f7f6f2] z-10">
      <h2 className="text-xl font-semibold">{title}</h2><button onClick={onClose} aria-label="Close dialog" className="p-2 rounded-lg hover:bg-stone-200"><X size={20} /></button>
    </div>
    <div className="p-6">{children}</div>
  </dialog>;
}
