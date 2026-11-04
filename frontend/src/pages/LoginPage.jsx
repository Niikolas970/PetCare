import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Button from '../components/Button.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Input from '../components/Input.jsx';
import AuthShell from './AuthShell.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'El correo es obligatorio';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'El correo no tiene un formato válido';
  if (!password) errors.password = 'La contraseña es obligatoria';
  return errors;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', password: '' });
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
      await login({ email: values.email.trim(), password: values.password });
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(
        err.status === 429 && err.retryAfter
          ? `${err.message} Podrás intentarlo en ${Math.ceil(err.retryAfter / 60)} min.`
          : err.message,
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Te damos la bienvenida"
      subtitle="Entra para ver el cuidado de tus mascotas."
      footer={
        <>
          ¿Aún no tienes cuenta? <Link to="/register">Crea una</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="form">
        {formError && <ErrorMessage inline>{formError}</ErrorMessage>}
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
          autoComplete="current-password"
          value={values.password}
          onChange={onChange}
          error={errors.password}
        />
        <Button type="submit" icon="arrow-right" loading={loading} className="btn-block">
          Iniciar sesión
        </Button>
      </form>
    </AuthShell>
  );
}
