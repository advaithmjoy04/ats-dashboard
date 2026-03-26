function RoleDashboardPage({ title, description, highlights }) {
  return (
    <div className="page-stack">
      <section className="panel placeholder-page">
        <h2>{title}</h2>
        <p>{description}</p>
      </section>
      <section className="stats-grid">
        {highlights.map((item) => (
          <article key={item.label} className="stat-card">
            <div>
              <p className="stat-title">{item.label}</p>
              <h3>{item.value}</h3>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export default RoleDashboardPage;
