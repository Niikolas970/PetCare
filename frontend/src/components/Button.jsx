import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

/**
 * variant: 'primary' (caramelo, una por pantalla), 'soft' (superficie blanca) o 'ghost'.
 * Si recibe `to` se dibuja como enlace; si no, como botón.
 */
export default function Button({
  variant = 'primary',
  icon,
  iconOnly = false,
  loading = false,
  to,
  children,
  className = '',
  type = 'button',
  disabled,
  ...rest
}) {
  const classes = `btn btn-${variant} ${iconOnly ? 'btn-icon' : ''} ${className}`.trim();
  const content = (
    <>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {!loading && icon && iconOnly && <Icon name={icon} />}
      {!iconOnly && children}
      {!iconOnly && icon && !loading && <Icon name={icon} size={20} />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {iconOnly && <span className="sr-only">{children}</span>}
      {content}
    </button>
  );
}
