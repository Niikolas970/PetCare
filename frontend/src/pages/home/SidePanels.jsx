import { useAuth } from '../../auth/AuthContext.jsx';
import Chip from '../../components/Chip.jsx';
import Icon from '../../components/Icon.jsx';
import UserAvatar from '../../components/UserAvatar.jsx';
import { MEMBER_ROLE, MEMBER_STATUS, label } from '../../i18n/labels.js';
import { plural, weekDays } from '../careFormat.js';

const ACTIONS = [
  { id: 'meal', label: 'Registrar comida', hint: 'Qué comió y cuánto', icon: 'bag', tone: 'amber' },
  { id: 'weight', label: 'Registrar peso', hint: 'Actualiza su peso actual', icon: 'scale', tone: 'sage' },
  { id: 'task', label: 'Nueva tarea', hint: 'Cita, vacuna o recordatorio', icon: 'calendar', tone: 'blue' },
];

export function QuickActions({ disabled, onAction }) {
  return (
    <section className="panel side-panel" aria-labelledby="actions-title">
      <h2 id="actions-title" className="section-title">
        Acciones rápidas
      </h2>
      {disabled && <p className="side-note">Agrega una mascota para registrar comidas, pesos y tareas.</p>}
      <ul className="action-list">
        {ACTIONS.map((a) => (
          <li key={a.id}>
            <button type="button" className="action pressable" onClick={() => onAction(a.id)} disabled={disabled}>
              <span className={`tile tile-${a.tone}`}>
                <Icon name={a.icon} size={22} />
              </span>
              <span className="action-text">
                <span className="action-label">{a.label}</span>
                <span className="action-hint">{a.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WeekStrip({ today, tasks }) {
  const days = weekDays(today, 7);
  const counts = tasks.reduce((acc, t) => {
    const d = t.dueAt.slice(0, 10);
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="panel side-panel" aria-labelledby="week-title">
      <h2 id="week-title" className="section-title">
        Esta semana
      </h2>
      <ol className="week">
        {days.map((d) => {
          const n = counts[d.iso] ?? 0;
          return (
            <li
              key={d.iso}
              className={`week-day${d.isToday ? ' is-today' : ''}${n ? ' has-care' : ''}`}
              aria-label={`${d.isToday ? 'Hoy, ' : ''}${d.long}: ${n ? plural(n, 'cuidado', 'cuidados') : 'sin cuidados'}`}
            >
              <span className="week-name" aria-hidden="true">
                {d.weekday}
              </span>
              <span className="week-num" aria-hidden="true">
                {d.day}
              </span>
              <span className="week-dots" aria-hidden="true">
                {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                  <span key={i} className="week-dot" />
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function HouseholdPanel({ name, members }) {
  const { user } = useAuth();
  return (
    <section className="panel side-panel" aria-labelledby="home-members-title">
      <h2 id="home-members-title" className="section-title">
        Mi hogar
      </h2>
      <p className="side-note">{name}</p>
      <ul className="member-list">
        {members.map((m) => (
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
                {m.status === 'INVITED' && <Chip tone="soon">{label(MEMBER_STATUS, m.status)}</Chip>}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
