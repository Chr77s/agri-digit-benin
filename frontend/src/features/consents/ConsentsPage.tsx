import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, rows } from '../../shared/api/client';
import type { Consent, Paginated } from '../../shared/api/types';
import { Badge, Button, EmptyState, Notice, PageHeader, QueryState, fmtDateTime } from '../../shared/ui';

const useConsents = () =>
  useQuery({ queryKey: ['consents'], queryFn: async () => rows(await api<Paginated<Consent> | Consent[]>('/consents/mine')) });
const useWithdraw = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/consents/${id}/withdraw`, { method: 'POST', body: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }) });
};

const purposeLabel: Record<string, string> = {
  donnees_personnelles: 'Données personnelles (inscription et services agricoles)', parental: 'Consentement parental (moins de 16 ans)', credit: 'Partage du profil pour le crédit',
};

export function ConsentsPage() {
  const q = useConsents();
  const w = useWithdraw();
  return (
    <>
      <PageHeader title="Mes consentements" listen="Mes consentements. Vous pouvez retirer votre accord à tout moment en touchant le bouton Retirer." />
      <p className="mb-4">Vous pouvez retirer chaque consentement à tout moment, en un clic (loi n° 2017-20, art. 389 et 390).</p>
      <div aria-live="polite" className="mb-3">
        {w.isSuccess && <Notice tone="success">Consentement retiré. Le retrait est enregistré avec sa date.</Notice>}
        {w.error && <Notice tone="error">{w.error.message}</Notice>}
      </div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucun consentement enregistré." />}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.map((c) => {
              const purpose = String(c.type ?? c.purpose ?? 'registration');
              const withdrawn = !!c.withdrawn_at;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface p-3">
                  <div>
                    <p className="font-semibold">{purposeLabel[purpose] ?? purpose}</p>
                    <p className="text-sm text-muted">Texte {String(c.text_version ?? 'v1')}, donné le {fmtDateTime(String(c.accepted_at ?? c.created_at ?? ''))}{c.channel ? `, canal ${c.channel}` : ''}</p>
                    {withdrawn ? <Badge tone="error">Retiré le {fmtDateTime(c.withdrawn_at)}</Badge> : <Badge tone="success">Actif</Badge>}
                  </div>
                  {!withdrawn && <Button variant="danger" busy={w.isPending && w.variables === c.id} onClick={() => w.mutate(c.id)}>Retirer ce consentement</Button>}
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </>
  );
}
