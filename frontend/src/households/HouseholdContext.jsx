import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { householdsApi } from '../api/services.js';

const HouseholdContext = createContext(null);
const KEY = 'petcare.householdId';

/**
 * Hogares del usuario (GET /api/households, con myRole) y el hogar elegido,
 * compartidos por Inicio y Mascotas. El elegido se recuerda en la sesión.
 */
export function HouseholdProvider({ children }) {
  const [households, setHouseholds] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedIdState] = useState(() => Number(sessionStorage.getItem(KEY)) || null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    householdsApi
      .listMine(controller.signal)
      .then((list) => {
        setError(null);
        setHouseholds(list);
        setSelectedIdState((current) => (list.some((h) => h.id === current) ? current : (list[0]?.id ?? null)));
      })
      .catch((err) => err.name !== 'AbortError' && setError(err));
    return () => controller.abort();
  }, [version]);

  useEffect(() => {
    if (selectedId) sessionStorage.setItem(KEY, String(selectedId));
  }, [selectedId]);

  const setSelectedId = useCallback((id) => setSelectedIdState(Number(id)), []);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(() => {
    const current = households?.find((h) => h.id === selectedId) ?? null;
    return {
      households,
      error,
      selectedId,
      current,
      setSelectedId,
      reload,
      // Rol del usuario en un hogar concreto (para la ficha de una mascota de otro hogar)
      roleIn: (householdId) => households?.find((h) => h.id === householdId)?.myRole ?? null,
      // Zona horaria de un hogar (para "hoy" y "ahora"); America/Bogota si aún no se conoce
      timezoneOf: (householdId) => households?.find((h) => h.id === householdId)?.timezone ?? 'America/Bogota',
    };
  }, [households, error, selectedId, setSelectedId, reload]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHouseholds() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHouseholds debe usarse dentro de HouseholdProvider');
  return ctx;
}
