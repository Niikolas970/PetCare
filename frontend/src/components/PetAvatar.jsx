import { speciesKind } from '../pages/careFormat.js';
import Icon from './Icon.jsx';

// Avatares planos por especie, dibujados con formas simples en la paleta de la marca.
const INK = '#2A1D14';

function Eyes({ y, left = 26.5, right = 37.5, rx = 2.2, ry = 2.2 }) {
  return (
    <g>
      <ellipse cx={left} cy={y} rx={rx} ry={ry} fill={INK} />
      <ellipse cx={right} cy={y} rx={rx} ry={ry} fill={INK} />
      <circle cx={left + 0.7} cy={y - 0.8} r="0.7" fill="#fff" />
      <circle cx={right + 0.7} cy={y - 0.8} r="0.7" fill="#fff" />
    </g>
  );
}

function Dog() {
  return (
    <>
      <ellipse cx="17.5" cy="30" rx="6.5" ry="13" fill="#8F5524" transform="rotate(18 17.5 30)" />
      <ellipse cx="46.5" cy="30" rx="6.5" ry="13" fill="#8F5524" transform="rotate(-18 46.5 30)" />
      <ellipse cx="32" cy="32" rx="15" ry="16" fill="#D39A5E" />
      <ellipse cx="32" cy="40.5" rx="9" ry="7" fill="#F5DDBF" />
      <Eyes y={29} />
      <ellipse cx="32" cy="37" rx="3.6" ry="2.6" fill={INK} />
      <path d="M32 39.5v2.2M28.6 42.4c1.8 1.5 5 1.5 6.8 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function Cat() {
  return (
    <>
      <path d="M18.5 27 20.5 11l11.5 9.5Z" fill="#9C8571" />
      <path d="M45.5 27 43.5 11 32 20.5Z" fill="#9C8571" />
      <path d="M21.6 22.5 22.6 15.5l5.2 4.4Z" fill="#F2B8A8" />
      <path d="M42.4 22.5 41.4 15.5l-5.2 4.4Z" fill="#F2B8A8" />
      <ellipse cx="32" cy="34" rx="15.5" ry="14" fill="#B49A82" />
      <ellipse cx="32" cy="40.5" rx="7.5" ry="5.2" fill="#EFE3D6" />
      <Eyes y={32} rx={2.1} ry={2.8} />
      <path d="M29.9 37.6h4.2L32 39.9Z" fill="#D9786B" />
      <path d="M24 40l-10-2M24 42.5l-10 1.5M40 40l10-2M40 42.5l10 1.5" stroke="#6A5A4D" strokeWidth="1.2" strokeLinecap="round" />
    </>
  );
}

function Rabbit() {
  return (
    <>
      <rect x="20.5" y="5" width="9" height="25" rx="4.5" fill="#EADFD1" transform="rotate(-8 25 17)" />
      <rect x="34.5" y="5" width="9" height="25" rx="4.5" fill="#EADFD1" transform="rotate(8 39 17)" />
      <rect x="23" y="8.5" width="4" height="17" rx="2" fill="#F2B8A8" transform="rotate(-8 25 17)" />
      <rect x="37" y="8.5" width="4" height="17" rx="2" fill="#F2B8A8" transform="rotate(8 39 17)" />
      <circle cx="32" cy="38" r="14.5" fill="#F6EEE4" />
      <circle cx="24.5" cy="42.5" r="2.6" fill="#F6CFC4" />
      <circle cx="39.5" cy="42.5" r="2.6" fill="#F6CFC4" />
      <Eyes y={36} />
      <ellipse cx="32" cy="41" rx="2.2" ry="1.6" fill="#D9786B" />
      <path d="M32 42.6v2M29.6 45.4c1.2 1 3.6 1 4.8 0" stroke="#6A5A4D" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  );
}

function Bird() {
  return (
    <>
      <path d="M30 20.5c-1.6-4.2.4-7.7 4.2-8.7-1 3-.2 5.4 1.6 7.4" fill="#E2AE3C" />
      <circle cx="32" cy="35" r="16" fill="#E9B949" />
      <ellipse cx="32" cy="41.5" rx="9" ry="8" fill="#F7E3A6" />
      <ellipse cx="45" cy="38" rx="4.5" ry="8" fill="#C9962E" transform="rotate(-20 45 38)" />
      <Eyes y={31} />
      <path d="M29 35.4h6l-3 4.2Z" fill="#D9783B" />
    </>
  );
}

const ART = {
  dog: { bg: 'var(--amber-bg)', Art: Dog },
  cat: { bg: 'var(--violet-bg)', Art: Cat },
  rabbit: { bg: 'var(--sage-bg)', Art: Rabbit },
  bird: { bg: 'var(--blue-bg)', Art: Bird },
};

/** Avatar ilustrado según la especie (texto libre del backend). Decorativo: el nombre va al lado. */
export default function PetAvatar({ species, size = 64 }) {
  const kind = speciesKind(species);
  const entry = ART[kind];
  if (!entry) {
    return (
      <span className="pet-avatar pet-avatar-other" style={{ width: size, height: size }} aria-hidden="true">
        <Icon name="paw" size={Math.round(size * 0.45)} />
      </span>
    );
  }
  const { bg, Art } = entry;
  return (
    <svg className="pet-avatar" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill={bg} />
      <Art />
    </svg>
  );
}
