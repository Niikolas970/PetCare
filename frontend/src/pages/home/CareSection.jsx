import { useState } from 'react';
import { tasksApi } from '../../api/services.js';
import Chip from '../../components/Chip.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import { CARE_TASK_TYPE, label } from '../../i18n/labels.js';
import { dueLabel, formatDay, formatTime, groupTasks, taskStyle } from '../careFormat.js';

// Tiempo de la salida animada de una fila completada (coincide con el CSS)
const EXIT_MS = 320;

function CareRow({ task, today, state, onComplete }) {
  const style = taskStyle(task.type);
  const due = dueLabel(task, today);
  const when = task.dueAt.slice(0, 10) === today ? formatTime(task.dueAt) : `${formatDay(task.dueAt)}, ${formatTime(task.dueAt)}`;

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
            <span className="care-pet">{task.petName}</span>, {when}
          </p>
        </div>
        <div className="care-actions">
        <Chip tone={due.tone} className="care-due">
          {due.text}
        </Chip>
        <button
          type="button"
          className="btn btn-soft btn-sm care-done pressable"
          onClick={() => onComplete(task)}
          disabled={Boolean(state)}
          aria-busy={state === 'saving' || undefined}
        >
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
        </div>
      </div>
    </li>
  );
}

function Group({ id, title, tasks, today, states, onComplete }) {
  if (tasks.length === 0) return null;
  return (
    <section className="care-group" aria-labelledby={id} id={`grupo-${id}`}>
      <h3 id={id} className="care-group-title">
        {title} <span className="care-group-count">{tasks.length}</span>
      </h3>
      <ul className="care-list">
        {tasks.map((task) => (
          <CareRow key={task.id} task={task} today={today} state={states[task.id]} onComplete={onComplete} />
        ))}
      </ul>
    </section>
  );
}

export default function CareSection({ overdue, upcoming, today, onChanged, onNotice }) {
  // id -> 'saving' | 'done' | 'gone'
  const [states, setStates] = useState({});
  const setTaskState = (id, value) => setStates((s) => ({ ...s, [id]: value }));

  async function complete(task) {
    setTaskState(task.id, 'saving');
    try {
      await tasksApi.complete(task.petId, task.id);
      setTaskState(task.id, 'done');
      onNotice(`Listo: «${task.title}» de ${task.petName} quedó como hecho.`);
      // 1) el botón cambia a «Hecho»  2) la fila se recoge  3) se quita y se recargan los conteos
      setTimeout(() => setTaskState(task.id, 'leaving'), 700);
      setTimeout(() => {
        setTaskState(task.id, 'gone');
        onChanged();
      }, 700 + EXIT_MS);
    } catch (err) {
      setTaskState(task.id, undefined);
      onNotice(`No se pudo marcar como hecho: ${err.message}`, 'error');
    }
  }

  const visible = (list) => list.filter((t) => states[t.id] !== 'gone');
  const groups = groupTasks(visible(overdue), visible(upcoming), today);
  const total = groups.overdue.length + groups.today.length + groups.next.length;

  return (
    <section className="home-section" aria-labelledby="care-title">
      <div className="section-head">
        <h2 id="care-title" className="section-title">
          Próximos cuidados
        </h2>
      </div>
      {total === 0 ? (
        <div className="panel">
          <EmptyState art="done" title="Todo al día">
            No hay cuidados vencidos ni programados para los próximos 7 días. Usa «Nueva tarea» para agendar el próximo.
          </EmptyState>
        </div>
      ) : (
        <div className="panel care-panel">
          <Group id="vencidos" title="Vencidos" tasks={groups.overdue} today={today} states={states} onComplete={complete} />
          <Group id="hoy" title="Hoy" tasks={groups.today} today={today} states={states} onComplete={complete} />
          <Group id="semana" title="Próximos 7 días" tasks={groups.next} today={today} states={states} onComplete={complete} />
        </div>
      )}
    </section>
  );
}
