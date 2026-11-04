import { useAuth } from '../auth/AuthContext.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import UserAvatar from '../components/UserAvatar.jsx';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  return (
    <div className="page profile-page">
      <PageHeader title="Perfil" />
      <section className="panel profile-card" aria-label="Tu cuenta">
        <UserAvatar name={user?.fullName} size={72} />
        <div className="profile-text">
          <p className="profile-name">{user?.fullName}</p>
          <p className="profile-email">{user?.email}</p>
        </div>
      </section>
      <button type="button" className="btn btn-soft profile-logout pressable" onClick={logout}>
        <Icon name="logout" size={20} />
        Cerrar sesión
      </button>
    </div>
  );
}
