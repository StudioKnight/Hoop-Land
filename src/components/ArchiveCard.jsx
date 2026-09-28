import { ArrowUpRight, Eye } from 'lucide-react';

export default function ArchiveCard({ record, onOpen }) {
  return (
    <article className="archive-card group min-w-0 overflow-hidden rounded-md border border-line bg-white transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_14px_35px_rgba(22,45,34,0.09)]">
      <div className="image-frame relative">
        <button className="image-open absolute inset-0 z-[1] cursor-zoom-in" onClick={() => onOpen(record)} aria-label={`View details for ${record.team}, ${record.season}`} />
        <img
          src={record.image}
          alt={`${record.team} ${record.season} ${record.conference}`}
          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.025]"
          loading="lazy"
        />
        <span className="image-count absolute left-3 top-3 z-[2]">{record.group || 'NBA'}</span>
        <span className="image-hover absolute bottom-3 right-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-paper text-ink opacity-0 shadow-sm transition group-hover:opacity-100">
          <Eye size={15} />
        </span>
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-[14px] font-extrabold leading-snug text-ink">{record.team}</h2>
          <span className="season-chip shrink-0">{record.season}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="truncate text-[11px] text-muted">{record.conference}</span>
          <button className="icon-button-small relative z-[2]" onClick={() => onOpen(record)} aria-label={`View ${record.team} details`} title="View record">
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="mt-2 truncate font-mono text-[9px] text-muted">ID / {record.id}</div>
      </div>
    </article>
  );
}