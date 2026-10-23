import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Chips, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Timeline, fmtNum } from '../../shared/ui';
import { HarvestForm, useHarvests } from '../harvests/HarvestPages';
import { useVcSelect, useVcName } from '../../shared/api/ref';
import type { Campaign, Parcel, Stage } from '../../shared/api/types';
import { ListenGhost, STAGES, StageBar } from '../producers/producerKit';
import { useCampaigns, useCreateCampaign, useParcels, useSetStage } from '../parcels/api';
import { NEXT, addDays, cycleOf, dayOf, tasksFor } from './cycle';

const SEASONS = ['2026-pluie-1', '2026-pluie-2', '2027-pluie-1'];

export function CampaignsPage() {
  const { t } = useTranslation();
  const parcels = useParcels();
  const q = useCampaigns();
  const setStage = useSetStage();
  const [season, setSeason] = useState<string[]>([]);
  const [harvestFor, setHarvestFor] = useState<Campaign | null>(null);
  const vcName = useVcName();
  const parcel = (id: string) => parcels.data?.find((p) => p.id === id);

  return (
    <>
      <PageHeader title={t('nav.campaigns')} desc={t('campaigns.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.campaigns') }]}
        actions={<ListenGhost text={t('campaigns.listen')} />} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <OpenForm parcels={parcels.data ?? []} />
        <QueryState q={q} empty={(d) => d.length === 0}
          emptyText={<div className="card"><EmptyState icon="calendar" title={t('campaigns.empty')}>{t('campaigns.emptyHelp')}</EmptyState></div>}>
          {(d) => {
            const seasons = [...new Set(d.map((c) => c.season))].sort().reverse();
            const cur = season[0] && seasons.includes(season[0]) ? season[0] : seasons[0];
            return (
              <>
                <div className="between">
                  <h2 className="section-title">{t('campaigns.current')}</h2>
                  {seasons.length > 1 && (
                    <Chips single label={t('campaigns.bySeason')} value={[cur]} onChange={setSeason}
                      options={seasons.map((s) => ({ value: s, label: s, count: d.filter((c) => c.season === s).length }))} />
                  )}
                </div>
                <div aria-live="polite">
                  {setStage.error && <Alert tone="danger" title={t('campaigns.stageError')}>{setStage.error.message}</Alert>}
                  {setStage.data === 'queued' && <Alert tone="warn" icon="wifi-off">{t('offline.queuedStage')}</Alert>}
                </div>
                {d.filter((c) => c.season === cur).map((c) => (
                  <CampaignCard key={c.id} c={c} parcel={parcel(c.parcel)} title={`${vcName(c.value_chain)}, ${parcel(c.parcel)?.name ?? t('campaigns.parcel')}`}
                    busy={setStage.isPending && setStage.variables?.id === c.id}
                    onStage={(stage) => setStage.mutate({ id: c.id, stage, base_version: c.version })}
                    onHarvest={() => setHarvestFor(c)} />
                ))}
              </>
            );
          }}
        </QueryState>
      </div>
      <Dialog open={!!harvestFor} onClose={() => setHarvestFor(null)}
        title={harvestFor ? t('campaigns.harvestTitle', { name: `${vcName(harvestFor.value_chain)}, ${parcel(harvestFor.parcel)?.name ?? ''}` }) : t('harvest.open')}>
        {harvestFor && <HarvestForm campaign={harvestFor.id} estimated={harvestFor.estimated_kg} />}
      </Dialog>
    </>
  );
}

function OpenForm({ parcels }: { parcels: Parcel[] }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const vcSel = useVcSelect();
  const create = useCreateCampaign();
  const [v, setV] = useState({ parcel: params.get('parcelle') ?? '', value_chain: '', season: SEASONS[0], stage: 'semis' as Stage, variety: '', sown_at: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.parcel) er.parcel = t('campaigns.errParcel');
    if (!v.value_chain) er.value_chain = t('campaigns.errCrop');
    setErrs(er);
    setMsg('');
    if (Object.keys(er).length) return;
    try {
      const r = await create.mutateAsync({ ...v, variety: v.variety.trim(), sown_at: v.sown_at || null });
      setMsg(r === 'queued' ? 'queued' : 'opened');
    } catch { /* affiché */ }
  };

  return (
    <form onSubmit={submit} noValidate className="card" aria-labelledby="t-ouvrir">
      <h2 className="card-title mb-3.5" id="t-ouvrir">{t('campaigns.open')}</h2>
      <div className="form-grid">
        <Field label={t('campaigns.parcel')} error={errs.parcel}>
          {(p) => <Select {...p} value={v.parcel} onChange={(e) => setV({ ...v, parcel: e.target.value })} placeholder={t('common.choose')}
            options={parcels.map((x) => ({ value: x.id, label: `${x.name} (${t('parcels.ha', { n: fmtNum(x.area_ha, 2) })})` }))} />}
        </Field>
        <Field label={t('campaigns.crop')} error={errs.value_chain}>
          {(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder={t('common.choose')} {...vcSel} />}
        </Field>
        <Field label={t('campaigns.season')}>
          {(p) => <Select {...p} value={v.season} onChange={(e) => setV({ ...v, season: e.target.value })} options={SEASONS.map((s) => ({ value: s, label: s }))} />}
        </Field>
        <Field label={t('campaigns.stage')}>
          {(p) => <Select {...p} value={v.stage} onChange={(e) => setV({ ...v, stage: e.target.value as Stage })} options={STAGES.map((s) => ({ value: s, label: t(`stage.${s}`) }))} />}
        </Field>
        <Field label={t('cycle.variety')} optional hint={t('cycle.varietyHint')}>
          {(p) => <Input {...p} value={v.variety} maxLength={80} onChange={(e) => setV({ ...v, variety: e.target.value })} />}
        </Field>
        <Field label={t('cycle.sownAt')} optional hint={t('cycle.sownAtHint')}>
          {(p) => <Input {...p} type="date" value={v.sown_at} onChange={(e) => setV({ ...v, sown_at: e.target.value })} />}
        </Field>
      </div>
      <div className="mt-4 stack" style={{ ['--gap' as string]: '10px' }} aria-live="polite">
        {create.error && <Alert tone="danger">{create.error.message}</Alert>}
        {msg === 'opened' && <Alert tone="ok">{t('campaigns.opened')}</Alert>}
        {msg === 'queued' && <Alert tone="warn" icon="wifi-off">{t('campaigns.queued')}</Alert>}
      </div>
      <div className="cluster mt-4">
        <Button type="submit" icon="plus" busy={create.isPending}>{t('campaigns.submit')}</Button>
        <span className="hint">{t('campaigns.noParcel')} <Link to="/parcelles">{t('campaigns.drawFirst')}</Link></span>
      </div>
    </form>
  );
}

function CampaignCard({ c, parcel, title, busy, onStage, onHarvest }: { c: Campaign; parcel?: Parcel; title: string; busy: boolean; onStage: (s: Stage) => void; onHarvest: () => void }) {
  const { t } = useTranslation();
  const hid = `k-${c.id}`;
  const harvest = c.stage === 'recolte';
  return (
    <article className="card camp" aria-labelledby={hid}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <div>
          <h3 className="card-title" id={hid}>{title}</h3>
          <p className="card-sub">{t('campaigns.seasonLine', { season: c.season })}{parcel && <> · <span className="num">{t('parcels.ha', { n: fmtNum(parcel.area_ha, 2) })}</span></>}</p>
        </div>
        <StageBar stage={c.stage} />
        {harvest && <Alert tone="info" icon="wheat">{t('campaigns.harvestReached')}</Alert>}
        <div className="camp-actions">
          <Field label={t('campaigns.currentStage')}>
            {(p) => <Select {...p} value={c.stage} disabled={busy} aria-busy={busy || undefined} onChange={(e) => onStage(e.target.value as Stage)} options={STAGES.map((s) => ({ value: s, label: t(`stage.${s}`) }))} />}
          </Field>
          {NEXT[c.stage] && <Button variant="secondary" icon="chevron-right" busy={busy} onClick={() => onStage(NEXT[c.stage]!)}>{t('cycle.next', { stage: t(`stage.${NEXT[c.stage]}`).toLowerCase() })}</Button>}
          <Button variant={harvest ? 'primary' : 'secondary'} icon="wheat" onClick={onHarvest}>{t('harvest.open')}</Button>
        </div>
        <CycleDetails c={c} />
      </div>
      <HarvestSummary campaign={c.id} />
    </article>
  );
}

const fmtDay = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/** Calendrier des stades et tâches (maquettes mobile calendrier et taches), estimés depuis la date de semis. */
function CycleDetails({ c }: { c: Campaign }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const [done, setDone] = useState<string[]>([]);
  if (!c.sown_at) return <p className="hint">{t('cycle.noSowing')}</p>;
  const cy = cycleOf(c.value_chain);
  const order: Stage[] = ['semis', 'croissance', 'floraison', 'recolte'];
  const cur = order.indexOf(c.stage);
  const state = (s: Stage) => (order.indexOf(s) < cur ? 'done' as const : order.indexOf(s) === cur ? 'now' as const : undefined);
  const tasks = tasksFor(c.value_chain, c.stage, c.sown_at);
  const soon = new Date(Date.now() + 7 * 86_400_000);
  const id = (k: string, d: Date) => `${c.id}-${k}-${d.getTime()}`;
  const groups = [
    ['week', tasks.filter((x) => !done.includes(id(x.key, x.due)) && x.due <= soon)],
    ['later', tasks.filter((x) => !done.includes(id(x.key, x.due)) && x.due > soon)],
    ['done', tasks.filter((x) => done.includes(id(x.key, x.due)))],
  ] as const;
  return (
    <div className="grid-fit" style={{ '--min': '260px', '--gap': '16px' } as React.CSSProperties}>
      <details open>
        <summary className="label">{t('cycle.calendar', { day: dayOf(c.sown_at) })}</summary>
        <Timeline items={[
          { time: fmtDay(addDays(c.sown_at, 0)), title: t('stage.semis'), state: state('semis') },
          { time: fmtDay(addDays(c.sown_at, cy.levee)), title: t('cycle.emergence'), state: cur > 0 ? 'done' : undefined },
          { time: t('cycle.until', { date: fmtDay(addDays(c.sown_at, cy.floraison)) }), title: t('stage.croissance'), state: state('croissance') },
          { time: t('cycle.around', { date: fmtDay(addDays(c.sown_at, cy.floraison)) }), title: t('stage.floraison'), state: state('floraison') },
          { time: t('cycle.around', { date: fmtDay(addDays(c.sown_at, cy.recolte)) }), title: t('stage.recolte'), state: state('recolte') },
        ]} />
        <p className="hint mt-2">{t('cycle.estimated', { crop: vcName(c.value_chain), variety: c.variety || t('cycle.noVariety') })}</p>
      </details>
      <details open>
        <summary className="label">{t('cycle.tasks')}</summary>
        {groups.map(([g, list]) => list.length > 0 && (
          <div key={g} className="mt-2">
            <p className="small muted">{t(`cycle.group.${g}`)}</p>
            {list.map((x) => {
              const k = id(x.key, x.due);
              return (
                <div key={k} className="task">
                  <input className="cb" type="checkbox" id={`tk-${k}`} checked={done.includes(k)} onChange={(e) => setDone((d) => (e.target.checked ? [...d, k] : d.filter((y) => y !== k)))} />
                  <label htmlFor={`tk-${k}`}>
                    <span className="t-title">{t(`cycle.task.${x.key}`, { crop: vcName(c.value_chain) })}</span>
                    <span className="t-meta">{t('cycle.due', { date: fmtDay(x.due) })}</span>
                  </label>
                </div>
              );
            })}
          </div>
        ))}
        <p className="hint mt-2">{t('cycle.tasksHint')}</p>
      </details>
    </div>
  );
}

/** Récoltes déjà déclarées sur la campagne (GET /harvests?campaign=). */
function HarvestSummary({ campaign }: { campaign: string }) {
  const { t } = useTranslation();
  const q = useHarvests({ campaign });
  return (
    <div>
      <p className="label mb-1.5">{t('campaigns.harvests')}</p>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<p className="small muted">{t('campaigns.noHarvest')}</p>}>
        {(d) => (
          <div className="stack" style={{ ['--gap' as string]: '10px' }}>
            {d.map((h) => (
              <div key={h.id} className="stack" style={{ ['--gap' as string]: '8px' }}>
                <div className="result-box">
                  <div><span className="small muted">{t('campaigns.harvested')}</span><b className="num">{t('common.kg', { n: fmtNum(h.quantity_kg) })}</b></div>
                  <div><span className="small muted">{t('campaigns.estimate')}</span><b className="num">{h.estimated_kg === null ? t('common.notAvailable') : t('common.kg', { n: fmtNum(h.estimated_kg) })}</b></div>
                  <div><span className="small muted">{t('campaigns.sold')}</span><b className="num">{t('common.kg', { n: fmtNum(h.sold_kg) })}</b></div>
                </div>
                {h.flagged && h.check_status !== 'confirmee' && h.check_status !== 'corrigee' && <Alert tone="warn" icon="flag">{t('harvest.flagged')}</Alert>}
                {h.check_status === 'confirmee' && <Alert tone="ok" icon="check-circle">{t('harvest.confirmedByAgent')}</Alert>}
                {h.check_status === 'corrigee' && <Alert tone="info" icon="edit">{t('harvest.correctedByAgent', { q: fmtNum(h.declared_kg), reason: h.check_reason })}</Alert>}
                {h.deviation_pct !== null && !h.flagged && <Badge tone="ok">{t('campaigns.deviation', { d: `${h.deviation_pct > 0 ? '+' : ''}${fmtNum(h.deviation_pct, 1)}` })}</Badge>}
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
