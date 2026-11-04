import Button from './Button.jsx';
import Icon from './Icon.jsx';

/** Error que dice qué pasó y cómo seguir. Con `onRetry` ofrece reintentar. */
export default function ErrorMessage({ title = 'Algo salió mal', children, onRetry, inline = false }) {
  return (
    <div className={`error-box ${inline ? 'error-inline' : ''}`} role="alert">
      <span className="error-icon">
        <Icon name="alert" size={22} />
      </span>
      <div className="error-content">
        {!inline && <p className="error-title">{title}</p>}
        <p className="error-text">{children}</p>
        {onRetry && (
          <Button variant="soft" onClick={onRetry} className="error-retry">
            Intentar de nuevo
          </Button>
        )}
      </div>
    </div>
  );
}
