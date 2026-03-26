function UserInvitePanel({
  title,
  description,
  fields,
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <span>{description}</span>
        </div>
      </div>
      <form className="job-form" onSubmit={onSubmit}>
        {fields.map((field) => (
          <label key={field.name} className={field.fullWidth ? 'full-width' : ''}>
            {field.label}
            <input
              name={field.name}
              type={field.type || 'text'}
              value={values[field.name] ?? ''}
              onChange={onChange}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              required={field.required !== false}
            />
          </label>
        ))}
        <button type="submit" className="primary-button full-width" disabled={submitting}>
          {submitting ? 'Sending invite...' : submitLabel}
        </button>
      </form>
    </section>
  );
}

export default UserInvitePanel;
