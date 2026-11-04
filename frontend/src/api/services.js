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
  // GET /api/pets?householdId= -> [Pet] (id, householdId, name, species, breed, sex, birthDate, weightKg, status...)
  list: (householdId, signal) => request(`/api/pets?householdId=${householdId}`, { signal }),
  // GET /api/pets/{id}
  get: (id, signal) => request(`/api/pets/${id}`, { signal }),
  // POST /api/pets {householdId, name, species, breed, sex, birthDate, birthDateIsEstimated, weightKg, notes}
  create: (body) => request('/api/pets', { method: 'POST', body }),
};

export const recordsApi = {
  // POST /api/pets/{petId}/meals {food, quantity, occurredAt, notes}
  meal: (petId, { food, quantity, notes }) =>
    request(`/api/pets/${petId}/meals`, { method: 'POST', body: { food, quantity, notes } }),
  // POST /api/pets/{petId}/weights {weightKg, occurredAt, notes}
  weight: (petId, { weightKg, notes }) =>
    request(`/api/pets/${petId}/weights`, { method: 'POST', body: { weightKg, notes } }),
};
