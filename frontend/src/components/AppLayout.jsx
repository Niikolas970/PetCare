import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import UserAvatar from './UserAvatar.jsx';
import UserMenu from './UserMenu.jsx';

const NAV = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/mascotas', label: 'Mascotas', icon: 'paw' },
  { to: '/calendario', label: 'Calendario', icon: 'calendar' },
  { to: '/hogar', label: 'Hogar', icon: 'users' },
  { to: '/perfil', label: 'Perfil', icon: 'user' },
];

function NavItems({ className, iconSize = 22 }) {
  return NAV.map((item) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${className}${isActive ? ' is-active' : ''}`}>
      <Icon name={item.icon} size={iconSize} />
      <span>{item.label}</span>
    </NavLink>
  ));
}

/**
 * ≥1024 px: barra lateral de 256 px.
 * 768–1023 px: barra superior con navegación y menú de usuario.
 * <768 px: encabezado con menú de usuario y navegación inferior.
 */
export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <aside className="sidebar">
        <Logo size={40} />
        <nav aria-label="Principal" className="sidebar-nav">
          <NavItems className="side-link" />
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <UserAvatar name={user?.fullName} size={44} />
            <div className="sidebar-user-text">
              <p className="sidebar-user-name">{user?.fullName || ' '}</p>
              <p className="sidebar-user-email">{user?.email || ' '}</p>
            </div>
          </div>
          <button type="button" className="btn btn-soft btn-block sidebar-logout" onClick={logout}>
            <Icon name="logout" size={20} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="topbar">
        <Logo size={36} />
        <nav aria-label="Principal" className="topbar-nav">
          <NavItems className="top-link" iconSize={20} />
        </nav>
        <UserMenu />
      </header>

      <main className="main" id="contenido" tabIndex={-1}>
        <Outlet />
      </main>

      <nav aria-label="Principal" className="tabbar">
        <NavItems className="tab-link" iconSize={24} />
      </nav>
    </div>
  );
}
