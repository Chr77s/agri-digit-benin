import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { useDepartments } from '../../shared/api/ref';
import { Button } from '../../shared/ui';
import { departmentPlaces, findPlaces, type Place } from './places';

type Fix = { kind: 'idle' | 'busy' | 'denied' | 'unavailable' | 'timeout' | 'unsupported' } | { kind: 'ok'; meters: number };

interface Props {
  map: L.Map | null;
  /** Appelé quand la carte est déplacée à la demande de l'utilisateur (recherche, position) : la vue de départ ne doit plus la reprendre. */
  onNavigate: () => void;
}

/** Recherche d'un lieu (département tout de suite, village en ligne) et bouton « Ma position », posés sur la carte de tracé. */
export function MapFinder({ map, onNavigate }: Props) {
  const { t } = useTranslation();
  const deps = useDepartments().data ?? [];
  const id = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{ q: string; places: Place[]; online: boolean } | null>(null);
  const [fix, setFix] = useState<Fix>({ kind: 'idle' });
  const abort = useRef<AbortController | null>(null);
  const here = useRef<L.LayerGroup | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => () => { abort.current?.abort(); here.current?.remove(); }, []);

  const query = q.trim();
  const shown = found && found.q === query ? found : null;
  const places = shown ? shown.places : departmentPlaces(deps, query);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (query.length < 2) return;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setOpen(true);
    setBusy(true);
    try {
      setFound({ q: query, ...(await findPlaces(query, deps, undefined, ctl.signal)) });
    } catch { /* recherche remplacée par une plus récente */ } finally {
      if (abort.current === ctl) setBusy(false);
    }
  };

  const go = (p: Place) => {
    if (!map) return;
    onNavigate();
    if (p.bounds) map.fitBounds(p.bounds, { maxZoom: 17, padding: [24, 24] });
    else map.flyTo([p.lat, p.lon], p.zoom);
    setQ(p.label);
    setOpen(false);
  };

  const locate = () => {
    if (!navigator.geolocation) { setFix({ kind: 'unsupported' }); return; }
    setFix({ kind: 'busy' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!map) return;
        onNavigate();
        const at = L.latLng(pos.coords.latitude, pos.coords.longitude);
        const meters = Math.round(pos.coords.accuracy);
        here.current?.remove();
        here.current = L.layerGroup([
          L.circle(at, { radius: meters, color: '#2F86B5', weight: 1, fillOpacity: 0.12, interactive: false }),
          L.circleMarker(at, { radius: 7, color: '#FFFFFF', weight: 2, fillColor: '#2F86B5', fillOpacity: 1, interactive: false }),
        ]).addTo(map);
        map.flyTo(at, 17);
        setQ(''); // le nom d'un lieu cherché avant ne décrit plus la carte
        setOpen(false);
        setFix({ kind: 'ok', meters });
      },
      (err) => setFix({ kind: err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const note = (p: Place) => [p.detail, p.approximate ? t('parcels.find.approx') : ''].filter(Boolean).join(' · ');

  return (
    <div className="np-finder" role="search">
      <form onSubmit={search} className="np-find-row">
        <label htmlFor={id} className="sr-only">{t('parcels.find.label')}</label>
        <input id={id} type="search" value={q} placeholder={t('parcels.find.placeholder')} autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'ArrowDown') { e.preventDefault(); list.current?.querySelector('button')?.focus(); }
          }} />
        <Button type="submit" variant="secondary" iconOnly icon="search" busy={busy} aria-label={t('parcels.find.go')} title={t('parcels.find.go')} />
      </form>
      <div className="np-here">
        <Button type="button" variant="secondary" icon="target" busy={fix.kind === 'busy'} onClick={locate}>{t('parcels.find.here')}</Button>
      </div>

      {open && query.length >= 2 && (
        <div className="np-results" ref={list}>
          {busy && <p role="status">{t('parcels.find.searching')}</p>}
          {!busy && places.length > 0 && (
            <ul>
              {places.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => go(p)}><b>{p.label}</b>{note(p) && <span>{note(p)}</span>}</button>
                </li>
              ))}
            </ul>
          )}
          {!busy && shown && places.length === 0 && <p role="status">{t('parcels.find.none')}</p>}
          {!busy && shown && !shown.online && <p role="status">{t('parcels.find.offline')}</p>}
          {!busy && !shown && <p className="np-tip">{t('parcels.find.tip')}</p>}
        </div>
      )}

      <p className="np-fix" role="status" hidden={fix.kind === 'idle' || fix.kind === 'busy'}>
        {fix.kind === 'ok' ? t('parcels.find.fixOk', { m: fix.meters }) : fix.kind !== 'idle' && fix.kind !== 'busy' ? t(`parcels.find.fix.${fix.kind}`) : ''}
      </p>
    </div>
  );
}
