import { useCallback, useEffect, useState } from 'react';
import { dashboardApi, householdsApi, petsApi, tasksApi } from '../../api/services.js';

/**
 * Todo lo que necesita el Inicio para un hogar, en paralelo:
 * panel, mascotas (para edad y raza), tareas vencidas, tareas de los próximos 7 días y miembros.
 * reload() vuelve a pedir los datos sin vaciar la pantalla.
 */
export function useHomeData(householdId) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!householdId) return undefined;
    const controller = new AbortController();
    const { signal } = controller;

    setState((s) =>
      s.data?.householdId === householdId ? { ...s, refreshing: true } : { status: 'loading', data: null, error: null },
    );

    Promise.all([
      dashboardApi.get(householdId, signal),
      petsApi.list(householdId, signal),
      tasksApi.listForHousehold(householdId, { range: 'overdue' }, signal),
      tasksApi.listForHousehold(householdId, { range: 'upcoming', days: 7 }, signal),
      householdsApi.members(householdId, signal),
    ])
      .then(([dashboard, pets, overdue, upcoming, members]) => {
        // Ficha completa (birthDate, breed, sex) + datos del panel (último peso, próxima tarea)
        const byId = new Map(pets.map((p) => [p.id, p]));
        const petCards = dashboard.pets.map((card) => ({ ...byId.get(card.id), ...card }));
        setState({
          status: 'ready',
          error: null,
          refreshing: false,
          data: { householdId, dashboard, pets: petCards, overdue, upcoming, members },
        });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState((s) => ({ ...s, status: s.data ? 'ready' : 'error', error, refreshing: false }));
      });

    return () => controller.abort();
  }, [householdId, version]);

  return { ...state, reload };
}
