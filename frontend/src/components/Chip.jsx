import Icon from './Icon.jsx';

/** tone: neutral | ok | soon | late | sage | blue | amber | rose | violet | clay */
export default function Chip({ tone = 'neutral', icon, children, className = '' }) {
  return (
    <span className={`chip chip-${tone} ${className}`.trim()}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}
