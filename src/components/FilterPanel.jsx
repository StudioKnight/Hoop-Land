import { RotateCcw, SlidersHorizontal } from 'lucide-react';

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="filter-select min-w-0 flex-1">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
    </label>
  );
}

export default function FilterPanel({ records, filters, onFilter, sort, onSort, onClear }) {
  const unique = (key) => [...new Set(records.map((record) => record[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const activeCount = Object.values(filters).filter(Boolean).length;
  return (
    <section className="filter-panel rounded-md border border-line bg-white px-4 py-4 sm:px-5" aria-label="Filter archive">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink">
          <SlidersHorizontal size={15} className="text-green" /> Refine archive
          {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </div>
        {activeCount > 0 && (
          <button className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted transition hover:text-green" onClick={onClear}>
            <RotateCcw size={13} /> Clear filters
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SelectFilter label="Season" value={filters.season} options={unique('season')} onChange={(value) => onFilter('season', value)} />
        <SelectFilter label="Conference" value={filters.conference} options={unique('conference')} onChange={(value) => onFilter('conference', value)} />
        <SelectFilter label="Team" value={filters.team} options={unique('team')} onChange={(value) => onFilter('team', value)} />
        <label className="filter-select min-w-0 flex-1 sm:max-w-[170px]">
          <span>Sort by</span>
          <select value={sort} onChange={(event) => onSort(event.target.value)}>
            <option value="newest">Season · newest</option>
            <option value="oldest">Season · oldest</option>
            <option value="team">Team · A–Z</option>
          </select>
        </label>
      </div>
    </section>
  );
}