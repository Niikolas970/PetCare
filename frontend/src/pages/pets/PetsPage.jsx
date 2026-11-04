import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, petsApi } from '../../api/services.js';
import Button from '../../components/Button.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Icon from '../../components/Icon.jsx';
import Loader from '../../components/Loader.jsx';
import PetCard from '../../components/PetCard.jsx';
import Select from '../../components/Select.jsx';
import { useHouseholds } from '../../households/HouseholdContext.jsx';
import { todayIn } from '../careFormat.js';
import PetFormDialog from './PetFormDialog.jsx';

const FILTERS = [
  { id: 'ACTIVE', label: 'Activas' },
  { id: 'ARCHIVED', label: 'Archivadas' },
];

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** /mascotas: mascotas del hogar elegido, activas o archivadas, con búsqueda por nombre. */
export default function PetsPage() {
  const { households, selectedId, setSelectedId, current, error: householdsError, reload: reloadHouseholds } = useHouseholds();
  const navigate = useNavigate();
  const [status, setStatus] = useState('ACTIVE');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ pets: null, today: null, error: null });
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!selectedId) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    setState((s) => ({ ...s, pets: null, error: null }));
    // Activas: se completan con último peso y próximo cuidado del panel del hogar (igual que en el Inicio)
    const load =
      status === 'ACTIVE'
        ? Promise.all([petsApi.list(selectedId, signal, 'ACTIVE'), dashboardApi.get(selectedId, signal)]).then(([pets, dash]) => {
            const cards = new Map(dash.pets.map((c) => [c.id, c]));
            return { pets: pets.map((p) => ({ ...p, ...cards.get(p.id) })), today: dash.today };
          })
        : petsApi.list(selectedId, signal, 'ARCHIVED').then((pets) => ({ pets, today: todayIn(current?.timezone) }));
    load
      .then(({ pets, today }) => setState({ pets, today, error: null }))
      .catch((error) => error.name !== 'AbortError' && setState((s) => ({ ...s, error })));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, status, version]);

  const visible = useMemo(() => {
    if (!state.pets) return [];
    const q = normalize(query);
    return q ? state.pets.filter((p) => normalize(p.name).includes(q)) : state.pets;
  }, [state.pets, query]);

  const error = householdsError || state.error;

  return (
    <div className="page pets-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Mascotas</h1>
          {current && <p className="page-subtitle">{current.name}</p>}
        </div>
        <Button icon="plus" onClick={() => setAdding(true)} disabled={!selectedId}>
          Agregar mascota
        </Button>
      </header>

      <div className="pets-toolbar">
        <div className="segmented" role="group" aria-label="Estado de las mascotas">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="segmented-option"
              aria-pressed={status === f.id}
              onClick={() => setStatus(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="search">
          <label htmlFor="pet-search" className="sr-only">
            Buscar por nombre
          </label>
          <Icon name="search" size={20} className="search-icon" />
          <input
            id="pet-search"
            type="search"
            className="field-input search-input"
            placeholder="Buscar por nombre"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        {households && households.length > 1 && (
          <Select label="Hogar" hideLabel value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)} className="pets-household">
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {error && (
        <ErrorMessage title="No pudimos cargar las mascotas" onRetry={() => (householdsError ? reloadHouseholds() : setVersion((v) => v + 1))}>
          {error.message}
        </ErrorMessage>
      )}

      {!error && !state.pets && <Loader block text="Cargando mascotas…" />}

      {state.pets && (
        <>
          <p className="sr-only" role="status" aria-live="polite">
            {visible.length === 1 ? '1 mascota' : `${visible.length} mascotas`}
          </p>
          {visible.length > 0 ? (
            <ul className="pet-grid pets-list">
              {visible.map((pet, i) => (
                <PetCard key={pet.id} pet={pet} today={state.today} index={i} />
              ))}
            </ul>
          ) : (
            <div className="panel">
              {query ? (
                <EmptyState
                  art="paw"
                  title={`Ninguna mascota se llama «${query.trim()}»`}
                  action={
                    <Button variant="soft" onClick={() => setQuery('')} className="empty-action">
                      Limpiar búsqueda
                    </Button>
                  }
                >
                  Revisa el nombre o busca entre las {status === 'ACTIVE' ? 'archivadas' : 'activas'}.
                </EmptyState>
              ) : status === 'ACTIVE' ? (
                <EmptyState
                  art="paw"
                  title="Aún no hay mascotas en este hogar"
                  action={
                    <Button icon="plus" onClick={() => setAdding(true)} className="empty-action">
                      Agregar mascota
                    </Button>
                  }
                >
                  Registra a tu primera mascota para llevar su salud, comidas y cuidados.
                </EmptyState>
              ) : (
                <EmptyState
                  art="done"
                  title="No hay mascotas archivadas"
                  action={
                    <Button variant="soft" onClick={() => setStatus('ACTIVE')} className="empty-action">
                      Ver activas
                    </Button>
                  }
                >
                  Cuando archives una mascota, su historial se guarda y aparece aquí.
                </EmptyState>
              )}
            </div>
          )}
        </>
      )}

      {adding && (
        <PetFormDialog
          open
          householdId={selectedId}
          today={state.today ?? todayIn(current?.timezone)}
          onClose={() => setAdding(false)}
          onDone={(pet) => {
            setAdding(false);
            reloadHouseholds();
            navigate(`/mascotas/${pet.id}`, { state: { notice: `${pet.name} ya es parte del hogar.` } });
          }}
        />
      )}
    </div>
  );
}
