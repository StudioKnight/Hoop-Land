import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, ArrowRight, Database, ImagePlus, Search, ShieldAlert, X } from 'lucide-react';
import AdminTable from './components/AdminTable.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import ArchiveCard from './components/ArchiveCard.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import RecordForm from './components/RecordForm.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Viewer from './components/Viewer.jsx';
import { ArchiveWriteUnavailableError, createImage, deleteImage, getAdminSession, getImages, hasArchiveApi, loginAdmin, logoutAdmin, updateImage } from './services/dataService.js';

const pageTitles = {
  home: 'A living record of the game',
  gallery: 'Image archive',
  teams: 'Browse by team',
  seasons: 'Browse by season',
  conferences: 'Browse by conference',
  about: 'About the archive',
  admin: 'Archive overview',
  'admin/images': 'Image management',
  'admin/upload': 'Add to the archive',
  'admin/groups': 'Regroup records',
  'admin/settings': 'Archive settings',
};

function routeFromHash() {
  return window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'gallery';
}

function uniqueId(records) {
  let id;
  do {
    id = `nba-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  } while (records.some((record) => record.id === id));
  return id;
}

function ArchiveNotice() {
  return (
    <div className="backend-notice flex items-start gap-3 rounded-md border border-amber-line bg-amber-wash px-4 py-3.5">
      <ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-ink" />
      <p className="text-[11px] leading-5 text-amber-ink"><strong className="font-extrabold">Admin access is server-protected.</strong> The public collection is readable without signing in; record changes require an authenticated session.</p>
    </div>
  );
}

function EmptyState({ search, onClear }) {
  return (
    <div className="empty-state flex flex-col items-center rounded-md border border-dashed border-line-strong bg-white px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-wash text-muted"><Search size={19} /></span>
      <h3 className="text-[14px] font-extrabold text-ink">No records found</h3>
      <p className="mt-1 text-[11px] text-muted">{search ? 'Try a different search or clear your filters.' : 'There are no records in this view yet.'}</p>
      <button className="mt-4 text-[11px] font-bold text-green hover:underline" onClick={onClear}>Clear search and filters</button>
    </div>
  );
}

function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [records, setRecords] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ team: '', season: '', conference: '' });
  const [sort, setSort] = useState('newest');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('hoop-sidebar-collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [groupMode, setGroupMode] = useState('conference');
  const [adminSession, setAdminSession] = useState({ configured: false, authenticated: false, checking: true, error: '' });
  const [loggingIn, setLoggingIn] = useState(false);

  const isAdmin = route.startsWith('admin');
  const apiConfigured = hasArchiveApi;
  const title = pageTitles[route] ?? pageTitles.gallery;

  useEffect(() => {
    const onHashChange = () => {
      setRoute(routeFromHash());
      setMobileOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.location.hash = '/gallery';
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    getAdminSession()
      .then((session) => setAdminSession({ ...session, checking: false, error: '' }))
      .catch((error) => setAdminSession({ configured: true, authenticated: false, checking: false, error: error.message }));
  }, []);

  useEffect(() => {
    getImages()
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('The archive API must return a JSON array of image records.');
        setRecords(data);
      })
      .catch((error) => setLoadError(error.message || 'The archive could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(''), 5500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('input[type="search"]')?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const visibleRecords = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = records.filter((record) => {
      const matchesSearch = !needle || [record.team, record.season, record.conference, record.id, record.group]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(needle));
      return matchesSearch
        && (!filters.team || record.team === filters.team)
        && (!filters.season || record.season === filters.season)
        && (!filters.conference || record.conference === filters.conference);
    });
    return filtered.sort((a, b) => {
      if (sort === 'team') return a.team.localeCompare(b.team);
      const comparison = a.season.localeCompare(b.season);
      return sort === 'oldest' ? comparison : -comparison;
    });
  }, [records, query, filters, sort]);

  const facets = useMemo(() => ({
    team: [...new Set(records.map((record) => record.team))].sort(),
    season: [...new Set(records.map((record) => record.season))].sort(),
    conference: [...new Set(records.map((record) => record.conference))].sort(),
  }), [records]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearSearchAndFilters() {
    setQuery('');
    setFilters({ team: '', season: '', conference: '' });
  }

  function toggleSidebar() {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => {
      localStorage.setItem('hoop-sidebar-collapsed', String(!collapsed));
      return !collapsed;
    });
  }

  async function saveRecord(record, imageFile, existingId = null) {
    const nextRecord = { ...record, id: record.id || uniqueId(records) };
    const duplicate = records.some((item) => item.id === nextRecord.id && item.id !== existingId);
    if (duplicate) {
      setMessage(`ID "${nextRecord.id}" is already in use.`);
      return;
    }
    setSaving(true);
    try {
      const saved = existingId
        ? await updateImage(existingId, nextRecord, imageFile)
        : await createImage(nextRecord, imageFile);
      if (saved) setRecords((current) => existingId
        ? current.map((item) => item.id === existingId ? saved : item)
        : [saved, ...current]);
      else setRecords(await getImages());
      setEditing(null);
      setMessage('Record saved.');
    } catch (error) {
      setMessage(error instanceof ArchiveWriteUnavailableError ? error.message : `Save failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteImage(pendingDelete.id);
      setRecords((current) => current.filter((item) => item.id !== pendingDelete.id));
      setMessage('Record deleted.');
    } catch (error) {
      setMessage(error instanceof ArchiveWriteUnavailableError ? error.message : `Delete failed: ${error.message}`);
    } finally {
      setPendingDelete(null);
    }
  }

  async function regroupRecord(record, group) {
    try {
      const updated = await updateImage(record.id, { ...record, group });
      setRecords((current) => current.map((item) => item.id === record.id ? updated : item));
      setMessage('Record regrouped.');
    } catch (error) {
      setMessage(error instanceof ArchiveWriteUnavailableError ? error.message : `Regroup failed: ${error.message}`);
    }
  }

  async function signIn(password) {
    setLoggingIn(true);
    try {
      const session = await loginAdmin(password);
      setAdminSession({ ...session, checking: false, error: '' });
      setMessage('Signed in to the archive.');
    } catch (error) {
      setAdminSession((current) => ({ ...current, error: error.message }));
    } finally {
      setLoggingIn(false);
    }
  }

  async function signOut() {
    try {
      await logoutAdmin();
      setAdminSession((current) => ({ ...current, authenticated: false }));
      setEditing(null);
      setPendingDelete(null);
      setMessage('Signed out.');
    } catch (error) {
      setMessage(`Sign out failed: ${error.message}`);
    }
  }

  const clearAll = () => {
    clearSearchAndFilters();
    setMessage('');
  };

  const groupOptions = [...new Set(records.map((record) => record[groupMode]).filter(Boolean))].sort();
  const groupLabels = { team: 'Team', season: 'Season', conference: 'Conference', group: 'Collection' };

  return (
    <div className="app-shell min-h-screen bg-canvas text-ink">
      <div className="app-layout flex min-h-screen">
        <Sidebar
          route={route}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onToggle={toggleSidebar}
          onClose={() => setMobileOpen(false)}
        />
        <div className="min-w-0 flex-1">
          <Topbar
            title={title}
            isAdmin={isAdmin}
            authenticated={adminSession.authenticated}
            onLogout={signOut}
            query={query}
            onQueryChange={setQuery}
            onMenuClick={toggleSidebar}
            mobileOpen={mobileOpen}
          />
          <main className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-6 sm:px-6 md:px-8 md:pt-8">
            <div className="mobile-search mb-4 sm:hidden">
              <label className="top-search flex items-center gap-2 rounded-md border border-line bg-white px-3">
                <Search size={16} className="shrink-0 text-muted" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team, season, ID..." aria-label="Search images" className="h-10 min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted" />
              </label>
            </div>
            {isAdmin && <ArchiveNotice />}
            {message && (
              <div role="status" className="toast-note mt-4 flex items-start justify-between gap-3 rounded-md border border-line-strong bg-white px-4 py-3 text-[11px] text-ink shadow-sm">
                <span>{message}</span><button className="icon-button-small" aria-label="Dismiss message" onClick={() => setMessage('')}><X size={14} /></button>
              </div>
            )}
            {loadError ? (
              <div role="alert" className="mt-8 rounded-md border border-red-200 bg-red-50 p-5 text-[12px] text-red-800">Unable to load archive: {loadError}</div>
            ) : loading ? (
              <div className="py-24 text-center text-[12px] text-muted">Loading archive...</div>
            ) : (
              <>
                {!isAdmin && (
                  <>
                    <section className="archive-heading mb-6 flex flex-col justify-between gap-5 border-b border-line pb-6 lg:flex-row lg:items-end">
                      <div>
                        <div className="eyebrow mb-3"><span className="eyebrow-mark" /> THE GAME, IN FRAMES</div>
                        <h2 className="max-w-3xl text-[26px] font-extrabold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[34px]">{route === 'about' ? 'Built to keep the details.' : 'Every season leaves a trace.'}</h2>
                        <p className="mt-3 max-w-[560px] text-[12px] leading-6 text-muted sm:text-[13px]">{route === 'about' ? 'A browsable record of basketball history, organized by the teams and seasons that shaped it.' : 'A growing visual record of teams, seasons, and the moments that connect them.'}</p>
                      </div>
                      <div className="archive-counter flex items-end gap-4 self-start lg:self-auto">
                        <div><span className="counter-value">{String(records.length).padStart(2, '0')}</span><span className="counter-label">RECORDS</span></div>
                        <span className="counter-divider" />
                        <div><span className="counter-value">{String(facets.season.length).padStart(2, '0')}</span><span className="counter-label">SEASONS</span></div>
                        <span className="counter-divider" />
                        <div><span className="counter-value">{String(facets.team.length).padStart(2, '0')}</span><span className="counter-label">TEAMS</span></div>
                      </div>
                    </section>
                    {['teams', 'seasons', 'conferences'].includes(route) && (
                      <section className="facet-strip mb-5 flex flex-wrap items-center gap-2" aria-label={`${route} in archive`}>
                        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Browse {route}</span>
                        {facets[route === 'teams' ? 'team' : route === 'seasons' ? 'season' : 'conference'].map((facet) => {
                          const key = route === 'teams' ? 'team' : route === 'seasons' ? 'season' : 'conference';
                          return <button key={facet} onClick={() => updateFilter(key, filters[key] === facet ? '' : facet)} className={`facet-chip ${filters[key] === facet ? 'facet-chip-active' : ''}`}>{facet}</button>;
                        })}
                        {facets[route === 'teams' ? 'team' : route === 'seasons' ? 'season' : 'conference'].length === 0 && <span className="text-[11px] text-muted">Nothing here yet.</span>}
                      </section>
                    )}
                    <FilterPanel records={records} filters={filters} onFilter={updateFilter} sort={sort} onSort={setSort} onClear={clearAll} />
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-muted"><strong className="font-extrabold text-ink">{visibleRecords.length}</strong> records <span className="mx-1.5 text-line-strong">/</span> {filters.team || filters.season || filters.conference ? 'filtered selection' : 'full collection'}</p>
                      <a href="#/admin" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted transition hover:text-green">Collection notes <ArrowRight size={13} /></a>
                    </div>
                    {visibleRecords.length ? (
                      <section className="gallery-grid mt-4" aria-label="Image archive records">
                        {visibleRecords.map((record) => <ArchiveCard key={record.id} record={record} onOpen={setSelected} />)}
                      </section>
                    ) : <div className="mt-4"><EmptyState search={query} onClear={clearAll} /></div>}
                  </>
                )}

                {isAdmin && !adminSession.authenticated && (
                  adminSession.checking
                    ? <p className="mt-12 text-center text-[12px] text-muted">Checking admin session...</p>
                    : <AdminLogin configured={adminSession.configured} error={adminSession.error} onLogin={signIn} saving={loggingIn} />
                )}

                {adminSession.authenticated && route === 'admin' && (
                  <>
                    <div className="admin-intro mb-6 mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                      <div><div className="eyebrow mb-2"><span className="eyebrow-mark" /> COLLECTION CONTROL</div><h2 className="text-[23px] font-extrabold tracking-[-0.02em]">Dashboard</h2><p className="mt-1 text-[11px] text-muted">A quick read on the archive as it stands.</p></div>
                      <a href="#/admin/upload" className="button-primary inline-flex min-h-10 items-center justify-center gap-2 px-4 text-[11px] font-bold"><ImagePlus size={15} /> Add a record</a>
                    </div>
                    <div className="stats-grid mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <StatCard label="Total records" value={records.length} icon={<Database size={17} />} detail="Images in the collection" />
                      <StatCard label="Teams" value={facets.team.length} icon={<span className="text-[15px]">T</span>} detail="Distinct team records" />
                      <StatCard label="Seasons" value={facets.season.length} icon={<ArrowDownUp size={16} />} detail="Coverage across seasons" />
                      <StatCard label="Conferences" value={facets.conference.length} icon={<span className="text-[15px]">C</span>} detail="Conference categories" />
                    </div>
                    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                      <section><div className="mb-3 flex items-center justify-between"><h3 className="text-[13px] font-extrabold">Recently catalogued</h3><a href="#/admin/images" className="text-[10px] font-bold text-green">View all →</a></div><AdminTable records={records.slice(0, 5)} onView={setSelected} onEdit={setEditing} onDelete={setPendingDelete} /></section>
                      <section className="dashboard-aside rounded-md border border-line bg-white p-5"><span className="eyebrow"><span className="eyebrow-mark" /> COLLECTION NOTE</span><h3 className="mt-4 text-[18px] font-extrabold leading-tight">One archive.<br />Many ways in.</h3><p className="mt-3 text-[11px] leading-5 text-muted">Records keep their original image path. Team, season, conference, and collection are metadata, so reorganizing never duplicates a file.</p><a href="#/admin/groups" className="mt-5 inline-flex items-center gap-2 text-[11px] font-extrabold text-green">Review groupings <ArrowRight size={14} /></a></section>
                    </div>
                  </>
                )}

                {adminSession.authenticated && route === 'admin/images' && (
                  <section className="mt-6">
                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="eyebrow mb-2"><span className="eyebrow-mark" /> CATALOGUE</div><h2 className="text-[22px] font-extrabold">All image records</h2></div><a href="#/admin/upload" className="button-primary inline-flex min-h-9 items-center justify-center gap-2 px-3 text-[10px] font-bold"><ImagePlus size={14} /> Add record</a></div>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><label className="top-search flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-white px-3"><Search size={15} className="text-muted" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team, season, conference, ID..." aria-label="Search records" className="h-10 min-w-0 flex-1 bg-transparent text-[11px] outline-none" /></label><select aria-label="Filter by season" value={filters.season} onChange={(event) => updateFilter('season', event.target.value)} className="admin-filter"><option value="">All seasons</option>{facets.season.map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter by conference" value={filters.conference} onChange={(event) => updateFilter('conference', event.target.value)} className="admin-filter"><option value="">All conferences</option>{facets.conference.map((value) => <option key={value}>{value}</option>)}</select></div>
                    <AdminTable records={visibleRecords} onView={setSelected} onEdit={setEditing} onDelete={setPendingDelete} />
                  </section>
                )}

                {adminSession.authenticated && route === 'admin/upload' && (
                  <section className="mx-auto mt-6 max-w-4xl">
                    <div className="mb-5"><div className="eyebrow mb-2"><span className="eyebrow-mark" /> CATALOGUE</div><h2 className="text-[22px] font-extrabold">New image record</h2><p className="mt-1 text-[11px] text-muted">Add metadata and keep the source image at its original resolution.</p></div>
                    <div className="rounded-md border border-line bg-white p-4 sm:p-6"><RecordForm onSubmit={(record, file) => saveRecord(record, file)} saving={saving} apiConfigured={apiConfigured} /></div>
                  </section>
                )}

                {adminSession.authenticated && route === 'admin/groups' && (
                  <section className="mt-6">
                    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow mb-2"><span className="eyebrow-mark" /> RECORD ORGANIZATION</div><h2 className="text-[22px] font-extrabold">Regroup without duplication</h2><p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted">Change a record’s collection metadata. The image path stays the same, and each record remains available through every other filter.</p></div><label className="filter-select w-full sm:w-52"><span>View groups by</span><select value={groupMode} onChange={(event) => setGroupMode(event.target.value)}>{['conference', 'season', 'team', 'group'].map((key) => <option key={key} value={key}>{groupLabels[key]}</option>)}</select></label></div>
                    <div className="mb-4 flex flex-wrap gap-2">{groupOptions.map((option) => <span className="facet-chip facet-chip-static" key={option}>{option}<span className="ml-1 font-mono text-[9px]">{records.filter((record) => record[groupMode] === option).length}</span></span>)}</div>
                    <div className="overflow-hidden rounded-md border border-line bg-white"><div className="divide-y divide-line">{records.map((record) => <div key={record.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:px-4"><img src={record.image} alt={`${record.team} thumbnail`} className="h-12 w-16 rounded-sm bg-wash object-contain" loading="lazy" /><div className="min-w-0 flex-1"><h3 className="truncate text-[11px] font-extrabold">{record.team}</h3><p className="mt-1 truncate font-mono text-[9px] text-muted">{record.id} · {record.season} · {record.conference}</p></div><div className="flex items-center gap-2"><label className="text-[10px] text-muted" htmlFor={`group-${record.id}`}>Collection</label><input key={`${record.id}-${record.group}`} id={`group-${record.id}`} defaultValue={record.group || 'NBA'} onBlur={(event) => event.target.value.trim() && event.target.value !== record.group && regroupRecord(record, event.target.value.trim())} className="group-input" aria-label={`Collection for ${record.team}`} /></div></div>)}</div></div>
                  </section>
                )}

                {adminSession.authenticated && route === 'admin/settings' && (
                  <section className="mx-auto mt-6 max-w-3xl"><div className="mb-5"><div className="eyebrow mb-2"><span className="eyebrow-mark" /> CONFIGURATION</div><h2 className="text-[22px] font-extrabold">Archive settings</h2><p className="mt-1 text-[11px] text-muted">Current storage and API connection status.</p></div><div className="overflow-hidden rounded-md border border-line bg-white"><SettingRow label="Record source" value={apiConfigured ? 'Configured archive API' : 'Bundled JSON · read-only'} /><SettingRow label="Image handling" value="Original source path · no browser resizing" /><SettingRow label="Admin writes" value={apiConfigured ? 'Requests sent to configured API' : 'Unavailable without a writable backend'} /><SettingRow label="Sidebar preference" value="Stored locally on this device" /></div><p className="mt-4 text-[10px] leading-5 text-muted">The API URL is supplied as a build-time environment variable. Authorization, ID uniqueness, file validation, and storage permissions must be enforced by the server.</p></section>
                )}
              </>
            )}
          </main>
          <footer className="page-footer flex flex-col justify-between gap-2 border-t border-line px-4 py-4 text-[9px] text-muted sm:flex-row sm:items-center md:px-8"><span>HOOP LAND ARCHIVE <span className="mx-1 text-line-strong">/</span> A RECORD OF THE GAME</span><span>{isAdmin ? 'ADMINISTRATIVE INTERFACE' : 'PUBLIC COLLECTION'} · ORIGINAL IMAGES REMAIN UNCHANGED</span></footer>
        </div>
      </div>

      <Viewer record={selected} onClose={() => setSelected(null)} />
      {editing && (
        <div className="viewer-backdrop fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="edit-title" className="w-full max-w-3xl rounded-md bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3"><div><span className="eyebrow"><span className="eyebrow-mark" /> EDIT RECORD</span><h2 id="edit-title" className="mt-2 text-[19px] font-extrabold">{editing.team}</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Close edit form"><X size={18} /></button></div>
            <RecordForm existing={editing} onSubmit={(record, file) => saveRecord(record, file, editing.id)} onCancel={() => setEditing(null)} saving={saving} apiConfigured={apiConfigured} />
          </section>
        </div>
      )}
      {pendingDelete && (
        <div className="viewer-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPendingDelete(null)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-md bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-700"><ShieldAlert size={19} /></div>
            <h2 id="delete-title" className="text-[17px] font-extrabold">Delete this record?</h2>
            <p className="mt-2 text-[11px] leading-5 text-muted">This will remove <strong className="text-ink">{pendingDelete.team} · {pendingDelete.season}</strong> from the archive. The image file is only removed by the storage service when it is no longer referenced.</p>
            {!apiConfigured && <p className="mt-3 rounded-sm bg-amber-wash p-3 text-[10px] leading-5 text-amber-ink">Read-only mode is active. The record cannot be deleted until a writable API is configured.</p>}
            <div className="mt-6 flex justify-end gap-2"><button className="button-secondary min-h-10 px-4 text-[11px] font-bold" onClick={() => setPendingDelete(null)}>Keep record</button><button className="button-danger min-h-10 px-4 text-[11px] font-bold" onClick={confirmDelete}>Delete record</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, detail }) {
  return <article className="stat-card rounded-md border border-line bg-white p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</span><span className="text-green">{icon}</span></div><strong className="mt-4 block text-[27px] font-extrabold leading-none">{String(value).padStart(2, '0')}</strong><span className="mt-2 block text-[10px] text-muted">{detail}</span></article>;
}

function SettingRow({ label, value }) {
  return <div className="flex flex-col gap-1 border-b border-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"><span className="text-[11px] text-muted">{label}</span><span className="text-[11px] font-bold text-ink">{value}</span></div>;
}

export default App;