import { LogOut, Menu, Search, ShieldCheck, X } from 'lucide-react';

export default function Topbar({ title, isAdmin, authenticated, onLogout, query, onQueryChange, onMenuClick, mobileOpen }) {
  return (
    <header className="topbar sticky top-0 z-30 flex min-h-[76px] items-center gap-3 border-b border-line bg-paper/95 px-4 backdrop-blur md:px-8">
      <button className="icon-button lg:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={onMenuClick}>
        {mobileOpen ? <X size={19} /> : <Menu size={20} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="crumbline hidden text-[10px] font-bold uppercase tracking-[0.14em] text-muted sm:block">
          HOOP LAND <span className="mx-2 text-line-strong">/</span> {isAdmin ? 'ADMIN' : 'PUBLIC'}
        </div>
        <h1 className="truncate text-[16px] font-bold text-ink md:text-[18px]">{title}</h1>
      </div>
      {!isAdmin && (
        <label className="top-search hidden w-[min(34vw,340px)] items-center gap-2.5 rounded-md border border-line bg-white px-3 transition focus-within:border-green focus-within:ring-2 focus-within:ring-green/10 sm:flex">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search the archive..."
            aria-label="Search images"
            className="h-10 min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-muted"
          />
          <kbd className="hidden font-mono text-[10px] text-muted lg:inline">⌘ K</kbd>
        </label>
      )}
      {isAdmin && authenticated && <>
        <span className="hidden items-center gap-2 rounded-full border border-green/20 bg-green/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-green sm:inline-flex"><ShieldCheck size={14} /> Admin view</span>
        <button className="icon-button" onClick={onLogout} aria-label="Sign out of admin" title="Sign out"><LogOut size={16} /></button>
      </>}
    </header>
  );
}