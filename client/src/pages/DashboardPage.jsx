import { useEffect, useState } from 'react';
import api from '../api/client';
import ActivityPanel from '../components/ActivityPanel';
import PipelineSummary from '../components/PipelineSummary';
import StatCard from '../components/StatCard';
import { formatPercent } from '../utils/formatters';

function DashboardPage() {
  const [state, setState] = useState({
    dashboard: null,
    jobs: [],
    candidates: [],
    loading: true,
    error: '',
  });

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [dashboardRes, jobsRes, candidatesRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/jobs'),
          api.get('/admin/candidates'),
        ]);
        if (!ignore) {
          setState({
            dashboard: dashboardRes.data,
            jobs: jobsRes.data.items || [],
            candidates: candidatesRes.data.items || [],
            loading: false,
            error: '',
          });
        }
      } catch (error) {
        if (!ignore) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.response?.data?.message || 'Failed to load dashboard data.',
          }));
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  if (state.loading) {
    return <div className="screen-center">Loading dashboard insights...</div>;
  }

  if (state.error) {
    return <div className="error-banner">{state.error}</div>;
  }

  const totalApplications = state.dashboard?.applications?.total || 0;
  const rejected = state.dashboard?.applications?.byStatus?.REJECTED || 0;
  const shortlisted = state.dashboard?.applications?.byStatus?.SHORTLISTED || 0;

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <StatCard
          title="Total Applications"
          value={totalApplications}
          percent={formatPercent(totalApplications, totalApplications || 1)}
          tone="applied"
        />
        <StatCard
          title="Rejected Applications"
          value={rejected}
          percent={formatPercent(rejected, totalApplications)}
          tone="rejected"
        />
        <StatCard
          title="Shortlisted Applications"
          value={shortlisted}
          percent={formatPercent(shortlisted, totalApplications)}
          tone="shortlisted"
        />
      </section>

      <section className="dashboard-panels">
        <PipelineSummary data={state.dashboard?.applications?.byStatus} total={totalApplications} />
        <ActivityPanel jobs={state.jobs} candidates={state.candidates} />
      </section>
    </div>
  );
}

export default DashboardPage;
