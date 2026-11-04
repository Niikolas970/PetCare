import { request } from './client.js';

// Rutas y campos exactos de los controladores del backend.

export const authApi = {
  // POST /api/auth/register  {fullName, email, password} -> {id, fullName, email, householdId}
  register: ({ fullName, email, password }) =>
    request('/api/auth/register', { method: 'POST', body: { fullName, email, password }, auth: false }),

  // POST /api/auth/login  {email, password} -> {accessToken, tokenType, expiresInSeconds}
  login: ({ email, password }) =>
    request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
};

export const usersApi = {
  // GET /api/users/me -> {id, fullName, email}
  me: (signal) => request('/api/users/me', { signal }),
};

export const householdsApi = {
  // GET /api/households -> [{id, name, myRole, activePetsCount}]
  listMine: (signal) => request('/api/households', { signal }),
  // GET /api/households/{id}/members -> [{userId, fullName, email, role, status, joinedAt}]
  members: (householdId, signal) => request(`/api/households/${householdId}/members`, { signal }),
};

export const dashboardApi = {
  // GET /api/households/{householdId}/dashboard
  // -> {householdId, householdName, timezone, today, activePetsCount, upcomingDays, upcomingTasksCount,
  //     overdueTasksCount, pets: [{id, name, species, lastWeightKg, lastWeightAt, nextTask}], recentActivity}
  get: (householdId, signal) => request(`/api/households/${householdId}/dashboard`, { signal }),
};

export const tasksApi = {
  // GET /api/households/{householdId}/tasks?range=upcoming|overdue|all&days=N -> [CareTaskResponse]
  listForHousehold: (householdId, { range, days } = {}, signal) => {
    const params = new URLSearchParams();
    if (range) params.set('range', range);
    if (days) params.set('days', String(days));
    return request(`/api/households/${householdId}/tasks?${params}`, { signal });
  },
  // GET /api/pets/{petId}/tasks?status=PENDING
  listForPet: (petId, status, signal) =>
    request(`/api/pets/${petId}/tasks${status ? `?status=${status}` : ''}`, { signal }),
  // POST /api/pets/{petId}/tasks  {type, title, dueAt, location, notes}
  create: (petId, { type, title, dueAt, location, notes }) =>
    request(`/api/pets/${petId}/tasks`, { method: 'POST', body: { type, title, dueAt, location, notes } }),
  // PATCH /api/pets/{petId}/tasks/{id}/complete  (cuerpo opcional: se completa con la hora del hogar)
  complete: (petId, taskId) => request(`/api/pets/${petId}/tasks/${taskId}/complete`, { method: 'PATCH' }),
};

export const petsApi = {
  // GET /api/pets?householdId=&status=ACTIVE|ARCHIVED -> [Pet]
  // (id, householdId, name, species, breed, sex, birthDate, birthDateIsEstimated, weightKg, notes, status)
  list: (householdId, signal, status = 'ACTIVE') =>
    request(`/api/pets?householdId=${householdId}&status=${status}`, { signal }),
  // GET /api/pets/{id} (también si está archivada)
  get: (id, signal) => request(`/api/pets/${id}`, { signal }),
  // POST /api/pets {householdId, name, species, breed, sex, birthDate, birthDateIsEstimated, weightKg, notes}
  create: (body) => request('/api/pets', { method: 'POST', body }),
  // PUT /api/pets/{id} {name, species, breed, sex, birthDate, birthDateIsEstimated, weightKg, notes}; 409 si está archivada
  update: (id, body) => request(`/api/pets/${id}`, { method: 'PUT', body }),
  // PATCH /api/pets/{id}/archive y /restore (solo OWNER; 403 para CAREGIVER)
  archive: (id) => request(`/api/pets/${id}/archive`, { method: 'PATCH' }),
  restore: (id) => request(`/api/pets/${id}/restore`, { method: 'PATCH' }),
  // GET /api/pets/{petId}/timeline?types=  -> [{type, id, petId, petName, date, title, summary, createdBy}]
  timeline: (petId, types, signal) =>
    request(`/api/pets/${petId}/timeline${types ? `?types=${types}` : ''}`, { signal }),
};

/**
 * Registros de la mascota. kind = segmento exacto de la ruta:
 * health-records | doses | treatments | meals | weights | wellbeing
 */
export const recordsApi = {
  // GET /api/pets/{petId}/{kind}?includeVoided=true
  list: (petId, kind, includeVoided, signal) =>
    request(`/api/pets/${petId}/${kind}${includeVoided ? '?includeVoided=true' : ''}`, { signal }),
  // POST /api/pets/{petId}/{kind}
  create: (petId, kind, body) => request(`/api/pets/${petId}/${kind}`, { method: 'POST', body }),
  // PATCH /api/pets/{petId}/{kind}/{id}/void {reason} (solo OWNER)
  void: (petId, kind, id, reason) =>
    request(`/api/pets/${petId}/${kind}/${id}/void`, { method: 'PATCH', body: { reason: reason || null } }),

  // Atajos usados por el Inicio
  meal: (petId, { food, quantity, notes }) =>
    request(`/api/pets/${petId}/meals`, { method: 'POST', body: { food, quantity, notes } }),
  weight: (petId, { weightKg, notes }) =>
    request(`/api/pets/${petId}/weights`, { method: 'POST', body: { weightKg, notes } }),
};
