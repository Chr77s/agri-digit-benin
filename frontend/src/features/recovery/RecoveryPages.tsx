import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, list } from '../../shared/api/client';
import { usePlaceName } from '../../shared/api/ref';
import type { Claim, ClaimInstallment, ClaimPayment, ClaimPortfolio, ClaimTotals } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Chips, Dialog, EmptyState, Field, Input, PageHeader, QueryState, Select, Stat, Table, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

const useClaims = () => useQuery({ queryKey: ['claims'], queryFn: () => list<Claim>('/claims') });
const TONE = { solde: 'ok', en_retard: 'bad', en_cours: 'wait' } as const;
const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

function Status({ s }: { s: Claim['status'] }) {
  const { t } = useTranslation();
  return <Badge tone={TONE[s]}>{t(`rec.status.${s}`)}</Badge>;
}

/* ---------- Débiteur : producteur (appuis, prêts) ou transformateur (équipement du plateau) ---------- */
export function RepaymentsPage() {
  const { t } = useTranslation();
  const q = useClaims();
  return (
    <>
      <PageHeader title={t('rec.mine.title')} desc={t('rec.mine.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.repayments') }]} listen={t('rec.mine.desc')} />
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="coins" title={t('rec.mine.empty')}>{t('rec.mine.emptyHelp')}</EmptyState></div>}>
        {(d) => <div className="stack" style={gap(20)}>{d.map((c) => <ClaimCard key={c.id} c={c} />)}</div>}
      </QueryState>
    </>
  );
}

function ClaimCard({ c }: { c: Claim }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pct = c.amount_xof ? Math.round((100 * c.paid_xof) / c.amount_xof) : 0;
  return (
    <Card title={c.label} sub={t(`rec.kind.${c.kind}`)} actions={<Status s={c.status} />}>
      <div className="stack" style={gap(14)}>
        <div className="progress" role="img" aria-label={t('rec.progress', { pct })}><span style={{ '--v': `${pct}%` } as React.CSSProperties} /></div>
        <p className="small">{t('rec.paidOf', { paid: fmtNum(c.paid_xof), total: fmtNum(c.amount_xof) })}</p>
        {c.status === 'en_retard' && <Alert tone="warn">{t('rec.lateAlert', { amount: fmtNum(c.overdue_xof) })}</Alert>}
        <Table<ClaimInstallment> caption={t('rec.installments')} data={c.installments} rowKey={(r) => String(r.rank)} pageSize={12} columns={[
          { key: 'rank', label: t('rec.col.rank'), num: true },
          { key: 'due_on', label: t('rec.col.dueOn'), render: (r) => fmtDate(r.due_on) },
          { key: 'amount_xof', label: t('rec.col.amount'), num: true, render: (r) => fmtNum(r.amount_xof) },
          { key: 'paid_xof', label: t('rec.col.paid'), num: true, render: (r) => fmtNum(r.paid_xof) },
          { key: 'status', label: t('rec.col.state'), render: (r) => <Badge tone={r.status === 'payee' ? 'ok' : r.status === 'en_retard' ? 'bad' : 'wait'}>{t(`rec.ins.${r.status}`)}</Badge> },
        ]} />
        {c.status !== 'solde' && <div className="cluster"><Button icon="wallet" onClick={() => setOpen(true)}>{t('rec.payOne', { amount: fmtNum(c.next_amount_xof) })}</Button></div>}
        {open && <PayDialog c={c} onClose={() => setOpen(false)} />}
      </div>
    </Card>
  );
}

/** Remboursement en un clic : la prochaine échéance, par Mobile Money (FakePay, simulé). */
function PayDialog({ c, onClose }: { c: Claim; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [phone, setPhone] = useState(/^01\d{8}$/.test(user?.phone ?? '') ? (user?.phone ?? '') : '');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const pay = useMutation({ mutationFn: () => api<ClaimPayment>(`/claims/${c.id}/pay`, { method: 'POST', body: { payer_phone: phone } }), onSuccess: (p) => setPaymentId(p.id) });
  const st = useQuery({
    queryKey: ['claim-payment', paymentId], queryFn: () => api<ClaimPayment>(`/claim-payments/${paymentId}`), enabled: !!paymentId,
    refetchInterval: (q) => (q.state.data?.status === 'en_attente' ? 1000 : false),
  });
  const status = st.data?.status;
  useEffect(() => { if (status === 'reussi') { void qc.invalidateQueries({ queryKey: ['claims'] }); toast(t('rec.paid')); } }, [status, qc, t]);
  const retry = () => { pay.reset(); setPaymentId(null); };
  return (
    <Dialog open onClose={onClose} title={t('rec.payTitle', { label: c.label })}
      footer={status === 'reussi' ? <Button onClick={onClose}>{t('common.close')}</Button> : !paymentId ? <><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-claim-pay" icon="wallet" busy={pay.isPending}>{t('rec.payConfirm', { amount: fmtNum(c.next_amount_xof) })}</Button></> : status === 'echoue' ? <Button onClick={retry}>{t('rec.retry')}</Button> : undefined}>
      {!paymentId ? (
        <form id="f-claim-pay" noValidate className="stack" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
          <Alert tone="demo" icon="info">{t('rec.simulated')}</Alert>
          <Field label={t('rec.phone')} hint={t('rec.phoneHint')}>{(p) => <Input {...p} inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />}</Field>
          {pay.error && <Alert tone="danger" live>{pay.error.message}</Alert>}
        </form>
      ) : (
        <div className="stack" aria-live="polite">
          {(!status || status === 'en_attente') && <Alert tone="info" live>{t('rec.pending')}</Alert>}
          {status === 'reussi' && <Alert tone="ok" title={t('rec.paid')}>{t('rec.receipt', { amount: fmtNum(st.data?.amount_xof), ref: st.data?.reference })}</Alert>}
          {status === 'echoue' && <Alert tone="danger" title={t('rec.failed')}>{t('rec.failedHelp')}</Alert>}
        </div>
      )}
    </Dialog>
  );
}

/* ---------- Créancier : institution financière (prêts), agent et administration (appuis, équipements) ---------- */
export function RecoveryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const place = usePlaceName();
  const [filter, setFilter] = useState<string[]>([]);
  const pf = useQuery({ queryKey: ['claims-portfolio'], queryFn: () => api<ClaimPortfolio>('/claims/portfolio') });
  const q = useClaims();
  const canOpen = ['agent_financier', 'agent_atda', 'admin_maep'].includes(user?.role ?? '');
  return (
    <>
      <PageHeader title={t('rec.title')} desc={t(user?.role === 'agent_financier' ? 'rec.descBank' : 'rec.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.recovery') }]} />
      <div className="stack" style={gap(20)}>
        <QueryState q={pf}>
          {(d) => (
            <>
              <div className="grid-fit" style={{ '--min': '170px' } as React.CSSProperties}>
                <Stat label={t('rec.kpi.advanced')} value={fmtNum(d.total.amount_xof)} unit="FCFA" />
                <Stat label={t('rec.kpi.outstanding')} value={fmtNum(d.total.outstanding_xof)} unit="FCFA" />
                <Stat tone="peach" label={t('rec.kpi.overdue')} value={fmtNum(d.total.overdue_xof)} unit="FCFA" foot={t('rec.kpi.overdueCount', { count: d.total.overdue_count })} />
                <Stat label={t('rec.kpi.rate')} value={d.total.recovery_rate === null ? t('common.notAvailable') : `${fmtNum(100 * d.total.recovery_rate, 0)} %`} foot={t('rec.kpi.rateHelp')} />
              </div>
              {Object.keys(d.by_department).length > 1 && (
                <Table<[string, ClaimTotals]> title={t('rec.byDepartment')} caption={t('rec.byDepartment')} data={Object.entries(d.by_department)} rowKey={(r) => r[0]} columns={[
                  { key: 'dep', label: t('common.department'), render: (r) => place(r[0]) || '—', csv: (r) => r[0] },
                  { key: 'count', label: t('rec.col.count'), num: true, render: (r) => fmtNum(r[1].count), csv: (r) => r[1].count },
                  { key: 'out', label: t('rec.kpi.outstanding'), num: true, render: (r) => fmtNum(r[1].outstanding_xof), csv: (r) => r[1].outstanding_xof },
                  { key: 'over', label: t('rec.kpi.overdue'), num: true, render: (r) => fmtNum(r[1].overdue_xof), csv: (r) => r[1].overdue_xof },
                  { key: 'rate', label: t('rec.kpi.rate'), num: true, render: (r) => (r[1].recovery_rate === null ? '—' : `${fmtNum(100 * r[1].recovery_rate)} %`), csv: (r) => r[1].recovery_rate },
                ]} />
              )}
            </>
          )}
        </QueryState>
        <div className={canOpen ? 'split' : undefined}>
          <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="coins" title={t('rec.empty')}>{t(user?.role === 'agent_financier' ? 'rec.emptyHelpBank' : 'rec.emptyHelp')}</EmptyState></div>}>
            {(d) => (
              <Table<Claim> title={t('rec.registry')} caption={t('rec.registry')} data={d.filter((c) => !filter.length || filter.includes(c.status))} rowKey={(r) => r.id} exportName="creances"
                toolbar={<Chips label={t('rec.filter')} value={filter} onChange={setFilter} options={(['en_retard', 'en_cours', 'solde'] as const).map((s) => ({ value: s, label: t(`rec.status.${s}`), count: d.filter((c) => c.status === s).length }))} />}
                columns={[
                  { key: 'debtor', label: t('rec.col.debtor'), render: (r) => <><span className="cell-main num">{r.debtor}</span><span className="cell-sub">{[place(r.department), t(`rec.kind.${r.kind}`)].filter(Boolean).join(' · ')}</span></>, csv: (r) => r.debtor },
                  { key: 'label', label: t('rec.col.label') },
                  { key: 'amount_xof', label: t('rec.col.amount'), num: true, render: (r) => fmtNum(r.amount_xof) },
                  { key: 'outstanding_xof', label: t('rec.col.left'), num: true, render: (r) => fmtNum(r.outstanding_xof) },
                  { key: 'overdue_xof', label: t('rec.col.overdue'), num: true, render: (r) => (r.overdue_xof ? fmtNum(r.overdue_xof) : '—'), csv: (r) => r.overdue_xof },
                  { key: 'next_due_on', label: t('rec.col.next'), render: (r) => (r.next_due_on ? fmtDate(r.next_due_on) : '—'), csv: (r) => r.next_due_on },
                  { key: 'status', label: t('rec.col.state'), render: (r) => <Status s={r.status} />, csv: (r) => t(`rec.status.${r.status}`) },
                ]} />
            )}
          </QueryState>
          {canOpen && <OpenClaim bank={user?.role === 'agent_financier'} />}
        </div>
      </div>
    </>
  );
}

interface Consented { id: string; code: string; first_name: string; last_name: string }

function OpenClaim({ bank }: { bank: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const producers = useQuery({ queryKey: ['credit-producers'], queryFn: () => list<Consented>('/credit/consented-producers'), enabled: bank });
  const empty = { producer: '', phone: '', label: '', amount: '', n: '3', first: '' };
  const [v, setV] = useState(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const open = useMutation({
    mutationFn: () => api('/claims', { method: 'POST', body: {
      kind: bank ? 'pret' : 'plateau', label: v.label.trim(), amount_xof: Number(v.amount), installments: Number(v.n), ...(v.first ? { first_due: v.first } : {}),
      ...(bank ? { producer: v.producer } : { debtor_phone: v.phone }),
    } }),
    onSuccess: () => { setV(empty); void qc.invalidateQueries({ queryKey: ['claims'] }); void qc.invalidateQueries({ queryKey: ['claims-portfolio'] }); toast(t('rec.opened')); },
  });
  return (
    <form noValidate className="card stack" style={gap(16)} aria-labelledby="h-open-claim" onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      if (bank ? !v.producer : !/^01\d{8}$/.test(v.phone)) er.who = t(bank ? 'rec.errProducer' : 'rec.errPhone');
      if (v.label.trim().length < 2) er.label = t('rec.errLabel');
      if (!(Number(v.amount) > 0)) er.amount = t('rec.errAmount');
      setErrs(er);
      if (!Object.keys(er).length) open.mutate();
    }}>
      <div className="card-head m-0"><h2 className="card-title" id="h-open-claim">{t(bank ? 'rec.openLoan' : 'rec.openEquipment')}</h2></div>
      <p className="small muted">{t(bank ? 'rec.openLoanHelp' : 'rec.openEquipmentHelp')}</p>
      {bank
        ? <Field label={t('rec.producer')} hint={t('rec.consentOnly')} error={errs.who}>{(p) => <Select {...p} value={v.producer} onChange={(e) => setV({ ...v, producer: e.target.value })} placeholder={t('common.choose')} options={(producers.data ?? []).map((x) => ({ value: x.id, label: `${x.code} ${x.first_name} ${x.last_name}` }))} />}</Field>
        : <Field label={t('rec.transformerPhone')} error={errs.who}>{(p) => <Input {...p} inputMode="numeric" maxLength={10} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value.replace(/\D/g, '') })} />}</Field>}
      <Field label={t('rec.label')} error={errs.label}>{(p) => <Input {...p} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />}</Field>
      <Field label={t('rec.amount')} error={errs.amount}>{(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value.replace(/\D/g, '') })} /><span className="addon addon--end">FCFA</span></div>}</Field>
      <div className="form-grid">
        <Field label={t('rec.installmentsCount')}>{(p) => <Select {...p} value={v.n} onChange={(e) => setV({ ...v, n: e.target.value })} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />}</Field>
        <Field label={t('rec.firstDue')} optional hint={t('rec.firstDueHint')}>{(p) => <Input {...p} type="date" value={v.first} onChange={(e) => setV({ ...v, first: e.target.value })} />}</Field>
      </div>
      {open.error && <Alert tone="danger" live>{open.error.message}</Alert>}
      <div className="cluster justify-end"><Button type="submit" busy={open.isPending}>{t('rec.open')}</Button></div>
    </form>
  );
}
