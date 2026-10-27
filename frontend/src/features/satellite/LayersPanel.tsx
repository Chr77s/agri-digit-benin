import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtNum } from '../../shared/ui';
import { BASEMAPS, type Basemap } from '../parcels/ParcelBasemaps';
import { indexRange, indexStops, type IndexKind } from './scale';

interface Props {
  basemap: Basemap;
  onBasemap: (b: Basemap) => void;
  kind: IndexKind;
  onKind: (k: IndexKind) => void;
  showDepartments: boolean;
  onToggleDepartments: () => void;
  /** Présents seulement quand le rôle voit des parcelles : la case « Parcelles » n'a pas de sens sans marqueurs. */
  showParcels?: boolean;
  onToggleParcels?: () => void;
  watch: { code: string; name: string; ndvi: number }[];
  onSelect: (code: string) => void;
  /** Présent seulement si le relief 3D est disponible (WebGL). */
  onRelief?: () => void;
  /** Fiche de la parcelle choisie, rangée en haut du panneau sur grand écran pour ne pas recouvrir la carte. */
  top?: ReactNode;
  id?: string;
  className?: string;
}

/** Colonne de droite de la console : indice, légende, fond de carte, départements, zones à surveiller. */
export function LayersPanel({ basemap, onBasemap, kind, onKind, showDepartments, onToggleDepartments, showParcels, onToggleParcels, watch, onSelect, onRelief, top, id, className = '' }: Props) {
  const { t } = useTranslation();
  const [lo, hi] = indexRange(kind);
  const legend = `linear-gradient(90deg, ${indexStops(kind).join(', ')})`;
  return (
    <aside id={id} className={`sat-panel ${className}`} aria-label={t('satellite.layers')}>
      {top}
      <fieldset className="sat-group">
        <legend>{t('satellite.index')}</legend>
        {(['ndvi', 'ndmi'] as const).map((k) => (
          <label key={k} className="sat-opt">
            <input type="radio" name="sat-index" value={k} checked={kind === k} onChange={() => onKind(k)} />
            <span>{t(k === 'ndvi' ? 'satellite.ndvi' : 'satellite.moisture')}</span>
          </label>
        ))}
        <div className="sat-legend" role="img" aria-label={`${t('satellite.legend')} : ${fmtNum(lo, 1)} à ${fmtNum(hi, 1)}`}>
          <i style={{ background: legend }} />
          <span className="num">{fmtNum(lo, 1)}</span><span className="num">{fmtNum(hi, 1)}</span>
        </div>
      </fieldset>

      <fieldset className="sat-group">
        <legend>{t('satellite.basemap')}</legend>
        {BASEMAPS.map((b) => (
          <label key={b.key} className="sat-opt">
            <input type="radio" name="sat-basemap" value={b.key} checked={basemap === b.key} onChange={() => onBasemap(b.key)} />
            <span>{t(`parcels.basemap.${b.key}`)}</span>
          </label>
        ))}
        <label className="sat-opt">
          <input type="checkbox" checked={showDepartments} onChange={onToggleDepartments} />
          <span>{t('satellite.departments')}</span>
        </label>
        {onToggleParcels && (
          <label className="sat-opt">
            <input type="checkbox" checked={!!showParcels} onChange={onToggleParcels} />
            <span>{t('satellite.parcelsLayer')}</span>
          </label>
        )}
      </fieldset>

      <div className="sat-group">
        <h3 className="sat-h">{t('satellite.watch')}</h3>
        {watch.length === 0 ? <p className="small">{t('satellite.watchNone')}</p> : (
          <ul className="sat-watch">
            {watch.map((w) => (
              <li key={w.code}>
                <button type="button" onClick={() => onSelect(w.code)}>{t('satellite.watchLine', { name: w.name, v: fmtNum(w.ndvi, 2) })}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {onRelief && <button type="button" className="sat-relief" onClick={onRelief}>{t('satellite.relief')}</button>}
    </aside>
  );
}
