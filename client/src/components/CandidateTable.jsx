import { Download } from 'lucide-react';
import { formatDate, getInitials } from '../utils/formatters';

function CandidateTable({ candidates }) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th />
              <th>Student</th>
              <th>USN</th>
              <th>Branch</th>
              <th>Semester</th>
              <th>CGPA</th>
              <th>Applied Job</th>
              <th>Applied On</th>
              <th>Resume</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length ? (
              candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${candidate.student.fullName || candidate.student.email}`} />
                  </td>
                  <td>
                    <div className="student-cell">
                      <div className="avatar-badge">{getInitials(candidate.student.fullName || candidate.student.email)}</div>
                      <div>
                        <strong>{candidate.student.fullName || candidate.student.email}</strong>
                        <span>{candidate.student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{candidate.student.usn || '--'}</td>
                  <td>{candidate.student.branch || '--'}</td>
                  <td>{candidate.student.semester ?? '--'}</td>
                  <td>{candidate.student.cgpa ?? '--'}</td>
                  <td>
                    <div>
                      <strong>{candidate.job?.role || '--'}</strong>
                      <span>{candidate.job?.companyName || '--'}</span>
                    </div>
                  </td>
                  <td>{formatDate(candidate.appliedAt)}</td>
                  <td>
                    {candidate.student.resumeUrl ? (
                      <a href={candidate.student.resumeUrl} target="_blank" rel="noreferrer" className="resume-link">
                        <Download size={16} />
                      </a>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td>
                    <span className={`status-pill status-${candidate.status.toLowerCase()}`}>{candidate.status}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10">
                  <div className="empty-state compact">No candidates match the current filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CandidateTable;
