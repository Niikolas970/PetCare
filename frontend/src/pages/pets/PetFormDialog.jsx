import { useState } from 'react';
import { petsApi } from '../../api/services.js';
import Checkbox from '../../components/Checkbox.jsx';
import FormModal from '../../components/FormModal.jsx';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Textarea from '../../components/Textarea.jsx';
import { SEX } from '../../i18n/labels.js';

const SPECIES = ['Perro', 'Gato', 'Conejo', 'Ave'];

function toNumber(v) {
  return Number(String(v).replace(',', '.'));
}

/**
 * Crear (POST /api/pets) o editar (PUT /api/pets/{id}) una mascota.
 * Diálogo en escritorio y página completa en celular. Mismas reglas que CreatePetRequest / UpdatePetRequest.
 */
export default function PetFormDialog({ open, pet, householdId, today, onClose, onDone }) {
  const editing = Boolean(pet);
  const [values, setValues] = useState(() => ({
    name: pet?.name ?? '',
    species: pet?.species ?? '',
    breed: pet?.breed ?? '',
    sex: pet?.sex ?? 'UNKNOWN',
    birthDate: pet?.birthDate ?? '',
    birthDateIsEstimated: pet?.birthDateIsEstimated ?? false,
    weightKg: pet?.weightKg != null ? String(pet.weightKg).replace('.', ',') : '',
    notes: pet?.notes ?? '',
  }));
  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [k]: value, ...(k === 'birthDate' && !value ? { birthDateIsEstimated: false } : {}) }));
  };

  function validate(v) {
    const e = {};
    if (!v.name.trim()) e.name = 'El nombre es obligatorio';
    else if (v.name.trim().length > 100) e.name = 'El nombre no puede superar 100 caracteres';
    if (!v.species.trim()) e.species = 'La especie es obligatoria';
    else if (v.species.trim().length > 40) e.species = 'La especie no puede superar 40 caracteres';
    if (v.breed.trim().length > 100) e.breed = 'La raza no puede superar 100 caracteres';
    if (v.birthDate && v.birthDate > today) e.birthDate = 'La fecha de nacimiento no puede ser futura';
    if (String(v.weightKg).trim()) {
      const n = toNumber(v.weightKg);
      if (!Number.isFinite(n) || n <= 0) e.weightKg = 'El peso debe ser mayor que cero';
      else if (!/^\d{1,4}([.,]\d{1,3})?$/.test(String(v.weightKg).trim())) e.weightKg = 'El peso tiene un formato inválido';
    }
    if (v.notes.length > 2000) e.notes = 'Las notas no pueden superar 2000 caracteres';
    return e;
  }

  function submit(v) {
    const body = {
      name: v.name.trim(),
      species: v.species.trim(),
      breed: v.breed.trim() || null,
      sex: v.sex,
      birthDate: v.birthDate || null,
      birthDateIsEstimated: Boolean(v.birthDate) && v.birthDateIsEstimated,
      weightKg: String(v.weightKg).trim() ? toNumber(v.weightKg) : null,
      notes: v.notes.trim() || null,
    };
    return editing ? petsApi.update(pet.id, body) : petsApi.create({ householdId, ...body });
  }

  return (
    <FormModal
      open={open}
      sheet
      title={editing ? `Editar a ${pet.name}` : 'Agregar mascota'}
      submitLabel={editing ? 'Guardar cambios' : 'Agregar mascota'}
      values={values}
      onClose={onClose}
      validate={validate}
      submit={submit}
      onDone={onDone}
    >
      {(errors) => (
        <>
          <Input label="Nombre" value={values.name} onChange={set('name')} error={errors.name} autoComplete="off" maxLength={100} />
          <div className="form-row">
            <Input
              label="Especie"
              value={values.species}
              onChange={set('species')}
              error={errors.species}
              list="species-options"
              placeholder="Perro, gato, conejo…"
              maxLength={40}
            />
            <Input label="Raza (opcional)" value={values.breed} onChange={set('breed')} error={errors.breed} maxLength={100} />
          </div>
          <datalist id="species-options">
            {SPECIES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="form-row">
            <Select label="Sexo" value={values.sex} onChange={set('sex')} error={errors.sex}>
              {Object.entries(SEX).map(([key, text]) => (
                <option key={key} value={key}>
                  {text}
                </option>
              ))}
            </Select>
            <Input
              label="Peso en kg (opcional)"
              inputMode="decimal"
              value={values.weightKg}
              onChange={set('weightKg')}
              error={errors.weightKg}
              placeholder="12,5"
            />
          </div>
          <Input
            label="Fecha de nacimiento (opcional)"
            type="date"
            max={today}
            value={values.birthDate}
            onChange={set('birthDate')}
            error={errors.birthDate}
          />
          <Checkbox
            label="La fecha es estimada"
            checked={values.birthDateIsEstimated}
            onChange={set('birthDateIsEstimated')}
            disabled={!values.birthDate}
            hint={values.birthDate ? 'Márcala si no conoces el día exacto.' : 'Primero indica una fecha de nacimiento.'}
          />
          <Textarea label="Notas (opcional)" value={values.notes} onChange={set('notes')} error={errors.notes} maxLength={2000} />
        </>
      )}
    </FormModal>
  );
}
