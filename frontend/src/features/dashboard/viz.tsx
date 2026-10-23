// Composants locaux du groupe Pilotage (absents du kit, candidats) : valeur non disponible, barres horizontales,
// jauge avec cible, barre empilée avec légende, vue tableau repliable. Styles : ./pilotage.css.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, fmtNum } from '../../shared/ui';
import './pilotage.css';

/** Une valeur absente n'est jamais un zéro : « non disponible ». */
export function Val({ v, unit, digits = 1 }: { v: number | null | undefined; unit?: string; digits?: number }) {
  const { t } = useTranslation();
  if (v === null || v === undefined) return <span className="na">{t('common.notAvailable')}</span>;
  return <>{fmtNum(v, digits)}{unit ? ` ${unit}` : ''}</>;
}

/** Unité accordée au nombre : « 1 producteur », « 2 producteurs » (les unités sans « s » final, comme ha ou %, ne bougent pas). */
export const unitFor = (value: number | null | undefined, unit?: string) => (value === 1 && unit && /[a-zé]s$/.test(unit) ? unit.slice(0, -1) : unit);

export interface Bar { label: string; value: number | null }
/** Barres horizontales d'une seule série (pas de légende : le titre la nomme). Valeur toujours écrite à droite. */
export function HBars({ data, label, unit = '', digits = 0, describedBy }: { data: Bar[]; label?: string; unit?: string; digits?: number; describedBy?: string }) {
  const max = Math.max(0, ...data.map((d) => d.value ?? 0));
  return (
    <ul className="hbars" aria-label={label} aria-describedby={describedBy}>
      {data.map((d) => (
        <li key={d.label} className="hbar" title={d.value === null ? undefined : `${d.label} : ${fmtNum(d.value, digits)} ${unit}`.trim()}>
          <span className="hbar-label">{d.label}</span>
          <span className="hbar-track" aria-hidden>{d.value !== null && max > 0 && <span className="hbar-fill" style={{ '--v': `${(100 * d.value) / max}%` } as CSSProperties} />}</span>
          <span className="hbar-val"><Val v={d.value} digits={digits} /></span>
        </li>
      ))}
    </ul>
  );
}

/** Jauge 0–100 % avec un repère de cible facultatif. */
export function Meter({ pct, target, label }: { pct: number; target?: number; label: string }) {
  const clamp = (n: number) => `${Math.max(0, Math.min(100, n))}%`;
  return (
    <span className="meter" role="img" aria-label={label}>
      <span style={{ '--v': clamp(pct) } as CSSProperties} />
      {target !== undefined && <i style={{ '--t': clamp(target) } as CSSProperties} />}
    </span>
  );
}

/** Barre empilée : couleurs dans l'ordre fixe d5, d2, d1, d3, d4 ; la légende écrit chaque valeur (jamais la couleur seule). */
const STACK = ['var(--d5)', 'var(--d2)', 'var(--d1)', 'var(--d3)', 'var(--d4)'];
const SW = ['sw--5', 'sw--2', '', 'sw--3', 'sw--4'];
export function StackBar({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const parts = data.slice(0, STACK.length);
  return (
    <>
      <div className="stack-bar" role="img" aria-label={`${label} : ${parts.map((p) => `${p.label} ${fmtNum(p.value)}`).join(', ')}`}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <span key={p.label} style={{ flex: p.value, background: STACK[parts.indexOf(p)] }} title={`${p.label} : ${fmtNum(p.value)}`} />
        ))}
      </div>
      <ul className="legend full" aria-hidden>
        {parts.map((p, i) => <li key={p.label}><span className={`sw ${SW[i]}`} />{p.label} · <b className="num">{fmtNum(p.value)}</b></li>)}
      </ul>
    </>
  );
}

/** Vue tableau d'un graphique (repliée) : la donnée reste lisible sans couleur. */
export function TableView({ caption, head, rows, summary }: { caption: string; head: ReactNode[]; rows: ReactNode[][]; summary?: string }) {
  const { t } = useTranslation();
  return (
    <details className="tview full">
      <summary><Icon name="list-check" />{summary ?? t('pilotage.tableView')}<Icon name="chevron-down" className="chev" /></summary>
      <div className="table-scroll">
        <table className="data-table">
          <caption className="sr-only">{caption}</caption>
          <thead><tr>{head.map((h, i) => <th key={i} scope="col" className={i > 0 ? 'num' : undefined}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j} className="num">{c}</td>))}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

/** Ligne « Source · date ». */
export function Src({ source, at, id }: { source: string; at?: string | null; id?: string }) {
  const { t } = useTranslation();
  return <p className="src" id={id}>{at ? t('pilotage.srcLine', { source, date: new Date(at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }) : t('pilotage.srcOnly', { source })}</p>;
}

/** Hors ligne : les chiffres affichés sont ceux de la dernière lecture (react-query garde le cache). */
export function OfflineNote({ at }: { at: number }) {
  const { t } = useTranslation();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online || !at) return null;
  return <div className="banner banner--offline" role="status"><Icon name="wifi-off" /><span>{t('pilotage.offline', { date: new Date(at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) })}</span></div>;
}
