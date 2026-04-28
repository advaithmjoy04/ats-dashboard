import { Download } from 'lucide-react';
import { getInitials } from '../utils/formatters';

function PipelineBoard({ candidates, stages = [], onMoveCandidate, onSelectCandidate, updatingId, selectedCandidateId = '' }) {
  const columns = stages.length
    ? stages
    : [{ stageKey: 'applied', label: 'Applied' }];
  return (
    <div className="pipeline-board">
      {columns.map((column) => {
        const items = candidates.filter((candidate) => candidate.currentStageKey === column.stageKey);
        return (
          <section
            className="pipeline-column board-selected"
            key={column.stageKey}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const candidateId = event.dataTransfer.getData('text/plain');
              if (candidateId) {
                onMoveCandidate?.(candidateId, column.stageKey);
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
                    className={`pipeline-card ${updatingId === candidate.id ? 'is-updating' : ''} ${selectedCandidateId === candidate.id ? 'is-selected' : ''}`}
                    key={candidate.id}
                    draggable={updatingId !== candidate.id}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', candidate.id)}
                    onClick={() => onSelectCandidate?.(candidate)}
                  >
                    <div className="pipeline-card-head">
                      <div className="avatar-badge small">
                        {getInitials(candidate.student?.fullName || candidate.student?.email || 'Candidate')}
                      </div>
                      {candidate.student?.resumeUrl ? (
                        <a href={candidate.student.resumeUrl} target="_blank" rel="noreferrer" className="resume-link">
                          <Download size={14} />
                        </a>
                      ) : null}
                    </div>
                    <strong>{candidate.student?.fullName || candidate.student?.email || 'Unknown candidate'}</strong>
                    <p>{candidate.student?.branch || '--'} | Semester {candidate.student?.semester ?? '--'}</p>
                    <span>CGPA {candidate.student?.cgpa ?? '--'}</span>
                    <span>{candidate.currentStageLabel || column.label}</span>
                    <span className={`match-pill match-pill-${String(candidate.skillMatch?.matchLevel || 'NONE').toLowerCase()}`}>
                      {candidate.skillMatch?.matchLevel || 'NO MATCH'} MATCH
                    </span>
                    {candidate.skillMatch?.matchedPrioritySkills?.length ? (
                      <div className="priority-match-list">
                        {candidate.skillMatch.matchedPrioritySkills.slice(0, 2).map((skill) => (
                          <span className="priority-match-chip" key={`${candidate.id}-${skill}`}>
                            ★ {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <span className="pipeline-skills">
                      {candidate.student?.skills?.length
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
