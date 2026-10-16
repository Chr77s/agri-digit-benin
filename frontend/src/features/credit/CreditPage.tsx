import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, rows } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import { Button, EmptyState, Notice, PageHeader, QueryState, Table, fmtNum } from '../../shared/ui';
import { usePlaceName } from '../../shared/api/ref';

interface ConsentedProducer { id: string; code: string; first_name: string; last_name: string; commune: string }
interface Factor { name: string; weight: number; value: number | string; contribution: number }
interface Score { score: number; factors: Factor[]; disclaimer: string }

/** Agent financier : producteurs ayant consenti, puis score et facteurs (chaque consultation est journalisée côté serveur). */
export function CreditPage() {
  const place = usePlaceName();
  const [sel, setSel] = useState<ConsentedProducer | null>(null);
  const q = useQuery({ queryKey: ['credit-producers'], queryFn: async () => rows(await api<Paginated<ConsentedProducer> | ConsentedProducer[]>('/credit/consented-producers?page_size=100')) });
  const score = useQuery({ queryKey: ['credit-score', sel?.id], queryFn: () => api<Score>(`/credit/scores/${sel!.id}`), enabled: !!sel, staleTime: 0 });
  return (
    <>
      <PageHeader title="Crédit" />
      <Notice tone="warn">Le score est une aide. La décision de crédit revient à une personne et se prend hors de la plateforme. Chaque consultation est enregistrée dans le journal d'audit.</Notice>
      <h2 className="mb-2 mt-4 text-xl font-semibold">Producteurs ayant consenti au partage</h2>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucun producteur n'a donné son consentement.">Le producteur l'accorde dans « Mes consentements ».</EmptyState>}>
        {(d) => (
          <Table<ConsentedProducer> caption="Producteurs ayant consenti" data={d} rowKey={(r) => r.id} columns={[
            { key: 'code', label: 'Code' },
            { key: 'last_name', label: 'Nom', render: (r) => `${r.first_name} ${r.last_name}` },
            { key: 'commune', label: 'Commune', render: (r) => place(r.commune) },
            { key: 'act', label: 'Score', sortable: false, render: (r) => <Button variant="secondary" onClick={() => setSel(r)}>Consulter le score</Button> },
          ]} />
        )}
      </QueryState>
      {sel && (
        <section className="mt-6 flex flex-col gap-3" aria-live="polite">
          <h2 className="text-xl font-semibold">Score de {sel.first_name} {sel.last_name} ({sel.code})</h2>
          <QueryState q={score}>
            {(s) => (
              <>
                <p className="text-2xl font-semibold">{fmtNum(s.score, 0)} / 100</p>
                <Table<Factor> caption="Facteurs du score" data={s.factors} rowKey={(r) => r.name} columns={[
                  { key: 'name', label: 'Facteur' },
                  { key: 'weight', label: 'Poids', render: (r) => fmtNum(r.weight, 2) },
                  { key: 'value', label: 'Valeur', render: (r) => (typeof r.value === 'number' ? fmtNum(r.value, 2) : r.value) },
                  { key: 'contribution', label: 'Contribution', render: (r) => fmtNum(r.contribution, 1) },
                ]} />
                <p className="rounded border border-warn bg-warn-bg p-3 font-semibold text-warn">{s.disclaimer}</p>
              </>
            )}
          </QueryState>
        </section>
      )}
    </>
  );
}

/** Producteur : accorder ou retirer le partage du profil pour le crédit. */
export function CreditConsentBox({ active }: { active: boolean }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (on: boolean) => api(on ? '/credit/consent' : '/credit/consent/withdraw', { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }),
  });
  return (
    <div className="mb-4 flex flex-col gap-2 rounded border-2 border-brand bg-surface p-4">
      <h2 className="text-lg font-semibold">Partage du profil pour le crédit</h2>
      <p>Si vous acceptez, un agent financier pourra voir un score calculé à partir de vos parcelles et campagnes, avec ses facteurs. Vous pouvez retirer cet accord à tout moment.</p>
      <div aria-live="polite">{m.error && <Notice tone="error">{m.error.message}</Notice>}</div>
      {active
        ? <Button variant="danger" className="self-start" busy={m.isPending} onClick={() => m.mutate(false)}>Retirer le partage pour le crédit</Button>
        : <Button className="self-start" busy={m.isPending} onClick={() => m.mutate(true)}>J'accepte le partage pour le crédit</Button>}
    </div>
  );
}
