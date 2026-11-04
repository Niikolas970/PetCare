import { useState } from 'react';
import Button from './Button.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import Modal from './Modal.jsx';

/**
 * Formulario en un diálogo: valida en cliente, envía y muestra los errores del backend por campo.
 * `sheet` = página completa en celular (<768 px) y diálogo en escritorio.
 */
export default function FormModal({ title, submitLabel, open, onClose, validate, submit, onDone, values, sheet, children }) {
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const clientErrors = validate(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      // Lleva el foco al primer campo con error
      requestAnimationFrame(() => e.target.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    try {
      const result = await submit(values);
      setSaving(false);
      onDone(result);
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} sheet={sheet}>
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <ErrorMessage inline>{formError}</ErrorMessage>}
        {typeof children === 'function' ? children(errors) : children}
        <div className="form-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
