#!/usr/bin/env node
// =====================================================
// PetCare - Cuenta de demostración
// Crea, usando solo la API REST, una cuenta con su hogar, 3 mascotas y ~2 meses de registros
// (pesos, comidas, bienestar, vacunas, un tratamiento, consultas y cuidados) para mostrar la app.
//
// Uso (PowerShell, con el backend corriendo):
//   $env:PETCARE_DEMO_PASSWORD = "<contraseña de 8 a 128 caracteres>"
//   node scripts/seed-demo.mjs
//
// Variables de entorno:
//   PETCARE_DEMO_PASSWORD  (obligatoria) contraseña de la cuenta demo. Nunca se escribe en el código.
//   PETCARE_DEMO_EMAIL     (opcional) por defecto demo@petcare.example
//   PETCARE_API_URL        (opcional) por defecto http://localhost:8080
//
// Requiere Node 18+ (fetch nativo). No usa dependencias. Si el correo ya existe, se detiene sin tocar nada.
// =====================================================

const API = (process.env.PETCARE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const EMAIL = (process.env.PETCARE_DEMO_EMAIL || 'demo@petcare.example').trim().toLowerCase();
const PASSWORD = process.env.PETCARE_DEMO_PASSWORD;
const FULL_NAME = 'Mariana Restrepo';

if (!PASSWORD || PASSWORD.length < 8 || PASSWORD.length > 128) {
  console.error('Falta PETCARE_DEMO_PASSWORD (entre 8 y 128 caracteres). Defínela como variable de entorno y vuelve a ejecutar.');
  process.exit(1);
}

let token = null;
let requests = 0;

async function api(method, path, body, { expect } = {}) {
  requests += 1;
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`No se pudo conectar con ${API}. ¿Está corriendo el backend?`);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (expect && res.status !== expect) {
    const err = new Error(`${method} ${path} respondió ${res.status}: ${data?.message ?? text}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Fechas (hora local del hogar) ----------
let TODAY; // "YYYY-MM-DD" según el backend
function day(offset, time = '09:00') {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return `${d.toISOString().slice(0, 10)}T${time}:00`;
}
const date = (offset) => day(offset).slice(0, 10);
const round = (n, decimals = 2) => Math.round(n * 10 ** decimals) / 10 ** decimals;

async function main() {
  console.log(`API: ${API}`);
  console.log(`Creando la cuenta demo ${EMAIL}…`);

  try {
    await api('POST', '/api/auth/register', { fullName: FULL_NAME, email: EMAIL, password: PASSWORD }, { expect: 201 });
  } catch (err) {
    if (err.status === 409) {
      console.error(`Ya existe una cuenta con ${EMAIL}. No se modificó nada.`);
      console.error('Usa otro PETCARE_DEMO_EMAIL o entra con la cuenta existente.');
      process.exit(2);
    }
    throw err;
  }
  token = (await api('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD }, { expect: 200 })).accessToken;

  const [household] = await api('GET', '/api/households', undefined, { expect: 200 });
  await api('PUT', `/api/households/${household.id}`, { name: 'Casa de Mariana', timezone: 'America/Bogota' }, { expect: 200 });
  TODAY = (await api('GET', `/api/households/${household.id}/dashboard`, undefined, { expect: 200 })).today;

  // ---------- Mascotas ----------
  const pet = (body) => api('POST', '/api/pets', { householdId: household.id, ...body }, { expect: 201 });
  const luna = await pet({
    name: 'Luna', species: 'Perro', breed: 'Labrador', sex: 'FEMALE', birthDate: '2021-03-14', weightKg: 25.2,
    notes: 'Le encanta nadar. Alérgica al pollo.',
  });
  const milo = await pet({ name: 'Milo', species: 'Gato', breed: 'Siamés', sex: 'MALE', birthDate: '2022-08-02', weightKg: 4.4 });
  const kiwi = await pet({
    name: 'Kiwi', species: 'Conejo', breed: 'Mini lop', sex: 'FEMALE', birthDate: '2024-01-15', birthDateIsEstimated: true, weightKg: 1.7,
  });
  console.log('Mascotas: Luna, Milo y Kiwi.');

  const record = (p, kind, body) => api('POST', `/api/pets/${p.id}/${kind}`, body, { expect: 201 });

  // ---------- Pesos: cada semana durante 2 meses ----------
  const weightPlan = [
    [luna, 25.2, 26.1],
    [milo, 4.4, 4.7],
    [kiwi, 1.7, 1.95],
  ];
  for (const [p, start, end] of weightPlan) {
    for (let w = 8; w >= 0; w -= 1) {
      const progress = (8 - w) / 8;
      const jitter = ((w * 37) % 5 - 2) * (end - start) * 0.04;
      await record(p, 'weights', { weightKg: round(start + (end - start) * progress + jitter), occurredAt: day(-w * 7, '08:15') });
    }
  }
  console.log('Pesos semanales registrados.');

  // ---------- Comidas: diarias ----------
  const foods = {
    [luna.id]: ['Concentrado de cordero', '2 tazas'],
    [milo.id]: ['Concentrado para gato adulto', '½ taza'],
    [kiwi.id]: ['Heno fresco y verduras', '1 puñado'],
  };
  for (let d = 59; d >= 0; d -= 1) {
    for (const p of [luna, milo, kiwi]) {
      const [food, quantity] = foods[p.id];
      await record(p, 'meals', { food, quantity, occurredAt: day(-d, p === kiwi ? '18:00' : '07:30') });
    }
    if (d % 6 === 0) await record(luna, 'meals', { food: 'Snack de zanahoria', quantity: '2 unidades', occurredAt: day(-d, '16:00') });
  }
  console.log('Comidas de 60 días registradas.');

  // ---------- Bienestar: cada 4 días (Milo decae con la otitis y se recupera) ----------
  const moods = ['GOOD', 'VERY_GOOD', 'GOOD', 'NORMAL', 'GOOD'];
  for (let d = 56; d >= 0; d -= 4) {
    await record(luna, 'wellbeing', { mood: moods[d % moods.length], energy: 'HIGH', appetite: 'NORMAL', occurredAt: day(-d, '19:00') });
    const sick = d <= 12 && d >= 8;
    await record(milo, 'wellbeing', {
      mood: sick ? 'BAD' : 'GOOD',
      energy: sick ? 'LOW' : 'NORMAL',
      appetite: sick ? 'LOW' : 'NORMAL',
      occurredAt: day(-d, '20:00'),
      notes: sick ? 'Se rasca la oreja izquierda y duerme más de lo normal.' : null,
    });
    if (d % 8 === 0) await record(kiwi, 'wellbeing', { mood: 'GOOD', energy: 'NORMAL', appetite: 'HIGH', occurredAt: day(-d, '18:30') });
  }
  console.log('Registros de bienestar listos.');

  // ---------- Salud ----------
  await record(luna, 'health-records', {
    recordType: 'CONSULTATION', title: 'Chequeo anual', veterinarian: 'Dra. Paula Méndez', occurredAt: day(-50, '10:00'),
    description: 'Buen estado general. Se recomienda mantener el peso y revisar dientes en 6 meses.',
  });
  await record(luna, 'doses', { kind: 'VACCINE', productName: 'Rabia (anual)', occurredAt: day(-50, '10:30'), nextDueOn: date(315) });
  await record(luna, 'doses', { kind: 'DEWORMING', productName: 'Desparasitante oral', occurredAt: day(-40, '09:00'), nextDueOn: date(50) });
  await record(milo, 'doses', { kind: 'VACCINE', productName: 'Triple felina', occurredAt: day(-30, '11:00'), nextDueOn: date(335) });
  await record(milo, 'health-records', {
    recordType: 'DIAGNOSIS', title: 'Otitis leve', veterinarian: 'Dr. Andrés Gil', occurredAt: day(-10, '17:00'),
    description: 'Inflamación leve en el oído izquierdo. Gotas por 14 días y control al terminar.',
  });
  await record(milo, 'treatments', {
    medication: 'Gotas óticas', dosage: '3 gotas', frequency: 'Cada 12 horas', occurredAt: day(-10, '18:00'), endsOn: date(4),
  });
  await record(kiwi, 'doses', { kind: 'DEWORMING', productName: 'Antiparasitario para conejos', occurredAt: day(-25, '10:00'), nextDueOn: date(65) });
  console.log('Historial de salud listo.');

  // ---------- Cuidados ----------
  const task = (p, type, title, dueAt, location) =>
    api('POST', `/api/pets/${p.id}/tasks`, { type, title, dueAt, location: location ?? null, notes: null }, { expect: 201 });
  const done = async (p, t) => api('PATCH', `/api/pets/${p.id}/tasks/${t.id}/complete`, undefined, { expect: 200 });

  await done(luna, await task(luna, 'GROOMING', 'Baño y corte', day(-21, '10:00'), 'Peluquería Patitas'));
  await done(milo, await task(milo, 'VET_APPOINTMENT', 'Consulta por la oreja', day(-10, '17:00'), 'Clínica Veterinaria del Parque'));
  await done(kiwi, await task(kiwi, 'PURCHASE', 'Comprar heno', day(-7, '12:00')));
  await task(milo, 'PURCHASE', 'Comprar arena', day(-1, '18:00'));
  await task(milo, 'MEDICATION', 'Gotas óticas de la noche', day(0, '20:00'));
  await task(luna, 'PURCHASE', 'Comprar concentrado', day(1, '12:00'));
  await task(luna, 'GROOMING', 'Corte de uñas', day(3, '10:00'), 'Peluquería Patitas');
  await task(milo, 'VET_APPOINTMENT', 'Control de otitis', day(5, '16:30'), 'Clínica Veterinaria del Parque');
  await task(kiwi, 'OTHER', 'Limpiar el corral', day(6, '09:00'));
  await task(luna, 'VET_APPOINTMENT', 'Limpieza dental', day(24, '09:30'), 'Clínica Veterinaria del Parque');
  console.log('Cuidados programados.');

  console.log('');
  console.log(`Listo (${requests} peticiones). Entra con ${EMAIL} y la contraseña de PETCARE_DEMO_PASSWORD.`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
