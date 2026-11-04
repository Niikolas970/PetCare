import { useCallback, useEffect, useMemo, useState } from 'react';
import { householdsApi, invitationsApi } from '../api/services.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Button from '../components/Button.jsx';
import Chip from '../components/Chip.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import FormModal from '../components/FormModal.jsx';
import Icon from '../components/Icon.jsx';
import Input from '../components/Input.jsx';
import Loader from '../components/Loader.jsx';
import Select from '../components/Select.jsx';
import Toast from '../components/Toast.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useHouseholds } from '../households/HouseholdContext.jsx';
import { MEMBER_ROLE, MEMBER_STATUS, label } from '../i18n/labels.js';
import { nowIn, timeZones } from './careFormat.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "America/Bogota" -> "America/Bogota (19:45)": la hora actual ayuda a elegir bien
function zoneLabel(tz) {
  return `${tz.replace(/_/g, ' ')} (${nowIn(tz).slice(11)})`;
}

/** Crear o editar un hogar (nombre y zona horaria). */
function HouseholdForm({ household, onClose, onDone }) {
  const editing = Boolean(household);
  const [values, setValues] = useState({ name: household?.name ?? '', timezone: household?.timezone ?? 'America/Bogota' });
  const zones = useMemo(() => {
    const list = timeZones();
    return list.includes(values.timezone) ? list : [values.timezone, ...list];
  }, [values.timezone]);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <FormModal
      open
      sheet
      title={editing ? 'Editar hogar' : 'Crear hogar'}
      submitLabel={editing ? 'Guardar cambios' : 'Crear hogar'}
      values={values}
      onClose={onClose}
      validate={(v) => {
        const e = {};
        if (!v.name.trim()) e.name = 'El nombre del hogar es obligatorio';
        else if (v.name.trim().length > 120) e.name = 'El nombre del hogar no puede superar 120 caracteres';
        return e;
      }}
      submit={(v) => (editing ? householdsApi.update(household.id, v) : householdsApi.create(v))}
      onDone={onDone}
    >
      {(errors) => (
        <>
          <Input label="Nombre del hogar" value={values.name} onChange={set('name')} error={errors.name} maxLength={120} />
          <Select label="Zona horaria" value={values.timezone} onChange={set('timezone')} error={errors.timezone}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {zoneLabel(z)}
              </option>
            ))}
          </Select>
          <p className="field-hint">
            Define qué es «hoy» para los cuidados del hogar. Las fechas ya guardadas no se mueven al cambiarla.
          </p>
        </>
      )}
    </FormModal>
  );
}

function InviteForm({ householdId, onClose, onDone }) {
  const [values, setValues] = useState({ email: '' });
  return (
    <FormModal
      open
      title="Invitar a alguien"
      submitLabel="Enviar invitación"
      values={values}
      onClose={onClose}
      validate={(v) => {
        if (!v.email.trim()) return { email: 'El correo es obligatorio' };
        if (!EMAIL_RE.test(v.email.trim())) return { email: 'El correo no tiene un formato válido' };
        return {};
      }}
      submit={(v) => householdsApi.invite(householdId, v.email.trim())}
      onDone={onDone}
    >
      {(errors) => (
        <>
          <Input
            label="Correo de la persona"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={values.email}
            onChange={(e) => setValues({ email: e.target.value })}
            error={errors.email}
            hint="Debe tener una cuenta en PetCare. Entrará como cuidador cuando acepte."
          />
        </>
      )}
    </FormModal>
  );
}

/** /hogar: datos del hogar, miembros, invitaciones enviadas y recibidas. */
export default function HouseholdPage() {
  const { user } = useAuth();
  const { households, current, selectedId, setSelectedId, reload: reloadHouseholds, error: householdsError } = useHouseholds();
  const [members, setMembers] = useState({ items: null, error: null });
  const [received, setReceived] = useState({ items: null, error: null });
  const [version, setVersion] = useState(0);
  const [dialog, setDialog] = useState(null); // {type: 'edit'|'create'|'invite'|'remove'|'decline', target}
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const say = (text, tone = 'ok') => setNotice({ id: Date.now(), text, tone });
  const isOwner = current?.myRole === 'OWNER';

  useEffect(() => {
    if (!selectedId) return undefined;
    const controller = new AbortController();
    householdsApi
      .members(selectedId, controller.signal)
      .then((items) => setMembers({ items, error: null }))
      .catch((error) => error.name !== 'AbortError' && setMembers({ items: null, error }));
    return () => controller.abort();
  }, [selectedId, version]);

  useEffect(() => {
    const controller = new AbortController();
    invitationsApi
      .listMine(controller.signal)
      .then((items) => setReceived({ items, error: null }))
      .catch((error) => error.name !== 'AbortError' && setReceived({ items: null, error }));
    return () => controller.abort();
  }, [version]);

  async function accept(inv) {
    setBusy(inv.householdId);
    try {
      const summary = await invitationsApi.accept(inv.householdId);
      reloadHouseholds();
      setSelectedId(summary.id);
      say(`Ahora eres parte de ${summary.name}.`);
      reload();
    } catch (err) {
      say(err.message, 'error');
      reload();
    } finally {
      setBusy(null);
    }
  }

  const active = members.items?.filter((m) => m.status === 'ACTIVE') ?? [];
  const invited = members.items?.filter((m) => m.status === 'INVITED') ?? [];

  return (
    <div className="page household-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Hogar</h1>
          {current && <p className="page-subtitle">{label(MEMBER_ROLE, current.myRole)} en este hogar</p>}
        </div>
        <Button variant="soft" icon="plus" onClick={() => setDialog({ type: 'create' })}>
          Crear hogar
        </Button>
      </header>

      {householdsError && <ErrorMessage onRetry={reloadHouseholds}>{householdsError.message}</ErrorMessage>}

      {/* Invitaciones recibidas primero: piden una decisión */}
      {received.items?.length > 0 && (
        <section className="panel side-panel invites-panel" aria-labelledby="received-title">
          <h2 id="received-title" className="section-title">
            Invitaciones recibidas <span className="section-count">{received.items.length}</span>
          </h2>
          <ul className="member-list">
            {received.items.map((inv) => (
              <li key={inv.householdId} className="invite">
                <span className="invite-icon">
                  <Icon name="users" size={22} />
                </span>
                <span className="member-text">
                  <span className="member-name">{inv.householdName}</span>
                  <span className="member-email">
                    {inv.invitedByName ? `Te invitó ${inv.invitedByName}` : 'Te invitaron'} como {label(MEMBER_ROLE, inv.role).toLowerCase()}
                  </span>
                </span>
                <span className="invite-actions">
                  <Button className="btn-sm" loading={busy === inv.householdId} onClick={() => accept(inv)}>
                    Aceptar
                  </Button>
                  <Button variant="ghost" className="btn-sm" onClick={() => setDialog({ type: 'decline', target: inv })}>
                    Rechazar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!households && !householdsError && <Loader block text="Cargando tu hogar…" />}

      {households && households.length === 0 && (
        <EmptyState
          art="paw"
          title="Todavía no tienes un hogar"
          action={
            <Button icon="plus" onClick={() => setDialog({ type: 'create' })} className="empty-action">
              Crear hogar
            </Button>
          }
        >
          Crea uno para registrar a tus mascotas o acepta una invitación.
        </EmptyState>
      )}

      {current && (
        <div className="household-grid">
          <section className="panel side-panel" aria-labelledby="hh-title">
            <div className="tab-section-head">
              <h2 id="hh-title" className="section-title">
                Datos del hogar
              </h2>
              {isOwner && (
                <Button variant="soft" icon="edit" className="btn-sm" onClick={() => setDialog({ type: 'edit' })}>
                  Editar
                </Button>
              )}
            </div>
            <dl className="facts">
              <div>
                <dt>Nombre</dt>
                <dd>{current.name}</dd>
              </div>
              <div>
                <dt>Zona horaria</dt>
                <dd>{zoneLabel(current.timezone)}</dd>
              </div>
              <div>
                <dt>Mascotas activas</dt>
                <dd>{current.activePetsCount}</dd>
              </div>
            </dl>
            {!isOwner && <p className="side-note role-note">Solo el responsable del hogar puede editar estos datos e invitar personas.</p>}
            {households.length > 1 && (
              <Select label="Cambiar de hogar" value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({label(MEMBER_ROLE, h.myRole).toLowerCase()})
                  </option>
                ))}
              </Select>
            )}
          </section>

          <section className="panel side-panel" aria-labelledby="members-title">
            <div className="tab-section-head">
              <h2 id="members-title" className="section-title">
                Miembros {active.length > 0 && <span className="section-count">{active.length}</span>}
              </h2>
              {isOwner && (
                <Button variant="soft" icon="plus" className="btn-sm" onClick={() => setDialog({ type: 'invite' })}>
                  Invitar
                </Button>
              )}
            </div>
            {members.error && <ErrorMessage onRetry={reload}>{members.error.message}</ErrorMessage>}
            {!members.items && !members.error && <Loader text="Cargando miembros…" />}
            {members.items && (
              <ul className="member-list">
                {[...active, ...invited].map((m) => (
                  <li key={m.userId} className="member">
                    <UserAvatar name={m.fullName} size={40} tone={m.role === 'OWNER' ? 'clay' : 'sage'} />
                    <span className="member-text">
                      <span className="member-name">
                        {m.fullName}
                        {m.userId === user?.id && <span className="member-you"> (tú)</span>}
                      </span>
                      <span className="member-email">{m.email}</span>
                      <span className="member-chips">
                        <Chip tone={m.role === 'OWNER' ? 'clay' : 'sage'}>{label(MEMBER_ROLE, m.role)}</Chip>
                        <Chip tone={m.status === 'INVITED' ? 'soon' : 'neutral'}>{label(MEMBER_STATUS, m.status)}</Chip>
                      </span>
                    </span>
                    {isOwner && m.userId !== user?.id && (
                      <Button variant="ghost" className="btn-sm member-remove" onClick={() => setDialog({ type: 'remove', target: m })}>
                        {m.status === 'INVITED' ? 'Cancelar invitación' : 'Quitar'}
                        <span className="sr-only"> a {m.fullName}</span>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {dialog?.type === 'edit' && (
        <HouseholdForm
          household={current}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            reloadHouseholds();
            say('Datos del hogar guardados.');
          }}
        />
      )}
      {dialog?.type === 'create' && (
        <HouseholdForm
          onClose={() => setDialog(null)}
          onDone={(created) => {
            setDialog(null);
            reloadHouseholds();
            setSelectedId(created.id);
            say(`${created.name} está listo. Ya es tu hogar activo.`);
          }}
        />
      )}
      {dialog?.type === 'invite' && (
        <InviteForm
          householdId={current.id}
          onClose={() => setDialog(null)}
          onDone={(m) => {
            setDialog(null);
            reload();
            say(`Invitación enviada a ${m.fullName}.`);
          }}
        />
      )}
      {dialog?.type === 'remove' && (
        <ConfirmDialog
          open
          tone="danger"
          title={dialog.target.status === 'INVITED' ? 'Cancelar invitación' : `Quitar a ${dialog.target.fullName}`}
          confirmLabel={dialog.target.status === 'INVITED' ? 'Cancelar invitación' : 'Quitar del hogar'}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await householdsApi.removeMember(current.id, dialog.target.userId);
            const t = dialog.target;
            setDialog(null);
            reload();
            say(t.status === 'INVITED' ? `Invitación a ${t.fullName} cancelada.` : `${t.fullName} ya no es miembro del hogar.`);
          }}
        >
          <p>
            {dialog.target.status === 'INVITED'
              ? `${dialog.target.fullName} ya no podrá aceptar la invitación. Puedes invitarle de nuevo cuando quieras.`
              : `${dialog.target.fullName} dejará de ver las mascotas de este hogar. Lo que registró se conserva en el historial.`}
          </p>
        </ConfirmDialog>
      )}
      {dialog?.type === 'decline' && (
        <ConfirmDialog
          open
          title={`Rechazar invitación a ${dialog.target.householdName}`}
          confirmLabel="Rechazar"
          tone="danger"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await invitationsApi.decline(dialog.target.householdId);
            const t = dialog.target;
            setDialog(null);
            reload();
            say(`Rechazaste la invitación a ${t.householdName}.`);
          }}
        >
          <p>No entrarás a este hogar. Si cambias de opinión, pide que te inviten de nuevo.</p>
        </ConfirmDialog>
      )}
      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}
