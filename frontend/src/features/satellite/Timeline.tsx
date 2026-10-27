import { useTranslation } from 'react-i18next';
import type { SatellitePoint } from '../../shared/api/types';
import { fmtDate, fmtNum } from '../../shared/ui';

const W = 600, H = 84, PAD = 14;

interface Props {
  points: SatellitePoint[];
  index: number;
  onIndex: (i: number) => void;
  playing: boolean;
  onPlay: () => void;
  /** Faux quand l'utilisateur demande moins de mouvement : la lecture automatique disparaît. */
  canPlay?: boolean;
}

/** Frise des passages : curseur au clavier, courbe du NDVI (les passages nuageux ne sont jamais reliés ni inventés). */
export function Timeline({ points, index, onIndex, playing, onPlay, canPlay = true }: Props) {
  const { t } = useTranslation();
  const n = points.length;
  const sel = points[Math.min(index, n - 1)];
  const x = (i: number) => PAD + (n > 1 ? (i * (W - 2 * PAD)) / (n - 1) : 0);
  const y = (v: number) => H - PAD - Math.min(1, Math.max(0, v)) * (H - 2 * PAD);

  const segments: string[] = [];
  let run: string[] = [];
  points.forEach((p, i) => {
    if (p.ndvi === null) { if (run.length > 1) segments.push(run.join(' ')); run = []; } else run.push(`${x(i)},${y(p.ndvi)}`);
  });
  if (run.length > 1) segments.push(run.join(' '));

  const from = sel ? fmtDate(sel.from) : '', to = sel ? fmtDate(sel.to) : '';
  const value = !sel || sel.ndvi === null ? t('satellite.cloudy') : fmtNum(sel.ndvi, 2);

  return (
    <div className="sat-time">
      <div className="sat-time-head">
        {canPlay && (
          <button type="button" className="sat-play" aria-pressed={playing} onClick={onPlay}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
              {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" fill="currentColor" /> : <path d="M5 3l8 5-8 5z" fill="currentColor" />}
            </svg>
            {t(playing ? 'satellite.pause' : 'satellite.play')}
          </button>
        )}
        <p className="sat-time-label" aria-live="polite">
          <span>{t('satellite.period', { from, to })}</span>
          <b className="num">{value}</b>
        </p>
      </div>
      <input type="range" className="sat-slider" min={0} max={n - 1} step={1} value={Math.min(index, n - 1)}
        aria-label={t('satellite.timeline')} aria-valuetext={`${t('satellite.period', { from, to })} : ${value}`}
        onChange={(e) => onIndex(Number(e.target.value))} />
      <svg className="sat-curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={t('satellite.timelineSummary', { from, to, v: value })}>
        <title>{t('satellite.timelineSummary', { from, to, v: value })}</title>
        {segments.map((s) => <polyline key={s} points={s} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
        {points.map((p, i) => (
          <circle key={p.from} cx={x(i)} cy={p.ndvi === null ? H - PAD : y(p.ndvi)} r={i === index ? 6 : 4}
            className={`${p.ndvi === null ? 'is-cloudy' : ''} ${i === index ? 'is-sel' : ''}`} onClick={() => onIndex(i)} />
        ))}
      </svg>
    </div>
  );
}
