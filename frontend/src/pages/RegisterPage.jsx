import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Button from '../components/Button.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Input from '../components/Input.jsx';
import AuthShell from './AuthShell.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mismas reglas que RegisterRequest del backend
function validate({ fullName, email, password }) {
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'El nombre completo es obligatorio';
  else if (fullName.trim().length > 120) errors.fullName = 'El nombre completo no puede superar 120 caracteres';

  if (!email.trim()) errors.email = 'El correo es obligatorio';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'El correo no tiene un formato válido';
  else if (email.trim().length > 190) errors.email = 'El correo no puede superar 190 caracteres';

  if (!password) errors.password = 'La contraseña es obligatoria';
  else if (password.length < 8 || password.length > 128) errors.password = 'La contraseña debe tener entre 8 y 128 caracteres';
  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const clientErrors = validate(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setLoading(true);
    try {
      await register({ fullName: values.fullName.trim(), email: values.email.trim(), password: values.password });
      navigate('/', { replace: true });
    } catch (err) {
      // errors trae el mensaje del backend por campo: fullName, email, password
      setErrors(err.errors || {});
      setFormError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Te preparamos un hogar para empezar a cuidar a tus mascotas."
      footer={
        <>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="form">
        {formError && <ErrorMessage inline>{formError}</ErrorMessage>}
        <Input
          label="Nombre completo"
          name="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={onChange}
          error={errors.fullName}
        />
        <Input
          label="Correo"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={onChange}
          error={errors.email}
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Entre 8 y 128 caracteres."
          value={values.password}
          onChange={onChange}
          error={errors.password}
        />
        <Button type="submit" icon="arrow-right" loading={loading} className="btn-block">
          Crear cuenta
        </Button>
      </form>
    </AuthShell>
  );
}
