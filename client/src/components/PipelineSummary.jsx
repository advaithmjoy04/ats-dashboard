const pipelineColors = {
  APPLIED: 'pipeline-applied',
  SHORTLISTED: 'pipeline-shortlisted',
  REJECTED: 'pipeline-rejected',
  SELECTED: 'pipeline-selected',
};

function PipelineSummary({ data, total }) {
  const items = [
    { key: 'APPLIED', label: 'Applied' },
    { key: 'SHORTLISTED', label: 'Shortlisted' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'SELECTED', label: 'Selected' },
  ];

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Application Pipeline</h2>
      </div>
      <div className="pipeline-summary">
        {items.map((item) => {
          const value = data?.[item.key] || 0;
          const percent = total ? Math.max(6, Math.round((value / total) * 100)) : 0;
          return (
            <div key={item.key} className="pipeline-row">
              <div>
                <strong>{item.label}</strong>
                <span>{value} candidates</span>
              </div>
              <div className="pipeline-track">
                <div className={`pipeline-fill ${pipelineColors[item.key]}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default PipelineSummary;
