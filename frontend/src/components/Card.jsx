import { Link } from 'react-router-dom';

/** Superficie con radio y sombra suave. Con `to` se vuelve enlace completo. */
export default function Card({ as: Tag = 'div', to, tone = 'surface', className = '', children, ...rest }) {
  const classes = `card card-${tone} ${to ? 'card-link' : ''} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
