function PopupShell({ open, onClose, title, subtitle, children, width = 'wide', className = '' }) {
  if (!open) {
    return null;
  }

  const widthClass = width === 'standard' ? '' : ' modal-card-wide';
  const classes = `modal-card${widthClass}${className ? ` ${className}` : ''}`;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={classes}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-heading wizard-heading popup-shell-heading">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p className="page-description">{subtitle}</p> : null}
          </div>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default PopupShell;
