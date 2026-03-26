import {
  Bell,
  BriefcaseBusiness,
  CircleHelp,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShieldUser,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { getInitials } from '../utils/formatters';

function AppShell({ navItems, sectionLabel = 'Menu' }) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const location = useLocation();

  const greetingName = useMemo(() => {
    if (user?.fullName) {
      return user.fullName.split(' ')[0];
    }
    return user?.email?.split('@')[0] || 'Admin';
  }, [user]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">ATS Dashboard</div>
          <div className="nav-label">{sectionLabel}</div>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <button type="button" className="logout-button" onClick={logout}>
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <div className="eyebrow">Hello,</div>
              <h1>{greetingName}</h1>
              <p>{location.pathname.replace('/admin/', '').replace('/', ' / ')}</p>
            </div>
          </div>

          <div className="topbar-search">
            <Search size={20} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search jobs, candidates, USN, company..."
            />
          </div>

          <div className="topbar-actions">
            <button type="button" className="icon-button">
              <CircleHelp size={18} />
            </button>
            <button type="button" className="icon-button">
              <Bell size={18} />
            </button>
            <div className="profile-pill">{getInitials(user?.fullName || user?.email)}</div>
          </div>
        </header>

        <main className="page-content">
          <Outlet context={{ search }} />
        </main>
      </div>

      <nav className="mobile-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'is-active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default AppShell;
