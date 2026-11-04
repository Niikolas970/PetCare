import Icon from '../../components/Icon.jsx';
import PetCard from '../../components/PetCard.jsx';

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
