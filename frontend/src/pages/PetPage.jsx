import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { petsApi, tasksApi } from '../api/services.js';
import Chip from '../components/Chip.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';
import PetAvatar from '../components/PetAvatar.jsx';
import { CARE_TASK_TYPE, SEX, label } from '../i18n/labels.js';
import { dueLabel, formatDay, formatKg, formatTime, petAge, taskStyle } from './careFormat.js';

// Fecha local del navegador; la ficha no recibe la fecha del hogar
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Ficha básica de la mascota: datos y cuidados pendientes. */
export default function PetPage() {
  const { id } = useParams();
  const [state, setState] = useState({ pet: null, tasks: [], error: null });
  const today = localToday();

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([petsApi.get(id, controller.signal), tasksApi.listForPet(id, 'PENDING', controller.signal)])
      .then(([pet, tasks]) => setState({ pet, tasks, error: null }))
      .catch((error) => error.name !== 'AbortError' && setState({ pet: null, tasks: [], error }));
    return () => controller.abort();
  }, [id]);

  const { pet, tasks, error } = state;

  return (
    <div className="page pet-page">
      <Link to="/" className="back-link">
        <Icon name="arrow-right" size={20} className="back-icon" />
        Volver al inicio
      </Link>

      {error && <ErrorMessage title="No pudimos abrir la ficha">{error.message}</ErrorMessage>}
      {!error && !pet && <Loader block text="Cargando la ficha…" />}

      {pet && (
        <>
          <header className="pet-hero">
            <PetAvatar species={pet.species} size={96} />
            <div>
              <h1 className="home-title">{pet.name}</h1>
              <p className="pet-hero-sub">{[pet.species, pet.breed].filter(Boolean).join(', ')}</p>
              <div className="pet-facts">
                <Chip>{label(SEX, pet.sex)}</Chip>
                {pet.birthDate && <Chip icon="clock">{petAge(pet.birthDate, today, pet.birthDateIsEstimated)}</Chip>}
                {pet.weightKg != null && <Chip icon="scale">{formatKg(pet.weightKg)}</Chip>}
              </div>
            </div>
          </header>

          {pet.notes && (
            <section className="panel">
              <h2 className="section-title">Notas</h2>
              <p className="pet-notes">{pet.notes}</p>
            </section>
          )}

          <section className="home-section" aria-labelledby="pet-tasks-title">
            <h2 id="pet-tasks-title" className="section-title">
              Cuidados pendientes
            </h2>
            {tasks.length === 0 ? (
              <div className="panel">
                <EmptyState art="done" title="Sin cuidados pendientes">
                  Cuando agendes una cita o un recordatorio para {pet.name}, aparecerá aquí.
                </EmptyState>
              </div>
            ) : (
              <ul className="panel care-list">
                {tasks.map((t) => {
                  const style = taskStyle(t.type);
                  const due = dueLabel(t, today);
                  return (
                    <li key={t.id} className="care-row">
                      <div className="care-row-inner care-row-static">
                        <span className={`tile tile-${style.tone}`}>
                          <Icon name={style.icon} size={24} />
                        </span>
                        <div className="care-main">
                          <p className="care-title">{t.title}</p>
                          <p className="care-sub">
                            {label(CARE_TASK_TYPE, t.type)}, {formatDay(t.dueAt)}, {formatTime(t.dueAt)}
                          </p>
                        </div>
                        <Chip tone={due.tone} className="care-due">
                          {due.text}
                        </Chip>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
