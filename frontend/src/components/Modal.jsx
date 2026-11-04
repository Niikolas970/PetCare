import { useEffect, useId, useRef } from 'react';
import Icon from './Icon.jsx';

/**
 * Diálogo accesible sobre <dialog>: el navegador atrapa el foco, Esc cierra y el fondo queda inerte.
 * Úsalo solo cuando la tarea necesita interrumpir al usuario.
 */
export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // Clic en el fondo oscuro (el propio <dialog>) cierra
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-body">
        <div className="modal-head">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          <button type="button" className="btn btn-soft btn-icon" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
