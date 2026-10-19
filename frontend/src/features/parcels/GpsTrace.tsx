import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Button, Chips, Field, Icon, Input, PageHeader, Select, fmtNum } from '../../shared/ui';
import type { Parcel } from '../../shared/api/types';
import { useCreateParcel } from './api';
import { LAND_TYPES, TENURES } from './ParcelsPage';
import { areaHa, distanceM, fitPoints, lengthM, toPolygon, type LonLat } from './shape';
import './gps.css';

const MAX_ACCURACY_M = 20; // au-delà, le point est trop imprécis pour mesurer un champ
const MIN_STEP_M = 3; // un point n'est gardé que si l'on a vraiment avancé
const CLOSE_M = 15; // revenu à moins de 15 m du départ : le contour peut se fermer

/** Suivi de la position : points retenus selon la précision et le déplacement. */
export function useGpsTrace(active: boolean) {
  const [pts, setPts] = useState<LonLat[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<'denied' | 'unavailable' | null>(null);
  useEffect(() => {
    if (!active) return;
    if (!navigator.geolocation) { setError('unavailable'); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(null);
        setAccuracy(p.coords.accuracy);
        if (p.coords.accuracy > MAX_ACCURACY_M) return;
        const here: LonLat = [p.coords.longitude, p.coords.latitude];
        setPts((cur) => (cur.length && distanceM(cur[cur.length - 1], here) < MIN_STEP_M ? cur : [...cur, here]));
      },
      (e) => setError(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);
  return { pts, accuracy, error, reset: () => setPts([]) };
}

function Shape({ pts, closed, w = 328, h = 300, label }: { pts: LonLat[]; closed: boolean; w?: number; h?: number; label: string }) {
  const xy = fitPoints(pts, w, h, 24);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + (closed && xy.length > 2 ? ' Z' : '');
  const last = xy[xy.length - 1];
  return (
    <svg className="gps-field" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      {xy.length > 1 && <path d={d} className={closed ? 'gps-poly is-closed' : 'gps-poly'} />}
      {!closed && xy.length > 2 && <path d={`M${last[0]} ${last[1]} L${xy[0][0]} ${xy[0][1]}`} className="gps-ghost" />}
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 0 ? 6 : 3.5} className={i === 0 ? 'gps-start' : 'gps-vertex'} />)}
      {!closed && last && <circle cx={last[0]} cy={last[1]} r={9} className="gps-me" />}
    </svg>
  );
}

/** /parcelles?tracer=1 (maquettes mobile trace-gps et trace-fin) : mesurer un champ en le parcourant à pied. */
export function GpsTrace() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [paused, setPaused] = useState(false);
  const [closed, setClosed] = useState(false);
  const { pts, accuracy, error, reset } = useGpsTrace(!paused && !closed);
  const create = useCreateParcel();
  const [name, setName] = useState('');
  const [landType, setLandType] = useState('');
  const [tenure, setTenure] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Parcel | 'queued' | null>(null);

  const ha = areaHa(pts);
  const nearStart = pts.length > 2 && distanceM(pts[pts.length - 1], pts[0]) <= CLOSE_M;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!name.trim()) er.name = t('parcels.errName');
    if (!landType) er.land_type = t('parcels.errLandType');
    if (!tenure.length) er.tenure = t('parcels.errTenure');
    setErrs(er);
    const geometry = toPolygon(pts);
    if (Object.keys(er).length || !geometry) return;
    try {
      setResult(await create.mutateAsync({ name: name.trim(), land_type: landType as Parcel['land_type'], tenure: tenure[0] as Parcel['tenure'], geometry }));
    } catch { /* affiché */ }
  };

  if (result) {
    return (
      <>
        <PageHeader title={t('gps.savedTitle')} crumbs={[{ label: t('nav.parcels'), to: '/parcelles' }, { label: t('gps.savedTitle') }]} />
        {result === 'queued'
          ? <Alert tone="warn" icon="wifi-off">{t('parcels.queued')}</Alert>
          : (
            <Alert tone={result.overlap_warning ? 'warn' : 'ok'} title={result.overlap_warning ? t('parcels.overlap') : undefined}>
              <p><Trans i18nKey="parcels.saved" values={{ area: fmtNum(result.area_ha, 2) }} components={{ b: <b className="num" /> }} /></p>
              <p>{t('parcels.nextPrefix')} <Link to={`/campagnes?parcelle=${result.id}`}>{t('parcels.nextLink')}</Link>.</p>
            </Alert>
          )}
        <div className="m-cta"><Link className="btn btn-primary btn-block" to="/parcelles">{t('gps.backList')}</Link></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={closed ? t('gps.closedTitle') : t('gps.title')} desc={closed ? undefined : t('gps.desc')}
        crumbs={[{ label: t('nav.parcels'), to: '/parcelles' }, { label: t('gps.title') }]} />
      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        {error === 'denied' && <Alert tone="danger" title={t('gps.deniedTitle')}>{t('gps.denied')}</Alert>}
        {error === 'unavailable' && <Alert tone="warn" title={t('gps.unavailableTitle')}>{t('gps.unavailable')}</Alert>}
        <div className="gps-wrap">
          <Shape pts={pts} closed={closed} label={t('gps.shapeLabel', { count: pts.length })} />
          {!closed && <span className="gps-rec" aria-live="polite">{paused ? t('gps.paused') : t('gps.recording')}</span>}
        </div>
        <dl className="gps-stats" aria-live="polite">
          <div><dt>{t('gps.area')}</dt><dd className="num">{t('parcels.ha', { n: fmtNum(ha, 2) })}</dd></div>
          <div><dt>{closed ? t('gps.perimeter') : t('gps.distance')}</dt><dd className="num">{fmtNum(lengthM(pts, closed), 0)} m</dd></div>
          <div><dt>{t('gps.accuracy')}</dt><dd className="num">{accuracy === null ? '—' : `± ${fmtNum(accuracy, 0)} m`}</dd></div>
        </dl>
        {!closed ? (
          <>
            <p className="hint"><Icon name="info" /> {accuracy !== null && accuracy > MAX_ACCURACY_M ? t('gps.waitAccuracy', { m: MAX_ACCURACY_M }) : nearStart ? t('gps.nearStart') : t('gps.walkBack')}</p>
            <div className="m-cta cluster" style={{ flexWrap: 'nowrap' }}>
              <Button variant="secondary" onClick={() => setPaused(!paused)}>{paused ? t('gps.resume') : t('gps.pause')}</Button>
              <Button icon="check" disabled={pts.length < 3} onClick={() => setClosed(true)}>{t('gps.finish')}</Button>
            </div>
            <div className="cluster">
              <Button variant="ghost" size="sm" disabled={!pts.length} onClick={reset}>{t('gps.restart')}</Button>
              <Button variant="ghost" size="sm" onClick={() => nav('/parcelles')}>{t('common.cancel')}</Button>
            </div>
            <p className="hint">{t('gps.minPoints')}</p>
          </>
        ) : (
          <form noValidate className="stack" style={{ '--gap': '14px' } as React.CSSProperties} onSubmit={(e) => void save(e)}>
            <Alert tone="ok" icon="check">{t('gps.closedOk')}</Alert>
            <Field label={t('parcels.name')} error={errs.name}>{(p) => <Input {...p} value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label={t('parcels.landTypeLabel')} error={errs.land_type}>{(p) => <Select {...p} value={landType} onChange={(e) => setLandType(e.target.value)} placeholder={t('common.choose')} options={LAND_TYPES.map((v) => ({ value: v, label: t(`parcels.landType.${v}`) }))} />}</Field>
            <div>
              <Chips single label={t('parcels.tenureLabel')} value={tenure} onChange={setTenure} options={TENURES.map((v) => ({ value: v, label: t(`parcels.tenure.${v}`) }))} />
              {errs.tenure && <p className="error-msg" role="alert"><Icon name="alert" />{errs.tenure}</p>}
            </div>
            <p className="hint">{t('parcels.previewNote')}</p>
            {create.error && <Alert tone="danger" live>{create.error.message}</Alert>}
            <div className="m-cta cluster" style={{ flexWrap: 'nowrap' }}>
              <Button variant="secondary" onClick={() => setClosed(false)}>{t('gps.continue')}</Button>
              <Button type="submit" icon="check" busy={create.isPending}>{t('parcels.save')}</Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
