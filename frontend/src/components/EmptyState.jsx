// Ilustraciones simples hechas con formas geométricas, en los colores de la marca.
function PawArt() {
  return (
    <svg viewBox="0 0 160 120" role="img" aria-label="Huella de mascota">
      <ellipse cx="80" cy="104" rx="52" ry="8" fill="var(--surface-sunken)" />
      <circle cx="80" cy="58" r="46" fill="var(--primary-tint)" />
      <g fill="var(--primary)">
        <circle cx="52" cy="54" r="8" />
        <circle cx="68" cy="36" r="8" />
        <circle cx="92" cy="36" r="8" />
        <circle cx="108" cy="54" r="8" />
        <path d="M80 60c-13 0-23 12-23 22 0 7.500 6.500 11 13 9.800 3.500-.6 6.500-2 10-2s6.500 1.400 10 2c6.500 1.200 13-2.300 13-9.800 0-10-10-22-23-22Z" />
      </g>
    </svg>
  );
}

function DoneArt() {
  return (
    <svg viewBox="0 0 160 120" role="img" aria-label="Todo al día">
      <ellipse cx="80" cy="104" rx="52" ry="8" fill="var(--surface-sunken)" />
      <circle cx="80" cy="58" r="46" fill="var(--sage-bg)" />
      <circle cx="80" cy="58" r="30" fill="var(--surface-raised)" />
      <path d="m66 59 10 10 19-21" fill="none" stroke="var(--sage)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ART = { paw: PawArt, done: DoneArt };

export default function EmptyState({ art = 'paw', title, children, action }) {
  const Art = ART[art] ?? PawArt;
  return (
    <div className="empty">
      <div className="empty-art">
        <Art />
      </div>
      <h3 className="empty-title">{title}</h3>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  );
}
