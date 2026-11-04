import { useEffect, useState } from 'react';
import { recordsApi, tasksApi } from '../../api/services.js';
import Button from '../../components/Button.jsx';
import Chip from '../../components/Chip.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Icon from '../../components/Icon.jsx';
import Loader from '../../components/Loader.jsx';
import { CARE_TASK_TYPE, DOSE_KIND, HEALTH_RECORD_TYPE, LEVEL, LEVEL_FEMININE, MOOD, label } from '../../i18n/labels.js';
import { dayDiff, dueLabel, formatKg, taskStyle } from '../careFormat.js';
import {
  DoseForm,
  HealthRecordForm,
  PetMealForm,
  PetTaskForm,
  PetWeightForm,
  TreatmentForm,
  WellbeingForm,
} from './RecordForms.jsx';
import { EmptyRecords, RecordList, SectionHead, VoidedToggle, formatDate, formatWhen, useRecords, useVoid } from './records.jsx';
import WeightChart from './WeightChart.jsx';

export const PET_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'salud', label: 'Salud' },
  { id: 'alimentacion', label: 'Alimentación' },
  { id: 'peso', label: 'Peso' },
  { id: 'bienestar', label: 'Bienestar' },
  { id: 'cuidados', label: 'Cuidados' },
];

function AddButton({ show, onClick, children }) {
  if (!show) return null;
  return (
    <Button variant="soft" icon="plus" className="btn-sm" onClick={onClick}>
      {children}
    </Button>
  );
}

// ---------- Cuidados (usado también en Resumen) ----------

function TaskRow({ task, today, canComplete, onComplete, state }) {
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
            {task.status === 'COMPLETED' && task.completedAt
              ? `Hecho el ${formatWhen(task.completedAt)}`
              : `${formatWhen(task.dueAt)}${task.location ? `, ${task.location}` : ''}`}
          </p>
        </div>
        <div className="care-actions">
          {due && <Chip tone={due.tone}>{due.text}</Chip>}
          {task.status === 'COMPLETED' && <Chip tone="ok" icon="check">Hecho</Chip>}
          {task.status === 'CANCELLED' && <Chip tone="neutral">Cancelado</Chip>}
          {task.status === 'PENDING' && canComplete && (
            <button type="button" className="btn btn-soft btn-sm care-done pressable" onClick={() => onComplete(task)} disabled={Boolean(state)}>
              <span className="care-done-label" data-show={state !== 'done'}>
                {state === 'saving' ? <span className="btn-spinner" aria-hidden="true" /> : <Icon name="check" size={18} />}
                Marcar como hecho
              </span>
              <span className="care-done-label care-done-ok" data-show={state === 'done'} aria-hidden={state !== 'done'}>
                <Icon name="check" size={18} />
                Hecho
              </span>
              <span className="sr-only">: {task.title}</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function usePetTasks(petId, status) {
  const [state, setState] = useState({ items: null, error: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    tasksApi
      .listForPet(petId, status, controller.signal)
      .then((items) => setState({ items, error: null }))
      .catch((error) => error.name !== 'AbortError' && setState({ items: null, error }));
    return () => controller.abort();
  }, [petId, status, version]);
  return { ...state, reload: () => setVersion((v) => v + 1) };
}

function useComplete(onNotice, onDone) {
  const [states, setStates] = useState({});
  async function complete(task) {
    setStates((s) => ({ ...s, [task.id]: 'saving' }));
    try {
      await tasksApi.complete(task.petId, task.id);
      setStates((s) => ({ ...s, [task.id]: 'done' }));
      onNotice(`Listo: «${task.title}» quedó como hecho.`);
      setTimeout(() => setStates((s) => ({ ...s, [task.id]: 'leaving' })), 700);
      setTimeout(onDone, 1020);
    } catch (err) {
      setStates((s) => ({ ...s, [task.id]: undefined }));
      onNotice(`No se pudo marcar como hecho: ${err.message}`, 'error');
    }
  }
  return { states, complete };
}

const TASK_FILTERS = [
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'COMPLETED', label: 'Hechos' },
  { id: 'CANCELLED', label: 'Cancelados' },
];

export function CareTab({ pet, today, canWrite, onNotice }) {
  const [status, setStatus] = useState('PENDING');
  const [form, setForm] = useState(false);
  const tasks = usePetTasks(pet.id, status);
  const { states, complete } = useComplete(onNotice, tasks.reload);
  const items = tasks.items && (status === 'COMPLETED' ? [...tasks.items].reverse() : tasks.items);

  return (
    <section className="tab-section" aria-labelledby="care-tasks-title">
      <SectionHead id="care-tasks-title" title="Cuidados" action={<AddButton show={canWrite} onClick={() => setForm(true)}>Nueva tarea</AddButton>} />
      <div className="segmented" role="group" aria-label="Estado de los cuidados">
        {TASK_FILTERS.map((f) => (
          <button key={f.id} type="button" className="segmented-option" aria-pressed={status === f.id} onClick={() => setStatus(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {tasks.error && <ErrorMessage onRetry={tasks.reload}>{tasks.error.message}</ErrorMessage>}
      {!tasks.error && !items && <Loader text="Cargando…" />}
      {items && items.length === 0 && (
        <EmptyRecords
          art="done"
          title={status === 'PENDING' ? 'Sin cuidados pendientes' : status === 'COMPLETED' ? 'Aún no hay cuidados hechos' : 'No hay cuidados cancelados'}
          actionLabel="Nueva tarea"
          onAction={canWrite && status === 'PENDING' ? () => setForm(true) : null}
        >
          {status === 'PENDING' ? `Agenda citas, vacunas o recordatorios para ${pet.name}.` : 'Aparecerán aquí cuando los haya.'}
        </EmptyRecords>
      )}
      {items && items.length > 0 && (
        <ul className="care-list panel care-panel">
          {items.map((t) => (
            <TaskRow key={t.id} task={t} today={today} canComplete state={states[t.id]} onComplete={complete} />
          ))}
        </ul>
      )}
      {form && (
        <PetTaskForm
          pet={pet}
          onClose={() => setForm(false)}
          onDone={(msg) => {
            setForm(false);
            onNotice(msg);
            setStatus('PENDING');
            tasks.reload();
          }}
        />
      )}
    </section>
  );
}

// ---------- Resumen ----------

// Últimos registros armados en el frontend con los datos estructurados de cada tipo y labels.js
const SUMMARY_SOURCES = [
  {
    kind: 'weights',
    tab: 'peso',
    chip: 'Peso',
    toEntry: (w) => ({ title: `Peso: ${formatKg(w.weightKg)}`, details: [w.notes] }),
  },
  {
    kind: 'meals',
    tab: 'alimentacion',
    chip: 'Comida',
    toEntry: (m) => ({ title: `Comida: ${m.food}`, details: [m.quantity && `Cantidad: ${m.quantity}`, m.notes] }),
  },
  {
    kind: 'wellbeing',
    tab: 'bienestar',
    chip: 'Bienestar',
    toEntry: (l) => ({
      title: `Ánimo: ${label(MOOD, l.mood).toLowerCase()}`,
      details: [
        [l.energy && `energía ${label(LEVEL_FEMININE, l.energy).toLowerCase()}`, l.appetite && `apetito ${label(LEVEL, l.appetite).toLowerCase()}`]
          .filter(Boolean)
          .join(', ')
          .replace(/^./, (c) => c.toUpperCase()),
        l.notes,
      ],
    }),
  },
  {
    kind: 'doses',
    tab: 'salud',
    chip: 'Salud',
    toEntry: (d) => ({
      title: `${label(DOSE_KIND, d.kind)}: ${d.productName}`,
      details: [d.nextDueOn && `Próxima dosis: ${formatDate(d.nextDueOn)}`],
    }),
  },
  {
    kind: 'treatments',
    tab: 'salud',
    chip: 'Salud',
    toEntry: (t) => ({
      title: `Tratamiento: ${t.medication}`,
      details: [[t.dosage, t.frequency].filter(Boolean).join(', '), t.endsOn && `Hasta el ${formatDate(t.endsOn)}`],
    }),
  },
  {
    kind: 'health-records',
    tab: 'salud',
    chip: 'Salud',
    toEntry: (h) => ({
      title: `${label(HEALTH_RECORD_TYPE, h.recordType)}: ${h.title}`,
      details: [h.veterinarian && `Atendió: ${h.veterinarian}`],
    }),
  },
];

function useLatestRecords(petId, limit = 6) {
  const [state, setState] = useState({ items: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(SUMMARY_SOURCES.map((s) => recordsApi.list(petId, s.kind, false, controller.signal)))
      .then((lists) => {
        const items = lists
          .flatMap((list, i) =>
            list.map((r) => {
              const source = SUMMARY_SOURCES[i];
              const entry = source.toEntry(r);
              return {
                key: `${source.kind}-${r.id}`,
                date: r.occurredAt,
                tab: source.tab,
                chip: source.chip,
                title: entry.title,
                details: entry.details.filter(Boolean),
              };
            }),
          )
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);
        setState({ items, error: null });
      })
      .catch((error) => error.name !== 'AbortError' && setState({ items: null, error }));
    return () => controller.abort();
  }, [petId, limit]);
  return state;
}

export function SummaryTab({ pet, today, onNotice, goTo }) {
  const tasks = usePetTasks(pet.id, 'PENDING');
  const { states, complete } = useComplete(onNotice, tasks.reload);
  const latest = useLatestRecords(pet.id);
  const upcoming = tasks.items?.slice(0, 3);

  return (
    <div className="tab-grid">
      <section className="tab-section" aria-labelledby="sum-care-title">
        <SectionHead
          id="sum-care-title"
          title="Próximos cuidados"
          count={tasks.items?.length}
          action={
            tasks.items?.length > 3 && (
              <Button variant="ghost" className="btn-sm" onClick={() => goTo('cuidados')}>
                Ver todos
              </Button>
            )
          }
        />
        {tasks.error && <ErrorMessage onRetry={tasks.reload}>{tasks.error.message}</ErrorMessage>}
        {!tasks.error && !upcoming && <Loader text="Cargando…" />}
        {upcoming && upcoming.length === 0 && (
          <div className="panel">
            <EmptyRecords art="done" title="Sin cuidados pendientes" actionLabel="Programar un cuidado" onAction={() => goTo('cuidados')}>
              No hay citas ni recordatorios por hacer.
            </EmptyRecords>
          </div>
        )}
        {upcoming && upcoming.length > 0 && (
          <ul className="care-list panel care-panel">
            {upcoming.map((t) => (
              <TaskRow key={t.id} task={t} today={today} canComplete state={states[t.id]} onComplete={complete} />
            ))}
          </ul>
        )}
      </section>

      <section className="tab-section" aria-labelledby="sum-records-title">
        <SectionHead id="sum-records-title" title="Últimos registros" />
        {latest.error && <ErrorMessage>{latest.error.message}</ErrorMessage>}
        {!latest.error && !latest.items && <Loader text="Cargando…" />}
        {latest.items && latest.items.length === 0 && (
          <div className="panel">
            <EmptyRecords title="Todavía no hay registros" actionLabel="Registrar peso" onAction={() => goTo('peso')}>
              Lo que registres en Salud, Alimentación, Peso o Bienestar aparecerá aquí.
            </EmptyRecords>
          </div>
        )}
        {latest.items && latest.items.length > 0 && (
          <ul className="record-list">
            {latest.items.map((item) => (
              <li key={item.key} className="record">
                <div className="record-body">
                  <p className="record-title">{item.title}</p>
                  <p className="record-meta">{formatWhen(item.date)}</p>
                  {item.details.map((d) => (
                    <p key={d} className="record-meta">
                      {d}
                    </p>
                  ))}
                </div>
                <div className="record-side">
                  <button type="button" className="chip chip-clay chip-link" onClick={() => goTo(item.tab)}>
                    {item.chip}
                    <span className="sr-only">: ver la pestaña</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Salud ----------

function doseNext(dose, today) {
  if (!dose.nextDueOn) return null;
  const days = dayDiff(today, dose.nextDueOn);
  const date = formatDate(dose.nextDueOn);
  if (days < 0) return <Chip tone="late">Próxima dosis vencida: {date}</Chip>;
  if (days <= 14) return <Chip tone="soon">Próxima dosis: {date}</Chip>;
  return <Chip tone="ok">Próxima dosis: {date}</Chip>;
}

function treatmentState(t, today) {
  if (!t.endsOn) return <Chip tone="clay">Sin fecha de fin</Chip>;
  if (t.endsOn >= today) return <Chip tone="ok">En curso hasta el {formatDate(t.endsOn)}</Chip>;
  return <Chip tone="neutral">Terminó el {formatDate(t.endsOn)}</Chip>;
}

export function HealthTab({ pet, today, canWrite, canVoid, onNotice }) {
  const [showVoided, setShowVoided] = useState(false);
  const [form, setForm] = useState(null);
  const doses = useRecords(pet.id, 'doses', showVoided);
  const treatments = useRecords(pet.id, 'treatments', showVoided);
  const events = useRecords(pet.id, 'health-records', showVoided);
  const voided = () => onNotice('Registro anulado. Sigue en el historial como anulado.');
  const vDose = useVoid(pet.id, 'doses', {
    describe: (d) => `${DOSE_KIND[d.kind]}: ${d.productName}`,
    note: (d) => d.nextDueOn && `Si su cuidado de próxima dosis (${formatDate(d.nextDueOn)}) sigue pendiente, también se cancelará.`,
    onDone: (d, res) => {
      doses.reload();
      onNotice(
        res?.cancelledTaskIds?.length
          ? 'Dosis anulada. Su cuidado de próxima dosis quedó cancelado.'
          : 'Registro anulado. Sigue en el historial como anulado.',
      );
    },
  });
  const vTreat = useVoid(pet.id, 'treatments', { onDone: () => (treatments.reload(), voided()), describe: (t) => `el tratamiento ${t.medication}` });
  const vEvent = useVoid(pet.id, 'health-records', { onDone: () => (events.reload(), voided()), describe: (h) => `«${h.title}»` });

  const done = (reload) => (msg) => {
    setForm(null);
    onNotice(msg);
    reload();
  };

  return (
    <div className="tab-stack">
      <p className="vet-note">
        <Icon name="stethoscope" size={20} />
        PetCare registra y organiza; no reemplaza la consulta veterinaria.
      </p>
      <VoidedToggle checked={showVoided} onChange={setShowVoided} />

      <section className="tab-section" aria-labelledby="doses-title">
        <SectionHead id="doses-title" title="Vacunas y desparasitaciones" count={doses.items?.length} action={<AddButton show={canWrite} onClick={() => setForm('dose')}>Registrar</AddButton>} />
        <RecordList
          records={doses}
          canVoid={canVoid}
          onVoid={vDose.askVoid}
          voidLabel={(d) => d.productName}
          empty={
            <EmptyRecords title="Sin vacunas ni desparasitaciones" actionLabel="Registrar vacuna" onAction={canWrite ? () => setForm('dose') : null}>
              Registra cada dosis y, si quieres, la fecha de la próxima para recibir el recordatorio.
            </EmptyRecords>
          }
          renderItem={(d) => (
            <>
              <p className="record-title">{d.productName}</p>
              <p className="record-meta">
                {DOSE_KIND[d.kind]}, aplicada el {formatWhen(d.occurredAt)}
              </p>
              <div className="record-chips">{doseNext(d, today)}</div>
              {d.notes && <p className="record-notes">{d.notes}</p>}
            </>
          )}
        />
      </section>

      <section className="tab-section" aria-labelledby="treat-title">
        <SectionHead id="treat-title" title="Tratamientos" count={treatments.items?.length} action={<AddButton show={canWrite} onClick={() => setForm('treatment')}>Registrar</AddButton>} />
        <RecordList
          records={treatments}
          canVoid={canVoid}
          onVoid={vTreat.askVoid}
          voidLabel={(t) => t.medication}
          empty={
            <EmptyRecords title="Sin tratamientos" actionLabel="Registrar tratamiento" onAction={canWrite ? () => setForm('treatment') : null}>
              Anota medicamentos, dosis y hasta cuándo se dan.
            </EmptyRecords>
          }
          renderItem={(t) => (
            <>
              <p className="record-title">{t.medication}</p>
              <p className="record-meta">
                {[t.dosage, t.frequency].filter(Boolean).join(', ')}
                {t.dosage || t.frequency ? '. ' : ''}Desde el {formatDate(t.occurredAt.slice(0, 10))}
              </p>
              <div className="record-chips">{treatmentState(t, today)}</div>
              {t.notes && <p className="record-notes">{t.notes}</p>}
            </>
          )}
        />
      </section>

      <section className="tab-section" aria-labelledby="events-title">
        <SectionHead id="events-title" title="Consultas y eventos" count={events.items?.length} action={<AddButton show={canWrite} onClick={() => setForm('event')}>Registrar</AddButton>} />
        <RecordList
          records={events}
          canVoid={canVoid}
          onVoid={vEvent.askVoid}
          voidLabel={(h) => h.title}
          empty={
            <EmptyRecords title="Sin consultas registradas" actionLabel="Registrar evento" onAction={canWrite ? () => setForm('event') : null}>
              Consultas, diagnósticos, exámenes, cirugías y alergias.
            </EmptyRecords>
          }
          renderItem={(h) => (
            <>
              <p className="record-title">{h.title}</p>
              <p className="record-meta">
                {label(HEALTH_RECORD_TYPE, h.recordType)}, {formatWhen(h.occurredAt)}
              </p>
              {h.veterinarian && <p className="record-meta">Atendió: {h.veterinarian}</p>}
              {h.description && <p className="record-notes">{h.description}</p>}
            </>
          )}
        />
      </section>

      {form === 'dose' && <DoseForm pet={pet} onClose={() => setForm(null)} onDone={done(doses.reload)} />}
      {form === 'treatment' && <TreatmentForm pet={pet} onClose={() => setForm(null)} onDone={done(treatments.reload)} />}
      {form === 'event' && <HealthRecordForm pet={pet} onClose={() => setForm(null)} onDone={done(events.reload)} />}
      {vDose.dialog}
      {vTreat.dialog}
      {vEvent.dialog}
    </div>
  );
}

// ---------- Alimentación ----------

export function FeedingTab({ pet, canWrite, canVoid, onNotice }) {
  const [showVoided, setShowVoided] = useState(false);
  const [form, setForm] = useState(false);
  const meals = useRecords(pet.id, 'meals', showVoided);
  const v = useVoid(pet.id, 'meals', {
    onDone: () => (meals.reload(), onNotice('Comida anulada. Sigue en el historial como anulada.')),
    describe: (m) => `la comida «${m.food}»`,
  });

  return (
    <section className="tab-section" aria-labelledby="meals-title">
      <SectionHead id="meals-title" title="Comidas" count={meals.items?.length} action={<AddButton show={canWrite} onClick={() => setForm(true)}>Registrar comida</AddButton>} />
      <VoidedToggle checked={showVoided} onChange={setShowVoided} />
      <RecordList
        records={meals}
        canVoid={canVoid}
        onVoid={v.askVoid}
        voidLabel={(m) => m.food}
        empty={
          <EmptyRecords title="Sin comidas registradas" actionLabel="Registrar comida" onAction={canWrite ? () => setForm(true) : null}>
            Anota qué come {pet.name} y cuánto, para ver sus hábitos.
          </EmptyRecords>
        }
        renderItem={(m) => (
          <>
            <p className="record-title">{m.food}</p>
            <p className="record-meta">
              {m.quantity ? `${m.quantity}, ` : ''}
              {formatWhen(m.occurredAt)}
            </p>
            {m.notes && <p className="record-notes">{m.notes}</p>}
          </>
        )}
      />
      {form && (
        <PetMealForm
          pet={pet}
          onClose={() => setForm(false)}
          onDone={(msg) => {
            setForm(false);
            onNotice(msg);
            meals.reload();
          }}
        />
      )}
      {v.dialog}
    </section>
  );
}

// ---------- Peso ----------

export function WeightTab({ pet, canWrite, canVoid, onNotice, onPetChanged }) {
  const [showVoided, setShowVoided] = useState(false);
  const [form, setForm] = useState(false);
  const weights = useRecords(pet.id, 'weights', showVoided);
  const v = useVoid(pet.id, 'weights', {
    onDone: () => {
      weights.reload();
      onPetChanged();
      onNotice('Peso anulado. El peso actual pasa a la medición anterior.');
    },
    describe: (w) => `la medición de ${formatKg(w.weightKg)}`,
  });
  const active = weights.items?.filter((w) => w.status === 'ACTIVE') ?? [];
  // Diferencia con la medición activa anterior (la lista viene de la más reciente a la más antigua)
  const delta = (w) => {
    const i = active.indexOf(w);
    const prev = i >= 0 ? active[i + 1] : null;
    if (!prev) return null;
    const d = Math.round((Number(w.weightKg) - Number(prev.weightKg)) * 100) / 100;
    if (d === 0) return <Chip tone="neutral">Sin cambio</Chip>;
    return <Chip tone="clay">{`${d > 0 ? '+' : '−'}${formatKg(Math.abs(d))}`}</Chip>;
  };

  return (
    <section className="tab-section" aria-labelledby="weights-title">
      <SectionHead id="weights-title" title="Peso" action={<AddButton show={canWrite} onClick={() => setForm(true)}>Registrar peso</AddButton>} />
      {active.length > 0 && (
        <div className="panel">
          <WeightChart records={active} petName={pet.name} />
        </div>
      )}
      <h3 className="tab-subtitle">Historial</h3>
      <VoidedToggle checked={showVoided} onChange={setShowVoided} />
      <RecordList
        records={weights}
        canVoid={canVoid}
        onVoid={v.askVoid}
        voidLabel={(w) => formatKg(w.weightKg)}
        empty={
          <EmptyRecords title="Sin pesos registrados" actionLabel="Registrar peso" onAction={canWrite ? () => setForm(true) : null}>
            Registra el peso de {pet.name} para ver cómo cambia con el tiempo.
          </EmptyRecords>
        }
        renderItem={(w) => (
          <>
            <p className="record-title record-weight">{formatKg(w.weightKg)}</p>
            <p className="record-meta">{formatWhen(w.occurredAt)}</p>
            {w.status === 'ACTIVE' && <div className="record-chips">{delta(w)}</div>}
            {w.notes && <p className="record-notes">{w.notes}</p>}
          </>
        )}
      />
      {form && (
        <PetWeightForm
          pet={pet}
          onClose={() => setForm(false)}
          onDone={(msg) => {
            setForm(false);
            onNotice(msg);
            weights.reload();
            onPetChanged();
          }}
        />
      )}
      {v.dialog}
    </section>
  );
}

// ---------- Bienestar ----------

const MOOD_TONE = { VERY_BAD: 'rose', BAD: 'rose', NORMAL: 'clay', GOOD: 'sage', VERY_GOOD: 'sage' };

export function WellbeingTab({ pet, canWrite, canVoid, onNotice }) {
  const [showVoided, setShowVoided] = useState(false);
  const [form, setForm] = useState(false);
  const logs = useRecords(pet.id, 'wellbeing', showVoided);
  const v = useVoid(pet.id, 'wellbeing', {
    onDone: () => (logs.reload(), onNotice('Registro anulado. Sigue en el historial como anulado.')),
    describe: (l) => `el registro de ánimo «${MOOD[l.mood]}» del ${formatWhen(l.occurredAt)}`,
  });

  return (
    <section className="tab-section" aria-labelledby="wellbeing-title">
      <SectionHead id="wellbeing-title" title="Ánimo y comportamiento" count={logs.items?.length} action={<AddButton show={canWrite} onClick={() => setForm(true)}>Registrar</AddButton>} />
      <VoidedToggle checked={showVoided} onChange={setShowVoided} />
      <RecordList
        records={logs}
        canVoid={canVoid}
        onVoid={v.askVoid}
        voidLabel={(l) => MOOD[l.mood]}
        empty={
          <EmptyRecords title="Sin registros de bienestar" actionLabel="Registrar bienestar" onAction={canWrite ? () => setForm(true) : null}>
            Anota cómo ves a {pet.name}: ánimo, energía, apetito y comportamiento.
          </EmptyRecords>
        }
        renderItem={(l) => (
          <>
            <p className="record-title">
              <Icon name="smile" size={20} className="record-title-icon" />
              {label(MOOD, l.mood)}
            </p>
            <p className="record-meta">{formatWhen(l.occurredAt)}</p>
            <div className="record-chips">
              <Chip tone={MOOD_TONE[l.mood]}>Ánimo: {label(MOOD, l.mood).toLowerCase()}</Chip>
              {l.energy && <Chip tone="neutral">Energía: {label(LEVEL_FEMININE, l.energy).toLowerCase()}</Chip>}
              {l.appetite && <Chip tone="neutral">Apetito: {label(LEVEL, l.appetite).toLowerCase()}</Chip>}
            </div>
            {l.notes && <p className="record-notes">{l.notes}</p>}
          </>
        )}
      />
      {form && (
        <WellbeingForm
          pet={pet}
          onClose={() => setForm(false)}
          onDone={(msg) => {
            setForm(false);
            onNotice(msg);
            logs.reload();
          }}
        />
      )}
      {v.dialog}
    </section>
  );
}

