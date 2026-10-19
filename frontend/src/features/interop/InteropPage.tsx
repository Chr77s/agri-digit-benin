import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Chips, Dialog, EmptyState, PageHeader, QueryState, Table, fmtDateTime, fmtNum } from '../../shared/ui';
import '../dashboard/pilotage.css';

interface Connector {
  partner: string; label: string; configured: boolean; last_exchange_at: string | null;
  calls_24h: number; failures_24h: number; avg_ms: number | null;
  key: { masked: string; created_at: string; last_used_at: string | null } | null;
}
interface Exchange { id: string; at: string; partner: string; ok: boolean; via: string; rows: number | null; status: number; ip: string }

const KEY_AGE_DAYS = 180; // au-delà, la maquette conseille de renouveler

/** Interopérabilité (UC-24, maquette pilotage/interoperabilite) : connecteurs, journal des échanges, clés d'API. */
export function InteropPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string[]>(['all']);
  const [confirm, setConfirm] = useState<{ partner: string; label: string; action: 'renew' | 'revoke' } | null>(null);
  const [newKey, setNewKey] = useState<{ label: string; key: string } | null>(null);
  const [tested, setTested] = useState<Record<string, string>>({});
  const cons = useQuery({ queryKey: ['interop', 'connectors'], queryFn: () => api<Connector[]>('/interop/connectors') });
  const f = filter[0] ?? 'all';
  const ex = useQuery({
    queryKey: ['interop', 'exchanges', f],
    queryFn: async () => (await api<Paginated<Exchange>>(`/interop/exchanges${qs(f === 'failed' ? { failed: '1' } : f === 'all' ? {} : { partner: f })}`)).results,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['interop'] });
  const test = useMutation({
    mutationFn: (p: string) => api<{ results: unknown[] }>(`/interop/${p}/aggregates`),
    onSuccess: (r, p) => { setTested((s) => ({ ...s, [p]: t('pilotage.interop.testOk', { count: r.results.length, n: fmtNum(r.results.length) }) })); void refresh(); },
    onError: (e, p) => setTested((s) => ({ ...s, [p]: (e as Error).message })),
  });
  const key = useMutation({
    mutationFn: ({ partner, action }: { partner: string; action: 'renew' | 'revoke' }) => api<{ key?: string }>(`/interop/keys/${partner}/${action}`, { method: 'POST', body: {} }),
    onSuccess: (r) => { if (r.key && confirm) setNewKey({ label: confirm.label, key: r.key }); setConfirm(null); void refresh(); },
  });
  const label = (p: string) => cons.data?.find((c) => c.partner === p)?.label ?? p;
  const old = (d: string) => Date.now() - new Date(d).getTime() > KEY_AGE_DAYS * 86_400_000;

  return (
    <div className="pv">
      <PageHeader title={t('nav.interop')} crumbs={[{ label: t('pilotage.crumbGov') }, { label: t('nav.interop') }]} desc={t('pilotage.interop.desc')} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="demo" title={t('pilotage.interop.simTitle')}>{t('pilotage.interop.simText')}</Alert>
        <QueryState q={cons}>
          {(list) => (
            <section aria-labelledby="ip-con">
              <h2 className="section-title" id="ip-con">{t('pilotage.interop.connectors')}</h2>
              <div className="grid-fit" style={{ '--min': '260px', '--gap': '16px' } as React.CSSProperties}>
                {list.map((c) => (
                  <Card key={c.partner} title={c.label} sub={t(`pilotage.interop.role.${c.partner}`)} headingLevel={3}
                    actions={c.failures_24h > 0 ? <Badge tone="warn">{t('pilotage.interop.degraded')}</Badge> : c.configured ? <Badge tone="ok">{t('pilotage.interop.active')}</Badge> : <Badge tone="neutral">{t('pilotage.interop.noKey')}</Badge>}>
                    <dl className="dl">
                      <dt>{t('pilotage.interop.last')}</dt><dd className="num">{c.last_exchange_at ? fmtDateTime(c.last_exchange_at) : t('pilotage.interop.never')}</dd>
                      <dt>{t('pilotage.interop.calls')}</dt><dd className="num">{fmtNum(c.calls_24h)}{c.failures_24h > 0 && ` · ${t('pilotage.interop.failures', { count: c.failures_24h })}`}</dd>
                      <dt>{t('pilotage.interop.time')}</dt><dd className="num">{c.avg_ms === null ? t('pilotage.interop.na') : `${fmtNum(c.avg_ms)} ms`}</dd>
                      <dt>{t('pilotage.interop.data')}</dt><dd>{t(`pilotage.interop.dataOf.${c.partner}`)}</dd>
                    </dl>
                    <div className="cluster mt-3" style={{ alignItems: 'center' }}>
                      <Badge tone="sim">{t('common.simulation')}</Badge>
                      <Button size="sm" variant="secondary" busy={test.isPending && test.variables === c.partner} onClick={() => test.mutate(c.partner)}>{t('pilotage.interop.test')}</Button>
                    </div>
                    {tested[c.partner] && <p className="small mt-2" role="status">{tested[c.partner]}</p>}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </QueryState>

        <QueryState q={ex} empty={(d) => d.length === 0 && f === 'all'} emptyText={<EmptyState icon="layers" title={t('pilotage.interop.emptyLog')}>{t('pilotage.interop.emptyLogText')}</EmptyState>}>
          {(rows) => (
            <Table<Exchange> title={t('pilotage.interop.log')} caption={t('pilotage.interop.logCaption')} data={rows} rowKey={(r) => r.id} exportName="echanges-interop"
              toolbar={<Chips single label={t('pilotage.interop.filter')} value={filter} onChange={(v) => setFilter(v.length ? v : ['all'])} options={[
                { value: 'all', label: t('common.all') },
                ...['xroad', 'sonama', 'fnda'].map((p) => ({ value: p, label: label(p) })),
                { value: 'failed', label: t('pilotage.interop.failed') },
              ]} />}
              columns={[
                { key: 'at', label: t('common.date'), num: true, render: (r) => fmtDateTime(r.at) },
                { key: 'partner', label: t('pilotage.interop.partner'), render: (r) => (r.ok ? label(r.partner) : t('pilotage.interop.unknown')) },
                { key: 'request', label: t('pilotage.interop.request'), sortable: false, render: (r) => <span className="mono small">GET /interop/{r.partner}/aggregates</span>, csv: (r) => `GET /interop/${r.partner}/aggregates` },
                { key: 'via', label: t('pilotage.interop.access'), render: (r) => (r.ok ? t(`pilotage.interop.via.${r.via}`, { defaultValue: r.via }) : t('pilotage.interop.badKey', { ip: r.ip })) },
                { key: 'rows', label: t('pilotage.interop.rows'), num: true, render: (r) => (r.rows === null ? '—' : fmtNum(r.rows)) },
                { key: 'status', label: t('admin.state'), render: (r) => (r.ok ? <Badge tone="ok">{t('pilotage.interop.okStatus', { code: r.status })}</Badge> : <Badge tone="bad">{t('pilotage.interop.refused', { code: r.status })}</Badge>) },
              ]} />
          )}
        </QueryState>
        <p className="hint">{t('pilotage.interop.rate')}</p>

        <QueryState q={cons}>
          {(list) => (
            <Table<Connector> title={t('pilotage.interop.keys')} caption={t('pilotage.interop.keysCaption')} data={list} rowKey={(r) => r.partner}
              columns={[
                { key: 'label', label: t('pilotage.interop.partner'), render: (r) => <><span className="cell-main">{r.label}</span>{r.key && old(r.key.created_at) && <span className="cell-sub">{t('pilotage.interop.renewAdvice')}</span>}</> },
                { key: 'key', label: t('pilotage.interop.key'), sortable: false, render: (r) => (r.key ? <span className="mono">{r.key.masked}</span> : <span className="muted small">{r.configured ? t('pilotage.interop.envKey') : t('pilotage.interop.noKey')}</span>) },
                { key: 'created', label: t('pilotage.interop.created'), num: true, render: (r) => (r.key ? fmtDateTime(r.key.created_at) : '—') },
                { key: 'used', label: t('pilotage.interop.used'), num: true, render: (r) => (r.key?.last_used_at ? fmtDateTime(r.key.last_used_at) : '—') },
                { key: 'actions', label: t('admin.actions'), actions: true, render: (r) => (
                  <div className="cluster" style={{ '--gap': '6px', justifyContent: 'flex-end' } as React.CSSProperties}>
                    <Button size="sm" variant="secondary" onClick={() => setConfirm({ partner: r.partner, label: r.label, action: 'renew' })}>{r.key ? t('pilotage.interop.renew') : t('pilotage.interop.create')}</Button>
                    {r.key && <Button size="sm" variant="danger" onClick={() => setConfirm({ partner: r.partner, label: r.label, action: 'revoke' })}>{t('pilotage.interop.revoke')}</Button>}
                  </div>
                ) },
              ]} />
          )}
        </QueryState>
        <p className="hint">{t('pilotage.interop.keyOnce')}</p>
      </div>

      {confirm && (
        <Dialog open onClose={() => setConfirm(null)} title={t(`pilotage.interop.${confirm.action}Title`, { name: confirm.label })}
          footer={<>
            <Button variant="secondary" onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
            <Button variant={confirm.action === 'revoke' ? 'dangerSolid' : 'primary'} busy={key.isPending} onClick={() => key.mutate(confirm)}>{t(`pilotage.interop.${confirm.action}`)}</Button>
          </>}>
          <p>{t(`pilotage.interop.${confirm.action}Text`)}</p>
          {key.isError && <Alert tone="danger" live>{(key.error as Error).message}</Alert>}
        </Dialog>
      )}
      {newKey && (
        <Dialog open onClose={() => setNewKey(null)} title={t('pilotage.interop.newKeyTitle', { name: newKey.label })}
          footer={<Button onClick={() => setNewKey(null)}>{t('pilotage.interop.newKeyDone')}</Button>}>
          <p>{t('pilotage.interop.newKeyText')}</p>
          <p className="code-block mono mt-2" style={{ wordBreak: 'break-all' }}>{newKey.key}</p>
        </Dialog>
      )}
    </div>
  );
}
