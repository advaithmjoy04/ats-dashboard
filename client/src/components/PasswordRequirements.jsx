import { CheckCircle2, Circle } from 'lucide-react';
import { getPasswordRuleState } from '../utils/passwordValidation';

function PasswordRequirements({ password, visible }) {
  if (!visible) {
    return null;
  }

  const rules = getPasswordRuleState(password);

  return (
    <div className="password-requirements" aria-live="polite">
      <strong>Password requirements</strong>
      <ul>
        {rules.map((rule) => (
          <li key={rule.key} className={rule.valid ? 'is-valid' : 'is-invalid'}>
            {rule.valid ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordRequirements;
