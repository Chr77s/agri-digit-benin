import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, Field, Notice, PageHeader, QueryState, Select } from '../../shared/ui';
import { useValueChains, useVcName } from '../../shared/api/ref';
import type { Stage } from '../../shared/api/types';
import { useCampaigns, useCreateCampaign, useParcels, useSetStage } from '../parcels/api';

const STAGES: Stage[] = ['semis', 'croissance', 'floraison', 'recolte'];
const SEASONS = ['2026-pluie-1', '2026-pluie-2', '2027-pluie-1'];

export function CampaignsPage() {
  const { t } = useTranslation();
  const parcels = useParcels();
  const q = useCampaigns();
  const vcs = useValueChains();
  const vcName = useVcName();
  const create = useCreateCampaign();
  const setStage = useSetStage();
  const [v, setV] = useState({ parcel: '', value_chain: '', season: SEASONS[0], stage: 'semis' as Stage });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const parcelName = (id: string) => parcels.data?.find((p) => p.id === id)?.name ?? 'Parcelle';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.parcel) er.parcel = 'Choisissez la parcelle. Si la liste est vide, dessinez d’abord une parcelle.';
    if (!v.value_chain) er.value_chain = 'Choisissez la culture principale.';
    setErrs(er);
    if (Object.keys(er).length) return;
    try {
      const r = await create.mutateAsync(v);
      setMsg(r === 'queued' ? 'Pas de réseau : la campagne sera envoyée au retour de la connexion.' : 'Campagne ouverte. Mettez à jour le stade au fil de la saison.');
    } catch { setMsg(''); }
  };

  return (
    <>
      <PageHeader title="Mes campagnes" listen="Mes campagnes. Choisissez une parcelle et une culture pour ouvrir une campagne. Changez le stade quand la culture avance." />
      <form onSubmit={submit} noValidate className="mb-6 grid gap-3 rounded border border-border bg-surface p-4 md:grid-cols-4">
        <h2 className="text-xl font-semibold md:col-span-4">Ouvrir une campagne</h2>
        <Field label="Parcelle" error={errs.parcel}>
          {(p) => <Select {...p} value={v.parcel} onChange={(e) => setV({ ...v, parcel: e.target.value })} placeholder="Choisir" options={(parcels.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />}
        </Field>
        <Field label="Culture principale" error={errs.value_chain}>
          {(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder="Choisir" options={(vcs.data ?? []).map((x) => ({ value: x.code, label: x.name }))} />}
        </Field>
        <Field label="Saison">
          {(p) => <Select {...p} value={v.season} onChange={(e) => setV({ ...v, season: e.target.value })} options={SEASONS.map((s) => ({ value: s, label: s }))} />}
        </Field>
        <Field label="Stade">
          {(p) => <Select {...p} value={v.stage} onChange={(e) => setV({ ...v, stage: e.target.value as Stage })} options={STAGES.map((s) => ({ value: s, label: t(`stage.${s}`) }))} />}
        </Field>
        <div className="md:col-span-4 flex flex-col gap-2" aria-live="polite">
          {create.error && <Notice tone="error">{create.error.message}</Notice>}
          {msg && !create.error && <Notice tone="success">{msg}</Notice>}
          <Button type="submit" busy={create.isPending} className="self-start">Ouvrir la campagne</Button>
        </div>
      </form>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune campagne ouverte.">Utilisez le formulaire ci-dessus pour ouvrir votre première campagne.</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {setStage.error && <Notice tone="error" live>{setStage.error.message}</Notice>}
            {d.map((c) => (
              <li key={c.id} className="flex flex-wrap items-end justify-between gap-3 rounded border border-border bg-surface p-3">
                <div>
                  <p className="text-lg font-semibold">{vcName(c.value_chain)}, {parcelName(c.parcel)}</p>
                  <p className="text-muted">Saison {c.season}</p>
                </div>
                <div className="w-48">
                  <Field label="Stade actuel">
                    {(p) => <Select {...p} value={c.stage} disabled={setStage.isPending} onChange={(e) => setStage.mutate({ id: c.id, stage: e.target.value as Stage })} options={STAGES.map((s) => ({ value: s, label: t(`stage.${s}`) }))} />}
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}
