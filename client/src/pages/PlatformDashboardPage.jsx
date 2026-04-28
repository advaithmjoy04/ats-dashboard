import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

function PlatformDashboardPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await api.get('/platform/tenants');
        if (!ignore) {
          setTenants(response.data || []);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load tenant overview.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const summary = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((tenant) => tenant.isActive).length;
    const customDomains = tenants.filter((tenant) => tenant.customDomain).length;
    const subdomains = tenants.filter((tenant) => tenant.subdomain).length;
    return { total, active, customDomains, subdomains };
  }, [tenants]);

  if (loading) {
    return <div className="screen-center">Loading platform overview...</div>;
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Platform Overview</h2>
          <p className="page-description">Monitor tenant readiness, active institutes, and domain onboarding from one place.</p>
        </div>
      </section>
      {error ? <div className="error-banner">{error}</div> : null}
      <section className="stats-grid">
        <article className="stat-card">
          <div>
            <p className="stat-title">Total Institutes</p>
            <h3>{summary.total}</h3>
          </div>
        </article>
        <article className="stat-card">
          <div>
            <p className="stat-title">Active Institutes</p>
            <h3>{summary.active}</h3>
          </div>
        </article>
        <article className="stat-card">
          <div>
            <p className="stat-title">Domain Ready</p>
            <h3>{summary.customDomains + summary.subdomains}</h3>
          </div>
        </article>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent Tenants</h2>
            <span>Newest institute workspaces provisioned in the platform.</span>
          </div>
        </div>
        <div className="simple-list">
          {tenants.slice(0, 6).map((tenant) => (
            <div key={tenant._id} className="simple-list-item">
              <div>
                <strong>{tenant.name}</strong>
                <span>{tenant.customDomain || tenant.subdomain || tenant.slug}</span>
              </div>
              <span className={`status-pill ${tenant.isActive ? 'status-selected' : 'status-rejected'}`}>
                {tenant.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
          {!tenants.length ? <div className="empty-state compact">No institutes created yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

export default PlatformDashboardPage;
