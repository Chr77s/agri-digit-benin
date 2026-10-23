import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Dialog, EmptyState, ErrorState, Field, Icon, Input, PageHeader, Radio, Select, Skeleton, Table, fieldError, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useDepartments, usePlaceName, useVcName, useVcSelect } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { PRICE_WRITERS, useMargins, usePriceRows, useRecordPrice, type Form, type Margin, type PricePoint, type PriceRow } from './api';
import { FormError, gap, isoDay as today } from './FormError';

const MARGIN_READERS = ['transformateur', 'responsable_programme', 'admin_maep'];
const PRICE_MAX = 20000;

/** Variation par rapport au relevé précédent du même marché : flèche et texte, jamais la couleur seule. */
export function Change({ value }: { value: number | null }) {
  const { t } = useTranslation();
  if (value === null) return <span className="muted">{t('mk.noPrevious')}</span>;
  if (value === 0) return <span className="muted">{t('weather.stable')}</span>;
  return <span className={value > 0 ? 'up' : 'down'}><Icon name={value > 0 ? 'arrow-up' : 'arrow-down'} />{value > 0 ? '+' : '−'}{Math.abs(value)} %</span>;
}

/** Relevés de prix (TDR : prix brut et transformé) : derniers prix par marché, historique, saisie, écart brut / transformé. */
export function PricesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const vc = useVcSelect();
  const vcName = useVcName();
  const place = usePlaceName();
  const [chain, setChain] = useState('mais');
  const [adding, setAdding] = useState(false);
  const o = usePriceRows(chain);
  const canWrite = PRICE_WRITERS.includes(user?.role ?? '');
  const withMargins = MARGIN_READERS.includes(user?.role ?? '');
  return (
    <>
      <PageHeader title={t('mk.prices.title')} desc={t('mk.prices.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.priceReadings') }]}
        actions={canWrite ? <Button icon="plus" onClick={() => setAdding(true)}>{t('mk.prices.add')}</Button> : undefined} />
      <div className="stack" style={gap(20)}>
        <div className="w-full sm:w-72">
          <Field label={t('common.valueChain')}>{(p) => <Select {...p} value={chain} onChange={(e) => setChain(e.target.value)} options={vc.options} groups={vc.groups} />}</Field>
        </div>
        {o.loading ? <div className="card"><Skeleton lines={4} /></div> : (
          <>
            {o.simulated && <Alert tone="demo" title={t('mk.prices.simTitle')}>{o.latest.length ? t('mk.prices.simText') : t('mk.prices.none', { crop: vcName(chain) })}</Alert>}
            {o.latest.length === 0 ? (!o.simulated && <div className="card"><EmptyState title={t('mk.prices.empty')} icon="coins">{t('mk.prices.emptyHelp')}</EmptyState></div>) : (
              <Table<PriceRow & { id: string }> title={t('mk.prices.latest', { crop: vcName(chain) })} caption={t('mk.prices.caption', { days: o.window_days })} exportName={`prix-${chain}`}
                rowKey={(r) => r.id} data={o.latest.map((r) => ({ ...r, id: `${r.market}|${r.form}|${r.product}` }))}
                columns={[
                  { key: 'market', label: t('weather.market'), primary: true, render: (r) => <span className="cell-main">{r.market}</span>, csv: (r) => r.market },
                  { key: 'department', label: t('common.department'), render: (r) => place(r.department), csv: (r) => r.department },
                  { key: 'form', label: t('mk.prices.form'), render: (r) => <><Badge tone={r.form === 'brut' ? 'neutral' : 'ok'} icon={false}>{t(`mk.form.${r.form}`)}</Badge> <span className="small muted">{r.product}</span></>, csv: (r) => `${r.form} ${r.product}` },
                  { key: 'price', label: t('weather.price'), num: true, render: (r) => <b>{fmtNum(r.price)}</b> },
                  { key: 'change', label: t('mk.prices.change'), num: true, render: (r) => <Change value={r.change} />, csv: (r) => r.change },
                  { key: 'observed_on', label: t('mk.prices.date'), render: (r) => (r.observed_on ? fmtDate(r.observed_on) : <Badge tone="demo">{t('pr.demo')}</Badge>), csv: (r) => r.observed_on },
                ]} />
            )}
            {!o.simulated && <History points={o.history} />}
          </>
        )}
        {withMargins && <Margins />}
      </div>
      {adding && <RecordDialog chain={chain} onClose={() => setAdding(false)} />}
    </>
  );
}

function History({ points }: { points: PricePoint[] }) {
  const { t } = useTranslation();
  const weeks = [...new Set(points.map((p) => p.week))].sort().reverse();
  if (!weeks.length) return null;
  const at = (w: string, f: Form) => points.find((p) => p.week === w && p.form === f);
  const cell = (p?: PricePoint) => (p ? <>{fmtNum(p.price)} <span className="small muted">({t('mk.prices.nReadings', { count: p.n })})</span></> : '—');
  return (
    <Table<{ id: string; week: string }> title={t('mk.prices.history')} caption={t('mk.prices.historyCaption')} rowKey={(r) => r.id} pageSize={6} data={weeks.map((w) => ({ id: w, week: w }))}
      columns={[
        { key: 'week', label: t('mk.prices.week'), render: (r) => fmtDate(r.week), csv: (r) => r.week },
        { key: 'brut', label: t('mk.form.brut'), num: true, render: (r) => cell(at(r.week, 'brut')) },
        { key: 'transforme', label: t('mk.form.transforme'), num: true, render: (r) => cell(at(r.week, 'transforme')) },
      ]} />
  );
}

/** Écart entre le produit transformé et la matière brute, par filière et département (transformateurs, responsables, administration). */
function Margins() {
  const { t } = useTranslation();
  const vcName = useVcName();
  const place = usePlaceName();
  const q = useMargins(true);
  return (
    <Card title={t('mk.margin.title')} sub={t('mk.margin.sub')}>
      {q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data ? <Skeleton lines={3} /> : q.data.results.length === 0 ? <p className="muted">{t('mk.margin.empty')}</p> : (
        <div className="stack" style={gap(10)}>
          <Table<Margin & { id: string }> caption={t('mk.margin.title')} rowKey={(r) => r.id} pageSize={8} exportName="ecart-brut-transforme"
            data={q.data.results.map((r) => ({ ...r, id: `${r.value_chain}|${r.department}|${r.product}` }))}
            columns={[
              { key: 'value_chain', label: t('common.valueChain'), primary: true, render: (r) => <><span className="cell-main">{vcName(r.value_chain)}</span><span className="cell-sub">{place(r.department)}</span></>, csv: (r) => `${r.value_chain} ${r.department}` },
              { key: 'product', label: t('mk.margin.product') },
              { key: 'raw_xof', label: t('mk.margin.raw'), num: true, render: (r) => fmtNum(r.raw_xof) },
              { key: 'transformed_xof', label: t('mk.margin.processed'), num: true, render: (r) => fmtNum(r.transformed_xof) },
              { key: 'gap_xof', label: t('mk.margin.gap'), num: true, render: (r) => <b>{r.gap_xof > 0 ? '+' : ''}{fmtNum(r.gap_xof)} ({r.gap_pct > 0 ? '+' : ''}{r.gap_pct} %)</b>, csv: (r) => r.gap_xof },
            ]} />
          <p className="hint">{t('mk.margin.note')}</p>
        </div>
      )}
    </Card>
  );
}

function RecordDialog({ chain, onClose }: { chain: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const vc = useVcSelect();
  const vcName = useVcName();
  const m = useRecordPrice();
  const admin = user?.role === 'admin_maep';
  const [v, setV] = useState({ value_chain: chain, market: '', department: user?.department ?? '', form: 'brut' as Form, product: '', price: '', observed_on: today() });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const err = (k: string) => errs[k] ?? fieldError(m.error, k === 'price' ? 'price_xof_per_kg' : k);  const suggestion = v.product || `${vcName(v.value_chain)} (${t(`mk.form.${v.form}`).toLowerCase()})`;
  return (
    <Dialog open onClose={onClose} title={t('mk.prices.add')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-price" busy={m.isPending}>{t('common.save')}</Button></>}>
      <form id="f-price" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        const price = Number(v.price);
        if (!v.value_chain) er.value_chain = t('mk.prices.errChain');
        if (v.market.trim().length < 2) er.market = t('mk.prices.errMarket');
        if (!v.department) er.department = t('mk.prices.errDepartment');
        if (!Number.isInteger(price) || price < 1 || price > PRICE_MAX) er.price = t('mk.prices.errPrice', { max: fmtNum(PRICE_MAX) });
        if (!v.observed_on || v.observed_on > today()) er.observed_on = t('mk.prices.errDate');
        setErrs(er);
        if (Object.keys(er).length) return;
        m.mutate({ market: v.market.trim(), department: v.department, value_chain: v.value_chain, form: v.form, product: suggestion.trim(), price_xof_per_kg: price, observed_on: v.observed_on },
          { onSuccess: () => { toast(t('mk.prices.saved')); onClose(); } });
      }}>
        <Field label={t('common.valueChain')} error={err('value_chain')}>{(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} options={vc.options} groups={vc.groups} />}</Field>
        <fieldset className="fieldset">
          <legend className="label">{t('mk.prices.form')}</legend>
          <div className="cluster" style={gap(10)}>
            {(['brut', 'transforme'] as Form[]).map((f) => <Radio key={f} name="price-form" className="choice-card" checked={v.form === f} onChange={() => setV({ ...v, form: f })} label={<b>{t(`mk.form.${f}`)}</b>} />)}
          </div>
        </fieldset>
        <Field label={t('mk.prices.product')} hint={t('mk.prices.productHint')} error={err('product')}>{(p) => <Input {...p} value={v.product} placeholder={suggestion} onChange={(e) => setV({ ...v, product: e.target.value })} />}</Field>
        <div className="form-grid">
          <Field label={t('weather.market')} error={err('market')}>{(p) => <Input {...p} value={v.market} onChange={(e) => setV({ ...v, market: e.target.value })} />}</Field>
          <Field label={t('common.department')} error={err('department')} hint={admin ? undefined : t('mk.prices.ownDepartment')}>{(p) => (
            <Select {...p} value={v.department} disabled={!admin && !!user?.department} onChange={(e) => setV({ ...v, department: e.target.value })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />
          )}</Field>
          <Field label={t('mk.prices.price')} error={err('price')}>{(p) => <div className="input-group"><Input {...p} inputMode="numeric" className="input-num" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value.replace(/\D/g, '') })} /><span className="addon addon--end">FCFA/kg</span></div>}</Field>
          <Field label={t('mk.prices.date')} error={err('observed_on')}>{(p) => <Input {...p} type="date" max={today()} value={v.observed_on} onChange={(e) => setV({ ...v, observed_on: e.target.value })} />}</Field>
        </div>
        <FormError error={m.error} />
      </form>
    </Dialog>
  );
}
