import { Bell, BriefcaseBusiness, FileSearch, GraduationCap, LayoutDashboard, LogOut, ShieldUser, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../state/AuthContext';
import { useTenant } from '../state/TenantContext';
import { ATS_ACTIVITY_REFRESH_EVENT } from '../utils/activitySignals';
import { formatDate, getInitials } from '../utils/formatters';

function buildAdminNotifications(jobs, candidates) {
  const notifications = [];
  const openJobs = jobs.filter((job) => job.active);
  if (openJobs.length) {
    notifications.push({
      id: 'admin-open-jobs',
      title: `${openJobs.length} active job posting${openJobs.length > 1 ? 's' : ''}`,
      description: 'Admin dashboard has live roles students can apply to right now.',
      tone: 'info',
      icon: BriefcaseBusiness,
      timestamp: openJobs[0]?.createdAt,
    });
  }

  const selectedCandidates = candidates.filter((candidate) => candidate.status === 'SELECTED');
  if (selectedCandidates.length) {
    notifications.push({
      id: 'admin-selected',
      title: `${selectedCandidates.length} candidate${selectedCandidates.length > 1 ? 's' : ''} selected`,
      description: 'Selected candidates need follow-up and final communication.',
      tone: 'success',
      icon: Users,
      timestamp: selectedCandidates[0]?.appliedAt || selectedCandidates[0]?.updatedAt,
    });
  }

  const shortlistedCandidates = candidates.filter((candidate) => candidate.status === 'SHORTLISTED');
  if (shortlistedCandidates.length) {
    notifications.push({
      id: 'admin-shortlisted',
      title: `${shortlistedCandidates.length} shortlisted applicant${shortlistedCandidates.length > 1 ? 's' : ''}`,
      description: 'Shortlisted applicants are ready for recruiter review.',
      tone: 'info',
      icon: FileSearch,
      timestamp: shortlistedCandidates[0]?.appliedAt || shortlistedCandidates[0]?.updatedAt,
    });
  }

  return notifications;
}

function buildPlatformNotifications(tenants) {
  const notifications = [];
  const inactiveTenants = tenants.filter((tenant) => !tenant.isActive);
  if (inactiveTenants.length) {
    notifications.push({
      id: 'platform-inactive-tenants',
      title: `${inactiveTenants.length} inactive institute workspace${inactiveTenants.length > 1 ? 's' : ''}`,
      description: 'Review tenant onboarding or re-activation needs before access is restored.',
      tone: 'info',
      icon: ShieldUser,
      timestamp: inactiveTenants[0]?.updatedAt || inactiveTenants[0]?.createdAt,
    });
  }

  const domainReady = tenants.filter((tenant) => tenant.customDomain || tenant.subdomain);
  if (domainReady.length) {
    notifications.push({
      id: 'platform-domain-ready',
      title: `${domainReady.length} institute domain mapping${domainReady.length > 1 ? 's' : ''} configured`,
      description: 'Tenant routing is ready for these institute workspaces.',
      tone: 'success',
      icon: BriefcaseBusiness,
      timestamp: domainReady[0]?.updatedAt || domainReady[0]?.createdAt,
    });
  }

  return notifications;
}

function buildStudentNotifications(jobs, applications) {
  const notifications = [];
  const freshJobs = jobs.filter((job) => !job.applied).slice(0, 3);
  freshJobs.forEach((job) => {
    notifications.push({
      id: `student-job-${job.jobId}`,
      title: `New job posting: ${job.title || job.role}`,
      description: `${job.companyName || 'Campus Partner'} is open for applications.`,
      tone: 'info',
      icon: BriefcaseBusiness,
      timestamp: job.createdAt,
    });
  });

  applications
    .filter((application) => application.status === 'SELECTED' || application.status === 'SHORTLISTED')
    .slice(0, 3)
    .forEach((application) => {
      notifications.push({
        id: `student-application-${application._id}`,
        title: `Application ${application.status.toLowerCase()}`,
        description: `${application.jobId?.companyName || 'A company'} updated your application for ${application.jobId?.title || application.jobId?.role || 'a role'}.`,
        tone: application.status === 'SELECTED' ? 'success' : 'info',
        icon: Bell,
        timestamp: application.updatedAt || application.createdAt,
      });
    });

  return notifications;
}

function buildRecruiterNotifications(jobs, candidates) {
  const notifications = [];
  const freshJobs = jobs.slice(0, 3);
  freshJobs.forEach((job) => {
    notifications.push({
      id: `recruiter-job-${job.jobId}`,
      title: `Assigned job: ${job.title || job.role}`,
      description: `${job.companyName || 'Campus Partner'} is assigned to you for review.`,
      tone: 'info',
      icon: BriefcaseBusiness,
      timestamp: job.createdAt,
    });
  });

  candidates
    .filter((candidate) => candidate.status === 'APPLIED' || candidate.status === 'SHORTLISTED')
    .slice(0, 3)
    .forEach((candidate) => {
      notifications.push({
        id: `recruiter-candidate-${candidate.id}`,
        title: `Candidate update: ${candidate.student?.fullName || candidate.student?.email || 'Applicant'}`,
        description: `${candidate.status === 'APPLIED' ? 'New applicant ready for review' : 'Candidate moved to shortlist'} for ${candidate.job?.title || candidate.job?.role || 'the assigned role'}.`,
        tone: candidate.status === 'SHORTLISTED' ? 'success' : 'info',
        icon: Users,
        timestamp: candidate.appliedAt || candidate.updatedAt,
      });
    });

  return notifications;
}

function startCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function AppShell({ navItems, sectionLabel = 'Menu' }) {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsState, setNotificationsState] = useState({
    items: [],
    loading: true,
    error: '',
  });
  const location = useLocation();
  const panelRef = useRef(null);
  const isPlatform = user?.role === 'PLATFORM_SUPER_ADMIN';
  const activeNavItem = useMemo(
    () =>
      navItems
        .slice()
        .sort((left, right) => right.to.length - left.to.length)
        .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)),
    [location.pathname, navItems]
  );

  const greetingName = useMemo(() => {
    if (user?.fullName) {
      return user.fullName.split(' ')[0];
    }
    return user?.email?.split('@')[0] || 'Admin';
  }, [user]);

  const currentViewLabel = useMemo(() => {
    if (isPlatform) {
      return 'Platform';
    }
    return activeNavItem?.label || startCase(location.pathname.split('/').filter(Boolean).slice(-1)[0] || sectionLabel);
  }, [activeNavItem?.label, isPlatform, sectionLabel]);

  const showSearch = useMemo(() => {
    if (isPlatform) {
      return false;
    }
    if (user?.role === 'STUDENT') {
      return location.pathname.startsWith('/student/jobs');
    }
    return true;
  }, [isPlatform, location.pathname, user?.role]);

  const searchPlaceholder = useMemo(() => {
    if (user?.role === 'STUDENT') {
      return 'Search job postings, company, role, or job ID...';
    }
    if (user?.role === 'RECRUITER') {
      return 'Search jobs, candidates, skills, company...';
    }
    return 'Search jobs, candidates, USN, company...';
  }, [user?.role]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!panelRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user?.role) {
      setNotificationsState({ items: [], loading: false, error: '' });
      return;
    }

    setNotificationsState((current) => ({ ...current, loading: true, error: '' }));

    try {
      let items = [];

      if (user.role === 'PLATFORM_SUPER_ADMIN') {
        const tenantsRes = await api.get('/platform/tenants');
        items = buildPlatformNotifications(tenantsRes.data || []);
      } else if (user.role === 'ADMIN') {
        const [jobsRes, candidatesRes] = await Promise.all([
          api.get('/admin/jobs', { params: { limit: 6 } }),
          api.get('/admin/candidates', { params: { limit: 10 } }),
        ]);
        items = buildAdminNotifications(jobsRes.data.items || [], candidatesRes.data.items || []);
      } else if (user.role === 'STUDENT') {
        const [jobsRes, applicationsRes] = await Promise.all([
          api.get('/students/jobs', { params: { limit: 10 } }),
          api.get('/students/applications/my', { params: { limit: 10 } }),
        ]);
        const applications = applicationsRes.data.items || [];
        const appliedJobIds = new Set(applications.map((application) => application.jobId?.jobId).filter(Boolean));
        const jobs = (jobsRes.data.items || []).map((job) => ({
          ...job,
          applied: appliedJobIds.has(job.jobId),
        }));
        items = buildStudentNotifications(jobs, applications);
      } else if (user.role === 'RECRUITER') {
        const jobsRes = await api.get('/recruiters/jobs', { params: { limit: 10 } });
        const jobs = jobsRes.data.items || [];
        let candidates = [];
        if (jobs[0]?.jobId) {
          const candidatesRes = await api.get(`/recruiters/jobs/${jobs[0].jobId}/applicants`, {
            params: { limit: 10 },
          });
          candidates = candidatesRes.data.items || [];
        }
        items = buildRecruiterNotifications(jobs, candidates);
      }

      items = items
        .slice()
        .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0));

      setNotificationsState({
        items,
        loading: false,
        error: '',
      });
    } catch (error) {
      setNotificationsState({
        items: [],
        loading: false,
        error: 'Unable to load notifications right now.',
      });
    }
  }, [user?.role]);

  useEffect(() => {
    let active = true;

    async function syncNotifications() {
      if (!active) {
        return;
      }
      await loadNotifications();
    }

    syncNotifications();
    const interval = window.setInterval(syncNotifications, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [loadNotifications, location.pathname]);

  useEffect(() => {
    function handleActivityRefresh() {
      loadNotifications();
    }

    function handleFocus() {
      loadNotifications();
    }

    window.addEventListener(ATS_ACTIVITY_REFRESH_EVENT, handleActivityRefresh);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener(ATS_ACTIVITY_REFRESH_EVENT, handleActivityRefresh);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (!showSearch && search) {
      setSearch('');
    }
  }, [search, showSearch]);

  const unreadCount = notificationsState.items.length;

  function toggleNotifications() {
    setNotificationsOpen((current) => !current);
    setProfileMenuOpen(false);
  }

  function toggleProfileMenu() {
    setProfileMenuOpen((current) => !current);
    setNotificationsOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="brand-logo" />
            ) : tenant.slug === 'default-institute' || isPlatform ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 220 230" width="28" height="29" style={{ flexShrink: 0 }}>
                  <path d="M86 56 C 132 50 168 84 168 128 C 168 166 140 192 102 190 C 64 188 40 158 44 118 C 47 84 60 60 86 56 Z" fill="#F9930C" />
                  <path d="M92 56 C 90 44 92 34 100 28" stroke="#C2620E" stroke-width="8" stroke-linecap="round" fill="none" />
                  <path d="M92 56 C 96 34 84 16 60 14 C 64 36 76 50 92 56 Z" fill="#1EA45C" />
                  <ellipse cx="120" cy="98" rx="9" ry="16" fill="#FFC24B" transform="rotate(-28 120 98)" />
                </svg>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', textTransform: 'none' }}>MNGO</span>
              </div>
            ) : (
              tenant.name
            )}
          </div>
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
        <header className={`topbar ${isPlatform ? 'topbar-platform' : ''}`}>
          {isPlatform ? (
            <>
              <div className="topbar-left">
                <div>
                  <div className="eyebrow">Platform Console</div>
                  <h1>Welcome Super Admin</h1>
                  <p>Tenant control, security, and institute provisioning</p>
                </div>
              </div>
              <div className="topbar-actions">
                <div className="topbar-menu-wrap" ref={panelRef}>
                  <button
                    type="button"
                    className="profile-pill profile-button"
                    onClick={toggleProfileMenu}
                    aria-label="Open account menu"
                    aria-expanded={profileMenuOpen}
                  >
                    {getInitials(user?.fullName || user?.email)}
                  </button>
                  {profileMenuOpen ? (
                    <div className="profile-menu-card">
                      <div className="profile-menu-copy">
                        <strong>{user?.fullName || greetingName}</strong>
                        <span>{user?.email}</span>
                      </div>
                      <button type="button" className="profile-menu-action" onClick={logout}>
                        <LogOut size={16} />
                        <span>Log out</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="topbar-left">
                <div>
                  <div className="eyebrow">Hello,</div>
                  <h1>{greetingName}</h1>
                  <p>{currentViewLabel}</p>
                </div>
              </div>



              <div className="topbar-actions">
                <button
                  type="button"
                  className="icon-button icon-button-notification"
                  onClick={toggleNotifications}
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} items` : ''}`}
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={18} />
                  {unreadCount ? <span className="notification-badge">{Math.min(unreadCount, 9)}</span> : null}
                </button>
                <div className="topbar-menu-wrap" ref={panelRef}>
                  <button
                    type="button"
                    className="profile-pill profile-button"
                    onClick={toggleProfileMenu}
                    aria-label="Open account menu"
                    aria-expanded={profileMenuOpen}
                  >
                    {getInitials(user?.fullName || user?.email)}
                  </button>
                  {profileMenuOpen ? (
                    <div className="profile-menu-card">
                      <div className="profile-menu-copy">
                        <strong>{user?.fullName || greetingName}</strong>
                        <span>{user?.email}</span>
                      </div>
                      <button type="button" className="profile-menu-action" onClick={logout}>
                        <LogOut size={16} />
                        <span>Log out</span>
                      </button>
                    </div>
                  ) : null}
                  {notificationsOpen ? (
                    <div className="notification-panel">
                      <div className="notification-panel-head">
                        <div>
                          <h3>Notifications</h3>
                          <span>Recent ATS updates for your role</span>
                        </div>
                      </div>
                      {notificationsState.loading ? (
                        <div className="notification-empty">Loading notifications...</div>
                      ) : notificationsState.error ? (
                        <div className="notification-empty">{notificationsState.error}</div>
                      ) : notificationsState.items.length ? (
                        <div className="notification-list">
                          {notificationsState.items.map((item) => {
                            const Icon = item.icon || Bell;
                            return (
                              <article key={item.id} className={`notification-item notification-${item.tone || 'info'}`}>
                                <div className="notification-icon">
                                  <Icon size={16} />
                                </div>
                                <div className="notification-copy">
                                  <strong>{item.title}</strong>
                                  <p>{item.description}</p>
                                  <span>{item.timestamp ? formatDate(item.timestamp) : 'Just now'}</span>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="notification-empty">No new notifications yet.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </header>

        <main className="page-content">
          <Outlet context={{ search, setSearch, debouncedSearch, refreshNotifications: loadNotifications }} />
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
        <button type="button" className="mobile-nav-item mobile-nav-logout" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}

export default AppShell;
