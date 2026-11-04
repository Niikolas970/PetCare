// Íconos propios en src/assets/icons/*.svg (trazo de 2 px, puntas redondeadas, currentColor).
// Se importan como texto y se pintan en línea para que tomen el color del texto que los rodea.
const files = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true });

const ICONS = Object.fromEntries(
  Object.entries(files).map(([path, svg]) => [path.split('/').pop().replace('.svg', ''), svg]),
);

export default function Icon({ name, size = 22, className = '' }) {
  const svg = ICONS[name];
  if (!svg) return null;
  return (
    <span
      className={`icon ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      // Los SVG son archivos propios del proyecto, no contenido del usuario
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
