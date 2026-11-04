import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { petsApi } from '../../api/services.js';
import Button from '../../components/Button.jsx';
import Chip from '../../components/Chip.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Icon from '../../components/Icon.jsx';
import Loader from '../../components/Loader.jsx';
import PetAvatar from '../../components/PetAvatar.jsx';
import Tabs from '../../components/Tabs.jsx';
import Toast from '../../components/Toast.jsx';
import { useHouseholds } from '../../households/HouseholdContext.jsx';
import { SEX, label } from '../../i18n/labels.js';
import { formatKg, localToday, petAge } from '../careFormat.js';
import PetFormDialog from './PetFormDialog.jsx';
import { CareTab, FeedingTab, HealthTab, PET_TABS, SummaryTab, WeightTab, WellbeingTab } from './PetTabs.jsx';

const PANELS = {
  resumen: SummaryTab,
  salud: HealthTab,
  alimentacion: FeedingTab,
  peso: WeightTab,
  bienestar: WellbeingTab,
  cuidados: CareTab,
};

/** /mascotas/:id: ficha con encabezado y pestañas. */
export default function PetPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { roleIn, reload: reloadHouseholds } = useHouseholds();
  const [pet, setPet] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const [dialog, setDialog] = useState(null); // 'edit' | 'archive' | 'restore'
  const [notice, setNotice] = useState(() => (location.state?.notice ? { id: 1, text: location.state.notice, tone: 'ok' } : null));
  const today = localToday();

  const tab = PANELS[params.get('tab')] ? params.get('tab') : 'resumen';
  const goTo = useCallback((t) => setParams({ tab: t }, { replace: true }), [setParams]);
  const reloadPet = useCallback(() => setVersion((v) => v + 1), []);
  const showNotice = useCallback((text, tone = 'ok') => setNotice({ id: Date.now(), text, tone }), []);

  useEffect(() => {
    const controller = new AbortController();
    petsApi
      .get(id, controller.signal)
      .then((p) => {
        setPet(p);
        setError(null);
      })
      .catch((err) => err.name !== 'AbortError' && setError(err));
    return () => controller.abort();
  }, [id, version]);

  if (error) {
    return (
      <div className="page">
        <Link to="/mascotas" className="back-link">
          <Icon name="arrow-right" size={20} className="back-icon" />
          Mascotas
        </Link>
        <ErrorMessage title="No pudimos abrir la ficha" onRetry={error.status === 404 ? null : reloadPet}>
          {error.message}
        </ErrorMessage>
      </div>
    );
  }
  if (!pet) return <Loader block text="Cargando la ficha…" />;

  const role = roleIn(pet.householdId);
  const isOwner = role === 'OWNER';
  const archived = pet.status === 'ARCHIVED';
  const canWrite = !archived; // OWNER y CAREGIVER registran; una archivada no admite registros (409)
  const canVoid = isOwner && !archived; // solo OWNER anula (403 para CAREGIVER)
  const age = petAge(pet.birthDate, today, pet.birthDateIsEstimated);
  const Panel = PANELS[tab];

  return (
    <div className="page pet-page">
      <Link to="/mascotas" className="back-link">
        <Icon name="arrow-right" size={20} className="back-icon" />
        Mascotas
      </Link>

      <header className="pet-hero">
        <PetAvatar species={pet.species} size={88} />
        <div className="pet-hero-text">
          <h1 className="page-title">{pet.name}</h1>
          <p className="pet-hero-sub">{[pet.species, pet.breed].filter(Boolean).join(', ')}</p>
          <div className="pet-facts">
            {archived && <Chip tone="late">Archivada</Chip>}
            <Chip>{label(SEX, pet.sex)}</Chip>
            {age && <Chip icon="clock">{age}</Chip>}
            {pet.weightKg != null && <Chip icon="scale">{formatKg(pet.weightKg)}</Chip>}
          </div>
        </div>
        <div className="pet-hero-actions">
          {!archived && (
            <Button variant="soft" icon="edit" className="btn-sm" onClick={() => setDialog('edit')}>
              Editar
            </Button>
          )}
          {isOwner && !archived && (
            <Button variant="ghost" icon="archive" className="btn-sm" onClick={() => setDialog('archive')}>
              Archivar
            </Button>
          )}
          {isOwner && archived && (
            <Button icon="restore" className="btn-sm" onClick={() => setDialog('restore')}>
              Restaurar
            </Button>
          )}
        </div>
      </header>

      {archived && (
        <p className="archived-banner" role="note">
          <Icon name="archive" size={20} />
          {isOwner
            ? 'Esta mascota está archivada: su historial se conserva, pero no se puede editar ni recibir registros. Restáurala para continuar.'
            : 'Esta mascota está archivada. Solo el responsable del hogar puede restaurarla.'}
        </p>
      )}

      <Tabs tabs={PET_TABS} active={tab} onChange={goTo} label={`Secciones de ${pet.name}`} />
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tab-panel" key={tab}>
        <Panel pet={pet} today={today} canWrite={canWrite} canVoid={canVoid} onNotice={showNotice} onPetChanged={reloadPet} goTo={goTo} />
      </div>

      {dialog === 'edit' && (
        <PetFormDialog
          open
          pet={pet}
          today={today}
          onClose={() => setDialog(null)}
          onDone={(updated) => {
            setDialog(null);
            setPet(updated);
            showNotice('Cambios guardados.');
          }}
        />
      )}
      {dialog === 'archive' && (
        <ConfirmDialog
          open
          title={`Archivar a ${pet.name}`}
          confirmLabel="Archivar"
          tone="danger"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const updated = await petsApi.archive(pet.id);
            setDialog(null);
            setPet(updated);
            reloadHouseholds();
            showNotice(`${pet.name} quedó archivada. Su historial se conserva.`);
          }}
        >
          <p>
            Dejará de aparecer en el Inicio y en las mascotas activas. Su historial no se borra y podrás restaurarla cuando quieras.
          </p>
        </ConfirmDialog>
      )}
      {dialog === 'restore' && (
        <ConfirmDialog
          open
          title={`Restaurar a ${pet.name}`}
          confirmLabel="Restaurar"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const updated = await petsApi.restore(pet.id);
            setDialog(null);
            setPet(updated);
            reloadHouseholds();
            showNotice(`${pet.name} está activa de nuevo.`);
          }}
        >
          <p>Volverá a las mascotas activas y podrás editarla y agregar registros.</p>
        </ConfirmDialog>
      )}
      <Toast notice={notice} onDismiss={() => {
        setNotice(null);
        if (location.state?.notice) navigate(location.pathname + location.search, { replace: true, state: null });
      }} />
    </div>
  );
}
