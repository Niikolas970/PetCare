import Logo from '../components/Logo.jsx';

/** Marco común de /login y /register: marca arriba, nota manuscrita y tarjeta con el formulario. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <div className="auth-inner">
        <div className="auth-brand">
          <Logo size={48} />
          <p className="script auth-script">Cuidar también es querer</p>
        </div>
        <section className="auth-card" aria-labelledby="auth-title">
          <h1 id="auth-title" className="auth-title">
            {title}
          </h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </section>
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  );
}
