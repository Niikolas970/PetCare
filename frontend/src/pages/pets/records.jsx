import { useCallback, useEffect, useState } from 'react';
import { recordsApi } from '../../api/services.js';
import Button from '../../components/Button.jsx';
import Checkbox from '../../components/Checkbox.jsx';
import Chip from '../../components/Chip.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Loader from '../../components/Loader.jsx';
import { formatDay, formatTime } from '../careFormat.js';

const dateFormat = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** LocalDate "YYYY-MM-DD" -> "6 nov 2026" */
export function formatDate(iso) {
  return iso ? dateFormat.format(new Date(`${iso}T12:00:00Z`)).replace('.', '') : '';
}

/** LocalDateTime -> "mar, 3 nov, 7:30 p. m." */
export function formatWhen(dateTime) {
  return dateTime ? `${formatDay(dateTime)}, ${formatTime(dateTime)}` : '';
}

/** Registros de un tipo (kind = segmento de la ruta) con opción de incluir anulados. */
export function useRecords(petId, kind, includeVoided) {
  const [state, setState] = useState({ items: null, error: null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    recordsApi
      .list(petId, kind, includeVoided, controller.signal)
      .then((items) => setState({ items, error: null }))
      .catch((error) => error.name !== 'AbortError' && setState({ items: null, error }));
    return () => controller.abort();
  }, [petId, kind, includeVoided, version]);

  return { ...state, reload };
}

/** Encabezado de una sección de pestaña: título y acción de registro. */
export function SectionHead({ id, title, count, action }) {
  return (
    <div className="tab-section-head">
      <h2 id={id} className="section-title">
        {title}
        {count > 0 && <span className="section-count">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

/** Interruptor «Mostrar anulados». */
export function VoidedToggle({ checked, onChange }) {
  return <Checkbox label="Mostrar anulados" checked={checked} onChange={(e) => onChange(e.target.checked)} className="voided-toggle" />;
}

/**
 * Lista de registros con carga, error y vacío. renderItem(record) devuelve el contenido de la fila.
 * Los anulados se muestran atenuados con su motivo.
 */
export function RecordList({ records, renderItem, empty, canVoid, onVoid, voidLabel }) {
  if (records.error) return <ErrorMessage title="No pudimos cargar los registros" onRetry={records.reload}>{records.error.message}</ErrorMessage>;
  if (!records.items) return <Loader text="Cargando…" />;
  if (records.items.length === 0) return empty;

  return (
    <ul className="record-list">
      {records.items.map((r, i) => {
        const voided = r.status === 'VOIDED';
        return (
          <li key={r.id} className={`record${voided ? ' is-voided' : ''}`} style={{ '--i': i }}>
            <div className="record-body">{renderItem(r)}</div>
            <div className="record-side">
              {voided ? (
                <Chip tone="neutral" icon="ban">
                  Anulado
                </Chip>
              ) : (
                canVoid && (
                  <Button variant="ghost" className="btn-sm record-void" onClick={() => onVoid(r)}>
                    Anular
                    <span className="sr-only"> {voidLabel(r)}</span>
                  </Button>
                )
              )}
            </div>
            {voided && (
              <p className="record-voided-note">
                {r.voidReason ? `Motivo: ${r.voidReason}. ` : ''}
                Anulado{r.voidedAt ? ` el ${formatWhen(r.voidedAt)}` : ''}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Estado y diálogo para anular un registro de `kind`. */
export function useVoid(petId, kind, { onDone, describe, note }) {
  const [target, setTarget] = useState(null);
  const dialog = target && (
    <ConfirmDialog
      open
      title="Anular registro"
      confirmLabel="Anular registro"
      tone="danger"
      reasonLabel="Motivo (opcional)"
      onClose={() => setTarget(null)}
      onConfirm={async (reason) => {
        const result = await recordsApi.void(petId, kind, target.id, reason);
        setTarget(null);
        onDone(target, result);
      }}
    >
      <p>
        Vas a anular <strong>{describe(target)}</strong>. No se borra: queda en el historial como anulado y deja de contar
        en los resúmenes.
      </p>
      {note && note(target) && <p className="confirm-note">{note(target)}</p>}
    </ConfirmDialog>
  );
  return { askVoid: setTarget, dialog };
}

/** Estado vacío de una sección con su acción de registro. */
export function EmptyRecords({ title, children, actionLabel, onAction, art = 'paw' }) {
  return (
    <EmptyState
      art={art}
      title={title}
      action={
        onAction && (
          <Button icon="plus" onClick={onAction} className="empty-action">
            {actionLabel}
          </Button>
        )
      }
    >
      {children}
    </EmptyState>
  );
}
