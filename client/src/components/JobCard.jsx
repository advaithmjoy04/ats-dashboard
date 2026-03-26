import { Link } from 'react-router-dom';
import { formatDate } from '../utils/formatters';

function JobCard({ job, onDelete, deleting }) {
  return (
    <article className="job-card">
      <div className="job-card-top">
        <div className="job-logo">{job.companyName.slice(0, 2).toUpperCase()}</div>
        <div className="job-card-actions">
          <span>{formatDate(job.createdAt)}</span>
          {onDelete ? (
            <button
              type="button"
              className="danger-button"
              onClick={() => onDelete(job)}
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Remove'}
            </button>
          ) : null}
        </div>
      </div>
      <div className="job-company">{job.companyName}</div>
      <Link to={`/admin/jobs/${job.jobId}`}>
        <h3>{job.role}</h3>
      </Link>
      <div className="job-meta-row">
        <span>{job.jobId}</span>
        <span>{job.active ? 'Active' : 'Inactive'}</span>
      </div>
      <p>{job.description || 'No description has been added for this role yet.'}</p>
      <div className="job-foot">
        <span>Min CGPA: {job.minCgpa ?? '--'}</span>
        <span>{job.assignedRecruiters?.length || 0} recruiters</span>
      </div>
    </article>
  );
}

export default JobCard;
