import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, usersApi } from '../api/services.js';
import { setUnauthorizedHandler, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

// Solo se lee exp para no usar un token vencido; el backend es quien valida el JWT.
function tokenIsUsable(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function initialToken() {
  const token = tokenStore.get();
  if (token && tokenIsUsable(token)) return token;
  tokenStore.clear();
  return null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(initialToken);
  // user = {id, fullName, email} de GET /api/users/me
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    tokenStore.clear();
    sessionStorage.removeItem('petcare.householdId');
    setToken(null);
    setUser(null);
  }, []);

  // Un 401 en una petición con token (sesión vencida) cierra sesión; las rutas protegidas redirigen a /login
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Con token (nuevo o al recargar la página) pedimos el usuario real
  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    usersApi
      .me(controller.signal)
      .then(setUser)
      .catch((err) => {
        if (err.name !== 'AbortError' && err.status !== 401) setUser({ id: null, fullName: '', email: '' });
      });
    return () => controller.abort();
  }, [token]);

  const login = useCallback(async ({ email, password }) => {
    const { accessToken } = await authApi.login({ email, password });
    tokenStore.set(accessToken);
    setUser(null);
    setToken(accessToken);
  }, []);

  const register = useCallback(
    async ({ fullName, email, password }) => {
      await authApi.register({ fullName, email, password });
      await login({ email, password });
    },
    [login],
  );

  // PUT /api/users/me: el nombre nuevo se refleja en el saludo y en el bloque de usuario
  const updateName = useCallback(async (fullName) => {
    const updated = await usersApi.updateMe(fullName);
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(token), login, register, logout, updateName }),
    [user, token, login, register, logout, updateName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
