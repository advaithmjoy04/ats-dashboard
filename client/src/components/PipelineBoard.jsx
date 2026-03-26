import { Download } from 'lucide-react';
import { getInitials } from '../utils/formatters';

const columns = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SELECTED', label: 'Selected' },
];

function PipelineBoard({ candidates, onMoveCandidate, updatingId }) {
  return (
    <div className="pipeline-board">
      {columns.map((column) => {
        const items = candidates.filter((candidate) => candidate.status === column.key);
        return (
          <section
            className={`pipeline-column board-${column.key.toLowerCase()}`}
            key={column.key}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const candidateId = event.dataTransfer.getData('text/plain');
              if (candidateId) {
                onMoveCandidate?.(candidateId, column.key);
              }
            }}
          >
            <div className="pipeline-column-head">
              <span>{column.label}</span>
              <strong>{items.length}</strong>
            </div>
            <div className="pipeline-column-list">
              {items.length ? (
                items.map((candidate) => (
                  <article
                    className={`pipeline-card ${updatingId === candidate.id ? 'is-updating' : ''}`}
                    key={candidate.id}
                    draggable={updatingId !== candidate.id}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', candidate.id)}
                  >
                    <div className="pipeline-card-head">
                      <div className="avatar-badge small">
                        {getInitials(candidate.student.fullName || candidate.student.email)}
                      </div>
                      {candidate.student.resumeUrl ? (
                        <a href={candidate.student.resumeUrl} target="_blank" rel="noreferrer" className="resume-link">
                          <Download size={14} />
                        </a>
                      ) : null}
                    </div>
                    <strong>{candidate.student.fullName || candidate.student.email}</strong>
                    <p>{candidate.student.branch || '--'} | Semester {candidate.student.semester ?? '--'}</p>
                    <span>CGPA {candidate.student.cgpa ?? '--'}</span>
                    <span className="pipeline-skills">
                      {candidate.student.skills?.length
                        ? candidate.student.skills.slice(0, 4).join(', ')
                        : 'Skills not available'}
                    </span>
                    {updatingId === candidate.id ? <span>Updating stage...</span> : null}
                  </article>
                ))
              ) : (
                <div className="empty-state compact">No candidates in this stage yet.</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default PipelineBoard;
