/** Indicador de carga. Con `block` ocupa una zona de la pantalla; sin él, va en línea. */
export default function Loader({ text = 'Cargando…', block = false }) {
  return (
    <div className={`loader ${block ? 'loader-block' : ''}`} role="status" aria-live="polite">
      <span className="loader-ring" aria-hidden="true" />
      <span className="loader-text">{text}</span>
    </div>
  );
}
