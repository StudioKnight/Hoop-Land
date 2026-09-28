import {
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Gauge,
  Grid2X2,
  Layers3,
  LayoutDashboard,
  Settings2,
  Tags,
  Upload,
  UsersRound,
  X,
} from 'lucide-react';

const publicLinks = [
  { label: 'Home', path: 'home', icon: LayoutDashboard },
  { label: 'Gallery', path: 'gallery', icon: Grid2X2 },
  { label: 'Teams', path: 'teams', icon: UsersRound },
  { label: 'Seasons', path: 'seasons', icon: Tags },
  { label: 'Conferences', path: 'conferences', icon: Layers3 },
  { label: 'About', path: 'about', icon: CircleHelp },
];

const adminLinks = [
  { label: 'Dashboard', path: 'admin', icon: Gauge },
  { label: 'Images', path: 'admin/images', icon: Grid2X2 },
  { label: 'Upload', path: 'admin/upload', icon: Upload },
  { label: 'Groups', path: 'admin/groups', icon: Layers3 },
  { label: 'Settings', path: 'admin/settings', icon: Settings2 },
];

export default function Sidebar({ route, collapsed, mobileOpen, onToggle, onClose }) {
  const isAdmin = route.startsWith('admin');
  const links = isAdmin ? adminLinks : publicLinks;

  return (
    <>
      {mobileOpen && (
        <button className="drawer-scrim lg:hidden" aria-label="Close navigation" onClick={onClose} />
      )}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-paper transition-[width,transform] duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-[252px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`sidebar-brand flex h-[76px] shrink-0 items-center border-b border-line ${collapsed ? 'lg:justify-center lg:px-0' : 'justify-between px-5'}`}>
          <a href={isAdmin ? '#/admin' : '#/home'} className="brand-lockup flex min-w-0 items-center gap-3" onClick={onClose}>
            <span className="brand-mark"><Archive size={19} strokeWidth={2.2} /></span>
            <span className={`brand-name ${collapsed ? 'lg:hidden' : ''}`}>
              <strong>Hoop Land</strong>
              <small>{isAdmin ? 'ARCHIVE ADMIN' : 'IMAGE ARCHIVE'}</small>
            </span>
          </a>
          <button className="icon-button ml-2 lg:hidden" aria-label="Close navigation" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className={`px-4 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-muted ${collapsed ? 'lg:hidden' : ''}`}>
          {isAdmin ? 'Workspace' : 'Explore archive'}
        </div>
        <nav aria-label={isAdmin ? 'Admin navigation' : 'Main navigation'} className="flex-1 space-y-1 px-3 py-2">
          {links.map(({ label, path, icon: Icon }) => {
            const active = path === 'admin' ? route === 'admin' : route === path;
            return (
              <a
                key={path}
                href={`#/${path}`}
                onClick={onClose}
                title={collapsed ? label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`nav-link ${active ? 'nav-link-active' : ''} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
                {active && !collapsed && <span className="nav-indicator" />}
              </a>
            );
          })}
        </nav>

        <div className={`border-t border-line p-3 ${collapsed ? 'lg:px-2' : ''}`}>
          <a
            href={isAdmin ? '#/gallery' : '#/admin'}
            className={`mode-switch ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
            title={collapsed ? (isAdmin ? 'Public archive' : 'Admin workspace') : undefined}
          >
            {isAdmin ? <Grid2X2 size={17} /> : <Settings2 size={17} />}
            <span className={collapsed ? 'lg:hidden' : ''}>{isAdmin ? 'Public archive' : 'Admin workspace'}</span>
            {!collapsed && <ChevronRight size={15} className="ml-auto text-muted" />}
          </a>
          <div className={`mt-3 flex items-center justify-between px-2 ${collapsed ? 'lg:hidden' : ''}`}>
            <span className="font-mono text-[10px] text-muted">COLLECTION 01 / 01</span>
            <span className="live-dot" aria-label="Archive available" />
          </div>
        </div>
        <button
          className="sidebar-collapse hidden h-11 items-center justify-center border-t border-line text-muted transition hover:bg-wash hover:text-ink lg:flex"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </aside>
    </>
  );
}