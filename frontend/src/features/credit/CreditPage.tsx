import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import { Alert, Badge, Button, Card, EmptyState, Notice, PageHeader, QueryState, Table, fmtDate, fmtDateTime, fmtNum } from '../../shared/ui';
import '../dashboard/pilotage.css';
import { usePlaceName } from '../../shared/api/ref';

interface ConsentedProducer { id: string; code: string; first_name: string; last_name: string; commune: string; consented_at?: string | null }
interface Factor { name: string; weight: number; value: number | string; contribution: number }
interface Score { score: number; factors: Factor[]; disclaimer: string }

/** Agent financier (maquette pilotage/credit) : producteurs ayant consenti, puis score et facteurs ; chaque consultation est journalisée côté serveur. */
export function CreditPage() {
  const { t } = useTranslation();
  const place = usePlaceName();
  const [sel, setSel] = useState<ConsentedProducer | null>(null);
  const q = useQuery({ queryKey: ['credit-producers'], queryFn: async () => rows(await api<Paginated<ConsentedProducer> | ConsentedProducer[]>('/credit/consented-producers?page_size=100')) });
  const score = useQuery({ queryKey: ['credit-score', sel?.id], queryFn: () => api<Score>(`/credit/scores/${sel!.id}`), enabled: !!sel, staleTime: 0 });
  const name = (p: ConsentedProducer) => `${p.first_name} ${p.last_name}`;
  return (
    <div className="pv">
      <PageHeader title={t('credit.title')} desc={t('credit.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.credit') }]} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="info" title={t('credit.aidTitle')}>{t('credit.notice')}</Alert>
        <div className="split">
          <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="shield-check" title={t('credit.empty')}>{t('credit.emptyHelp')}</EmptyState></div>}>
            {(d) => (
              <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <Table<ConsentedProducer> title={t('credit.consentedCount', { n: fmtNum(d.length) })} caption={t('credit.consentedCaption')} data={d} rowKey={(r) => r.id} columns={[
                  { key: 'code', label: t('common.code'), render: (r) => <span className="num">{r.code}</span> },
                  { key: 'last_name', label: t('common.name'), render: name, csv: name },
                  { key: 'commune', label: t('common.commune'), render: (r) => place(r.commune) },
                  { key: 'consented_at', label: t('credit.since'), num: true, render: (r) => (r.consented_at ? fmtDate(r.consented_at) : '—') },
                  { key: 'act', label: t('credit.score'), actions: true, render: (r) => (sel?.id === r.id
                    ? <Badge tone="ok">{t('credit.shown')}</Badge>
                    : <Button size="sm" variant="secondary" onClick={() => setSel(r)}>{t('credit.consult')}</Button>) },
                ]} />
                <p className="hint">{t('credit.leaves')}</p>
              </div>
            )}
          </QueryState>
          <aside className="stack sticky-side" aria-live="polite">
            {!sel ? <div className="card"><EmptyState icon="chart-bar" title={t('credit.pick')}>{t('credit.pickText')}</EmptyState></div> : (
              <Card title={t('credit.scoreOf', { name: name(sel), code: sel.code })} sub={score.dataUpdatedAt ? t('credit.computedAt', { date: fmtDateTime(new Date(score.dataUpdatedAt).toISOString()) }) : undefined} actions={<Badge tone="sim">{t('credit.sim')}</Badge>}>
                <QueryState q={score}>
                  {(s) => (
                    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
                      <p className="kpi-value num">{t('credit.outOf100', { score: fmtNum(s.score, 0) })}</p>
                      <ul className="stack" style={{ '--gap': '10px', listStyle: 'none', padding: 0 } as React.CSSProperties}>
                        {s.factors.map((f) => {
                          const max = Math.round(f.weight * 100);
                          return (
                            <li key={f.name}>
                              <div className="between small"><span>{f.name}</span><b className="num">{fmtNum(f.contribution, 0)} / {max}</b></div>
                              <div className="progress mt-1" role="img" aria-label={t('credit.barLabel', { name: f.name, v: fmtNum(f.contribution, 1), max })}><span style={{ '--v': `${max ? (100 * f.contribution) / max : 0}%` } as React.CSSProperties} /></div>
                            </li>
                          );
                        })}
                      </ul>
                      <details>
                        <summary className="small">{t('credit.asTable')}</summary>
                        <Table<Factor> caption={t('credit.factorsCaption')} data={s.factors} rowKey={(r) => r.name} pageSize={20} columns={[
                          { key: 'name', label: t('credit.factor') },
                          { key: 'weight', label: t('credit.weight'), num: true, render: (r) => fmtNum(r.weight, 2) },
                          { key: 'value', label: t('credit.value'), num: true, render: (r) => (typeof r.value === 'number' ? fmtNum(r.value, 2) : r.value) },
                          { key: 'contribution', label: t('credit.contribution'), num: true, render: (r) => fmtNum(r.contribution, 1) },
                        ]} />
                      </details>
                      <Alert tone="warn">{s.disclaimer} {t('credit.explain')}</Alert>
                      <p className="hint">{t('credit.logged')}</p>
                    </div>
                  )}
                </QueryState>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Producteur : accorder ou retirer le partage du profil pour le crédit. */
export function CreditConsentBox({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (on: boolean) => api(on ? '/credit/consent' : '/credit/consent/withdraw', { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }),
  });
  return (
    <div className="mb-4 flex flex-col gap-2 rounded border-2 border-brand bg-surface p-4">
      <h2 className="text-lg font-semibold">{t('credit.shareTitle')}</h2>
      <p>{t('credit.shareText')}</p>
      <div aria-live="polite">{m.error && <Notice tone="error">{m.error.message}</Notice>}</div>
      {active
        ? <Button variant="danger" className="self-start" busy={m.isPending} onClick={() => m.mutate(false)}>{t('credit.withdrawShare')}</Button>
        : <Button className="self-start" busy={m.isPending} onClick={() => m.mutate(true)}>{t('credit.acceptShare')}</Button>}
    </div>
  );
}
