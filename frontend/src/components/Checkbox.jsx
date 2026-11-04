import { useId } from 'react';
import Icon from './Icon.jsx';

/** Casilla con etiqueta clicable de 44 px de alto. */
export default function Checkbox({ label, hint, className = '', ...rest }) {
  const id = useId();
  return (
    <div className={`check ${className}`.trim()}>
      <input id={id} type="checkbox" className="check-input" aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      <label htmlFor={id} className="check-label">
        <span className="check-box" aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field-hint check-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
