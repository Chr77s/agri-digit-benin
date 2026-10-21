import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, buttonCls, Card, Checkbox, Dialog, Field, fmtNum, Icon, Input, PageHeader, Select, Table, toast, type Column } from '../../shared/ui';
import { MEMBERS, PLAN, POINTS, type CollectPoint } from './demo';
import { toDec } from './OffersPage';
import '../market/market.css';

interface Weighing { point: string; member: string; bags: number; kg: number; moisture: number; redry: boolean }
const fmtT = (n: number) => fmtNum(n, 1).replace(/,0$/, '');
const toInt = (s: string) => (/^\d+$/.test(s.replace(/\s/g, '')) ? Number(s.replace(/\s/g, '')) : NaN);

/** Contrôles d'une pesée ; le maïs au-dessus de 14 % d'humidité doit être marqué « à resécher ». */
export function weighingErrors(v: { member: string; bags: string; kg: string; moisture: string; redry: boolean }) {
  const e: Record<string, string> = {};
  const bags = toInt(v.bags), kg = toDec(v.kg), h = toDec(v.moisture);
  if (!v.member) e.member = 'supply.collection.errMember';
  if (!(bags >= 1 && bags <= 1000)) e.bags = 'supply.collection.errBags';
  if (!(kg >= 1 && kg <= 100_000)) e.kg = 'supply.collection.errWeight';
  if (!(h >= 5 && h <= 40)) e.moisture = 'supply.collection.errMoisture';
  else if (h > 14 && !v.redry) e.moisture = 'supply.collection.errWet';
  return e;
}

/** /collecte : circuit de collecte de la coopérative. Aucune API : exemples étiquetés, pesées gardées dans la page. */
export function CollectionPage() {
  const { t } = useTranslation();
  const [points, setPoints] = useState(POINTS);
  const [queue, setQueue] = useState<Weighing[]>([]);
  const [adding, setAdding] = useState(false);
  const queuedT = (id?: string) => queue.filter((w) => !id || w.point === id).reduce((a, w) => a + w.kg, 0) / 1000;
  const sum = (k: 'committed_t' | 'collected_t') => points.reduce((a, p) => a + p[k], 0);
  const cols: Column<CollectPoint>[] = [
    { key: 'name', label: t('supply.collection.col.name'), render: (p) => <><span className="cell-main">{p.name}</span>{p.note && <span className="cell-sub">{p.note}</span>}</> },
    { key: 'members', label: t('supply.collection.col.members'), num: true },
    { key: 'committed_t', label: t('supply.collection.col.committed'), num: true, render: (p) => `${fmtT(p.committed_t)} t` },
    { key: 'collected_t', label: t('supply.collection.col.collected'), num: true, render: (p) => {
      const q = queuedT(p.id);
      return <>{fmtT(p.collected_t)} t {q > 0 && <Badge tone="offline">{t('supply.collection.pending', { t: fmtT(q) })}</Badge>}</>;
    } },
    { key: 'progress', label: t('supply.collection.col.progress'), sortable: false, render: (p) => {
      const pct = p.committed_t ? Math.round((p.collected_t / p.committed_t) * 100) : 0;
      return <span className="progress" role="img" aria-label={`${pct} %`}><span style={{ ['--v' as string]: `${pct}%` }} /></span>;
    } },
    { key: 'next', label: t('supply.collection.col.next'), render: (p) => p.next ?? <Badge tone="wait">{t('supply.collection.tbc')}</Badge> },
  ];
  return (
    <>
      {queue.length > 0 && (
        <div className="banner banner--offline mb-4 rounded-md" role="status">
          <Icon name="wifi-off" />
          <span>{t('supply.collection.queue', { count: queue.length, t: fmtT(queuedT()) })}</span>
        </div>
      )}
      <PageHeader
        crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.collection') }]}
        title={t('supply.collection.title')} desc={t('supply.collection.desc')}
        actions={<>
          <Button variant="secondary" icon="map-pin" onClick={() => setAdding(true)}>{t('supply.collection.addPoint')}</Button>
          <a className={buttonCls()} href="#f-pesee"><Icon name="plus" />{t('supply.collection.addWeighing')}</a>
        </>}
      />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Alert tone="demo" title={t('supply.demoTitle')}>{t('supply.collection.demoBody')}</Alert>
        <div className="split">
          <Card title={t('supply.collection.routeTitle')} sub={t('supply.collection.routeSub')} actions={<Badge tone="sim">{t('supply.collection.mapBadge')}</Badge>}>
            <RouteMap />
          </Card>
          <WeighingForm points={points} onSave={(w) => { setQueue((q) => [...q, w]); toast({ text: t('supply.collection.saved'), type: 'offline' }); }} />
        </div>
        <div>
          <Table columns={cols} data={points} rowKey={(p) => p.id} title={t('supply.collection.pointsTitle')} caption={t('supply.collection.pointsCaption')}
            toolbar={<span className="small muted num">{t('supply.collection.pointsSub')}</span>} />
          <p className="small muted mt-2 num">{t('supply.collection.total', { committed: fmtT(sum('committed_t')), collected: fmtT(sum('collected_t')) })}</p>
        </div>
        <Card title={t('supply.collection.planTitle')}
          actions={<Button variant="ghost" size="sm" onClick={() => toast({ text: t('supply.collection.smsDone'), type: 'demo' })}>{t('supply.collection.sms')}</Button>}>
          <div className="plan">
            {PLAN.map((d) => (
              <div key={d.day} className={`day${d.today ? ' day--today' : ''}`}>
                <h3>{d.day}{d.today && ` · ${t('supply.collection.today')}`}</h3>
                {d.stops.map((s) => (
                  <div key={s.place} className="stop"><span>{s.place}</span>{s.info ? <span className="num">{s.info}</span> : <Badge tone="wait">{t('supply.collection.tbc')}</Badge>}</div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
      {adding && <PointDialog onClose={() => setAdding(false)} onAdd={(name, note) => {
        setPoints((l) => [...l, { id: `p${l.length}-${name}`, name, note: note || undefined, members: 0, committed_t: 0, collected_t: 0, next: null }]);
        setAdding(false); toast({ text: t('supply.collection.pointAdded'), type: 'demo' });
      }} />}
    </>
  );
}

function WeighingForm({ points, onSave }: { points: CollectPoint[]; onSave: (w: Weighing) => void }) {
  const { t } = useTranslation();
  const blank = { point: points[0]?.id ?? '', member: '', bags: '', kg: '', moisture: '', redry: false };
  const [v, setV] = useState(blank);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const err = (k: string) => (errs[k] ? t(errs[k]) : undefined);
  return (
    <form id="f-pesee" noValidate className="card stack" aria-labelledby="h-pes" onSubmit={(e) => {
      e.preventDefault();
      const er = weighingErrors(v);
      setErrs(er);
      if (Object.keys(er).length) return;
      onSave({ point: v.point, member: v.member, bags: toInt(v.bags), kg: toDec(v.kg), moisture: toDec(v.moisture), redry: v.redry });
      setV({ ...blank, point: v.point });
    }}>
      <div className="between">
        <h2 className="card-title" id="h-pes">{t('supply.collection.addWeighing')}</h2>
        <Badge tone="offline">{t('supply.collection.offlineOk')}</Badge>
      </div>
      <Field label={t('supply.collection.point')}>{(p) => <Select {...p} value={v.point} onChange={(e) => setV({ ...v, point: e.target.value })} options={points.map((x) => ({ value: x.id, label: x.name }))} />}</Field>
      <Field label={t('supply.collection.member')} error={err('member')}>{(p) => <Select {...p} value={v.member} onChange={(e) => setV({ ...v, member: e.target.value })} placeholder={t('common.choose')} options={MEMBERS.map((m) => ({ value: m.code, label: `${m.name} · ${m.code}` }))} />}</Field>
      <div className="form-grid">
        <Field label={t('supply.collection.bags')} error={err('bags')}>{(p) => <Input {...p} className="input-num" inputMode="numeric" autoComplete="off" value={v.bags} onChange={(e) => setV({ ...v, bags: e.target.value })} />}</Field>
        <Field label={t('supply.collection.weight')} error={err('kg')}>{(p) => (
          <div className="input-group"><Input {...p} className="input-num" inputMode="decimal" autoComplete="off" value={v.kg} onChange={(e) => setV({ ...v, kg: e.target.value })} /><span className="addon addon--end">kg</span></div>
        )}</Field>
      </div>
      <Field label={t('supply.collection.moisture')} error={err('moisture')}>{(p) => (
        <div className="input-group"><Input {...p} className="input-num" inputMode="decimal" autoComplete="off" value={v.moisture} onChange={(e) => setV({ ...v, moisture: e.target.value })} /><span className="addon addon--end">%</span></div>
      )}</Field>
      <Checkbox label={t('supply.collection.redry')} checked={v.redry} onChange={(e) => setV({ ...v, redry: e.target.checked })} />
      <Button type="submit">{t('supply.collection.save')}</Button>
    </form>
  );
}

function PointDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, note: string) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  return (
    <Dialog open onClose={onClose} title={t('supply.collection.addPoint')}>
      <form noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 2) { setErr(t('supply.collection.errPointName')); return; }
        onAdd(name.trim(), note.trim());
      }}>
        <Field label={t('supply.collection.pointName')} error={err || undefined}>{(p) => <Input {...p} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label={t('supply.collection.pointNote')} optional>{(p) => <Input {...p} maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        <Button type="submit" icon="map-pin">{t('supply.collection.pointAdd')}</Button>
      </form>
    </Dialog>
  );
}

/** Schéma de tournée repris de la maquette (fond simulé, pas de carte réelle). */
function RouteMap() {
  const { t } = useTranslation();
  return (
    <div className="map map--route" role="img" aria-label={t('supply.collection.mapLabel')}>
      <svg viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="480" height="270" fill="#DDE9CF" />
        <path d="M0 60 L160 30 L190 140 L0 170Z" fill="#CFE1BC" /><path d="M300 0 L480 0 L480 120 L340 150Z" fill="#D3E4C2" /><path d="M0 200 L150 190 L180 270 L0 270Z" fill="#C7DCB2" />
        <path d="M-10 230 C120 200 260 230 490 160" stroke="#F8FBF4" strokeWidth="10" fill="none" />
        <path d="M110 190 L200 90 L330 70 L390 180 L110 190" fill="none" stroke="#016648" strokeWidth="3" strokeLinejoin="round" strokeDasharray="10 6" />
        <g stroke="#fff" strokeWidth="3"><circle cx="110" cy="190" r="10" fill="#0E2F1C" /><circle cx="200" cy="90" r="9" fill="#016648" /><circle cx="330" cy="70" r="9" fill="#016648" /><circle cx="390" cy="180" r="9" fill="#6FA83A" /></g>
        <text className="route-lab" x="126" y="214">Magasin de Kandi</text><text className="route-lab" x="150" y="72">1 · Sonsoro</text>
        <text className="route-lab" x="300" y="52">2 · Angaradébou</text><text className="route-lab" x="350" y="210">3 · Donwari</text>
      </svg>
      <div className="map-legend">
        <ul className="legend">
          <li><span className="sw" style={{ background: 'var(--canopy)' }} />{t('supply.collection.legendStore')}</li>
          <li><span className="sw" />{t('supply.collection.legendPoint')}</li>
          <li><span className="sw sw--2" />{t('supply.collection.legendTbc')}</li>
        </ul>
      </div>
    </div>
  );
}
