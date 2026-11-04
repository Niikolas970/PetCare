import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Icon from './Icon.jsx';
import UserAvatar from './UserAvatar.jsx';

/** Menú del usuario en el encabezado (celular y tablet): Perfil y Cerrar sesión. */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();
  const location = useLocation();

  // Se cierra al navegar
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = user?.fullName || 'Mi cuenta';

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <UserAvatar name={user?.fullName} size={36} />
        <span className="user-menu-name">{name}</span>
        <Icon name="chevron-down" size={18} className="user-menu-chevron" />
        <span className="sr-only">Abrir menú de la cuenta</span>
      </button>

      <div id={panelId} className="user-menu-panel" data-open={open} hidden={!open}>
        <div className="user-menu-head">
          <p className="user-menu-fullname">{name}</p>
          {user?.email && <p className="user-menu-email">{user.email}</p>}
        </div>
        <Link to="/perfil" className="user-menu-item">
          <Icon name="user" size={20} />
          Perfil
        </Link>
        <button type="button" className="user-menu-item user-menu-logout" onClick={logout}>
          <Icon name="logout" size={20} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
