import { useCallback, useEffect, useState } from 'react';
import { householdsApi } from '../api/services.js';
import { useAuth } from '../auth/AuthContext.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';
import Select from '../components/Select.jsx';
import Toast from '../components/Toast.jsx';
import { firstName, greeting, groupTasks, plural } from './careFormat.js';
import CareSection from './home/CareSection.jsx';
import PetsSection from './home/PetsSection.jsx';
import { AddPetForm, MealForm, TaskForm, WeightForm } from './home/QuickForms.jsx';
import { HouseholdPanel, QuickActions, WeekStrip } from './home/SidePanels.jsx';
import { useHomeData } from './home/useHomeData.js';

const HOUSEHOLD_KEY = 'petcare.householdId';

const longDate = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

function Summary({ households, householdId, onHousehold, dashboard, groups }) {
  const todayCount = groups.today.length;
  const nextCount = groups.next.length;
  const late = groups.overdue.length;

  let care;
  if (todayCount === 0 && nextCount === 0) care = 'No hay cuidados programados para esta semana.';
  else if (todayCount === 0) care = `Hoy no hay cuidados; esta semana vienen ${nextCount}.`;
  else care = `Hoy toca ${plural(todayCount, 'cuidado', 'cuidados')}${nextCount ? ` y esta semana vienen ${nextCount} más` : ''}.`;

  return (
    <section className="summary" aria-labelledby="summary-title">
      <div className="summary-top">
        <h2 id="summary-title" className="summary-title">
          {dashboard.householdName}
        </h2>
        {households.length > 1 && (
          <Select label="Cambiar de hogar" value={householdId} onChange={onHousehold} className="summary-select">
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <p className="summary-text">
        {dashboard.activePetsCount === 0
          ? 'Todavía no hay mascotas en este hogar.'
          : `${plural(dashboard.activePetsCount, 'mascota activa', 'mascotas activas')}. ${care}`}
      </p>
      {late > 0 ? (
        <a href="#grupo-vencidos" className="summary-alert pressable">
          <Icon name="alert" size={20} />
          Ver {plural(late, 'cuidado vencido', 'cuidados vencidos')}
        </a>
      ) : (
        dashboard.activePetsCount > 0 && <p className="script summary-note">Todo al día por aquí</p>
      )}
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [households, setHouseholds] = useState(null);
  const [householdsError, setHouseholdsError] = useState(null);
  const [householdId, setHouseholdId] = useState(() => Number(sessionStorage.getItem(HOUSEHOLD_KEY)) || null);
  const [dialog, setDialog] = useState(null); // 'meal' | 'weight' | 'task' | 'pet'
  const [notice, setNotice] = useState(null);
  const [householdsVersion, setHouseholdsVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    householdsApi
      .listMine(controller.signal)
      .then((list) => {
        setHouseholdsError(null);
        setHouseholds(list);
        setHouseholdId((current) => (list.some((h) => h.id === current) ? current : (list[0]?.id ?? null)));
      })
      .catch((err) => err.name !== 'AbortError' && setHouseholdsError(err));
    return () => controller.abort();
  }, [householdsVersion]);

  useEffect(() => {
    if (householdId) sessionStorage.setItem(HOUSEHOLD_KEY, String(householdId));
  }, [householdId]);

  const home = useHomeData(householdId);
  const data = home.data;

  const showNotice = useCallback((text, tone = 'ok') => setNotice({ id: Date.now(), text, tone }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  function finishDialog(message) {
    setDialog(null);
    showNotice(message);
    home.reload();
  }

  const name = firstName(user?.fullName);
  const error = householdsError || home.error;

  return (
    <div className="home">
      <header className="home-greeting">
        <h1 className="home-title">
          {greeting()}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="home-date">
          {data ? longDate.format(new Date(`${data.dashboard.today}T12:00:00Z`)) : ' '}
        </p>
      </header>

      {error && (
        <ErrorMessage
          title="No pudimos cargar tu hogar"
          onRetry={() => (householdsError ? setHouseholdsVersion((v) => v + 1) : home.reload())}
        >
          {error.message}
        </ErrorMessage>
      )}

      {households && households.length === 0 && (
        <EmptyState art="paw" title="Todavía no tienes un hogar">
          Cuando aceptes una invitación, el hogar aparecerá aquí.
        </EmptyState>
      )}

      {!error && (!households || (households.length > 0 && !data)) && <Loader block text="Cargando tu hogar…" />}

      {data && households && (
        <div className="home-grid" aria-busy={home.refreshing || undefined}>
          <div className="home-main">
            <Summary
              households={households}
              householdId={householdId}
              onHousehold={(e) => setHouseholdId(Number(e.target.value))}
              dashboard={data.dashboard}
              groups={groupTasks(data.overdue, data.upcoming, data.dashboard.today)}
            />
            <PetsSection pets={data.pets} today={data.dashboard.today} onAddPet={() => setDialog('pet')} />
            <CareSection
              key={data.householdId}
              overdue={data.overdue}
              upcoming={data.upcoming}
              today={data.dashboard.today}
              onChanged={home.reload}
              onNotice={showNotice}
            />
          </div>
          <aside className="home-side" aria-label="Accesos y resumen de la semana">
            <QuickActions disabled={data.pets.length === 0} onAction={setDialog} />
            <WeekStrip today={data.dashboard.today} tasks={data.upcoming.filter((t) => !t.overdue)} />
            <HouseholdPanel name={data.dashboard.householdName} members={data.members} />
          </aside>
        </div>
      )}

      {data && dialog === 'meal' && <MealForm open pets={data.pets} onClose={() => setDialog(null)} onDone={finishDialog} />}
      {data && dialog === 'weight' && <WeightForm open pets={data.pets} onClose={() => setDialog(null)} onDone={finishDialog} />}
      {data && dialog === 'task' && (
        <TaskForm open pets={data.pets} today={data.dashboard.today} onClose={() => setDialog(null)} onDone={finishDialog} />
      )}
      {data && dialog === 'pet' && (
        <AddPetForm
          open
          householdId={data.householdId}
          today={data.dashboard.today}
          onClose={() => setDialog(null)}
          onDone={finishDialog}
        />
      )}

      <Toast notice={notice} onDismiss={dismissNotice} />
    </div>
  );
}
