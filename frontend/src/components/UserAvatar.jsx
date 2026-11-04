import { initials } from '../pages/careFormat.js';

/** Iniciales del usuario en un círculo. Decorativo: el nombre siempre va al lado o en la etiqueta. */
export default function UserAvatar({ name, size = 40, tone = 'clay' }) {
  return (
    <span
      className={`user-avatar avatar-${tone}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
