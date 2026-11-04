import { Link } from 'react-router-dom';
import { CARE_TASK_TYPE, label } from '../i18n/labels.js';
import { dueLabel, formatKg, petAge } from '../pages/careFormat.js';
import Chip from './Chip.jsx';
import PetAvatar from './PetAvatar.jsx';

/**
 * Tarjeta de mascota (Inicio y Mascotas). Toda la tarjeta lleva a la ficha.
 * pet: Pet del backend, opcionalmente con lastWeightKg y nextTask del panel del hogar.
 */
export default function PetCard({ pet, today, index = 0 }) {
  const archived = pet.status === 'ARCHIVED';
  const age = petAge(pet.birthDate, today, pet.birthDateIsEstimated);
  const weight = formatKg(pet.lastWeightKg ?? pet.weightKg);
  const due = pet.nextTask ? dueLabel(pet.nextTask, today) : null;
  const species = [pet.species, pet.breed].filter(Boolean).join(', ');

  let next;
  if (archived) next = <Chip tone="neutral">Archivada</Chip>;
  else if (due)
    next = (
      <Chip tone={due.tone} icon="calendar">
        {label(CARE_TASK_TYPE, pet.nextTask.type)}: {pet.nextTask.overdue ? 'vencida' : due.text.toLowerCase()}
      </Chip>
    );
  else if (pet.nextTask === null)
    next = (
      <Chip tone="ok" icon="check">
        Sin cuidados pendientes
      </Chip>
    );

  return (
    <li className="pet-slide" style={{ '--i': index }}>
      <Link to={`/mascotas/${pet.id}`} className={`pet-card pressable${archived ? ' is-archived' : ''}`}>
        <PetAvatar species={pet.species} size={64} />
        <span className="pet-card-text">
          <span className="pet-name">{pet.name}</span>
          <span className="pet-species">{species}</span>
        </span>
        {(age || weight) && (
          <span className="pet-facts">
            {age && <Chip icon="clock">{age}</Chip>}
            {weight && <Chip icon="scale">{weight}</Chip>}
          </span>
        )}
        {next && <span className="pet-next">{next}</span>}
      </Link>
    </li>
  );
}
