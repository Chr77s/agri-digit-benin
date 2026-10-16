import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, EmptyState, Field, Notice, PageHeader, QueryState, Select } from '../../shared/ui';
import { HarvestForm } from '../harvests/HarvestPages';
import { useVcSelect, useVcName } from '../../shared/api/ref';
import type { Stage } from '../../shared/api/types';
import { useCampaigns, useCreateCampaign, useParcels, useSetStage } from '../parcels/api';

const STAGES: Stage[] = ['semis', 'croissance', 'floraison', 'recolte'];
const SEASONS = ['2026-pluie-1', '2026-pluie-2', '2027-pluie-1'];

export function CampaignsPage() {
  const { t } = useTranslation();
  const parcels = useParcels();
  const q = useCampaigns();
  const vcSel = useVcSelect();
  const vcName = useVcName();
  const create = useCreateCampaign();
  const setStage = useSetStage();
  const [v, setV] = useState({ parcel: '', value_chain: '', season: SEASONS[0], stage: 'semis' as Stage });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [harvestFor, setHarvestFor] = useState<string | null>(null);
  const parcelName = (id: string) => parcels.data?.find((p) => p.id === id)?.name ?? t('campaigns.parcel');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.parcel) er.parcel = t('campaigns.errParcel');
    if (!v.value_chain) er.value_chain = t('campaigns.errCrop');
    setErrs(er);
    if (Object.keys(er).length) return;
    try {
      const r = await create.mutateAsync(v);
      setMsg(r === 'queued' ? t('campaigns.queued') : t('campaigns.opened'));
    } catch { setMsg(''); }
  };

  return (
    <>
      <PageHeader title={t('nav.campaigns')} listen={t('campaigns.listen')} />
      <form onSubmit={submit} noValidate className="mb-6 grid gap-3 rounded border border-border bg-surface p-4 md:grid-cols-4">
        <h2 className="text-xl font-semibold md:col-span-4">{t('campaigns.open')}</h2>
        <Field label={t('campaigns.parcel')} error={errs.parcel}>
          {(p) => <Select {...p} value={v.parcel} onChange={(e) => setV({ ...v, parcel: e.target.value })} placeholder={t('common.choose')} options={(parcels.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />}
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
        <div className="md:col-span-4 flex flex-col gap-2" aria-live="polite">
          {create.error && <Notice tone="error">{create.error.message}</Notice>}
          {msg && !create.error && <Notice tone="success">{msg}</Notice>}
          <Button type="submit" busy={create.isPending} className="self-start">{t('campaigns.submit')}</Button>
        </div>
      </form>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('campaigns.empty')}>{t('campaigns.emptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {setStage.error && <Notice tone="error" live>{setStage.error.message}</Notice>}
            {setStage.data === 'queued' && <Notice tone="warn" live>{t('offline.queuedStage')}</Notice>}
            {d.map((c) => (
              <li key={c.id} className="flex flex-wrap items-end justify-between gap-3 rounded border border-border bg-surface p-3">
                <div>
                  <p className="text-lg font-semibold">{vcName(c.value_chain)}, {parcelName(c.parcel)}</p>
                  <p className="text-muted">{t('campaigns.seasonLine', { season: c.season })}</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-48">
                    <Field label={t('campaigns.currentStage')}>
                      {(p) => <Select {...p} value={c.stage} disabled={setStage.isPending} onChange={(e) => setStage.mutate({ id: c.id, stage: e.target.value as Stage, base_version: c.version })} options={STAGES.map((s) => ({ value: s, label: t(`stage.${s}`) }))} />}
                    </Field>
                  </div>
                  <Button variant="secondary" onClick={() => setHarvestFor(c.id)}>{t('harvest.open')}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <Dialog open={!!harvestFor} onClose={() => setHarvestFor(null)} title={t('harvest.open')}>
        {harvestFor && <HarvestForm campaign={harvestFor} />}
      </Dialog>
    </>
  );
}
