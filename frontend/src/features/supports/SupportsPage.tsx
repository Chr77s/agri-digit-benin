import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, list, qs } from '../../shared/api/client';
import type { Program, Support } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Chips, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Radio, Select, Stat, Switch, Table, Timeline, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import i18n from '../../i18n';
import { postOrQueue } from '../outbox/offlineQueue';
import { useProducers } from '../producers/api';
import { daysSince } from '../producers/AgentHome';
import '../producers/agent.css';

export interface SupportCreate { producer: string; program?: string; item: string; quantity: number; unit: string; value_xof: number; repayable: boolean }

export const useSupports = (producer?: string) => useQuery({ queryKey: ['supports', producer], queryFn: () => list<Support>(`/supports${qs({ producer })}`) });
const usePrograms = () => useQuery({ queryKey: ['programs'], queryFn: () => list<Program>('/programs') });
export function useSupportActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['supports'] });
  return {
    create: useMutation({ mutationFn: (b: SupportCreate) => postOrQueue<Support>('/supports', b, i18n.t('offline.label.support', { item: b.item })), onSuccess: done }),
    confirm: useMutation({ mutationFn: (id: string) => api<Support>(`/supports/${id}/confirm`, { method: 'POST', body: {} }), onSuccess: done }),
    // l'appui reste « remis » : le signalement prévient l'agent, la confirmation reste possible
    report: useMutation({ mutationFn: ({ id, kind }: { id: string; kind: string }) => api<Support>(`/supports/${id}/report`, { method: 'POST', body: { kind } }) }),
  };
}

const UNITS = ['kg', 'sac', 'litre', 'unite'];

export function SupportsPage() {
  const { user } = useAuth();
  return user?.role === 'producteur' ? <ProducerSupports /> : <AgentSupports />;
}

function useQty() {
  const { t } = useTranslation();
  return (s: Support) => `${fmtNum(Number(s.quantity), 2)} ${t(`supports.unit.${s.unit}`, s.unit)}`;
}

/* ---------- Producteur : confirmer la réception, historique ---------- */
function ProducerSupports() {
  const { t } = useTranslation();
  const q = useSupports();
  const a = useSupportActions();
  const qty = useQty();
  return (
    <>
      <PageHeader title={t('nav.mySupports')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.mySupports') }]} desc={t('ag.sup.producerDesc')} listen={t('supports.listen')} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('supports.empty')} icon="gift">{t('supports.emptyProducer')}</EmptyState></div>}>
        {(d) => {
          const todo = d.filter((s) => s.status === 'remis');
          return (
            <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
              {a.confirm.error && <Alert tone="danger" live>{a.confirm.error.message}</Alert>}
              <section className="stack" style={{ '--gap': '12px' } as React.CSSProperties} aria-labelledby="t-conf">
                <div className="between"><h2 className="section-title" id="t-conf">{t('ag.sup.toConfirm')}</h2>
                  {todo.length > 0 ? <Badge tone="wait">{t('ag.sup.waiting', { count: todo.length })}</Badge> : <Badge tone="ok">{t('ag.sup.allConfirmed')}</Badge>}</div>
                {todo.length === 0 ? <p className="muted">{t('ag.sup.nothingToConfirm')}</p> : (
                  <ul className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
                    {todo.map((s) => (
                      <li key={s.id} className="card confirm-card">
                        <span className="li-icon" aria-hidden><svg className="ic" aria-hidden><use href="#i-gift" /></svg></span>
                        <div><h3 className="card-title">{s.item} · {qty(s)}</h3>
                          <p className="small muted">{[s.created_at ? t('ag.sup.handedOn', { date: fmtDate(s.created_at) }) : '', s.program_name].filter(Boolean).join(' · ')}</p>
                          <p className="small mt-1">{t('supports.value', { v: fmtNum(s.value_xof) })}{s.repayable && <> · <Badge tone="wait">{t('ag.sup.repayable')}</Badge></>}</p></div>
                        <div className="cluster">
                          <Button icon="check" busy={a.confirm.isPending && a.confirm.variables === s.id} onClick={() => a.confirm.mutate(s.id, { onSuccess: () => toast({ title: t('ag.sup.confirmedTitle'), text: t('supports.thanks') }) })}>{t('supports.confirm')}</Button>
                          <ReportIssue id={s.id} item={s.item} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <Table<Support> title={t('ag.sup.history')} caption={t('ag.sup.history')} data={d} rowKey={(r) => r.id} exportName="mes-appuis" columns={[
                { key: 'item', label: t('supports.item'), render: (r) => <><span className="cell-main">{r.item}</span><span className="cell-sub">{[r.created_at ? fmtDate(r.created_at) : '', r.program_name ?? t('ag.sup.noProgram')].filter(Boolean).join(' · ')}</span></> },
                { key: 'quantity', label: t('supports.quantity'), num: true, render: qty, csv: qty },
                { key: 'value_xof', label: t('supports.valueXof'), num: true, render: (r) => fmtNum(r.value_xof) },
                { key: 'repayable', label: t('ag.sup.type'), render: (r) => (r.repayable ? t('ag.sup.repayable') : t('ag.sup.gift')), csv: (r) => (r.repayable ? t('ag.sup.repayable') : t('ag.sup.gift')) },
                { key: 'status', label: t('ag.sup.state'), render: (r) => (r.status === 'confirme' ? <Badge tone="ok">{t('supports.confirmedOn', { date: fmtDate(r.confirmed_at) })}</Badge> : <Badge tone="wait">{t('supports.status.remis')}</Badge>), csv: (r) => t(`supports.status.${r.status}`) },
              ]} />
            </div>
          );
        }}
      </QueryState>
    </>
  );
}

/** « Il en manque » ou « rien reçu » : l'agent qui a remis l'appui est prévenu et rappelle le producteur. */
function ReportIssue({ id, item }: { id: string; item: string }) {
  const { t } = useTranslation();
  const { report } = useSupportActions();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('manque');
  return (
    <>
      <Button variant="ghost" onClick={() => { report.reset(); setOpen(true); }}>{t('ag.sup.report')}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('ag.sup.reportTitle', { item })}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" form={`f-rep-${id}`} busy={report.isPending}>{t('ag.sup.reportSend')}</Button></>}>
        <form id={`f-rep-${id}`} noValidate className="stack" onSubmit={(e) => {
          e.preventDefault();
          report.mutate({ id, kind }, { onSuccess: () => { setOpen(false); toast(t('ag.sup.reported')); } });
        }}>
          <fieldset className="fieldset">
            <legend className="label">{t('ag.sup.reportLegend')}</legend>
            {['manque', 'rien_recu'].map((k) => <Radio key={k} name={`kind-${id}`} checked={kind === k} onChange={() => setKind(k)} label={t(`ag.sup.reportKind.${k}`)} />)}
          </fieldset>
          <Alert tone="info" icon="info">{t('ag.sup.reportInfo')}</Alert>
          {report.error && <Alert tone="danger" live>{report.error.message}</Alert>}
        </form>
      </Dialog>
    </>
  );
}

/* ---------- Agent : enregistrer une remise, registre ---------- */
function AgentSupports() {
  const { t } = useTranslation();
  const q = useSupports();
  const qty = useQty();
  const [filter, setFilter] = useState<string[]>([]);
  const match = (s: Support) => !filter.length || (filter.includes('confirm') && s.status === 'remis') || (filter.includes('repay') && s.repayable);
  return (
    <>
      <PageHeader title={t('nav.supports')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.supports') }]} desc={t('ag.sup.agentDesc')} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <div className="split">
          <SupportForm />
          <aside className="stack" aria-label={t('ag.sup.confirmTitle')}>
            <Card title={t('ag.sup.confirmTitle')}>
              <Timeline items={[
                { title: t('ag.sup.step1'), text: t('ag.sup.step1Text'), state: 'done' },
                { title: t('ag.sup.step2'), text: t('ag.sup.step2Text'), state: 'now' },
                { title: t('ag.sup.step3'), text: t('ag.sup.step3Text') },
              ]} />
            </Card>
            <div className="grid-fit" style={{ '--min': '150px' } as React.CSSProperties}>
              <Stat label={t('ag.sup.toConfirm')} value={q.data ? fmtNum(q.data.filter((s) => s.status === 'remis').length) : '…'} />
              <Stat label={t('ag.sup.toRepay')} value={q.data ? fmtNum(q.data.filter((s) => s.repayable).length) : '…'} />
            </div>
          </aside>
        </div>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState title={t('supports.empty')} icon="gift">{t('supports.emptyAgent')}</EmptyState></div>}>
          {(d) => (
            <Table<Support> title={t('ag.sup.registry')} caption={t('nav.supports')} data={d.filter(match)} rowKey={(r) => r.id} exportName="appuis"
              toolbar={<Chips label={t('ag.sup.filter')} value={filter} onChange={setFilter} options={[
                { value: 'confirm', label: t('ag.sup.toConfirm'), count: d.filter((s) => s.status === 'remis').length },
                { value: 'repay', label: t('ag.sup.toRepay'), count: d.filter((s) => s.repayable).length },
              ]} />}
              columns={[
                { key: 'producer_code', label: t('common.producer'), render: (r) => <><span className="cell-main num">{r.producer_code}</span>{r.created_at && <span className="cell-sub">{t('ag.sup.handedOn', { date: fmtDate(r.created_at) })}</span>}</> },
                { key: 'item', label: t('supports.item'), render: (r) => <><span className="cell-main">{r.item}</span><span className="cell-sub">{qty(r)}{r.program_name ? ` · ${r.program_name}` : ''}</span></>, csv: (r) => `${r.item} (${qty(r)})` },
                { key: 'value_xof', label: t('supports.valueXof'), num: true, render: (r) => fmtNum(r.value_xof) },
                { key: 'status', label: t('ag.sup.confirmation'), render: (r) => (r.status === 'confirme'
                  ? <Badge tone="ok">{t('supports.confirmedOn', { date: fmtDate(r.confirmed_at) })}</Badge>
                  : <Badge tone="wait">{t('ag.sup.awaiting', { count: daysSince(r.created_at) })}</Badge>), csv: (r) => t(`supports.status.${r.status}`) },
                { key: 'repayable', label: t('ag.sup.recovery'), render: (r) => (r.repayable ? t('ag.sup.repayable') : <span className="muted">{t('ag.sup.notRepayable')}</span>), csv: (r) => (r.repayable ? t('common.yes') : t('common.no')) },
              ]} />
          )}
        </QueryState>
      </div>
    </>
  );
}

function SupportForm() {
  const { t } = useTranslation();
  const producers = useProducers({ status: 'valide' });
  const programs = usePrograms();
  const { create } = useSupportActions();
  const empty = { producer: '', program: '', item: '', quantity: '', unit: 'sac', value_xof: '', repayable: false };
  const [v, setV] = useState(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const errCount = Object.keys(errs).length;
  return (
    <form noValidate className="card stack" style={{ '--gap': '18px' } as React.CSSProperties} aria-labelledby="h-form" onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      if (!v.producer) er.producer = t('supports.errProducer');
      if (v.item.trim().length < 2) er.item = t('supports.errItem');
      if (!(Number(v.quantity) > 0)) er.quantity = t('supports.errQuantity');
      if (!(Number(v.value_xof) >= 0) || v.value_xof === '') er.value_xof = t('supports.errValue');
      setErrs(er);
      if (Object.keys(er).length) return;
      create.mutate({ producer: v.producer, program: v.program || undefined, item: v.item.trim(), quantity: Number(v.quantity), unit: v.unit, value_xof: Math.round(Number(v.value_xof)), repayable: v.repayable },
        { onSuccess: (r) => { setV(empty); toast(r === 'queued' ? t('supports.queuedOffline') : t('supports.saved')); } });
    }}>
      <div className="card-head m-0"><h2 className="card-title" id="h-form">{t('supports.formTitle')}</h2></div>
      {errCount > 0 && <Alert tone="danger" title={t('ag.alerts.errCount', { count: errCount })} />}
      <div className="form-grid">
        <Field label={t('common.producer')} hint={t('ag.coop.validOnly')} error={errs.producer}>{(p) => <Select {...p} value={v.producer} onChange={(e) => setV({ ...v, producer: e.target.value })} placeholder={t('common.choose')} options={(producers.data ?? []).map((x) => ({ value: x.id, label: `${x.code} ${x.first_name} ${x.last_name}` }))} />}</Field>
        <Field label={t('supports.program')}>{(p) => <Select {...p} value={v.program} onChange={(e) => setV({ ...v, program: e.target.value })} placeholder={t('supports.noProgram')} options={(programs.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />}</Field>
        <Field label={t('supports.item')} error={errs.item} hint={t('supports.itemHint')}>{(p) => <Input {...p} value={v.item} onChange={(e) => setV({ ...v, item: e.target.value })} />}</Field>
        <Field label={t('supports.quantity')} error={errs.quantity}>{(p) => (
          <div className="input-group">
            <Input {...p} className="input-num" inputMode="decimal" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} />
            <Select aria-label={t('supports.unitLabel')} className="max-w-[120px]" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} options={UNITS.map((u) => ({ value: u, label: t(`supports.unit.${u}`) }))} />
          </div>
        )}</Field>
        <Field label={t('supports.valueXof')} error={errs.value_xof}>{(p) => (
          <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" value={v.value_xof} onChange={(e) => setV({ ...v, value_xof: e.target.value.replace(/[^\d]/g, '') })} /><span className="addon addon--end">FCFA</span></div>
        )}</Field>
      </div>
      <fieldset className="fieldset"><legend className="label">{t('ag.sup.repayLegend')}</legend>
        <Switch label={t('supports.repayableLabel')} checked={v.repayable} onChange={(e) => setV({ ...v, repayable: e.target.checked })} />
      </fieldset>
      {create.error && <Alert tone="danger" live>{create.error.message}</Alert>}
      <div className="cluster justify-end"><Button type="submit" busy={create.isPending}>{t('supports.submit')}</Button></div>
    </form>
  );
}
