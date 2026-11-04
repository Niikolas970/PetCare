import { useEffect, useId, useRef, useState } from 'react';
import { formatKg } from '../careFormat.js';
import { formatDate } from './records.jsx';

const PAD = { top: 20, right: 16, bottom: 36, left: 64 };

// El SVG se dibuja al ancho real del contenedor para que el texto quede siempre en 14 px
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

const time = (dt) => Date.parse(`${dt.slice(0, 19)}Z`);

const shortFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortYearFmt = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' });

// Etiquetas del eje: cortas para que no se encimen en celular ("7 may"; con otro año, "may 2025")
function axisLabel(dt, otherDt) {
  const d = new Date(`${dt.slice(0, 10)}T12:00:00Z`);
  const sameYear = dt.slice(0, 4) === otherDt.slice(0, 4);
  return (sameYear ? shortFmt : shortYearFmt).format(d).replace('.', '');
}

/**
 * Gráfica de línea del peso (SVG propio, sin librerías).
 * records: pesos ACTIVE en cualquier orden. La lista de abajo es la versión en texto de los mismos datos.
 */
export default function WeightChart({ records, petName }) {
  const titleId = useId();
  const [ref, W] = useWidth();
  const H = W < 480 ? 200 : 240;
  const points = [...records].sort((a, b) => time(a.occurredAt) - time(b.occurredAt));
  if (points.length === 0) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const summary =
    points.length === 1
      ? `Una medición: ${formatKg(first.weightKg)} el ${formatDate(first.occurredAt.slice(0, 10))}.`
      : `Peso de ${petName} de ${formatKg(first.weightKg)} (${formatDate(first.occurredAt.slice(0, 10))}) a ${formatKg(
          last.weightKg,
        )} (${formatDate(last.occurredAt.slice(0, 10))}), ${points.length} mediciones.`;

  const values = points.map((p) => Number(p.weightKg));
  let min = Math.min(...values);
  let maxV = Math.max(...values);
  const span = maxV - min || Math.max(maxV * 0.1, 1);
  min = Math.max(0, min - span * 0.25);
  maxV = maxV + span * 0.25;

  const t0 = time(first.occurredAt);
  const t1 = time(last.occurredAt);
  const x = (p) =>
    points.length === 1 ? PAD.left + (W - PAD.left - PAD.right) / 2 : PAD.left + ((time(p.occurredAt) - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - (v - min) / (maxV - min)) * (H - PAD.top - PAD.bottom);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(Number(p.weightKg)).toFixed(1)}`).join(' ');
  const area = `${line} L${x(last).toFixed(1)},${H - PAD.bottom} L${x(first).toFixed(1)},${H - PAD.bottom} Z`;
  const ticks = [maxV, (maxV + min) / 2, min];

  return (
    <figure className="weight-chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-labelledby={titleId}>
        <title id={titleId}>{summary}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end" className="chart-label">
              {formatKg(Math.round(t * 10) / 10)}
            </text>
          </g>
        ))}
        {points.length > 1 && <path d={area} className="chart-area" />}
        {points.length > 1 && <path d={line} className="chart-line" />}
        {points.map((p) => (
          <circle key={p.id} cx={x(p)} cy={y(Number(p.weightKg))} r={p === last ? 6 : 4} className={p === last ? 'chart-dot is-last' : 'chart-dot'}>
            <title>{`${formatKg(p.weightKg)}, ${formatDate(p.occurredAt.slice(0, 10))}`}</title>
          </circle>
        ))}
        <text x={PAD.left} y={H - 10} className="chart-label">
          {axisLabel(first.occurredAt, last.occurredAt)}
        </text>
        {points.length > 1 && (
          <text x={W - PAD.right} y={H - 10} textAnchor="end" className="chart-label">
            {axisLabel(last.occurredAt, first.occurredAt)}
          </text>
        )}
      </svg>
      <figcaption className="chart-caption">
        {points.length === 1 ? 'Registra otro peso para ver la tendencia.' : summary}
      </figcaption>
    </figure>
  );
}
