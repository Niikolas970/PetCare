import { useState } from 'react';
import { recordsApi, tasksApi } from '../../api/services.js';
import FormModal from '../../components/FormModal.jsx';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import { CARE_TASK_TYPE } from '../../i18n/labels.js';
import PetFormDialog from '../pets/PetFormDialog.jsx';
import { defaultDueAt } from '../careFormat.js';

function PetSelect({ pets, value, onChange, error }) {
  return (
    <Select label="Mascota" value={value} onChange={onChange} error={error}>
      {pets.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

export function MealForm({ open, pets, onClose, onDone }) {
  const [values, setValues] = useState({ petId: pets[0]?.id ?? '', food: '', quantity: '' });
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const pet = pets.find((p) => p.id === Number(values.petId));

  return (
    <FormModal
      open={open}
      title="Registrar comida"
      submitLabel="Registrar comida"
      values={values}
      onClose={onClose}
      validate={(v) => {
        const e = {};
        if (!v.food.trim()) e.food = 'El alimento es obligatorio';
        else if (v.food.trim().length > 120) e.food = 'El alimento no puede superar 120 caracteres';
        if (v.quantity.trim().length > 60) e.quantity = 'La cantidad no puede superar 60 caracteres';
        return e;
      }}
      submit={(v) => recordsApi.meal(Number(v.petId), { food: v.food.trim(), quantity: v.quantity.trim() || null })}
      onDone={() => onDone(`Comida registrada para ${pet?.name ?? 'tu mascota'}.`)}
    >
      {(errors) => (
        <>
          <PetSelect pets={pets} value={values.petId} onChange={set('petId')} />
          <Input label="Alimento" value={values.food} onChange={set('food')} error={errors.food} placeholder="Concentrado de cordero" />
          <Input label="Cantidad (opcional)" value={values.quantity} onChange={set('quantity')} error={errors.quantity} placeholder="1 taza" />
        </>
      )}
    </FormModal>
  );
}

export function WeightForm({ open, pets, onClose, onDone }) {
  const [values, setValues] = useState({ petId: pets[0]?.id ?? '', weightKg: '' });
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const pet = pets.find((p) => p.id === Number(values.petId));

  return (
    <FormModal
      open={open}
      title="Registrar peso"
      submitLabel="Registrar peso"
      values={values}
      onClose={onClose}
      validate={(v) => {
        const n = Number(String(v.weightKg).replace(',', '.'));
        if (!String(v.weightKg).trim()) return { weightKg: 'El peso es obligatorio' };
        if (!Number.isFinite(n) || n <= 0) return { weightKg: 'El peso debe ser mayor que cero' };
        return {};
      }}
      submit={(v) => recordsApi.weight(Number(v.petId), { weightKg: Number(String(v.weightKg).replace(',', '.')) })}
      onDone={() => onDone(`Peso registrado para ${pet?.name ?? 'tu mascota'}.`)}
    >
      {(errors) => (
        <>
          <PetSelect pets={pets} value={values.petId} onChange={set('petId')} />
          <Input
            label="Peso en kg"
            inputMode="decimal"
            value={values.weightKg}
            onChange={set('weightKg')}
            error={errors.weightKg}
            placeholder="12,5"
          />
        </>
      )}
    </FormModal>
  );
}

/** defaultDate (YYYY-MM-DD) y defaultPetId preseleccionan día y mascota (calendario). */
export function TaskForm({ open, pets, today, defaultDate, defaultPetId, onClose, onDone }) {
  const [values, setValues] = useState({
    petId: defaultPetId ?? pets[0]?.id ?? '',
    type: 'VET_APPOINTMENT',
    title: '',
    dueAt: defaultDate ? `${defaultDate}T09:00` : defaultDueAt(today),
    location: '',
  });
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const pet = pets.find((p) => p.id === Number(values.petId));

  return (
    <FormModal
      open={open}
      title="Nueva tarea"
      submitLabel="Crear tarea"
      values={values}
      onClose={onClose}
      validate={(v) => {
        const e = {};
        if (!v.title.trim()) e.title = 'El título es obligatorio';
        else if (v.title.trim().length > 150) e.title = 'El título no puede superar 150 caracteres';
        if (!v.dueAt) e.dueAt = 'La fecha de la tarea es obligatoria';
        if (v.location.trim().length > 200) e.location = 'El lugar no puede superar 200 caracteres';
        return e;
      }}
      submit={(v) =>
        tasksApi.create(Number(v.petId), {
          type: v.type,
          title: v.title.trim(),
          dueAt: v.dueAt,
          location: v.location.trim() || null,
          notes: null,
        })
      }
      onDone={() => onDone(`Tarea creada para ${pet?.name ?? 'tu mascota'}.`)}
    >
      {(errors) => (
        <>
          <PetSelect pets={pets} value={values.petId} onChange={set('petId')} />
          <Select label="Tipo" value={values.type} onChange={set('type')} error={errors.type}>
            {Object.entries(CARE_TASK_TYPE).map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </Select>
          <Input label="Título" value={values.title} onChange={set('title')} error={errors.title} placeholder="Control anual" />
          <Input label="Fecha y hora" type="datetime-local" value={values.dueAt} onChange={set('dueAt')} error={errors.dueAt} />
          <Input label="Lugar (opcional)" value={values.location} onChange={set('location')} error={errors.location} />
        </>
      )}
    </FormModal>
  );
}

/** «Agregar mascota» desde el Inicio: el mismo formulario de la sección Mascotas. */
export function AddPetForm({ open, householdId, today, onClose, onDone }) {
  return (
    <PetFormDialog
      open={open}
      householdId={householdId}
      today={today}
      onClose={onClose}
      onDone={(pet) => onDone(`${pet.name} ya es parte del hogar.`)}
    />
  );
}
