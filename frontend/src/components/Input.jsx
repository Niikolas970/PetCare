import { useId, useState } from 'react';
import Icon from './Icon.jsx';

/** Campo con etiqueta visible, ayuda y error asociados con aria-describedby. */
export default function Input({ label, error, hint, type = 'text', className = '', ...rest }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`.trim()}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="field-control">
        <input
          id={id}
          className="field-input"
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={shown}
          >
            <Icon name={shown ? 'eye-off' : 'eye'} size={20} />
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
