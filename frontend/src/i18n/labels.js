// Traducción de los valores del backend (enums) al español de Colombia.
// Los valores salen de: Sex, PetStatus, MemberRole, MemberStatus, CareTaskType, CareTaskStatus, TimelineType.

export const SEX = {
  MALE: 'Macho',
  FEMALE: 'Hembra',
  UNKNOWN: 'Sin definir',
};

export const PET_STATUS = {
  ACTIVE: 'Activa',
  ARCHIVED: 'Archivada',
};

export const MEMBER_ROLE = {
  OWNER: 'Responsable',
  CAREGIVER: 'Cuidador',
};

export const MEMBER_STATUS = {
  ACTIVE: 'Activo',
  INVITED: 'Invitado',
};

export const CARE_TASK_TYPE = {
  VET_APPOINTMENT: 'Cita veterinaria',
  VACCINE: 'Vacuna',
  DEWORMING: 'Desparasitación',
  MEDICATION: 'Medicamento',
  GROOMING: 'Peluquería',
  PURCHASE: 'Compra',
  OTHER: 'Otro cuidado',
};

export const CARE_TASK_STATUS = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export const TIMELINE_TYPE = {
  HEALTH: 'Salud',
  VACCINE: 'Vacuna',
  DEWORMING: 'Desparasitación',
  TREATMENT: 'Tratamiento',
  MEAL: 'Comida',
  WEIGHT: 'Peso',
  WELLBEING: 'Bienestar',
  TASK: 'Cuidado',
};

// Devuelve la traducción o, si el backend envía un valor nuevo, el valor tal cual
export function label(map, key) {
  if (key == null) return '';
  return map[key] ?? String(key);
}
