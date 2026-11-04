import { Link } from 'react-router-dom';
import Chip from '../../components/Chip.jsx';
import Icon from '../../components/Icon.jsx';
import PetAvatar from '../../components/PetAvatar.jsx';
import { CARE_TASK_TYPE, label } from '../../i18n/labels.js';
import { dueLabel, formatKg, petAge } from '../careFormat.js';

function PetCard({ pet, today, index }) {
  const age = petAge(pet.birthDate, today, pet.birthDateIsEstimated);
  const weight = formatKg(pet.lastWeightKg);
  const due = pet.nextTask ? dueLabel(pet.nextTask, today) : null;
  const species = [pet.species, pet.breed].filter(Boolean).join(', ');

  return (
    <li className="pet-slide" style={{ '--i': index }}>
      <Link to={`/mascotas/${pet.id}`} className="pet-card pressable">
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
        <span className="pet-next">
          {due ? (
            <Chip tone={due.tone} icon="calendar">
              {label(CARE_TASK_TYPE, pet.nextTask.type)}: {pet.nextTask.overdue ? 'vencida' : due.text.toLowerCase()}
            </Chip>
          ) : (
            <Chip tone="ok" icon="check">
              Sin cuidados pendientes
            </Chip>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function PetsSection({ pets, today, onAddPet }) {
  return (
    <section className="home-section" aria-labelledby="pets-title">
      <div className="section-head">
        <h2 id="pets-title" className="section-title">
          Mis mascotas
        </h2>
        {pets.length > 0 && <span className="section-count">{pets.length}</span>}
      </div>
      <ul className="pet-grid">
        {pets.map((pet, i) => (
          <PetCard key={pet.id} pet={pet} today={today} index={i} />
        ))}
        <li className="pet-slide" style={{ '--i': pets.length }}>
          <button type="button" className="pet-add pressable" onClick={onAddPet}>
            <span className="pet-add-icon">
              <Icon name="plus" size={28} />
            </span>
            <span className="pet-name">Agregar mascota</span>
            <span className="pet-species">
              {pets.length === 0 ? 'Registra a tu primera mascota para empezar.' : 'Suma otro integrante al hogar.'}
            </span>
          </button>
        </li>
      </ul>
    </section>
  );
}
