import { useState } from 'react';
import { petsApi, recordsApi, tasksApi } from '../../api/services.js';
import Button from '../../components/Button.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Input from '../../components/Input.jsx';
import Modal from '../../components/Modal.jsx';
import Select from '../../components/Select.jsx';
import { CARE_TASK_TYPE, SEX } from '../../i18n/labels.js';
import { defaultDueAt } from '../careFormat.js';

/** Formulario dentro de un diálogo: valida en cliente, envía y muestra los errores del backend por campo. */
function FormModal({ title, submitLabel, open, onClose, validate, submit, onDone, children, values }) {
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const clientErrors = validate(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;
    setSaving(true);
    try {
      const result = await submit(values);
      setSaving(false);
      onDone(result);
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <ErrorMessage inline>{formError}</ErrorMessage>}
        {typeof children === 'function' ? children(errors) : children}
        <div className="form-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

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

export function TaskForm({ open, pets, today, onClose, onDone }) {
  const [values, setValues] = useState({
    petId: pets[0]?.id ?? '',
    type: 'VET_APPOINTMENT',
    title: '',
    dueAt: defaultDueAt(today),
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

const SPECIES = ['Perro', 'Gato', 'Conejo', 'Ave'];

export function AddPetForm({ open, householdId, today, onClose, onDone }) {
  const [values, setValues] = useState({ name: '', species: '', breed: '', sex: 'UNKNOWN', birthDate: '', weightKg: '' });
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <FormModal
      open={open}
      title="Agregar mascota"
      submitLabel="Agregar mascota"
      values={values}
      onClose={onClose}
      validate={(v) => {
        const e = {};
        if (!v.name.trim()) e.name = 'El nombre es obligatorio';
        else if (v.name.trim().length > 100) e.name = 'El nombre no puede superar 100 caracteres';
        if (!v.species.trim()) e.species = 'La especie es obligatoria';
        else if (v.species.trim().length > 40) e.species = 'La especie no puede superar 40 caracteres';
        if (v.breed.trim().length > 100) e.breed = 'La raza no puede superar 100 caracteres';
        if (v.birthDate && v.birthDate > today) e.birthDate = 'La fecha de nacimiento no puede ser futura';
        if (v.weightKg) {
          const n = Number(String(v.weightKg).replace(',', '.'));
          if (!Number.isFinite(n) || n <= 0) e.weightKg = 'El peso debe ser mayor que cero';
        }
        return e;
      }}
      submit={(v) =>
        petsApi.create({
          householdId,
          name: v.name.trim(),
          species: v.species.trim(),
          breed: v.breed.trim() || null,
          sex: v.sex,
          birthDate: v.birthDate || null,
          birthDateIsEstimated: false,
          weightKg: v.weightKg ? Number(String(v.weightKg).replace(',', '.')) : null,
          notes: null,
        })
      }
      onDone={(pet) => onDone(`${pet.name} ya es parte del hogar.`)}
    >
      {(errors) => (
        <>
          <Input label="Nombre" value={values.name} onChange={set('name')} error={errors.name} autoComplete="off" />
          <Input
            label="Especie"
            value={values.species}
            onChange={set('species')}
            error={errors.species}
            list="species-options"
            placeholder="Perro, gato, conejo…"
          />
          <datalist id="species-options">
            {SPECIES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Input label="Raza (opcional)" value={values.breed} onChange={set('breed')} error={errors.breed} />
          <div className="form-row">
            <Select label="Sexo" value={values.sex} onChange={set('sex')}>
              {Object.entries(SEX).map(([key, text]) => (
                <option key={key} value={key}>
                  {text}
                </option>
              ))}
            </Select>
            <Input label="Peso en kg (opcional)" inputMode="decimal" value={values.weightKg} onChange={set('weightKg')} error={errors.weightKg} />
          </div>
          <Input label="Fecha de nacimiento (opcional)" type="date" max={today} value={values.birthDate} onChange={set('birthDate')} error={errors.birthDate} />
        </>
      )}
    </FormModal>
  );
}
