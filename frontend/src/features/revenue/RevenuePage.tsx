import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, rows } from '../../shared/api/client';
import { useVcName } from '../../shared/api/ref';
import type { Expense, Paginated, Revenue } from '../../shared/api/types';
import { Alert, Button, EmptyState, Field, Input, PageHeader, QueryState, Select, Stat, Table, fmtDate, fmtNum, toast } from '../../shared/ui';

const CATEGORIES = ['intrants', 'main_oeuvre', 'mecanisation', 'transport', 'autre'];
const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;
const today = () => new Date().toISOString().slice(0, 10);

/** Revenu du producteur : ventes déclarées à la récolte moins dépenses déclarées et remboursements payés. */
export function RevenuePage() {
  const { t } = useTranslation();
  const vc = useVcName();
  const [season, setSeason] = useState('');
  const q = useQuery({ queryKey: ['revenue', season], queryFn: () => api<Revenue>(`/revenue${season ? `?season=${encodeURIComponent(season)}` : ''}`) });
  return (
    <>
      <PageHeader title={t('rev.title')} desc={t('rev.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.revenue') }]} listen={t('rev.desc')} />
      <div className="stack" style={gap(20)}>
        <QueryState q={q}>
          {(d) => (
            <>
              <Field label={t('rev.season')}>{(p) => <Select {...p} value={season} onChange={(e) => setSeason(e.target.value)} placeholder={t('rev.allSeasons')} options={d.seasons.map((s) => ({ value: s, label: s }))} />}</Field>
              <div className="grid-fit" style={{ '--min': '170px' } as React.CSSProperties}>
                <Stat label={t('rev.sales')} value={fmtNum(d.sales_xof)} unit="FCFA" />
                <Stat label={t('rev.expenses')} value={fmtNum(d.expenses_xof)} unit="FCFA" />
                <Stat label={t('rev.repayments')} value={fmtNum(d.repayments_xof)} unit="FCFA" foot={season ? t('rev.repaymentsAll') : undefined} />
                <Stat label={t('rev.net')} value={fmtNum(d.net_xof)} unit="FCFA" foot={d.net_per_ha_xof === null ? undefined : t('rev.perHa', { n: fmtNum(d.net_per_ha_xof) })} />
              </div>
              {d.unpriced_harvests > 0 && <Alert tone="warn">{t('rev.unpriced', { count: d.unpriced_harvests })}</Alert>}
              {d.by_campaign.length === 0
                ? <div className="card"><EmptyState icon="coins" title={t('rev.empty')}>{t('rev.emptyHelp')}</EmptyState></div>
                : <Table<Revenue['by_campaign'][number]> title={t('rev.byCampaign')} caption={t('rev.byCampaign')} data={d.by_campaign} rowKey={(r) => r.campaign} columns={[
                  { key: 'value_chain', label: t('common.valueChain'), render: (r) => <><span className="cell-main">{vc(r.value_chain)}</span><span className="cell-sub">{r.parcel} · {r.season}</span></>, csv: (r) => vc(r.value_chain) },
                  { key: 'sold_kg', label: t('rev.soldKg'), num: true, render: (r) => fmtNum(r.sold_kg) },
                  { key: 'sales_xof', label: t('rev.sales'), num: true, render: (r) => fmtNum(r.sales_xof) },
                  { key: 'expenses_xof', label: t('rev.expenses'), num: true, render: (r) => fmtNum(r.expenses_xof) },
                  { key: 'net_xof', label: t('rev.net'), num: true, render: (r) => fmtNum(r.net_xof) },
                ]} />}
              <p className="hint">{t('rev.method', { market: fmtNum(d.market_received_xof), free: fmtNum(d.free_supports_xof) })}</p>
            </>
          )}
        </QueryState>
        <Expenses />
      </div>
    </>
  );
}

function Expenses() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['expenses'], queryFn: async () => rows(await api<Paginated<Expense>>('/expenses')) });
  const done = () => { void qc.invalidateQueries({ queryKey: ['expenses'] }); void qc.invalidateQueries({ queryKey: ['revenue'] }); };
  const empty = { category: 'intrants', amount: '', date: today(), label: '' };
  const [v, setV] = useState(empty);
  const [err, setErr] = useState('');
  const add = useMutation({ mutationFn: () => api('/expenses', { method: 'POST', body: { category: v.category, amount_xof: Number(v.amount), spent_on: v.date, label: v.label.trim() } }), onSuccess: () => { setV(empty); done(); toast(t('rev.added')); } });
  const del = useMutation({ mutationFn: (id: string) => api(`/expenses/${id}`, { method: 'DELETE' }), onSuccess: done });
  return (
    <div className="split">
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="coins" title={t('rev.noExpenses')}>{t('rev.noExpensesHelp')}</EmptyState></div>}>
        {(d) => (
          <Table<Expense> title={t('rev.expensesList')} caption={t('rev.expensesList')} data={d} rowKey={(r) => r.id} columns={[
            { key: 'spent_on', label: t('common.date'), render: (r) => fmtDate(r.spent_on) },
            { key: 'category', label: t('rev.category'), render: (r) => <><span className="cell-main">{t(`rev.cat.${r.category}`)}</span>{r.label && <span className="cell-sub">{r.label}</span>}</>, csv: (r) => t(`rev.cat.${r.category}`) },
            { key: 'amount_xof', label: t('rev.amount'), num: true, render: (r) => fmtNum(r.amount_xof) },
            { key: 'act', label: t('common.action'), actions: true, render: (r) => <Button size="sm" variant="ghost" icon="trash" busy={del.isPending && del.variables === r.id} onClick={() => del.mutate(r.id)}>{t('rev.remove')}</Button> },
          ]} />
        )}
      </QueryState>
      <form noValidate className="card stack" style={gap(16)} aria-labelledby="h-exp" onSubmit={(e) => {
        e.preventDefault();
        if (!(Number(v.amount) > 0)) return setErr(t('rev.errAmount'));
        setErr('');
        add.mutate();
      }}>
        <div className="card-head m-0"><h2 className="card-title" id="h-exp">{t('rev.addExpense')}</h2></div>
        <Field label={t('rev.category')}>{(p) => <Select {...p} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: t(`rev.cat.${c}`) }))} />}</Field>
        <Field label={t('rev.amount')} error={err}>{(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value.replace(/\D/g, '') })} /><span className="addon addon--end">FCFA</span></div>}</Field>
        <Field label={t('common.date')}>{(p) => <Input {...p} type="date" max={today()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />}</Field>
        <Field label={t('rev.label')} optional>{(p) => <Input {...p} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />}</Field>
        {add.error && <Alert tone="danger" live>{add.error.message}</Alert>}
        <div className="cluster justify-end"><Button type="submit" icon="plus" busy={add.isPending}>{t('rev.add')}</Button></div>
      </form>
    </div>
  );
}
