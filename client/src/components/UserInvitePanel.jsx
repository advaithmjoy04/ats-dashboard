import PopupShell from './PopupShell';

function UserInvitePanel({
  title,
  description,
  fields,
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
  open = true,
  onClose,
}) {
  return (
    <PopupShell open={open} onClose={onClose} title={title} subtitle={description} width="standard">
      <form className="job-form popup-form-body" onSubmit={onSubmit}>
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
    </PopupShell>
  );
}

export default UserInvitePanel;
