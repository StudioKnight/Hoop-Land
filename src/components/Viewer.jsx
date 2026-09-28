import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';

export default function Viewer({ record, onClose }) {
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  if (!record) return null;
  return (
    <div className="viewer-backdrop fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="viewer-panel relative grid max-h-[94vh] w-full max-w-6xl overflow-auto rounded-md bg-white shadow-2xl md:grid-cols-[minmax(0,1fr)_300px]" role="dialog" aria-modal="true" aria-labelledby="viewer-title">
        <button className="icon-button absolute right-3 top-3 z-10 bg-white/90 shadow-sm md:hidden" onClick={onClose} aria-label="Close image details">
          <X size={19} />
        </button>
        <div className="viewer-image-wrap flex min-h-[38vh] items-center justify-center bg-[#101815] p-2 sm:min-h-[55vh] md:min-h-[72vh] md:p-5">
          <img src={record.image} alt={`${record.team} ${record.season} ${record.conference}`} className="max-h-[78vh] max-w-full object-contain" />
        </div>
        <aside className="flex flex-col p-5 sm:p-7">
          <div className="mb-8 hidden items-center justify-between md:flex">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Archive record</span>
            <button className="icon-button" onClick={onClose} aria-label="Close image details"><X size={19} /></button>
          </div>
          <span className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-green">{record.group || 'NBA'} · {record.season}</span>
          <h2 id="viewer-title" className="text-2xl font-extrabold leading-tight text-ink">{record.team}</h2>
          <p className="mt-2 text-[13px] text-muted">{record.conference}</p>
          {record.description && <p className="mt-6 text-[13px] leading-6 text-muted">{record.description}</p>}
          <dl className="mt-8 divide-y divide-line border-y border-line">
            <div className="flex justify-between gap-4 py-3"><dt className="text-[11px] text-muted">Season</dt><dd className="text-[11px] font-bold text-ink">{record.season}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-[11px] text-muted">Conference</dt><dd className="text-right text-[11px] font-bold text-ink">{record.conference}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-[11px] text-muted">Record ID</dt><dd className="font-mono text-[10px] text-ink">{record.id}</dd></div>
          </dl>
          <a href={record.image} target="_blank" rel="noreferrer" className="button-primary mt-auto inline-flex min-h-11 items-center justify-center gap-2 px-4 text-[12px] font-bold">
            Open original <ExternalLink size={15} />
          </a>
          <p className="mt-3 text-center text-[10px] text-muted">Original file · displayed without resizing</p>
        </aside>
      </section>
    </div>
  );
}