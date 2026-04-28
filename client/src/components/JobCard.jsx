import { Star } from 'lucide-react';
import { formatDate } from '../utils/formatters';

function JobCard({
  job,
  onDelete,
  deleting,
  onOpen,
  statusLabel,
  actionLabel = 'Open Job',
  subtitle,
  metaItems,
  chips,
  footerNote,
}) {
  const displayStatus = statusLabel || job.publishState || job.status || (job.active ? 'OPEN' : 'INACTIVE');
  const locationLabel = Array.isArray(job.locations) && job.locations.length
    ? job.locations
      .map((location) => location.label || location.city || location.state || location.country)
      .filter(Boolean)
      .join(', ')
    : 'Location not specified';
  const employmentLabel = job.employmentType || 'Employment type not specified';
  const resolvedMetaItems = metaItems || [
    { label: 'Job ID', value: job.jobId },
    { label: 'Min CGPA', value: job.minCgpa ?? '--' },
    { label: 'Openings', value: job.openings ?? '--' },
  ];
  const resolvedChips = chips || (job.requiredSkills?.slice(0, 3) || []);
  const handleKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && onOpen) {
      event.preventDefault();
      onOpen(job);
    }
  };

  return (
    <article
      className={`job-card job-card-ats ${onOpen ? 'job-card-interactive' : ''}`}
      onClick={onOpen ? () => onOpen(job) : undefined}
      onKeyDown={handleKeyDown}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="job-card-header">
        <div className="job-card-title-group">
          <div className="job-card-icon">
            <Star size={18} />
          </div>
          <div className="job-card-title-copy">
            <h3>{job.title || job.role}</h3>
            <span>{subtitle || job.companyName || 'Campus Partner'}</span>
          </div>
        </div>
        <div className="job-card-actions">
          <span className="status-pill status-selected">{displayStatus}</span>
          {onDelete ? (
            <button
              type="button"
              className="danger-button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(job);
              }}
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Remove'}
            </button>
          ) : null}
        </div>
      </div>
      <div className="job-card-subline">
        <span>{locationLabel}</span>
        <span>{employmentLabel}</span>
        <span>Created on {formatDate(job.createdAt)}</span>
      </div>
      <div className="job-card-meta-grid">
        {resolvedMetaItems.map((item) => (
          <div key={item.label}>
            <strong>{item.label}</strong>
            <span>{item.value ?? '--'}</span>
          </div>
        ))}
      </div>
      <p>{job.description || 'No description has been added for this role yet.'}</p>
      <div className="job-card-footer">
        <div className="job-card-chip-row">
          {resolvedChips.map((skill) => (
            <span className="job-skill-chip" key={skill}>{skill}</span>
          ))}
        </div>
        <span className="text-button">{footerNote || actionLabel}</span>
      </div>
    </article>
  );
}

export default JobCard;
