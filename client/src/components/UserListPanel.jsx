import { formatDate, getInitials } from '../utils/formatters';

function UserListPanel({
  title,
  description,
  users,
  emptyMessage,
  variant,
  actionLabel,
  onAction,
  actionLoadingId,
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <span>{description}</span>
        </div>
      </div>
      {(users || []).length ? (
        <div className="user-list">
          {(users || []).map((item, index) => {
            if (!item) return null;
            const user = variant === 'student' ? (item.userId || {}) : item;
            const meta = variant === 'student'
              ? [item.branch, item.semester ? `Sem ${item.semester}` : null, item.cgpa != null ? `CGPA ${item.cgpa}` : null].filter(Boolean).join(' • ') || user.email || '--'
              : user.email || '--';

            return (
              <article className="user-list-item" key={item._id || user?._id || index}>
                <div className="student-cell">
                  <div className="avatar-badge">{getInitials(user?.fullName || user?.email)}</div>
                  <div>
                    <strong>{user?.fullName || user?.email}</strong>
                    <span>{meta}</span>
                  </div>
                </div>
                <div className="user-list-meta">
                  <span className={`status-pill status-${String(user?.status || 'pending').toLowerCase()}`}>
                    {user?.status || 'PENDING'}
                  </span>
                  <span>{formatDate(user?.createdAt || item?.createdAt)}</span>
                  {onAction && user?._id ? (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => onAction(item)}
                      disabled={actionLoadingId === user._id}
                    >
                      {actionLoadingId === user._id ? 'Removing...' : actionLabel}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state compact">{emptyMessage}</div>
      )}
    </section>
  );
}

export default UserListPanel;
