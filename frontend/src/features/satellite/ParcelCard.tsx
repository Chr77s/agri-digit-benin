import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePlaceName, useVcName } from '../../shared/api/ref';
import { fmtDate, fmtNum } from '../../shared/ui';
import { ndmiLevel, ndviLevel, useParcelSatellite, type SatelliteParcel } from './api';
import { indexColor, type IndexKind } from './scale';

interface Props {
  parcel: SatelliteParcel;
  /** Rang du passage choisi sur la frise. */
  index: number;
  onClose: () => void;
  /** Seul le producteur a une page « Mes parcelles » où retrouver sa parcelle. */
  canOpenList: boolean;
}

/** Fiche de la parcelle choisie, façon Google Maps : identité, caractéristiques et indices du passage affiché. */
export function ParcelCard({ parcel, index, onClose, canOpenList }: Props) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const vcName = useVcName();
  const sat = useParcelSatellite(parcel.id);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, [parcel.id]);

  // Série de la parcelle (mesure propre) ou, à défaut, celle de son département : une seule dans les deux cas.
  const points = Object.values(sat.data?.series ?? {})[0];
  const pt = points?.[Math.min(index, points.length - 1)];
  const cloudy = t('satellite.cloudy');
  const row = (kind: IndexKind) => {
    const v = pt?.[kind] ?? null;
    const level = v === null ? '' : t(`satellite.${kind}Level.${(kind === 'ndvi' ? ndviLevel : ndmiLevel)(v)}`);
    return (
      <div key={kind}>
        <dt>{t(kind === 'ndvi' ? 'satellite.ndvi' : 'satellite.moisture')}</dt>
        <dd><i className="sat-chip" style={{ background: indexColor(kind, v) }} aria-hidden />{v === null ? cloudy : t(`satellite.${kind}Cell`, { v: fmtNum(v, 2), level })}</dd>
      </div>
    );
  };

  return (
    <section className="sat-card" aria-labelledby="sat-card-title">
      <header>
        <div>
          <h3 id="sat-card-title" ref={title} tabIndex={-1}>{parcel.name}</h3>
          <p><span>{place(parcel.department)}</span> <span>{t('satellite.cardProducer', { code: parcel.producer })}</span></p>
        </div>
        <button type="button" className="sat-card-close" onClick={onClose} aria-label={t('satellite.cardClose')}>×</button>
      </header>
      <h4>{pt ? t('satellite.period', { from: fmtDate(pt.from), to: fmtDate(pt.to) }) : t('satellite.cardIndices')}</h4>
      {sat.isLoading && <p role="status">{t('satellite.cardLoading')}</p>}
      {sat.isError && <p role="alert">{t('satellite.cardError')}</p>}
      {pt && (
        <>
          <dl className="sat-card-facts">{(['ndvi', 'ndmi'] as const).map(row)}</dl>
          <p className="sat-card-note">
            {sat.data?.scope === 'parcel' ? t('satellite.cardOwn') : t('satellite.cardDept', { place: place(parcel.department) })}
            {sat.data?.simulated ? ` ${t('satellite.cardDemo')}` : ''}
          </p>
        </>
      )}
      <dl className="sat-card-facts">
        <div><dt>{t('satellite.cardArea')}</dt><dd className="num">{t('amap.area', { n: fmtNum(parcel.area_ha, 2) })}</dd></div>
        <div><dt>{t('parcels.landTypeLabel')}</dt><dd>{t(`parcels.landType.${parcel.land_type}`, { defaultValue: parcel.land_type })}</dd></div>
        <div><dt>{t('parcels.tenureLabel')}</dt><dd>{t(`parcels.tenure.${parcel.tenure}`, { defaultValue: parcel.tenure })}</dd></div>
        <div><dt>{t('satellite.cardChains')}</dt><dd>{parcel.value_chains.length ? parcel.value_chains.map(vcName).join(', ') : t('satellite.cardNoCampaign')}</dd></div>
      </dl>
      {canOpenList && <Link className="sat-card-link" to="/parcelles">{t('satellite.cardMine')}</Link>}
    </section>
  );
}
