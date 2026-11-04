import { useState } from 'react';
import { recordsApi, tasksApi } from '../../api/services.js';
import FormModal from '../../components/FormModal.jsx';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Textarea from '../../components/Textarea.jsx';
import { CARE_TASK_TYPE, DOSE_KIND, HEALTH_RECORD_TYPE, LEVEL, MOOD } from '../../i18n/labels.js';
import { addDays, defaultDueAt, localNow, localToday } from '../careFormat.js';

// ---------- Utilidades comunes ----------

const max = (v, n, msg) => (v && v.trim().length > n ? msg : null);
const clean = (v) => (v && v.trim() ? v.trim() : null);
const toNumber = (v) => Number(String(v).replace(',', '.'));

function occurredError(v) {
  if (v && v > localNow()) return 'La fecha del registro no puede ser futura';
  return null;
}

function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
}

function OccurredAt({ value, onChange, error, label = 'Fecha y hora (opcional)' }) {
  return (
    <Input
      label={label}
      type="datetime-local"
      max={localNow()}
      value={value}
      onChange={onChange}
      error={error}
      hint="Si la dejas vacía, se usa la hora actual."
    />
  );
}

function useValues(initial) {
  const [values, setValues] = useState(initial);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  return [values, set];
}

function options(map) {
  return Object.entries(map).map(([key, text]) => (
    <option key={key} value={key}>
      {text}
    </option>
  ));
}

// ---------- Salud ----------

/** POST /api/pets/{petId}/doses {kind, productName, occurredAt, nextDueOn, notes} */
export function DoseForm({ pet, onClose, onDone }) {
  const [v, set] = useValues({ kind: 'VACCINE', productName: '', occurredAt: '', nextDueOn: '', notes: '' });
  const applied = (v.occurredAt || localNow()).slice(0, 10);
  return (
    <FormModal
      open
      sheet
      title="Registrar vacuna o desparasitación"
      submitLabel="Registrar"
      values={v}
      onClose={onClose}
      validate={(x) =>
        compact({
          productName: !x.productName.trim() ? 'El producto es obligatorio' : max(x.productName, 120, 'El producto no puede superar 120 caracteres'),
          occurredAt: occurredError(x.occurredAt),
          nextDueOn: x.nextDueOn && x.nextDueOn <= applied ? 'La próxima dosis debe ser posterior a la fecha de aplicación' : null,
          notes: max(x.notes, 2000, 'Las notas no pueden superar 2000 caracteres'),
        })
      }
      submit={(x) =>
        recordsApi.create(pet.id, 'doses', {
          kind: x.kind,
          productName: x.productName.trim(),
          occurredAt: x.occurredAt || null,
          nextDueOn: x.nextDueOn || null,
          notes: clean(x.notes),
        })
      }
      onDone={(res) =>
        onDone(
          `${DOSE_KIND[res.dose.kind]} registrada para ${pet.name}.${res.generatedTaskId ? ' La próxima dosis quedó en Cuidados.' : ''}`,
        )
      }
    >
      {(e) => (
        <>
          <Select label="Tipo" value={v.kind} onChange={set('kind')} error={e.kind}>
            {options(DOSE_KIND)}
          </Select>
          <Input label="Producto" value={v.productName} onChange={set('productName')} error={e.productName} placeholder="Rabia, Nobivac, Drontal…" maxLength={120} />
          <OccurredAt value={v.occurredAt} onChange={set('occurredAt')} error={e.occurredAt} label="Fecha de aplicación (opcional)" />
          <Input
            label="Próxima dosis (opcional)"
            type="date"
            min={addDays(applied, 1)}
            value={v.nextDueOn}
            onChange={set('nextDueOn')}
            error={e.nextDueOn}
            hint="Crea automáticamente un cuidado pendiente para esa fecha."
          />
          <Textarea label="Notas (opcional)" value={v.notes} onChange={set('notes')} error={e.notes} maxLength={2000} />
        </>
      )}
    </FormModal>
  );
}

/** POST /api/pets/{petId}/treatments {medication, dosage, frequency, occurredAt, endsOn, notes} */
export function TreatmentForm({ pet, onClose, onDone }) {
  const [v, set] = useValues({ medication: '', dosage: '', frequency: '', occurredAt: '', endsOn: '', notes: '' });
  const start = (v.occurredAt || localNow()).slice(0, 10);
  return (
    <FormModal
      open
      sheet
      title="Registrar tratamiento"
      submitLabel="Registrar tratamiento"
      values={v}
      onClose={onClose}
      validate={(x) =>
        compact({
          medication: !x.medication.trim() ? 'El medicamento es obligatorio' : max(x.medication, 120, 'El medicamento no puede superar 120 caracteres'),
          dosage: max(x.dosage, 80, 'La dosis no puede superar 80 caracteres'),
          frequency: max(x.frequency, 80, 'La frecuencia no puede superar 80 caracteres'),
          occurredAt: occurredError(x.occurredAt),
          endsOn: x.endsOn && x.endsOn < start ? 'La fecha de fin no puede ser anterior al inicio del tratamiento' : null,
          notes: max(x.notes, 2000, 'Las notas no pueden superar 2000 caracteres'),
        })
      }
      submit={(x) =>
        recordsApi.create(pet.id, 'treatments', {
          medication: x.medication.trim(),
          dosage: clean(x.dosage),
          frequency: clean(x.frequency),
          occurredAt: x.occurredAt || null,
          endsOn: x.endsOn || null,
          notes: clean(x.notes),
        })
      }
      onDone={() => onDone(`Tratamiento registrado para ${pet.name}.`)}
    >
      {(e) => (
        <>
          <Input label="Medicamento" value={v.medication} onChange={set('medication')} error={e.medication} maxLength={120} />
          <div className="form-row">
            <Input label="Dosis (opcional)" value={v.dosage} onChange={set('dosage')} error={e.dosage} placeholder="5 ml" maxLength={80} />
            <Input label="Frecuencia (opcional)" value={v.frequency} onChange={set('frequency')} error={e.frequency} placeholder="Cada 12 horas" maxLength={80} />
          </div>
          <OccurredAt value={v.occurredAt} onChange={set('occurredAt')} error={e.occurredAt} label="Inicio (opcional)" />
          <Input label="Termina el (opcional)" type="date" min={start} value={v.endsOn} onChange={set('endsOn')} error={e.endsOn} />
          <Textarea label="Notas (opcional)" value={v.notes} onChange={set('notes')} error={e.notes} maxLength={2000} />
        </>
      )}
    </FormModal>
  );
}

/** POST /api/pets/{petId}/health-records {recordType, title, description, veterinarian, occurredAt} */
export function HealthRecordForm({ pet, onClose, onDone }) {
  const [v, set] = useValues({ recordType: 'CONSULTATION', title: '', veterinarian: '', occurredAt: '', description: '' });
  return (
    <FormModal
      open
      sheet
      title="Registrar evento de salud"
      submitLabel="Registrar evento"
      values={v}
      onClose={onClose}
      validate={(x) =>
        compact({
          title: !x.title.trim() ? 'El título es obligatorio' : max(x.title, 150, 'El título no puede superar 150 caracteres'),
          veterinarian: max(x.veterinarian, 120, 'El veterinario no puede superar 120 caracteres'),
          occurredAt: occurredError(x.occurredAt),
          description: max(x.description, 5000, 'La descripción no puede superar 5000 caracteres'),
        })
      }
      submit={(x) =>
        recordsApi.create(pet.id, 'health-records', {
          recordType: x.recordType,
          title: x.title.trim(),
          description: clean(x.description),
          veterinarian: clean(x.veterinarian),
          occurredAt: x.occurredAt || null,
        })
      }
      onDone={() => onDone(`Evento de salud registrado para ${pet.name}.`)}
    >
      {(e) => (
        <>
          <Select label="Tipo" value={v.recordType} onChange={set('recordType')} error={e.recordType}>
            {options(HEALTH_RECORD_TYPE)}
          </Select>
          <Input label="Título" value={v.title} onChange={set('title')} error={e.title} placeholder="Control anual" maxLength={150} />
          <Input label="Veterinario (opcional)" value={v.veterinarian} onChange={set('veterinarian')} error={e.veterinarian} maxLength={120} />
          <OccurredAt value={v.occurredAt} onChange={set('occurredAt')} error={e.occurredAt} />
          <Textarea label="Descripción (opcional)" value={v.description} onChange={set('description')} error={e.description} maxLength={5000} />
        </>
      )}
    </FormModal>
  );
}

// ---------- Alimentación, peso, bienestar ----------

/** POST /api/pets/{petId}/meals {food, quantity, occurredAt, notes} */
export function PetMealForm({ pet, onClose, onDone }) {
  const [v, set] = useValues({ food: '', quantity: '', occurredAt: '', notes: '' });
  return (
    <FormModal
      open
      sheet
      title="Registrar comida"
      submitLabel="Registrar comida"
      values={v}
      onClose={onClose}
      validate={(x) =>
        compact({
          food: !x.food.trim() ? 'El alimento es obligatorio' : max(x.food, 120, 'El alimento no puede superar 120 caracteres'),
          quantity: max(x.quantity, 60, 'La cantidad no puede superar 60 caracteres'),
          occurredAt: occurredError(x.occurredAt),
          notes: max(x.notes, 2000, 'Las notas no pueden superar 2000 caracteres'),
        })
      }
      submit={(x) =>
        recordsApi.create(pet.id, 'meals', {
          food: x.food.trim(),
          quantity: clean(x.quantity),
          occurredAt: x.occurredAt || null,
          notes: clean(x.notes),
        })
      }
      onDone={() => onDone(`Comida registrada para ${pet.name}.`)}
    >
      {(e) => (
        <>
          <Input label="Alimento" value={v.food} onChange={set('food')} error={e.food} placeholder="Concentrado de cordero" maxLength={120} />
          <Input label="Cantidad (opcional)" value={v.quantity} onChange={set('quantity')} error={e.quantity} placeholder="1 taza" maxLength={60} />
          <OccurredAt value={v.occurredAt} onChange={set('occurredAt')} error={e.occurredAt} />
          <Textarea label="Notas (opcional)" value={v.notes} onChange={set('notes')} error={e.notes} maxLength={2000} />
        </>
      )}
    </FormModal>
  );
}

/** POST /api/pets/{petId}/weights {weightKg, occurredAt, notes} */
export function PetWeightForm({ pet, onClose, onDone }) {
  const [v, set] = useValues({ weightKg: '', occurredAt: '', notes: '' });
  return (
    <FormModal
      open
      sheet
      title="Registrar peso"
      submitLabel="Registrar peso"
      values={v}
      onClose={onClose}
      validate={(x) => {
        const raw = String(x.weightKg).trim();
        const n = toNumber(raw);
        return compact({
          weightKg: !raw
            ? 'El peso es obligatorio'
            : !Number.isFinite(n) || n <= 0
              ? 'El peso debe ser mayor que cero'
              : !/^\d{1,4}([.,]\d{1,3})?$/.test(raw)
                ? 'El peso tiene un formato inválido'
                : null,
          occurredAt: occurredError(x.occurredAt),
          notes: max(x.notes, 2000, 'Las notas no pueden superar 2000 caracteres'),
        });
      }}
      submit={(x) =>
        recordsApi.create(pet.id, 'weights', { weightKg: toNumber(x.weightKg), occurredAt: x.occurredAt || null, notes: clean(x.notes) })
      }
      onDone={() => onDone(`Peso registrado para ${pet.name}.`)}
    >
      {(e) => (
        <>
          <Input label="Peso en kg" inputMode="decimal" value={v.weightKg} onChange={set('weightKg')} error={e.weightKg} placeholder="12,5" />
          <OccurredAt value={v.occurredAt} onChange={set('occurredAt')} error={e.occurredAt} />
          <Textarea label="Notas (opcional)" value={v.notes} onChange={set('notes')} error={e.notes} maxLength={2000} />
        </>
      )}
    </FormModal>
  );
}

/** POST /api/pets/{petId}/wellbeing {mood, energy, appetite, occurredAt, notes} */
export function WellbeingForm({ pet, onClose, onDone }) {
  const [v, set] = useValues({ mood: '', energy: '', appetite: '', occurredAt: '', notes: '' });
  return (
    <FormModal
      open
      sheet
      title="Registrar bienestar"
      submitLabel="Registrar bienestar"
      values={v}
      onClose={onClose}
      validate={(x) =>
        compact({
          mood: !x.mood ? 'El ánimo es obligatorio' : null,
          occurredAt: occurredError(x.occurredAt),
          notes: max(x.notes, 2000, 'Las notas no pueden superar 2000 caracteres'),
        })
      }
      submit={(x) =>
        recordsApi.create(pet.id, 'wellbeing', {
          mood: x.mood,
          energy: x.energy || null,
          appetite: x.appetite || null,
          occurredAt: x.occurredAt || null,
          notes: clean(x.notes),
        })
      }
      onDone={() => onDone(`Bienestar registrado para ${pet.name}.`)}
    >
      {(e) => (
        <>
          <fieldset className={`mood-field${e.mood ? ' field-invalid' : ''}`} aria-describedby={e.mood ? 'mood-error' : undefined}>
            <legend className="field-label">Ánimo</legend>
            <div className="mood-options">
              {Object.entries(MOOD).map(([key, text]) => (
                <label key={key} className="mood-option">
                  <input type="radio" name="mood" value={key} checked={v.mood === key} onChange={set('mood')} aria-invalid={e.mood ? true : undefined} />
                  <span>{text}</span>
                </label>
              ))}
            </div>
            {e.mood && (
              <p id="mood-error" className="field-error" role="alert">
                {e.mood}
              </p>
            )}
          </fieldset>
          <div className="form-row">
            <Select label="Energía (opcional)" value={v.energy} onChange={set('energy')}>
              <option value="">Sin indicar</option>
              {options(LEVEL)}
            </Select>
            <Select label="Apetito (opcional)" value={v.appetite} onChange={set('appetite')}>
              <option value="">Sin indicar</option>
              {options(LEVEL)}
            </Select>
          </div>
          <OccurredAt value={v.occurredAt} onChange={set('occurredAt')} error={e.occurredAt} />
          <Textarea label="Comportamiento y notas (opcional)" value={v.notes} onChange={set('notes')} error={e.notes} maxLength={2000} />
        </>
      )}
    </FormModal>
  );
}

// ---------- Cuidados ----------

/** POST /api/pets/{petId}/tasks {type, title, dueAt, location, notes} */
export function PetTaskForm({ pet, onClose, onDone }) {
  const [v, set] = useValues({ type: 'VET_APPOINTMENT', title: '', dueAt: defaultDueAt(localToday()), location: '', notes: '' });
  return (
    <FormModal
      open
      sheet
      title="Nueva tarea"
      submitLabel="Crear tarea"
      values={v}
      onClose={onClose}
      validate={(x) =>
        compact({
          title: !x.title.trim() ? 'El título es obligatorio' : max(x.title, 150, 'El título no puede superar 150 caracteres'),
          dueAt: !x.dueAt ? 'La fecha de la tarea es obligatoria' : null,
          location: max(x.location, 200, 'El lugar no puede superar 200 caracteres'),
          notes: max(x.notes, 2000, 'Las notas no pueden superar 2000 caracteres'),
        })
      }
      submit={(x) =>
        tasksApi.create(pet.id, { type: x.type, title: x.title.trim(), dueAt: x.dueAt, location: clean(x.location), notes: clean(x.notes) })
      }
      onDone={() => onDone(`Tarea creada para ${pet.name}.`)}
    >
      {(e) => (
        <>
          <Select label="Tipo" value={v.type} onChange={set('type')} error={e.type}>
            {options(CARE_TASK_TYPE)}
          </Select>
          <Input label="Título" value={v.title} onChange={set('title')} error={e.title} placeholder="Control anual" maxLength={150} />
          <Input label="Fecha y hora" type="datetime-local" value={v.dueAt} onChange={set('dueAt')} error={e.dueAt} />
          <Input label="Lugar (opcional)" value={v.location} onChange={set('location')} error={e.location} maxLength={200} />
          <Textarea label="Notas (opcional)" value={v.notes} onChange={set('notes')} error={e.notes} maxLength={2000} />
        </>
      )}
    </FormModal>
  );
}
