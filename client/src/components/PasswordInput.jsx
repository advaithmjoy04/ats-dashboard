import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function PasswordInput({
  label,
  value,
  onChange,
  name,
  placeholder,
  required,
  autoComplete,
  error,
  onFocus,
  onBlur,
  disabled,
  hint,
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <label className="password-input-label" htmlFor={inputId}>
      <span>{label}</span>
      <div className={`password-field ${error ? 'password-field-error' : ''}`}>
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint ? <small className="field-hint">{hint}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

export default PasswordInput;
