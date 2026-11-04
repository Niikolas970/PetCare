// Formatos y reglas de presentación del Inicio. Fechas del backend: LocalDate "YYYY-MM-DD" y
// LocalDateTime "YYYY-MM-DDTHH:mm:ss" en la hora del hogar (sin zona), así que se comparan como texto/fechas UTC.

// Tipo de tarea -> ícono y tono pastel
export const TASK_STYLE = {
  VET_APPOINTMENT: { icon: 'stethoscope', tone: 'sage' },
  VACCINE: { icon: 'syringe', tone: 'blue' },
  DEWORMING: { icon: 'shield', tone: 'violet' },
  MEDICATION: { icon: 'pill', tone: 'rose' },
  GROOMING: { icon: 'scissors', tone: 'blue' },
  PURCHASE: { icon: 'bag', tone: 'amber' },
  OTHER: { icon: 'calendar', tone: 'clay' },
};

export function taskStyle(type) {
  return TASK_STYLE[type] ?? TASK_STYLE.OTHER;
}

function utcDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dayDiff(fromIso, toIso) {
  return Math.round((utcDate(toIso) - utcDate(fromIso)) / 86400000);
}

export function addDays(iso, n) {
  const d = utcDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Etiqueta de urgencia. `today` es la fecha del hogar que entrega el dashboard. */
export function dueLabel(task, today) {
  if (task.overdue) {
    const late = dayDiff(task.dueAt, today);
    return { text: late <= 0 ? 'Vencida hoy' : late === 1 ? 'Vencida ayer' : `Vencida hace ${late} días`, tone: 'late' };
  }
  const days = dayDiff(today, task.dueAt);
  if (days <= 0) return { text: 'Hoy', tone: 'soon' };
  if (days === 1) return { text: 'Mañana', tone: 'soon' };
  return { text: `En ${days} días`, tone: 'ok' };
}

/** Vencidos, Hoy y Próximos 7 días (sin repetir tareas). */
export function groupTasks(overdue, upcoming, today) {
  const seen = new Set();
  const uniq = (list) => list.filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
  const late = uniq([...overdue, ...upcoming.filter((t) => t.overdue)]);
  const rest = uniq(upcoming.filter((t) => !t.overdue));
  return {
    overdue: late,
    today: rest.filter((t) => t.dueAt.slice(0, 10) === today),
    next: rest.filter((t) => t.dueAt.slice(0, 10) > today),
  };
}

const timeFormat = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

function asUtc(localDateTime) {
  return new Date(`${localDateTime.slice(0, 19)}Z`);
}

export function formatTime(dueAt) {
  return timeFormat.format(asUtc(dueAt));
}

export function formatDay(dueAt) {
  return dayFormat.format(asUtc(dueAt));
}

const weekdayFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' });
const weekdayLong = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Los próximos `n` días desde hoy (hoy incluido). */
export function weekDays(today, n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const iso = addDays(today, i);
    const date = utcDate(iso);
    return {
      iso,
      weekday: weekdayFormat.format(date).replace('.', ''),
      day: date.getUTCDate(),
      long: weekdayLong.format(date),
      isToday: i === 0,
    };
  });
}

const kgFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export function formatKg(kg) {
  return kg == null ? null : `${kgFormat.format(Number(kg))} kg`;
}

/** Edad legible a partir de birthDate. */
export function petAge(birthDate, today, estimated = false) {
  if (!birthDate) return null;
  const b = utcDate(birthDate);
  const t = utcDate(today);
  let months = (t.getUTCFullYear() - b.getUTCFullYear()) * 12 + (t.getUTCMonth() - b.getUTCMonth());
  if (t.getUTCDate() < b.getUTCDate()) months -= 1;
  let text;
  if (months < 1) text = 'Menos de 1 mes';
  else if (months < 12) text = `${months} ${months === 1 ? 'mes' : 'meses'}`;
  else {
    const years = Math.floor(months / 12);
    text = `${years} ${years === 1 ? 'año' : 'años'}`;
  }
  return estimated ? `${text} aprox.` : text;
}

/** Especie libre ("Perro", "gata", "Conejo"...) -> ilustración disponible. */
export function speciesKind(species = '') {
  const s = species
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  if (/^(perr|can|dog|cachorr)/.test(s)) return 'dog';
  if (/^(gat|felin|cat|minin)/.test(s)) return 'cat';
  if (/^(conej|rabbit|liebre)/.test(s)) return 'rabbit';
  if (/^(ave|pajar|loro|perico|canario|bird|cotorra|periquito)/.test(s)) return 'bird';
  return 'other';
}

export function greeting(tz) {
  const h = hourIn(tz);
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function firstName(fullName) {
  return fullName?.trim().split(/\s+/)[0] ?? '';
}

export function initials(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// ---------- Zona horaria del hogar ----------
// El backend guarda fechas en la hora local del hogar (households.timezone). "Hoy" y "ahora"
// se calculan en esa zona con Intl, no con la del navegador.

const partsCache = new Map();
function partsIn(tz, date = new Date()) {
  const zone = tz || 'America/Bogota';
  let fmt = partsCache.get(zone);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });
    } catch {
      fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    }
    partsCache.set(zone, fmt);
  }
  return Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
}

/** "YYYY-MM-DD" de hoy en la zona del hogar. */
export function todayIn(tz) {
  const p = partsIn(tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "YYYY-MM-DDTHH:mm" de ahora en la zona del hogar (para <input type="datetime-local">). */
export function nowIn(tz) {
  const p = partsIn(tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function hourIn(tz) {
  return Number(partsIn(tz).hour);
}

/** Zonas horarias que conoce el navegador (para el selector del hogar). */
export function timeZones() {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'Europe/Madrid', 'UTC'];
  }
}

/** Valor para <input type="datetime-local">: mañana a las 9:00 en la fecha del hogar. */
export function defaultDueAt(today) {
  return `${addDays(today, 1)}T09:00`;
}
