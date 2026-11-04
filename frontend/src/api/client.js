// Cliente HTTP único del frontend. Todas las pantallas hablan con el backend a través de aquí.

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

const TOKEN_KEY = 'petcare.token';

// Token en sessionStorage: se borra al cerrar la pestaña y no queda en disco.
// Tradeoff: cualquier JavaScript que corra en la página (un ataque XSS) puede leerlo, igual que con localStorage.
// Una cookie HttpOnly lo evitaría, pero el backend usa el header Authorization (CORS sin credenciales).
// Por eso mantenemos el token fuera del estado de React, no lo registramos en consola y escapamos todo lo que se muestra.
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

/** Error normalizado: siempre {status, message, errors}. status 0 = sin conexión. */
export class ApiError extends Error {
  constructor({ status, message, errors = {}, retryAfter = null }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

// AuthContext registra aquí qué hacer cuando el backend responde 401 con un token enviado
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const GENERIC_MESSAGES = {
  400: 'La solicitud no es válida. Revisa los datos.',
  401: 'Tu sesión terminó. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No encontramos lo que buscas.',
  409: 'No se pudo completar por un conflicto con los datos existentes.',
  429: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
};

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * request('/api/...', { method, body, auth, signal })
 * auth=false para rutas públicas (login y registro): un 401 ahí es "credenciales inválidas", no sesión vencida.
 */
export async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = auth ? tokenStore.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError({
      status: 0,
      message: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
    });
  }

  const data = await parseBody(response);

  if (!response.ok) {
    const status = data?.status ?? response.status;
    const error = new ApiError({
      status,
      message: data?.message || GENERIC_MESSAGES[status] || 'Ocurrió un error inesperado. Intenta de nuevo.',
      errors: data?.errors || {},
      retryAfter: Number(response.headers.get('Retry-After')) || null,
    });
    if (status === 401 && token && unauthorizedHandler) unauthorizedHandler();
    throw error;
  }

  return data;
}
