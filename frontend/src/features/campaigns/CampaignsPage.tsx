import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Chips, Dialog, EmptyState, Field, PageHeader, QueryState, Select, fmtNum } from '../../shared/ui';
import { HarvestForm, useHarvests } from '../harvests/HarvestPages';
import { useVcSelect, useVcName } from '../../shared/api/ref';
import type { Campaign, Parcel, Stage } from '../../shared/api/types';
import { ListenGhost, STAGES, StageBar } from '../producers/producerKit';
import { useCampaigns, useCreateCampaign, useParcels, useSetStage } from '../parcels/api';

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
        {harvestFor && <HarvestForm campaign={harvestFor.id} />}
      </Dialog>
    </>
  );
}

function OpenForm({ parcels }: { parcels: Parcel[] }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const vcSel = useVcSelect();
  const create = useCreateCampaign();
  const [v, setV] = useState({ parcel: params.get('parcelle') ?? '', value_chain: '', season: SEASONS[0], stage: 'semis' as Stage });
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
      const r = await create.mutateAsync(v);
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
          <Button variant={harvest ? 'primary' : 'secondary'} icon="wheat" onClick={onHarvest}>{t('harvest.open')}</Button>
        </div>
      </div>
      <HarvestSummary campaign={c.id} />
    </article>
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
                {h.flagged && <Alert tone="warn" icon="flag">{t('harvest.flagged')}</Alert>}
                {h.deviation_pct !== null && !h.flagged && <Badge tone="ok">{t('campaigns.deviation', { d: `${h.deviation_pct > 0 ? '+' : ''}${fmtNum(h.deviation_pct, 1)}` })}</Badge>}
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
