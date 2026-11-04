import { useId } from 'react';
import Icon from './Icon.jsx';

/**
 * Select nativo (accesible por teclado y en móvil) con el estilo de la marca.
 * `hideLabel` deja la etiqueta solo para lectores de pantalla.
 */
export default function Select({ label, hideLabel = false, error, children, className = '', ...rest }) {
  const id = useId();
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`.trim()}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'field-label'}>
        {label}
      </label>
      <div className="select-wrap">
        <select
          id={id}
          className="select"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        >
          {children}
        </select>
        <Icon name="chevron-down" size={18} className="select-chevron" />
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
