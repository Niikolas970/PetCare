import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { petsApi, tasksApi } from '../api/services.js';
import Button from '../components/Button.jsx';
import Chip from '../components/Chip.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';
import Select from '../components/Select.jsx';
import Toast from '../components/Toast.jsx';
import { useHouseholds } from '../households/HouseholdContext.jsx';
import { CARE_TASK_TYPE, label } from '../i18n/labels.js';
import { addDays, dueLabel, formatTime, plural, taskStyle, todayIn } from './careFormat.js';
import { TaskForm } from './home/QuickForms.jsx';

const VIEWS = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

const utc = (iso) => new Date(`${iso}T12:00:00Z`);
const weekdayShort = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' });
const dayLong = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const monthTitle = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const rangeFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// Semanas de lunes a domingo
function startOfWeek(iso) {
  return addDays(iso, -((utc(iso).getUTCDay() + 6) % 7));
}
function monthDays(iso) {
  const first = `${iso.slice(0, 7)}-01`;
  const start = startOfWeek(first);
  const days = [];
  for (let d = start; days.length < 42; d = addDays(d, 1)) {
    if (days.length >= 35 && d.slice(0, 7) !== iso.slice(0, 7)) break;
    days.push(d);
  }
  return days;
}
function shiftMonth(iso, n) {
  const d = utc(`${iso.slice(0, 7)}-01`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function DayCell({ iso, today, selected, monthOf, tasks, onSelect }) {
  const outside = monthOf && iso.slice(0, 7) !== monthOf;
  const pending = tasks.filter((t) => t.status === 'PENDING');
  const aria = `${capitalize(dayLong.format(utc(iso)))}${iso === today ? ', hoy' : ''}: ${
    tasks.length ? plural(tasks.length, 'cuidado', 'cuidados') : 'sin cuidados'
  }${pending.some((t) => t.overdue) ? ', con vencidos' : ''}`;
  return (
    <button
      type="button"
      className={`cal-day${iso === today ? ' is-today' : ''}${outside ? ' is-outside' : ''}`}
      aria-pressed={selected}
      aria-label={aria}
      onClick={() => onSelect(iso)}
    >
      <span className="cal-day-head" aria-hidden="true">
        {!monthOf && <span className="cal-day-name">{weekdayShort.format(utc(iso)).replace('.', '')}</span>}
        <span className="cal-day-num">{utc(iso).getUTCDate()}</span>
      </span>
      <span className="cal-dots" aria-hidden="true">
        {tasks.slice(0, 4).map((t) => (
          <span key={t.id} className={`cal-dot tone-${t.overdue ? 'late' : taskStyle(t.type).tone}${t.status === 'COMPLETED' ? ' is-done' : ''}`} />
        ))}
      </span>
      <span className="cal-pills" aria-hidden="true">
        {tasks.slice(0, 3).map((t) => (
          <span key={t.id} className={`cal-pill tone-${t.overdue ? 'late' : taskStyle(t.type).tone}${t.status === 'COMPLETED' ? ' is-done' : ''}`}>
            {t.title}
          </span>
        ))}
        {tasks.length > 3 && <span className="cal-more">{tasks.length - 3} más</span>}
      </span>
    </button>
  );
}

function DayTask({ task, today, state, onComplete }) {
  const style = taskStyle(task.type);
  const due = task.status === 'PENDING' ? dueLabel(task, today) : null;
  return (
    <li className="care-row" data-state={state}>
      <div className="care-row-inner">
        <span className={`tile tile-${style.tone}`}>
          <Icon name={style.icon} size={24} />
        </span>
        <div className="care-main">
          <p className="care-title">
            <span className="sr-only">{label(CARE_TASK_TYPE, task.type)}: </span>
            {task.title}
          </p>
          <p className="care-sub">
            <Link to={`/mascotas/${task.petId}?tab=cuidados`} className="cal-pet-link">
              {task.petName}
            </Link>
            , {formatTime(task.dueAt)}
            {task.location ? `, ${task.location}` : ''}
          </p>
        </div>
        <div className="care-actions">
          {due && <Chip tone={due.tone}>{due.text}</Chip>}
          {task.status === 'COMPLETED' && (
            <Chip tone="ok" icon="check">
              Hecho
            </Chip>
          )}
          {task.status === 'PENDING' && (
            <button type="button" className="btn btn-soft btn-sm care-done pressable" onClick={() => onComplete(task)} disabled={Boolean(state)}>
              <span className="care-done-label" data-show={state !== 'done'}>
                {state === 'saving' ? <span className="btn-spinner" aria-hidden="true" /> : <Icon name="check" size={18} />}
                Marcar como hecho
              </span>
              <span className="care-done-label care-done-ok" data-show={state === 'done'} aria-hidden={state !== 'done'}>
                <Icon name="check" size={18} />
                Hecho
              </span>
              <span className="sr-only">: {task.title} de {task.petName}</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** /calendario: cuidados de todas las mascotas del hogar por semana o por mes. */
export default function CalendarPage() {
  const { current, selectedId, error: householdsError, reload: reloadHouseholds } = useHouseholds();
  const tz = current?.timezone;
  const today = todayIn(tz);
  const [view, setView] = useState(() => (window.matchMedia('(min-width: 1024px)').matches ? 'month' : 'week'));
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [petFilter, setPetFilter] = useState('');
  const [data, setData] = useState({ tasks: null, pets: [], error: null });
  const [version, setVersion] = useState(0);
  const [states, setStates] = useState({});
  const [scheduling, setScheduling] = useState(false);
  const [notice, setNotice] = useState(null);
  const reload = useCallback(() => setVersion((v) => v + 1), []);


  const byDay = useMemo(() => {
    const map = new Map();
    (data.tasks ?? [])
      .filter((t) => !petFilter || t.petId === Number(petFilter))
      .forEach((t) => {
        const d = t.dueAt.slice(0, 10);
        if (!map.has(d)) map.set(d, []);
        map.get(d).push(t);
      });
    map.forEach((list) => list.sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
    return map;
  }, [data.tasks, petFilter]);

  const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)) : monthDays(anchor);
  const rangeFrom = days[0];
  const rangeTo = days[days.length - 1];

  // Solo se pide el rango visible (from/to): semana o mes, con los días de relleno
  useEffect(() => {
    if (!selectedId) return undefined;
    const controller = new AbortController();
    setData((d) => ({ ...d, loading: true }));
    Promise.all([
      tasksApi.listForHousehold(selectedId, { from: rangeFrom, to: rangeTo }, controller.signal),
      petsApi.list(selectedId, controller.signal),
    ])
      .then(([tasks, pets]) =>
        setData({ tasks: tasks.filter((t) => t.status !== 'CANCELLED'), pets, error: null, loading: false }),
      )
      .catch((error) => error.name !== 'AbortError' && setData((d) => ({ ...d, error, loading: false })));
    return () => controller.abort();
  }, [selectedId, version, rangeFrom, rangeTo]);
  const period =
    view === 'week'
      ? rangeFmt.formatRange(utc(days[0]), utc(days[6]))
      : capitalize(monthTitle.format(utc(anchor)));
  const move = (n) => {
    const next = view === 'week' ? addDays(anchor, 7 * n) : shiftMonth(anchor, n);
    setAnchor(next);
    setSelected(view === 'week' ? addDays(selected, 7 * n) : next.slice(0, 7) === today.slice(0, 7) ? today : `${next.slice(0, 7)}-01`);
  };
  const goToday = () => {
    setAnchor(today);
    setSelected(today);
  };
  const selectDay = (iso) => {
    setSelected(iso);
    if (view === 'month' && iso.slice(0, 7) !== anchor.slice(0, 7)) setAnchor(iso);
  };

  async function complete(task) {
    setStates((s) => ({ ...s, [task.id]: 'saving' }));
    try {
      await tasksApi.complete(task.petId, task.id);
      setStates((s) => ({ ...s, [task.id]: 'done' }));
      setNotice({ id: Date.now(), text: `Listo: «${task.title}» de ${task.petName} quedó como hecho.`, tone: 'ok' });
      setTimeout(() => {
        setStates((s) => ({ ...s, [task.id]: undefined }));
        reload();
      }, 900);
    } catch (err) {
      setStates((s) => ({ ...s, [task.id]: undefined }));
      setNotice({ id: Date.now(), text: `No se pudo marcar como hecho: ${err.message}`, tone: 'error' });
    }
  }

  const dayTasks = byDay.get(selected) ?? [];
  const types = [...new Set((data.tasks ?? []).map((t) => t.type))];
  const error = householdsError || data.error;
  const activePets = data.pets;

  return (
    <div className="page calendar-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Calendario</h1>
          {current && <p className="page-subtitle">{current.name}</p>}
        </div>
        <Button icon="plus" onClick={() => setScheduling(true)} disabled={activePets.length === 0}>
          Programar un cuidado
        </Button>
      </header>

      <div className="cal-toolbar">
        <div className="segmented" role="group" aria-label="Vista del calendario">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className="segmented-option" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="cal-nav">
          <Button variant="soft" iconOnly icon="arrow-right" className="cal-prev" onClick={() => move(-1)}>
            {view === 'week' ? 'Semana anterior' : 'Mes anterior'}
          </Button>
          <Button variant="soft" className="btn-sm" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="soft" iconOnly icon="arrow-right" onClick={() => move(1)}>
            {view === 'week' ? 'Semana siguiente' : 'Mes siguiente'}
          </Button>
        </div>
        <h2 className="cal-period" aria-live="polite">
          {period}
        </h2>
        {activePets.length > 1 && (
          <Select label="Mascota" hideLabel value={petFilter} onChange={(e) => setPetFilter(e.target.value)} className="cal-filter">
            <option value="">Todas las mascotas</option>
            {activePets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {error && (
        <ErrorMessage title="No pudimos cargar el calendario" onRetry={householdsError ? reloadHouseholds : reload}>
          {error.message}
        </ErrorMessage>
      )}
      {!error && !data.tasks && <Loader block text="Cargando el calendario…" />}

      {data.tasks && (
        <div className={`cal-layout cal-${view}`} aria-busy={data.loading || undefined}>
          <div className="cal-board">
            {view === 'month' && (
              <div className="cal-weekdays" aria-hidden="true">
                {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            )}
            <div className="cal-grid" role="group" aria-label={`Días de ${period}`}>
              {days.map((iso) => (
                <DayCell
                  key={iso}
                  iso={iso}
                  today={today}
                  selected={iso === selected}
                  monthOf={view === 'month' ? anchor.slice(0, 7) : null}
                  tasks={byDay.get(iso) ?? []}
                  onSelect={selectDay}
                />
              ))}
            </div>
            {types.length > 0 && (
              <ul className="cal-legend" aria-label="Colores por tipo de cuidado">
                {types.map((t) => (
                  <li key={t}>
                    <span className={`cal-dot tone-${taskStyle(t).tone}`} aria-hidden="true" />
                    {label(CARE_TASK_TYPE, t)}
                  </li>
                ))}
                <li>
                  <span className="cal-dot tone-late" aria-hidden="true" />
                  Vencido
                </li>
              </ul>
            )}
          </div>

          <section className="cal-day-panel panel" aria-labelledby="cal-day-title">
            <div className="tab-section-head">
              <h2 id="cal-day-title" className="section-title">
                {selected === today ? 'Hoy, ' : ''}
                {selected === today ? dayLong.format(utc(selected)) : capitalize(dayLong.format(utc(selected)))}
              </h2>
            </div>
            {dayTasks.length === 0 ? (
              <EmptyState
                art="done"
                title="Sin cuidados este día"
                action={
                  activePets.length > 0 && (
                    <Button icon="plus" onClick={() => setScheduling(true)} className="empty-action">
                      Programar un cuidado
                    </Button>
                  )
                }
              >
                {activePets.length > 0 ? 'Agenda una cita, una vacuna o un recordatorio.' : 'Agrega una mascota para programar cuidados.'}
              </EmptyState>
            ) : (
              <>
                <ul className="care-list">
                  {dayTasks.map((t) => (
                    <DayTask key={t.id} task={t} today={today} state={states[t.id]} onComplete={complete} />
                  ))}
                </ul>
                <Button variant="soft" icon="plus" className="btn-sm cal-add" onClick={() => setScheduling(true)}>
                  Programar un cuidado
                </Button>
              </>
            )}
          </section>
        </div>
      )}

      {scheduling && (
        <TaskForm
          open
          pets={activePets}
          today={today}
          defaultDate={selected >= today ? selected : null}
          defaultPetId={petFilter ? Number(petFilter) : undefined}
          onClose={() => setScheduling(false)}
          onDone={(msg) => {
            setScheduling(false);
            setNotice({ id: Date.now(), text: msg, tone: 'ok' });
            reload();
          }}
        />
      )}
      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}
