import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Inbox, Search, X } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import '../management.css';

export function requestDashboardNavigation(run: () => void) {
  if (window.dispatchEvent(new CustomEvent('stagelink:before-navigation', { detail: run, cancelable: true }))) run();
}
export function useDraftGuard(dirty: boolean) {
  const [pending, setPending] = useState<{ run: () => void } | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: Event) => { event.preventDefault(); setPending({ run: (event as CustomEvent<() => void>).detail }); };
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('stagelink:before-navigation', guard);
    window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('stagelink:before-navigation', guard); window.removeEventListener('beforeunload', unload); };
  }, [dirty]);
  return pending && <ConfirmDialog title="Leave without saving?" confirm="Discard changes" onClose={() => setPending(null)} onConfirm={() => { const run = pending.run; setPending(null); run(); }}>Your latest edits are not saved. Go back to save them or use Save for later before leaving.</ConfirmDialog>;
}
export function Panel({ title, eyebrow, children, action, className = '' }: { title?: string; eyebrow?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`mg-panel ${className}`}>
    {(title || eyebrow) && <header className="mg-panel-head"><div>{eyebrow && <span className="sl-eyebrow">{eyebrow}</span>}{title && <h2>{title}</h2>}</div>{action}</header>}{children}
  </section>;
}
export function Badge({ value, children }: { value: string; children?: ReactNode }) { return <span className={`mg-badge mg-${value}`}><i />{children ?? value.replace(/_/g, ' ')}</span>; }
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) { return <div className="mg-empty"><Inbox size={27} /><h2>{title}</h2><p>{children}</p>{action}</div>; }
export function Notice({ children, error = false }: { children?: ReactNode; error?: boolean }) { return children ? <p className={error ? 'mg-error' : 'mg-notice'} role={error ? 'alert' : 'status'}>{children}</p> : null; }
export function SearchField({ value, onChange, label = 'Search', placeholder = 'Search…' }: { value: string; onChange: (value: string) => void; label?: string; placeholder?: string }) {
  return <label className="mg-search"><Search size={16} /><input aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>;
}
export function Stats({ values }: { values: { label: string; value: string | number; note?: string }[] }) {
  return <div className="mg-stats">{values.map((item, index) => <div className="mg-stat" key={item.label}><span>{item.label}<small>0{index + 1}</small></span><strong>{item.value}</strong>{item.note && <p>{item.note}</p>}</div>)}</div>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { const trigger = document.activeElement as HTMLElement; const dialog = ref.current!; dialog.showModal(); return () => { dialog.close(); trigger?.focus(); }; }, []);
  return <dialog ref={ref} className="mg-modal" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }}><header><h2 id={id}>{title}</h2><button className="mg-icon" aria-label="Close panel" onClick={onClose}><X size={18} /></button></header><div className="mg-modal-body">{children}</div></dialog>;
}
export function BackButton({ onClick, children = 'Back' }: { onClick: () => void; children?: ReactNode }) { return <button className="mg-back" onClick={onClick}><ArrowLeft size={15} />{children}</button>; }
export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/^[=+@\-]/, "'$&").replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
