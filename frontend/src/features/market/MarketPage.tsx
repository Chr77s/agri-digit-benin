import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Alert, Badge, Button, Card, Chips, Dialog, EmptyState, ErrorState, Field, fieldError, fmtDate, fmtDateTime, fmtNum, Input,
  PageHeader, PhoneInput, QueryState, Radio, Select, speak, Table, Tabs, Textarea, toast, type Column,
} from '../../shared/ui';
import { useDepartments, usePlaceName, useVcName, useVcSelect } from '../../shared/api/ref';
import type { Match, Offer, OfferType, Payment } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';
import { useContact, useCreateOffer, useCreatePayment, useDecide, useMatches, useOffers, usePayment, useRefund, type OfferFilter } from './api';
import { PRICE_CHAINS, demoPrices } from '../weather/demo';
import { EXPECTED_HARVESTS } from './demo';
import './market.css';

const TYPES: OfferType[] = ['offre', 'demande'];
const MAX_INT = 10_000_000; // bornes du serveur pour quantité et prix
export const toInt = (s: string) => { const c = s.replace(/\s/g, ''); return /^\d+$/.test(c) ? Number(c) : 0; };
const statusTone = { ouverte: 'neutral', en_relation: 'wait', conclue: 'ok', retiree: 'draft' } as const;
const matchTone = { proposee: 'wait', acceptee: 'ok', refusee: 'bad' } as const;
type Sort = 'price' | 'qty' | 'recent';

/** Vendeur (producteur, coopérative), acheteur (transformateur, distributeur) ou administrateur (lecture et remboursement). */
type Mode = 'seller' | 'buyer' | 'admin';
const modeOf = (role?: string): Mode => (role === 'admin_maep' ? 'admin' : role === 'producteur' || role === 'gestionnaire_cooperative' ? 'seller' : 'buyer');
// Sur une mise en relation, c'est l'annonce qui dit qui vend (propriétaire d'une offre, ou celui qui répond à une demande), pas le rôle.
const sellsIn = (m: Match, fallback: boolean) => (m.offer_summary ? m.is_owner === (m.offer_summary.type === 'offre') : fallback);

export function MarketPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mode = modeOf(user?.role);
  const isCoop = user?.role === 'gestionnaire_cooperative';
  const [tab, setTab] = useState(mode === 'seller' ? 'mine' : 'offers');
  const [payMatch, setPayMatch] = useState('');
  // Gardé ici : les onglets ne montent que le panneau visible, le suivi doit survivre au changement d'onglet.
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const all = useOffers({});
  const matches = useMatches(mode !== 'admin');
  const mine = (all.data ?? []).filter((o) => o.is_mine);
  const toAnswer = (matches.data ?? []).filter((m) => m.is_owner && m.status === 'proposee').length;
  const goPay = (id: string) => { setPayMatch(id); setTab('payment'); };

  const offersTab = { id: 'offers', label: t('market.tab.offers'), content: <OffersPanel canWrite={mode === 'buyer'} matches={matches.data ?? []} onPublish={() => setPublishing(true)} /> };
  const paymentTab = { id: 'payment', label: t('market.tab.payment'), content: <PaymentPanel mode={mode} match={payMatch} onMatch={setPayMatch} paymentId={paymentId} onPayment={setPaymentId} /> };
  const tabs = mode === 'seller'
    ? [
        { id: 'mine', label: t('market.tab.mine'), count: all.data ? mine.length : undefined, content: <MineTable q={all} mine={mine} onPublish={() => setTab('publish')} onBuyers={() => setTab('matches')} /> },
        { id: 'publish', label: t('market.tab.publish'), content: <Card><OfferForm coop={isCoop} onDone={() => setTab('mine')} /></Card> },
        { id: 'matches', label: t('market.tab.buyers'), count: matches.data ? toAnswer : undefined, content: <MatchesPanel seller onPay={goPay} /> },
        paymentTab,
      ]
    : mode === 'buyer'
      ? [offersTab, { id: 'matches', label: t('market.tab.matches'), count: matches.data?.length, content: <MatchesPanel onPay={goPay} /> }, paymentTab]
      : [offersTab, paymentTab];

  return (
    <>
      <PageHeader
        crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.market') }]}
        title={mode === 'seller' ? t('market.titleSeller') : t('market.title')}
        desc={t(mode === 'seller' ? (isCoop ? 'market.descCoop' : 'market.descSeller') : mode === 'buyer' ? 'market.descBuyer' : 'market.descAdmin')}
        actions={mode === 'admin' ? undefined : (
          <Button icon="plus" onClick={() => (mode === 'seller' ? setTab('publish') : setPublishing(true))}>{t('market.create')}</Button>
        )}
      />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Alert tone="demo" icon="wallet" title={t('market.banner')}>{t('market.bannerBody')}</Alert>
        <Tabs tabs={tabs} value={tab} onChange={setTab} label={t('market.tabsLabel')} />
      </div>
      {publishing && (
        <Dialog open onClose={() => setPublishing(false)} title={t('market.create')}>
          <OfferForm onDone={() => setPublishing(false)} />
        </Dialog>
      )}
    </>
  );
}

const line = (t: TFunction, vc: string, qty: number, price: number) =>
  t('market.line', { vc, qty: fmtNum(qty), price: fmtNum(price) });

// ---- Vendeur : mes annonces ----

function MineTable({ q, mine, onPublish, onBuyers }: { q: ReturnType<typeof useOffers>; mine: Offer[]; onPublish: () => void; onBuyers: () => void }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const place = usePlaceName();
  const [st, setSt] = useState<string[]>([]);
  const count = (s: Offer['status']) => mine.filter((o) => o.status === s).length;
  const rows = st.length ? mine.filter((o) => st.includes(o.status)) : mine;
  const cols: Column<Offer>[] = [
    { key: 'value_chain', label: t('market.col.offer'), render: (o) => (
      <><span className="cell-main">{t(`market.type.${o.type}`)} · {vcName(o.value_chain)}</span>{o.created_at && <span className="cell-sub">{t('market.publishedOn', { date: fmtDate(o.created_at) })}</span>}</>
    ) },
    { key: 'quantity_kg', label: t('market.col.qty'), num: true, render: (o) => fmtNum(o.quantity_kg) },
    { key: 'price_xof_per_kg', label: t('market.col.price'), num: true, render: (o) => fmtNum(o.price_xof_per_kg) },
    { key: 'commune', label: t('market.col.place'), render: (o) => `${place(o.commune)}, ${place(o.department)}` },
    { key: 'status', label: t('market.col.status'), render: (o) => <Badge tone={statusTone[o.status]}>{t(`market.offerStatus.${o.status}`)}</Badge> },
    { key: 'actions', label: t('market.col.actions'), actions: true, render: (o) => (o.status === 'en_relation' ? <Button variant="ghost" size="sm" onClick={onBuyers}>{t('market.seeBuyers')}</Button> : null) },
  ];
  return (
    <QueryState q={q} empty={() => mine.length === 0}
      emptyText={<Card><EmptyState title={t('market.mineEmpty')} action={<Button icon="plus" onClick={onPublish}>{t('market.create')}</Button>}>{t('market.mineEmptyHelp')}</EmptyState></Card>}>
      {() => (
        <Table columns={cols} data={rows} rowKey={(o) => o.id} caption={t('market.mineCaption')}
          toolbar={<Chips label={t('market.statusFilter')} value={st} onChange={setSt}
            options={(['ouverte', 'en_relation', 'conclue'] as const).map((s) => ({ value: s, label: t(`market.offerStatus.${s}`), count: count(s) }))} />} />
      )}
    </QueryState>
  );
}

// ---- Acheteur : offres et demandes ----

function OffersPanel({ canWrite, matches, onPublish }: { canWrite: boolean; matches: Match[]; onPublish: () => void }) {
  const { t } = useTranslation();
  const vc = useVcSelect();
  const deps = useDepartments();
  const [f, setF] = useState<OfferFilter>({ type: '', value_chain: '', department: '' });
  const [minT, setMinT] = useState('');
  const [sort, setSort] = useState<Sort>('price');
  const [contactFor, setContactFor] = useState<Offer | null>(null);
  const q = useOffers(f);
  const minKg = toInt(minT) * 1000;
  const sorted = (d: Offer[]) => d.filter((o) => o.quantity_kg >= minKg).sort((a, b) =>
    sort === 'price' ? a.price_xof_per_kg - b.price_xof_per_kg : sort === 'qty' ? b.quantity_kg - a.quantity_kg : String(b.created_at).localeCompare(String(a.created_at)));
  const pending = new Set(matches.filter((m) => m.status === 'proposee' && !m.is_owner).map((m) => (typeof m.offer === 'string' ? m.offer : m.offer.id)));
  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <form role="search" aria-label={t('market.filters')} className="card card--flat filters" onSubmit={(e) => e.preventDefault()}>
        <Field label={t('market.filterType')}>{(p) => <Select {...p} value={f.type ?? ''} onChange={(e) => setF({ ...f, type: e.target.value as OfferType | '' })} placeholder={t('common.all')} options={TYPES.map((x) => ({ value: x, label: t(`market.type.${x}`) }))} />}</Field>
        <Field label={t('common.valueChain')}>{(p) => <Select {...p} value={f.value_chain ?? ''} onChange={(e) => setF({ ...f, value_chain: e.target.value })} placeholder={t('common.all')} options={vc.options} groups={vc.groups} />}</Field>
        <Field label={t('common.department')}>{(p) => <Select {...p} value={f.department ?? ''} onChange={(e) => setF({ ...f, department: e.target.value })} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label={t('market.minQty')}>{(p) => (
          <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" autoComplete="off" value={minT} onChange={(e) => setMinT(e.target.value)} /><span className="addon addon--end">t</span></div>
        )}</Field>
      </form>
      <div className="split">
        <QueryState q={q}>
          {(d) => {
            const list = sorted([...d]);
            return (
              <Card title={t('market.results', { count: list.length })}
                actions={<label className="cluster"><span className="small muted">{t('market.sort')}</span>
                  <select className="select w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                    <option value="price">{t('market.sortPrice')}</option><option value="qty">{t('market.sortQty')}</option><option value="recent">{t('market.sortRecent')}</option>
                  </select></label>}>
                {list.length === 0
                  ? <EmptyState title={t('market.empty')} action={canWrite ? <Button variant="secondary" onClick={onPublish}>{t('market.create')}</Button> : undefined}>{t('market.emptyHelp')}</EmptyState>
                  : <ul className="offers-list">{list.map((o) => (
                      <OfferItem key={o.id} o={o} waiting={pending.has(o.id)}
                        canContact={canWrite && !o.is_mine && !pending.has(o.id) && (o.status === 'ouverte' || o.status === 'en_relation')}
                        onContact={() => setContactFor(o)} />
                    ))}</ul>}
              </Card>
            );
          }}
        </QueryState>
        <ExpectedHarvests />
      </div>
      {contactFor && <ContactDialog offer={contactFor} onClose={() => setContactFor(null)} onSent={() => { setContactFor(null); toast(t('market.contactSent')); }} />}
    </div>
  );
}

function OfferItem({ o, canContact, waiting, onContact }: { o: Offer; canContact: boolean; waiting: boolean; onContact: () => void }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const place = usePlaceName();
  return (
    <li className="offer">
      <div>
        <div className="cluster mb-1.5" style={{ ['--gap' as string]: '6px' }}>
          <Badge tone={o.type === 'offre' ? 'ok' : 'wait'} icon={false}>{t(`market.type.${o.type}`)}</Badge>
          <Badge>{t(`market.offerStatus.${o.status}`)}</Badge>
          {o.is_mine && <Badge tone="ok">{t('market.mine')}</Badge>}
        </div>
        <p className="offer-line">{t('market.kgLine', { vc: vcName(o.value_chain), qty: fmtNum(o.quantity_kg) })}</p>
        <p className="small muted">{place(o.commune)} ({place(o.department)}){o.owner_role ? `, ${t(`market.role.${o.owner_role}`, o.owner_role)}` : ''}</p>
        {o.description && <p className="small">{o.description}</p>}
      </div>
      <div className="offer-price"><b>{fmtNum(o.price_xof_per_kg)}</b><span className="small muted">{t('market.perKg')}</span></div>
      {(canContact || waiting) && (
        <div className="offer-foot">
          {waiting && <span className="small muted">{t('market.pendingReply')}</span>}
          {canContact && <Button variant="secondary" size="sm" onClick={onContact}>{t('market.contact')}</Button>}
        </div>
      )}
    </li>
  );
}

/** Récoltes attendues : pas d'API de prévision côté marché, données d'exemple étiquetées « Prévision simulée ». */
function ExpectedHarvests() {
  const { t } = useTranslation();
  const max = Math.max(...EXPECTED_HARVESTS.map((h) => h.t));
  return (
    <Card title={t('market.forecastTitle')} sub={t('market.forecastSub')} actions={<Badge tone="sim">{t('market.forecastBadge')}</Badge>}>
      <ul className="hbars">
        {EXPECTED_HARVESTS.map((h) => (
          <li key={h.key} className="hbar">
            <span>{t(`market.forecast.${h.key}`)}</span>
            <span className="hbar-track" aria-hidden><span className="hbar-fill" style={{ ['--v' as string]: `${(h.t / max) * 100}%` }} /></span>
            <span className="hbar-val">{fmtNum(h.t)} t</span>
          </li>
        ))}
      </ul>
      <p className="small muted mt-3">{t('market.forecastNote')}</p>
    </Card>
  );
}

function ContactDialog({ offer, onClose, onSent }: { offer: Offer; onClose: () => void; onSent: () => void }) {
  const { t } = useTranslation();
  const m = useContact();
  const [message, setMessage] = useState('');
  return (
    <Dialog open onClose={onClose} title={t('market.contact')}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!m.isPending) m.mutate({ id: offer.id, message: message.trim() }, { onSuccess: onSent }); }}>
        <p>{t('market.contactHelp')}</p>
        <Field label={t('market.message')} hint={t('market.messageHint')} error={fieldError(m.error, 'message')}>
          {(p) => <Textarea {...p} rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
        {m.error && <ErrorState error={m.error} />}
        <Button type="submit" icon="send" busy={m.isPending}>{t('market.send')}</Button>
      </form>
    </Dialog>
  );
}

/** Formulaire d'annonce : onglet « Publier » du vendeur ou fenêtre de l'acheteur. */
function OfferForm({ coop, onDone }: { coop?: boolean; onDone: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const vc = useVcSelect();
  const deps = useDepartments();
  const m = useCreateOffer();
  const [v, setV] = useState({ type: 'offre' as OfferType, value_chain: '', qty: '', price: '', department: user?.department ?? '', commune: user?.commune ?? '', description: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const communes = deps.data?.find((d) => d.code === v.department)?.communes ?? [];
  const err = (name: string) => errs[name] ?? fieldError(m.error, name);
  // Repère pour fixer son prix : relevés de démonstration de Banikoara et de Parakou pour la filière choisie.
  const priceHint = (chain: string) => {
    if (!PRICE_CHAINS.some((c) => c.code === chain)) return undefined; // pas de relevé pour cette filière
    const seen = demoPrices(chain).filter((r) => /^(Banikoara|Parakou)/.test(r.market)).map((r) => `${r.market.replace(/ \(.*\)/, '')} ${fmtNum(r.price)} F`);
    return seen.length ? t('market.priceHint', { list: seen.join(' · ') }) : undefined;
  };
  return (
    <form noValidate aria-label={t('market.create')} onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      const qty = toInt(v.qty);
      const price = toInt(v.price);
      if (!v.value_chain) er.value_chain = t('market.errVc');
      if (qty < 1 || qty > MAX_INT) er.quantity_kg = t('market.errQty');
      if (price < 1 || price > MAX_INT) er.price_xof_per_kg = t('market.errPrice');
      if (!v.department || !v.commune) er.commune = t('market.errPlace');
      setErrs(er);
      if (Object.keys(er).length) return;
      m.mutate({ type: v.type, value_chain: v.value_chain, quantity_kg: qty, price_xof_per_kg: price, department: v.department, commune: v.commune, description: v.description.trim() }, {
        onSuccess: () => { toast(t('market.created')); onDone(); },
      });
    }}>
      {coop && <div className="mb-4"><Alert tone="info">{t('market.coopHint')}</Alert></div>}
      <div className="form-grid">
        <fieldset className="fieldset span-all">
          <legend className="label">{t('market.type.label')}</legend>
          <div className="cluster" style={{ ['--gap' as string]: '10px' }}>
            {TYPES.map((x) => (
              <Radio key={x} name="offer-type" className="choice-card" checked={v.type === x} onChange={() => setV({ ...v, type: x })}
                label={<><b>{t(`market.type.${x}`)}</b><span className="small muted block">{t(`market.typeHint.${x}`)}</span></>} />
            ))}
          </div>
        </fieldset>
        <Field label={t('common.valueChain')} error={err('value_chain')}>{(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder={t('common.choose')} options={vc.options} groups={vc.groups} />}</Field>
        <Field label={t('market.quantity')} error={err('quantity_kg')}>{(p) => (
          <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" autoComplete="off" value={v.qty} onChange={(e) => setV({ ...v, qty: e.target.value })} /><span className="addon addon--end">kg</span></div>
        )}</Field>
        <Field label={t('market.price')} error={err('price_xof_per_kg')} hint={priceHint(v.value_chain)}>{(p) => (
          <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" autoComplete="off" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} /><span className="addon addon--end">FCFA/kg</span></div>
        )}</Field>
        <Field label={t('common.department')}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label={t('common.commune')} error={err('commune')}>{(p) => <Select {...p} value={v.commune} disabled={!v.department} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder={t('common.choose')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        <div className="span-all">
          <Field label={t('market.description')} error={err('description')}>{(p) => <Textarea {...p} rows={3} maxLength={1000} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
        </div>
      </div>
      {m.error && !Object.keys(errs).length && <div className="mt-4"><ErrorState error={m.error} /></div>}
      <div className="cluster mt-4">
        <Button type="submit" icon="send" busy={m.isPending}>{t('market.publish')}</Button>
        <span className="hint">{t('market.phoneNever')}</span>
      </div>
    </form>
  );
}

// ---- Mises en relation ----

function MatchesPanel({ seller, onPay }: { seller?: boolean; onPay: (matchId: string) => void }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const q = useMatches();
  const decide = useDecide();
  return (
    <>
      {decide.error && <div className="mb-3"><ErrorState error={decide.error} /></div>}
      <QueryState q={q} empty={(d) => d.length === 0}
        emptyText={<Card><EmptyState title={t('market.matchesEmpty')}>{t(seller ? 'market.buyersEmptyHelp' : 'market.matchesEmptyHelp')}</EmptyState></Card>}>
        {(d: Match[]) => (
          <Card>
            <ul className="offers-list" aria-label={t(seller ? 'market.tab.buyers' : 'market.tab.matches')}>
              {d.map((m) => {
                const s = m.offer_summary;
                const busy = (accept: boolean) => decide.isPending && decide.variables?.id === m.id && decide.variables.accept === accept;
                return (
                  <li key={m.id} className="match">
                    <div className="min-w-0">
                      <div className="cluster" style={{ ['--gap' as string]: '6px' }}>
                        <Badge tone={matchTone[m.status]}>{t(`market.matchStatus.${m.status}`)}</Badge>
                        <Badge>{m.is_owner ? t('market.received') : t('market.sent')}</Badge>
                      </div>
                      {s && <p className="card-title mt-2">{t(`market.type.${s.type}`)} : {line(t, vcName(s.value_chain), s.quantity_kg, s.price_xof_per_kg)}</p>}
                      {m.created_at && <p className="match-meta">{t('market.receivedOn', { date: fmtDate(m.created_at) })}</p>}
                      {m.message && <blockquote>{t('market.messageLabel')} : « {m.message} »</blockquote>}
                      {m.status === 'acceptee' && m.counterpart_phone && (
                        <p className="mt-2">
                          {t('market.phone')} :{' '}
                          <a className="num inline-flex min-h-touch items-center font-bold" href={`tel:${m.counterpart_phone}`}>{m.counterpart_phone}</a>
                        </p>
                      )}
                      {m.status === 'proposee' && <p className="hint mt-2">{t('market.phoneHidden')}</p>}
                    </div>
                    <div className="cluster">
                      {m.is_owner && m.status === 'proposee' && (
                        <>
                          <Button variant="ghost" disabled={decide.isPending} busy={busy(false)} onClick={() => decide.mutate({ id: m.id, accept: false })}>{t('market.refuse')}</Button>
                          <Button icon="check" disabled={decide.isPending} busy={busy(true)}
                            onClick={() => decide.mutate({ id: m.id, accept: true }, { onSuccess: () => toast(t('market.accepted')) })}>{t('market.accept')}</Button>
                        </>
                      )}
                      {m.status === 'acceptee' && <Button variant="secondary" icon="wallet" onClick={() => onPay(m.id)}>{sellsIn(m, !!seller) ? t('market.tab.payment') : t('market.pay')}</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </QueryState>
    </>
  );
}

// ---- Paiement ----

function PaymentPanel({ mode, match, onMatch, paymentId, onPayment }: { mode: Mode; match: string; onMatch: (id: string) => void; paymentId: string | null; onPayment: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="split">
      {mode === 'admin' ? <LookupForm onFind={onPayment} /> : <PayForm seller={mode === 'seller'} match={match} onMatch={onMatch} onCreated={onPayment} />}
      {paymentId
        ? <PaymentView key={paymentId} id={paymentId} mode={mode} />
        : <Card title={t('market.paymentTitle')}><p className="muted">{t('market.noPaymentHelp')}</p></Card>}
    </div>
  );
}

function PayForm({ seller: roleSeller, match, onMatch, onCreated }: { seller: boolean; match: string; onMatch: (id: string) => void; onCreated: (id: string) => void }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const matches = useMatches();
  const create = useCreatePayment();
  const accepted = (matches.data ?? []).filter((m) => m.status === 'acceptee');
  const selected = match || (accepted.length === 1 ? accepted[0].id : '');
  const sel = accepted.find((m) => m.id === selected);
  const s = sel?.offer_summary;
  const seller = sel ? sellsIn(sel, roleSeller) : roleSeller;
  const [amount, setAmount] = useState<string | null>(null); // null : montant calculé depuis l'annonce
  const [phone, setPhone] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const err = (name: string) => errs[name] ?? fieldError(create.error, name);
  const amountStr = amount ?? (s ? String(s.quantity_kg * s.price_xof_per_kg) : '');
  if (matches.isLoading || matches.isError) return <QueryState q={matches}>{() => null}</QueryState>;
  if (accepted.length === 0) return <Card><EmptyState title={t('market.payNoMatch')}>{t('market.payNoMatchHelp')}</EmptyState></Card>;
  return (
    <form noValidate className="card stack" aria-labelledby="pay-form-title" onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      const xof = toInt(amountStr);
      if (!selected) er.match = t('market.errMatch');
      if (xof < 1) er.amount_xof = t('market.errAmount');
      if (!/^01\d{8}$/.test(phone)) er.payer_phone = t('market.errPhone');
      setErrs(er);
      if (Object.keys(er).length) return;
      create.mutate({ match: selected, amount_xof: xof, payer_phone: phone }, { onSuccess: (p) => { setAmount(null); onCreated(p.id); } });
    }}>
      <h2 className="card-title" id="pay-form-title">{t(seller ? 'market.requestTitle' : 'market.payTitle')}</h2>
      <Field label={t('market.matchField')} error={err('match')}>
        {(p) => (
          <Select {...p} value={selected} onChange={(e) => { onMatch(e.target.value); setAmount(null); }} placeholder={t('common.choose')}
            options={accepted.map((m) => ({ value: m.id, label: m.offer_summary ? `${t(`market.type.${m.offer_summary.type}`)} : ${line(t, vcName(m.offer_summary.value_chain), m.offer_summary.quantity_kg, m.offer_summary.price_xof_per_kg)}` : m.id }))} />
        )}
      </Field>
      <Field label={t('market.amountLabel')} error={err('amount_xof')} hint={s && amount === null ? t('market.amountHint', { qty: fmtNum(s.quantity_kg), price: fmtNum(s.price_xof_per_kg) }) : undefined}>
        {(p) => <div className="input-group"><Input {...p} className="input-num" inputMode="numeric" autoComplete="off" value={amountStr} onChange={(e) => setAmount(e.target.value)} /><span className="addon addon--end">FCFA</span></div>}
      </Field>
      <Field label={t(seller ? 'market.buyerPhone' : 'market.payerPhone')} hint={t('market.payerHint')} error={err('payer_phone')}>
        {(p) => <PhoneInput {...p} maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />}
      </Field>
      {create.error && !Object.keys(errs).length && <ErrorState error={create.error} />}
      <Button type="submit" icon="wallet" block busy={create.isPending}>{t(seller ? 'market.requestPayment' : 'market.payConfirm')}</Button>
      {seller && <p className="hint">{t('market.requestHelp')}</p>}
    </form>
  );
}

function LookupForm({ onFind }: { onFind: (id: string) => void }) {
  const { t } = useTranslation();
  const [id, setId] = useState('');
  return (
    <form className="card stack" onSubmit={(e) => { e.preventDefault(); if (id.trim()) onFind(id.trim()); }}>
      <Field label={t('market.lookup')} hint={t('market.lookupHint')}>{(p) => <Input {...p} autoComplete="off" value={id} onChange={(e) => setId(e.target.value)} />}</Field>
      <Button type="submit" variant="secondary" icon="search">{t('market.lookupGo')}</Button>
    </form>
  );
}

const PAY_BADGE = { en_attente: 'wait', reussi: 'ok', echoue: 'bad', rembourse: 'neutral' } as const;

function PaymentView({ id, mode }: { id: string; mode: Mode }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = usePayment(id);
  const refund = useRefund();
  const [ask, setAsk] = useState(false);
  const status = q.data?.status;
  // Un paiement réussi conclut l'annonce : on recharge la liste.
  useEffect(() => { if (status === 'reussi') void qc.invalidateQueries({ queryKey: ['offers'] }); }, [status, qc]);
  const row = (label: string, value: ReactNode) => <div className="between"><span className="muted">{label}</span><b className="num">{value}</b></div>;
  // Le reçu ne porte que des numéros masqués : on peut le lire à voix haute ou le partager sans exposer personne.
  const receiptText = (p: Payment) => t('market.receiptText', { amount: fmtNum(p.receipt?.amount_xof ?? p.amount_xof), ref: p.reference, date: fmtDateTime(p.receipt?.paid_at) });
  const shareReceipt = async (p: Payment) => {
    try {
      if (navigator.share) await navigator.share({ title: t('market.receiptTitle'), text: receiptText(p) });
      else { await navigator.clipboard.writeText(receiptText(p)); toast(t('market.receiptCopied')); }
    } catch (e) {
      if ((e as { name?: string }).name !== 'AbortError') toast({ type: 'error', text: t('market.receiptFail') });
    }
  };
  return (
    <section aria-labelledby="pay-title" className={`card stack${status === 'reussi' ? ' pay-ok' : ''}`}>
      <QueryState q={q}>
        {(p: Payment) => (
          <>
            <div className="between">
              <h2 id="pay-title" className="card-title">{t('market.paymentTitle')}</h2>
              <Badge tone={PAY_BADGE[p.status]}>{t(`market.payStatus.${p.status}`)}</Badge>
            </div>
            <div role="status">
              {p.status === 'en_attente' && <div className="alert alert--info"><span className="spinner" aria-hidden /><div className="al-body">{t('market.pending')}</div></div>}
              {p.status === 'reussi' && <Alert tone="ok">{t('market.succeeded')}</Alert>}
              {p.status === 'rembourse' && <Alert>{t('market.refunded')}</Alert>}
            </div>
            {p.status === 'echoue' && <div role="alert"><Alert tone="danger" title={t('market.failedTitle')}>{t('market.failedHelp')}</Alert></div>}
            <div className="pay-sum">
              <span className="small muted">{t(mode === 'seller' ? 'market.youReceive' : 'market.amountLabel')}</span>
              <span className="pay-total">{fmtNum(p.receipt?.amount_xof ?? p.amount_xof)} FCFA</span>
              {row(t('market.payer'), p.receipt?.payer_masked ?? p.payer_masked)}
              {p.receipt && row(t('market.payee'), p.receipt.payee_masked)}
              {p.receipt && row(t('market.paidAt'), fmtDateTime(p.receipt.paid_at))}
              {row(t('market.reference'), `${p.reference} (${p.provider})`)}
            </div>
            {p.receipt && <p className="hint">{t('market.auditNote')}</p>}
            {p.receipt && (
              <div className="cluster">
                <Button variant="secondary" size="sm" icon="megaphone" onClick={() => speak(receiptText(p))}>{t('common.listen')}</Button>
                <Button variant="secondary" size="sm" icon="send" onClick={() => void shareReceipt(p)}>{t('market.shareReceipt')}</Button>
                <Button variant="secondary" size="sm" icon="printer" onClick={() => window.print()}>{t('market.print')}</Button>
              </div>
            )}
            {mode === 'admin' && p.status === 'reussi' && (
              ask ? (
                <div className="stack" style={{ ['--gap' as string]: '8px' }}>
                  <p>{t('market.refundAsk')}</p>
                  <div className="cluster">
                    <Button variant="dangerSolid" busy={refund.isPending} onClick={() => refund.mutate(p.id, { onSuccess: () => setAsk(false) })}>{t('market.refundConfirm')}</Button>
                    <Button variant="secondary" onClick={() => setAsk(false)}>{t('common.cancel')}</Button>
                  </div>
                </div>
              ) : <Button variant="danger" className="self-start" onClick={() => setAsk(true)}>{t('market.refund')}</Button>
            )}
            {refund.error && <ErrorState error={refund.error} />}
          </>
        )}
      </QueryState>
    </section>
  );
}
