import { useState } from 'react';
import Button from './Button.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import Modal from './Modal.jsx';
import Textarea from './Textarea.jsx';

/**
 * Confirmación de una acción que no se deshace sola (archivar, anular).
 * Con `reasonLabel` pide un motivo opcional y lo pasa a onConfirm.
 */
export default function ConfirmDialog({ open, title, children, confirmLabel, tone = 'primary', reasonLabel, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (reason.length > 300) {
      setError('El motivo no puede superar 300 caracteres');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="form">
        <div className="confirm-text">{children}</div>
        {reasonLabel && (
          <Textarea label={reasonLabel} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} />
        )}
        {error && <ErrorMessage inline>{error}</ErrorMessage>}
        <div className="form-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={saving} onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
