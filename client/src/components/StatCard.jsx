function StatCard({ title, value, percent, tone }) {
  return (
    <article className="stat-card">
      <div>
        <p className="stat-title">{title}</p>
        <h3>{value}</h3>
      </div>
      <div className={`progress-ring tone-${tone}`}>
        <svg viewBox="0 0 42 42">
          <circle className="ring-bg" cx="21" cy="21" r="15.9155" />
          <circle
            className="ring-value"
            cx="21"
            cy="21"
            r="15.9155"
            strokeDasharray={`${percent}, 100`}
          />
        </svg>
        <span>{percent}%</span>
      </div>
    </article>
  );
}

export default StatCard;
