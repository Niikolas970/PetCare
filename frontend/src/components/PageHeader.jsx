/** Encabezado de pantalla: título a la izquierda y una acción opcional a la derecha. */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
