import { formatDate } from '../utils/formatters';

function ActivityPanel({ jobs, candidates }) {
  const items = [];

  (jobs || []).slice(0, 3).forEach((job) => {
    items.push({
      title: `${job.companyName} opened ${job.role}`,
      subtitle: job.jobId,
      date: job.createdAt,
    });
  });

  (candidates || []).slice(0, 3).forEach((candidate) => {
    items.push({
      title: `${candidate.student.fullName || 'Candidate'} is ${candidate.status.toLowerCase()}`,
      subtitle: candidate.job ? `${candidate.job.companyName} - ${candidate.job.role}` : 'Application update',
      date: candidate.appliedAt,
    });
  });

  const finalItems = items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Recent Activity</h2>
        <span>Latest ATS events</span>
      </div>
      {finalItems.length ? (
        <div className="activity-list">
          {finalItems.map((item, index) => (
            <div className="activity-item" key={`${item.title}-${index}`}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.subtitle}</p>
              </div>
              <span>{formatDate(item.date)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">No activity yet. As jobs and applications arrive, the timeline will show them here.</div>
      )}
    </section>
  );
}

export default ActivityPanel;
