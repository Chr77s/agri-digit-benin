import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { useDepartments, useValueChains, useVcName } from '../../shared/api/ref';
import {
  Badge, Button, Card, Chips, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, QueryState, Select, Textarea, fmtDate, fmtNum, toast,
} from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

interface Org { id: string; name: string; kind: string; value_chains: string[]; department: string; headcount: { cooperatives: number; producers: number; women: number } }
interface OrgEvent { id: string; kind: string; date: string; title: string; notes: string; price_xof_per_kg: number | null; participants: number | null; women: number | null; youth: number | null }
interface OrgDetail extends Org { cooperatives: { id: string; name: string; department: string }[]; events: OrgEvent[] }
interface Pub { id: string; kind: 'service' | 'innovation' | 'financement'; title: string; body: string; provider: string; value_chains: string[]; amount_xof: number | null; link: string; created_at: string }

const ORG_KINDS = ['union', 'federation', 'interprofession', 'oia', 'opa'];
const EVENT_KINDS = ['assemblee', 'reunion', 'prix', 'formation'];
const PUB_KINDS = ['service', 'innovation', 'financement'] as const;
const PUB_AUTHORS = ['admin_maep', 'agent_atda', 'responsable_programme', 'agent_financier', 'agronome_inrab'];

function usePost(url: string, keys: string[], done: string) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (b: unknown) => api(url, { method: 'POST', body: b }),
    onSuccess: () => { keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] })); toast(t(done)); },
  });
}
const num = (s: string) => (s.trim() ? Number(s) : null);

// ---- Organisations de filière ----

export function OrganisationsPage() {
  const { t } = useTranslation();
  const role = useAuth().user?.role ?? '';
  const vcName = useVcName();
  const q = useQuery({ queryKey: ['orgs'], queryFn: () => api<{ results: Org[] }>('/organisations') });
  const [create, setCreate] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const canWrite = role === 'agent_atda' || role === 'admin_maep';
  return (
    <>
      <PageHeader title={t('org.title')} desc={t('org.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.organisations') }]}
        actions={canWrite && <Button icon="plus" onClick={() => setCreate(true)}>{t('org.create')}</Button>} />
      <QueryState q={q} empty={(d) => d.results.length === 0} emptyText={<div className="card"><EmptyState icon="building" title={t('org.empty')} /></div>}>
        {(d) => (
          <div className="grid-fit" style={{ '--min': '320px' } as React.CSSProperties}>
            {d.results.map((o) => (
              <Card key={o.id} as="article" title={o.name} actions={<Badge>{t(`org.kind.${o.kind}`)}</Badge>}>
                <p className="small muted">{o.department || t('org.national')} · {o.value_chains.map(vcName).join(', ') || '—'}</p>
                <p>{t('org.headcount', { coops: o.headcount.cooperatives, producers: o.headcount.producers, women: o.headcount.women })}</p>
                <Button variant="secondary" size="sm" onClick={() => setOpen(o.id)}>{t('org.open')}</Button>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
      {create && <OrgForm onClose={() => setCreate(false)} />}
      {open && <OrgDialog id={open} canWrite={canWrite} onClose={() => setOpen(null)} />}
    </>
  );
}

function OrgForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const user = useAuth().user;
  const deps = useDepartments();
  const vcs = useValueChains();
  const [v, setV] = useState({ name: '', kind: 'union', department: user?.role === 'agent_atda' ? user.department ?? '' : '', registration_number: '' });
  const [chains, setChains] = useState<string[]>([]);
  const m = usePost('/organisations', ['orgs'], 'org.saved');
  return (
    <Dialog open onClose={onClose} title={t('org.create')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button busy={m.isPending} onClick={() => m.mutate({ ...v, value_chains: chains }, { onSuccess: onClose })}>{t('org.create')}</Button></>}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <Field label={t('org.name')}>{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <Field label={t('org.kind.label')}>{(p) => <Select {...p} options={ORG_KINDS.map((k) => ({ value: k, label: t(`org.kind.${k}`) }))} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} />}</Field>
        <Field label={t('org.department')}>{(p) => <Select {...p} disabled={user?.role === 'agent_atda'} options={[{ value: '', label: t('org.national') }, ...(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))]} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value })} />}</Field>
        <Chips label={t('org.chains')} value={chains} onChange={setChains} options={(vcs.data ?? []).map((c) => ({ value: c.code, label: c.name }))} />
        <Field label={t('org.registration')} optional>{(p) => <Input {...p} value={v.registration_number} onChange={(e) => setV({ ...v, registration_number: e.target.value })} />}</Field>
        {m.error && <ErrorState error={m.error} />}
      </div>
    </Dialog>
  );
}

function OrgDialog({ id, canWrite, onClose }: { id: string; canWrite: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['orgs', id], queryFn: () => api<OrgDetail>(`/organisations/${id}`) });
  const coops = useQuery({ queryKey: ['cooperatives', {}], queryFn: () => api<{ results: { id: string; name: string }[] }>('/cooperatives'), enabled: canWrite });
  const [coop, setCoop] = useState('');
  const [ev, setEv] = useState({ kind: 'reunion', date: new Date().toISOString().slice(0, 10), title: '', notes: '', price: '', participants: '', women: '', youth: '' });
  const addCoop = usePost(`/organisations/${id}/cooperatives`, ['orgs'], 'org.saved');
  const addEv = usePost(`/organisations/${id}/events`, ['orgs'], 'org.saved');
  return (
    <Dialog open onClose={onClose} title={q.data?.name ?? t('org.title')}>
      <QueryState q={q}>
        {(d) => (
          <div className="stack" style={{ ['--gap' as string]: '16px' }}>
            <p>{t('org.headcount', { coops: d.headcount.cooperatives, producers: d.headcount.producers, women: d.headcount.women })}</p>
            <section>
              <h3 className="card-title">{t('org.coops')}</h3>
              {d.cooperatives.length ? <ul>{d.cooperatives.map((c) => <li key={c.id}>{c.name} ({c.department})</li>)}</ul> : <p className="muted">{t('org.noCoops')}</p>}
              {canWrite && (
                <div className="cluster mt-2">
                  <Select aria-label={t('org.addCoop')} value={coop} onChange={(e) => setCoop(e.target.value)} placeholder={t('common.choose')}
                    options={(coops.data?.results ?? []).map((c) => ({ value: c.id, label: c.name }))} />
                  <Button variant="secondary" size="sm" disabled={!coop} busy={addCoop.isPending} onClick={() => addCoop.mutate({ cooperative: coop })}>{t('org.addCoop')}</Button>
                </div>
              )}
            </section>
            <section>
              <h3 className="card-title">{t('org.events')}</h3>
              {d.events.length ? (
                <ul className="stack" style={{ ['--gap' as string]: '6px' }}>
                  {d.events.map((e) => (
                    <li key={e.id}><Badge>{t(`org.event.${e.kind}`)}</Badge> {fmtDate(e.date)} · {e.title}
                      {e.price_xof_per_kg != null && ` · ${t('org.priceLine', { price: fmtNum(e.price_xof_per_kg) })}`}
                      {e.participants != null && <span className="small muted"> · {t('org.people', { n: e.participants, w: e.women ?? 0, y: e.youth ?? 0 })}</span>}
                      {e.notes && <p className="small">{e.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t('org.noEvents')}</p>}
              {canWrite && (
                <form className="stack mt-2" style={{ ['--gap' as string]: '8px' }} onSubmit={(e) => {
                  e.preventDefault();
                  addEv.mutate({ kind: ev.kind, date: ev.date, title: ev.title, notes: ev.notes, price_xof_per_kg: num(ev.price), participants: num(ev.participants), women: num(ev.women), youth: num(ev.youth) });
                }}>
                  <div className="cluster">
                    <Field label={t('org.event.label')}>{(p) => <Select {...p} options={EVENT_KINDS.map((k) => ({ value: k, label: t(`org.event.${k}`) }))} value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value })} />}</Field>
                    <Field label={t('org.date')}>{(p) => <Input {...p} type="date" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} />}</Field>
                  </div>
                  <Field label={t('org.eventTitle')}>{(p) => <Input {...p} value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} />}</Field>
                  {ev.kind === 'prix' && <Field label={t('org.price')}>{(p) => <Input {...p} inputMode="numeric" value={ev.price} onChange={(e) => setEv({ ...ev, price: e.target.value })} />}</Field>}
                  {ev.kind === 'formation' && (
                    <div className="cluster">
                      <Field label={t('org.participants')}>{(p) => <Input {...p} inputMode="numeric" value={ev.participants} onChange={(e) => setEv({ ...ev, participants: e.target.value })} />}</Field>
                      <Field label={t('org.women')}>{(p) => <Input {...p} inputMode="numeric" value={ev.women} onChange={(e) => setEv({ ...ev, women: e.target.value })} />}</Field>
                      <Field label={t('org.youth')}>{(p) => <Input {...p} inputMode="numeric" value={ev.youth} onChange={(e) => setEv({ ...ev, youth: e.target.value })} />}</Field>
                    </div>
                  )}
                  <Field label={t('org.notes')} optional>{(p) => <Textarea {...p} rows={2} value={ev.notes} onChange={(e) => setEv({ ...ev, notes: e.target.value })} />}</Field>
                  {addEv.error && <ErrorState error={addEv.error} />}
                  <Button type="submit" busy={addEv.isPending} disabled={!ev.title.trim()}>{t('org.addEvent')}</Button>
                </form>
              )}
            </section>
          </div>
        )}
      </QueryState>
    </Dialog>
  );
}

// ---- Services, innovations, financements ----

export function ServicesPage() {
  const { t } = useTranslation();
  const role = useAuth().user?.role ?? '';
  const vcName = useVcName();
  const [kind, setKind] = useState<string[]>(['']);
  const q = useQuery({ queryKey: ['pubs'], queryFn: () => api<{ results: Pub[] }>('/publications') });
  const fin = useQuery({ queryKey: ['financing'], queryFn: () => api<{ published_total: number; supports_total: number }>('/dashboard/financing'),
    enabled: ['admin_maep', 'responsable_programme', 'auditeur_copil', 'agent_financier'].includes(role) });
  const [create, setCreate] = useState(false);
  const archive = useMutation({ mutationFn: (id: string) => api(`/publications/${id}/archive`, { method: 'POST', body: {} }) });
  const qc = useQueryClient();
  return (
    <>
      <PageHeader title={t('pub.title')} desc={t('pub.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.services') }]}
        actions={PUB_AUTHORS.includes(role) && <Button icon="plus" onClick={() => setCreate(true)}>{t('pub.create')}</Button>} />
      <div className="stack" style={{ ['--gap' as string]: '16px' }}>
        {fin.data && (
          <Card title={t('pub.financingTitle')}>
            <p>{t('pub.financingPublished', { amount: fmtNum(fin.data.published_total) })}</p>
            <p>{t('pub.financingSupports', { amount: fmtNum(fin.data.supports_total) })}</p>
          </Card>
        )}
        <Chips single label={t('pub.kind.label')} value={kind} onChange={setKind}
          options={[{ value: '', label: t('pub.all') }, ...PUB_KINDS.map((k) => ({ value: k, label: t(`pub.kind.${k}`) }))]} />
        <QueryState q={q} empty={(d) => d.results.length === 0} emptyText={<div className="card"><EmptyState icon="sprout" title={t('pub.empty')} /></div>}>
          {(d) => (
            <div className="grid-fit" style={{ '--min': '300px' } as React.CSSProperties}>
              {d.results.filter((p) => !kind[0] || p.kind === kind[0]).map((p) => (
                <Card key={p.id} as="article" title={p.title} actions={<Badge tone={p.kind === 'financement' ? 'ok' : 'neutral'}>{t(`pub.kind.${p.kind}`)}</Badge>}>
                  <p className="small muted">{t('pub.by', { provider: p.provider })}{p.value_chains.length ? ` · ${p.value_chains.map(vcName).join(', ')}` : ''}</p>
                  <p className="whitespace-pre-line">{p.body}</p>
                  {p.amount_xof != null && <p><b>{t('pub.amountLine', { amount: fmtNum(p.amount_xof) })}</b></p>}
                  {p.link && <a href={p.link} target="_blank" rel="noreferrer">{p.link}</a>}
                  {PUB_AUTHORS.includes(role) && <Button variant="ghost" size="sm" onClick={() => archive.mutate(p.id, { onSuccess: () => void qc.invalidateQueries({ queryKey: ['pubs'] }) })}>{t('pub.archive')}</Button>}
                </Card>
              ))}
            </div>
          )}
        </QueryState>
      </div>
      {create && <PubForm onClose={() => setCreate(false)} />}
    </>
  );
}

function PubForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const deps = useDepartments();
  const vcs = useValueChains();
  const [v, setV] = useState({ kind: 'service', title: '', body: '', provider: '', amount: '', link: '' });
  const [chains, setChains] = useState<string[]>([]);
  const [where, setWhere] = useState<string[]>([]);
  const m = usePost('/publications', ['pubs', 'financing'], 'pub.saved');
  return (
    <Dialog open onClose={onClose} title={t('pub.create')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button busy={m.isPending} onClick={() => m.mutate({ kind: v.kind, title: v.title, body: v.body, provider: v.provider, link: v.link, amount_xof: num(v.amount), value_chains: chains, departments: where }, { onSuccess: onClose })}>{t('pub.create')}</Button></>}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <Field label={t('pub.kind.label')}>{(p) => <Select {...p} options={PUB_KINDS.map((k) => ({ value: k, label: t(`pub.kind.${k}`) }))} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} />}</Field>
        <Field label={t('pub.titleField')}>{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <Field label={t('pub.provider')}>{(p) => <Input {...p} value={v.provider} onChange={(e) => setV({ ...v, provider: e.target.value })} />}</Field>
        <Field label={t('pub.body')}>{(p) => <Textarea {...p} rows={3} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />}</Field>
        {v.kind === 'financement' && <Field label={t('pub.amount')}>{(p) => <Input {...p} inputMode="numeric" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />}</Field>}
        <Chips label={t('pub.chains')} value={chains} onChange={setChains} options={(vcs.data ?? []).map((c) => ({ value: c.code, label: c.name }))} />
        <Chips label={t('pub.departments')} value={where} onChange={setWhere} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />
        <Field label={t('pub.link')} optional>{(p) => <Input {...p} type="url" value={v.link} onChange={(e) => setV({ ...v, link: e.target.value })} />}</Field>
        {m.error && <ErrorState error={m.error} />}
      </div>
    </Dialog>
  );
}
