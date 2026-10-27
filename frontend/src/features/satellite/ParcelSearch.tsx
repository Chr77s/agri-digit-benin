import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlaceName, useVcName } from '../../shared/api/ref';
import { fmtNum } from '../../shared/ui';
import type { SatelliteParcel } from './api';

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MAX_HITS = 6;

/** Recherche d'une parcelle par nom, code producteur, département ou filière ; sert aussi de liste sans souris. */
export function ParcelSearch({ parcels, onPick }: { parcels: SatelliteParcel[]; onPick: (id: string) => void }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const vcName = useVcName();
  const [q, setQ] = useState('');
  const id = useId();
  const list = useRef<HTMLUListElement>(null);
  if (parcels.length === 0) return null;

  const needle = plain(q.trim());
  const hits = needle
    ? parcels.filter((p) => plain([p.name, p.producer, place(p.department), ...p.value_chains.map(vcName)].join(' ')).includes(needle)).slice(0, MAX_HITS)
    : [];
  const pick = (pid: string) => { onPick(pid); setQ(''); };
  return (
    <div className="sat-search" role="search">
      <label htmlFor={id} className="sr-only">{t('satellite.searchParcel')}</label>
      <input id={id} type="search" value={q} placeholder={t('satellite.searchParcel')} autoComplete="off"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setQ('');
          if (e.key === 'ArrowDown') { e.preventDefault(); list.current?.querySelector('button')?.focus(); }
        }} />
      {needle && (hits.length ? (
        <ul ref={list} className="sat-hits">
          {hits.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p.id)}>
                <b>{p.name}</b>
                <span>{p.producer} · {place(p.department)} · {t('amap.area', { n: fmtNum(p.area_ha, 2) })}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="sat-hits-none" role="status">{t('satellite.noParcel')}</p>)}
    </div>
  );
}
