import { Eye, Pencil, Trash2 } from 'lucide-react';

export default function AdminTable({ records, onView, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="admin-table w-full min-w-[760px] text-left">
          <thead><tr><th>ID</th><th>Image</th><th>Team</th><th>Season</th><th>Conference</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td className="font-mono text-[10px] text-muted">{record.id}</td>
                <td><img src={record.image} alt={`${record.team} thumbnail`} className="h-11 w-16 rounded-sm bg-wash object-contain" loading="lazy" /></td>
                <td className="font-bold text-ink">{record.team}</td>
                <td>{record.season}</td>
                <td>{record.conference}</td>
                <td><div className="flex justify-end gap-1">
                  <button className="table-action" onClick={() => onView(record)} title="View" aria-label={`View ${record.team}`}><Eye size={15} /></button>
                  <button className="table-action" onClick={() => onEdit(record)} title="Edit" aria-label={`Edit ${record.team}`}><Pencil size={15} /></button>
                  <button className="table-action table-action-danger" onClick={() => onDelete(record)} title="Delete" aria-label={`Delete ${record.team}`}><Trash2 size={15} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-line md:hidden">
        {records.map((record) => (
          <article key={record.id} className="flex gap-3 p-4">
            <img src={record.image} alt={`${record.team} thumbnail`} className="h-20 w-[92px] shrink-0 rounded-sm bg-wash object-contain" loading="lazy" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2"><h3 className="truncate text-[12px] font-extrabold text-ink">{record.team}</h3><span className="season-chip">{record.season}</span></div>
              <p className="mt-1 truncate text-[10px] text-muted">{record.conference}</p>
              <p className="mt-1 truncate font-mono text-[9px] text-muted">{record.id}</p>
              <div className="mt-2 flex gap-1">
                <button className="table-action" onClick={() => onView(record)} aria-label={`View ${record.team}`}><Eye size={14} /></button>
                <button className="table-action" onClick={() => onEdit(record)} aria-label={`Edit ${record.team}`}><Pencil size={14} /></button>
                <button className="table-action table-action-danger" onClick={() => onDelete(record)} aria-label={`Delete ${record.team}`}><Trash2 size={14} /></button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {records.length === 0 && <p className="px-5 py-12 text-center text-[12px] text-muted">No records match your search.</p>}
    </div>
  );
}