import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import Button from '../components/Button.jsx';
import FormModal from '../components/FormModal.jsx';
import Icon from '../components/Icon.jsx';
import Input from '../components/Input.jsx';
import Loader from '../components/Loader.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Toast from '../components/Toast.jsx';
import UserAvatar from '../components/UserAvatar.jsx';

/** /perfil: datos de GET /api/users/me, editar nombre (PUT /api/users/me), privacidad y cerrar sesión. */
export default function ProfilePage() {
  const { user, logout, updateName } = useAuth();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState(null);

  return (
    <div className="page profile-page">
      <PageHeader title="Perfil" />

      {!user ? (
        <Loader block text="Cargando tu cuenta…" />
      ) : (
        <section className="panel profile-card" aria-label="Tu cuenta">
          <UserAvatar name={user.fullName} size={72} />
          <div className="profile-text">
            <p className="profile-name">{user.fullName}</p>
            <p className="profile-email">{user.email}</p>
          </div>
          <Button variant="soft" icon="edit" className="btn-sm profile-edit" onClick={() => setEditing(true)}>
            Editar nombre
          </Button>
        </section>
      )}

      <section className="panel privacy" aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="section-title">
          Tus datos
        </h2>
        <ul className="privacy-list">
          <li>
            <Icon name="users" size={20} />
            Solo los miembros de tus hogares ven la información de sus mascotas.
          </li>
          <li>
            <Icon name="shield" size={20} />
            Tu contraseña se guarda cifrada y nadie puede leerla, ni siquiera el equipo de PetCare.
          </li>
          <li>
            <Icon name="logout" size={20} />
            Tu sesión termina al cerrar la pestaña o al tocar «Cerrar sesión».
          </li>
          <li>
            <Icon name="archive" size={20} />
            Los registros de salud no se borran: se anulan y quedan en el historial con quién y cuándo.
          </li>
        </ul>
        <p className="field-hint">El correo identifica tu cuenta y no se puede cambiar desde aquí.</p>
      </section>

      <button type="button" className="btn btn-soft profile-logout pressable" onClick={logout}>
        <Icon name="logout" size={20} />
        Cerrar sesión
      </button>

      {editing && (
        <NameForm
          initial={user.fullName}
          onClose={() => setEditing(false)}
          onSave={async (name) => {
            await updateName(name);
            setEditing(false);
            setNotice({ id: Date.now(), text: 'Nombre actualizado.', tone: 'ok' });
          }}
        />
      )}
      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}

function NameForm({ initial, onClose, onSave }) {
  const [values, setValues] = useState({ fullName: initial });
  return (
    <FormModal
      open
      title="Editar nombre"
      submitLabel="Guardar nombre"
      values={values}
      onClose={onClose}
      validate={(v) => {
        if (!v.fullName.trim()) return { fullName: 'El nombre completo es obligatorio' };
        if (v.fullName.trim().length > 120) return { fullName: 'El nombre completo no puede superar 120 caracteres' };
        return {};
      }}
      submit={(v) => onSave(v.fullName.trim())}
      onDone={() => {}}
    >
      {(errors) => (
        <Input
          label="Nombre completo"
          autoComplete="name"
          value={values.fullName}
          onChange={(e) => setValues({ fullName: e.target.value })}
          error={errors.fullName}
          maxLength={120}
        />
      )}
    </FormModal>
  );
}
