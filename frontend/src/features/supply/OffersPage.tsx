import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, buttonCls, Card, Chips, Dialog, Field, fmtDate, fmtNum, Icon, Input, PageHeader, Select, Table, toast, type Column } from '../../shared/ui';
import { coverDays, ruptures, STOCKS, type Stock } from './demo';
import '../market/market.css';

export const toDec = (s: string) => { const c = s.replace(/\s/g, '').replace(',', '.'); return /^\d+(\.\d+)?$/.test(c) ? Number(c) : NaN; };
const fmtT = (n: number) => fmtNum(n, 1);
const fmtShort = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** /offres : stocks, ruptures anticipées et prix (transformateur, distributeur). Aucune API : données de démonstration étiquetées. */
export function OffersPage() {
  const { t } = useTranslation();
  const [stocks, setStocks] = useState(STOCKS);
  const [store, setStore] = useState('all');
  const [editing, setEditing] = useState(false);
  const soon = ruptures(stocks);
  const cols: Column<Stock>[] = [
    { key: 'product', label: t('supply.offers.col.product'), render: (s) => <span className="cell-main">{s.product}</span> },
    { key: 'store', label: t('supply.offers.col.store') },
    { key: 'stock_t', label: t('supply.offers.col.stock'), num: true, render: (s) => `${fmtT(s.stock_t)} t` },
    { key: 'daily_t', label: t('supply.offers.col.cover'), sortable: false, render: (s) => {
      const d = coverDays(s);
      if (s.stock_t <= 0) return <Badge tone="bad">{t('supply.offers.out')}</Badge>;
      const pct = Math.min(100, Number.isFinite(d) ? (d / 30) * 100 : 100);
      return (
        <span className={`cover${d <= 7 ? ' cover--low' : d <= 20 ? ' cover--mid' : ''}`}>
          <span className="progress" aria-hidden><span style={{ ['--v' as string]: `${pct}%` }} /></span>
          <b className="num">{Number.isFinite(d) ? t('supply.offers.days', { days: d }) : '∞'}</b>
        </span>
      );
    } },
    { key: 'buy', label: t('supply.offers.col.buy'), num: true, render: (s) => t('supply.offers.perKg', { price: fmtNum(s.buy) }) },
    { key: 'sell', label: t('supply.offers.col.sell'), num: true, render: (s) => (s.sell ? t('supply.offers.perKg', { price: fmtNum(s.sell) }) : <span className="muted">—</span>) },
    { key: 'updated', label: t('supply.offers.col.updated'), render: (s) => <span className="num">{fmtShort(s.updated)}</span> },
  ];
  return (
    <>
      <PageHeader
        crumbs={[{ label: t('supply.offers.crumb'), to: '/marche' }, { label: t('nav.offers') }]}
        title={t('supply.offers.title')} desc={t('supply.offers.desc')}
        actions={<>
          <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>{t('supply.offers.update')}</Button>
          <Link className={buttonCls()} to="/marche"><Icon name="search" />{t('supply.offers.search')}</Link>
        </>}
      />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Alert tone="demo" title={t('supply.demoTitle')}>{t('supply.offers.demoBody')}</Alert>
        <div className="split">
          <Card title={t('supply.offers.ruptTitle')} sub={t('supply.offers.ruptSub')} actions={<Badge tone="sim">{t('supply.offers.simulated')}</Badge>}>
            {soon.length === 0 ? <p className="muted">{t('supply.offers.ruptEmpty')}</p> : (
              <ul className="rupt">
                {soon.map((s, i) => {
                  const d = coverDays(s);
                  const date = new Date(Date.now() + d * 86_400_000).toISOString();
                  return (
                    <li key={s.id} className="list-item">
                      <span className="li-icon" style={d <= 7 ? { background: 'var(--bad-bg)', color: 'var(--bad-ink)' } : { background: 'var(--sun-bg)', color: 'var(--sun-ink)' }}>
                        <Icon name={d <= 7 ? 'alert' : 'clock'} />
                      </span>
                      <span className="li-main">
                        <span className="li-title">{t('supply.offers.ruptLine', { product: s.product, store: s.store, days: d })}</span>
                        <span className="li-meta">{t('supply.offers.ruptMeta', { stock: fmtT(s.stock_t), daily: fmtT(s.daily_t), date: fmtDate(date) })}</span>
                      </span>
                      <span className="li-end"><Link className={buttonCls({ variant: i === 0 ? 'primary' : 'secondary', size: 'sm' })} to="/marche">{t('supply.offers.buy')}</Link></span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <PriceChart />
        </div>
        <Table columns={cols} data={store === 'all' ? stocks : stocks.filter((s) => s.store === store)} rowKey={(s) => s.id}
          title={t('supply.offers.stockTitle')} caption={t('supply.offers.stockCaption')}
          toolbar={<Chips single label={t('supply.offers.store')} value={[store]} onChange={(v) => setStore(v[0] ?? 'all')}
            options={[{ value: 'all', label: t('supply.offers.all') }, { value: 'Bohicon', label: 'Bohicon' }, { value: 'Abomey', label: 'Abomey' }]} />} />
      </div>
      {editing && <StockDialog stocks={stocks} onClose={() => setEditing(false)}
        onSave={(id, qty) => { setStocks((l) => l.map((s) => (s.id === id ? { ...s, stock_t: qty, updated: new Date().toISOString() } : s))); setEditing(false); toast({ text: t('supply.offers.stockSaved'), type: 'demo' }); }} />}
    </>
  );
}

function StockDialog({ stocks, onClose, onSave }: { stocks: Stock[]; onClose: () => void; onSave: (id: string, qty: number) => void }) {
  const { t } = useTranslation();
  const [id, setId] = useState(stocks[0]?.id ?? '');
  const [qty, setQty] = useState('');
  const [err, setErr] = useState('');
  return (
    <Dialog open onClose={onClose} title={t('supply.offers.update')}>
      <form noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const n = toDec(qty);
        if (!(n >= 0 && n <= 10_000)) { setErr(t('supply.offers.errQty')); return; }
        onSave(id, n);
      }}>
        <Field label={t('supply.offers.product')}>{(p) => <Select {...p} value={id} onChange={(e) => setId(e.target.value)} options={stocks.map((s) => ({ value: s.id, label: `${s.product} · ${s.store}` }))} />}</Field>
        <Field label={t('supply.offers.quantity')} error={err || undefined}>{(p) => <Input {...p} className="input-num" inputMode="decimal" autoComplete="off" value={qty} onChange={(e) => setQty(e.target.value)} />}</Field>
        <Button type="submit">{t('supply.offers.saveStock')}</Button>
      </form>
    </Dialog>
  );
}

/** Courbe de prix d'exemple (reprise de la maquette), étiquetée « Démonstration ». */
function PriceChart() {
  const { t } = useTranslation();
  return (
    <figure className="card chart" aria-labelledby="px-h">
      <div className="card-head m-0">
        <div><h2 className="card-title" id="px-h">{t('supply.offers.priceTitle')}</h2><p className="card-sub">{t('supply.offers.priceSub')}</p></div>
        <Badge tone="demo">{t('supply.demoBadge')}</Badge>
      </div>
      <svg viewBox="0 0 360 200" role="img" aria-label={t('supply.offers.priceDesc')}>
        <g className="grid"><line x1="36" x2="300" y1="20" y2="20" /><line x1="36" x2="300" y1="70" y2="70" /><line x1="36" x2="300" y1="120" y2="120" /><line x1="36" x2="300" y1="170" y2="170" /></g>
        <g className="tick" textAnchor="end"><text x="30" y="24">260</text><text x="30" y="74">240</text><text x="30" y="124">220</text><text x="30" y="174">200</text></g>
        <path className="line" d="M44 95 L80 100 L116 92 L152 108 L188 120 L224 130 L260 145 L296 157" />
        <path className="line" style={{ stroke: 'var(--d3)' }} d="M44 45 L80 50 L116 48 L152 62 L188 70 L224 80 L260 92 L296 100" />
        <circle cx="296" cy="157" r="4.5" fill="var(--d1)" stroke="#fff" strokeWidth="2" />
        <circle cx="296" cy="100" r="4.5" fill="var(--d3)" stroke="#fff" strokeWidth="2" />
        <text className="val" x="304" y="161">205</text><text className="val" x="304" y="104">228</text>
        <g className="tick" textAnchor="middle"><text x="44" y="192">S-7</text><text x="152" y="192">S-4</text><text x="296" y="192">{t('supply.offers.thisWeek')}</text></g>
      </svg>
      <ul className="legend"><li><span className="sw" />Parakou</li><li><span className="sw sw--3" />Bohicon</li></ul>
      <figcaption>{t('supply.offers.priceSrc')}</figcaption>
    </figure>
  );
}
