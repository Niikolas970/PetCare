import { useEffect } from 'react';
import Icon from './Icon.jsx';

/**
 * Aviso breve que confirma una acción ("Peso registrado para Buddy").
 * La región role=status siempre existe para que los lectores de pantalla lo anuncien.
 */
export default function Toast({ notice, onDismiss }) {
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(onDismiss, notice.tone === 'error' ? 7000 : 4500);
    return () => clearTimeout(t);
  }, [notice, onDismiss]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {notice && (
        <div key={notice.id} className={`toast toast-${notice.tone}`}>
          <Icon name={notice.tone === 'error' ? 'alert' : 'check'} size={20} />
          <span>{notice.text}</span>
          <button type="button" className="toast-close" onClick={onDismiss} aria-label="Cerrar aviso">
            <Icon name="x" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
