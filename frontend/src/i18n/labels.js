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

export const HEALTH_RECORD_TYPE = {
  CONSULTATION: 'Consulta',
  DIAGNOSIS: 'Diagnóstico',
  EXAM: 'Examen',
  SURGERY: 'Cirugía',
  ALLERGY: 'Alergia',
  OTHER: 'Otro',
};

export const DOSE_KIND = {
  VACCINE: 'Vacuna',
  DEWORMING: 'Desparasitación',
};

export const MOOD = {
  VERY_BAD: 'Muy mal',
  BAD: 'Mal',
  NORMAL: 'Normal',
  GOOD: 'Bien',
  VERY_GOOD: 'Muy bien',
};

export const LEVEL = {
  LOW: 'Bajo',
  NORMAL: 'Normal',
  HIGH: 'Alto',
};

// Para "energía" (femenino): "energía alta". Para "apetito" se usa LEVEL: "apetito alto".
export const LEVEL_FEMININE = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
};

export const RECORD_STATUS = {
  ACTIVE: 'Activo',
  VOIDED: 'Anulado',
};

// Devuelve la traducción o, si el backend envía un valor nuevo, el valor tal cual
export function label(map, key) {
  if (key == null) return '';
  return map[key] ?? String(key);
}
