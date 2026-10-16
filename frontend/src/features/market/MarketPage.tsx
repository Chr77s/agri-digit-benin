import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Dialog, EmptyState, ErrorState, Field, fieldError, fmtDateTime, fmtNum, inputCls, Notice, PageHeader, QueryState, Select } from '../../shared/ui';
import { useDepartments, usePlaceName, useVcName, useVcSelect } from '../../shared/api/ref';
import type { Match, Offer, OfferType } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';
import { useContact, useCreateOffer, useCreatePayment, useDecide, useMatches, usePayment, useOffers, useRefund, type OfferFilter } from './api';

type TabId = 'offers' | 'matches' | 'payment';
const TYPES: OfferType[] = ['offre', 'demande'];
const MAX_INT = 10_000_000; // bornes du serveur pour quantité et prix
const toInt = (s: string) => { const c = s.replace(/\s/g, ''); return /^\d+$/.test(c) ? Number(c) : 0; };
const matchTone = { proposee: 'warn', acceptee: 'success', refusee: 'error' } as const;

function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tb, i) => (
        <button
          key={tb.id} id={`tab-${tb.id}`} type="button" role="tab" aria-selected={tb.id === value} aria-controls={`panel-${tb.id}`}
          tabIndex={tb.id === value ? 0 : -1} onKeyDown={(e) => onKey(e, i)} onClick={() => onChange(tb.id)}
          className={`min-h-touch rounded border border-brand px-4 font-semibold ${tb.id === value ? 'bg-brand text-surface underline underline-offset-4' : 'bg-surface text-brand'}`}
        >
          {tb.label}
        </button>
      ))}
    </div>
  );
}

export function MarketPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_maep';
  const [tab, setTab] = useState<TabId>('offers');
  const [payMatch, setPayMatch] = useState('');
  const tabs: { id: TabId; label: string }[] = [
    { id: 'offers', label: t('market.tab.offers') },
    ...(isAdmin ? [] : [{ id: 'matches' as const, label: t('market.tab.matches') }]),
    { id: 'payment', label: t('market.tab.payment') },
  ];
  // Les panneaux restent montés (hidden) pour garder l'état du paiement en cours quand on change d'onglet.
  const panel = (id: TabId, children: ReactNode) => (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={tab !== id}>{children}</div>
  );
  return (
    <>
      <PageHeader title={t('market.title')} />
      <div className="mb-4"><Notice tone="warn"><strong>{t('market.banner')}</strong></Notice></div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} label={t('market.tabsLabel')} />
      {panel('offers', <OffersPanel canWrite={!isAdmin} />)}
      {!isAdmin && panel('matches', <MatchesPanel onPay={(id) => { setPayMatch(id); setTab('payment'); }} />)}
      {panel('payment', <PaymentPanel isAdmin={isAdmin} match={payMatch} onMatch={setPayMatch} />)}
    </>
  );
}

// ---- Offres et demandes ----

function OffersPanel({ canWrite }: { canWrite: boolean }) {
  const { t } = useTranslation();
  const vc = useVcSelect();
  const deps = useDepartments();
  const [f, setF] = useState<OfferFilter>({ type: '', value_chain: '', department: '' });
  const q = useOffers(f);
  const [creating, setCreating] = useState(false);
  const [contactFor, setContactFor] = useState<Offer | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-44">
          <Field label={t('market.filterType')}>{(p) => <Select {...p} value={f.type ?? ''} onChange={(e) => setF({ ...f, type: e.target.value as OfferType | '' })} placeholder={t('common.all')} options={TYPES.map((x) => ({ value: x, label: t(`market.type.${x}`) }))} />}</Field>
        </div>
        <div className="w-full sm:w-52">
          <Field label={t('common.valueChain')}>{(p) => <Select {...p} value={f.value_chain ?? ''} onChange={(e) => setF({ ...f, value_chain: e.target.value })} placeholder={t('common.all')} options={vc.options} groups={vc.groups} />}</Field>
        </div>
        <div className="w-full sm:w-52">
          <Field label={t('common.department')}>{(p) => <Select {...p} value={f.department ?? ''} onChange={(e) => setF({ ...f, department: e.target.value })} placeholder={t('common.all')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        </div>
        {canWrite && <Button onClick={() => setCreating(true)}>{t('market.create')}</Button>}
      </div>
      <div aria-live="polite" className="mb-3">{msg && <Notice tone="success">{msg}</Notice>}</div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('market.empty')}>{t('market.emptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-3">
            {d.map((o) => (
              <OfferCard key={o.id} o={o} canContact={canWrite && !o.is_mine && (o.status === 'ouverte' || o.status === 'en_relation')} onContact={() => setContactFor(o)} />
            ))}
          </ul>
        )}
      </QueryState>
      {creating && <CreateOfferDialog onClose={() => setCreating(false)} onDone={() => { setCreating(false); setMsg(t('market.created')); }} />}
      {contactFor && <ContactDialog offer={contactFor} onClose={() => setContactFor(null)} onSent={() => { setContactFor(null); setMsg(t('market.contactSent')); }} />}
    </>
  );
}

function OfferCard({ o, canContact, onContact }: { o: Offer; canContact: boolean; onContact: () => void }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const place = usePlaceName();
  return (
    <li className="flex flex-col gap-2 rounded border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={o.type === 'offre' ? 'success' : 'warn'}>{t(`market.type.${o.type}`)}</Badge>
        <Badge>{t(`market.offerStatus.${o.status}`)}</Badge>
        {o.is_mine && <Badge tone="success">{t('market.mine')}</Badge>}
      </div>
      <p className="text-lg font-semibold">{t('market.line', { vc: vcName(o.value_chain), qty: fmtNum(o.quantity_kg), price: fmtNum(o.price_xof_per_kg) })}</p>
      <p>
        {place(o.commune)} ({place(o.department)})
        {o.owner_role ? `, ${t(`market.role.${o.owner_role}`, o.owner_role)}` : ''}
      </p>
      {o.description && <p className="text-muted">{o.description}</p>}
      {canContact && <Button variant="secondary" className="self-start" onClick={onContact}>{t('market.contact')}</Button>}
    </li>
  );
}

function ContactDialog({ offer, onClose, onSent }: { offer: Offer; onClose: () => void; onSent: () => void }) {
  const { t } = useTranslation();
  const m = useContact();
  const [message, setMessage] = useState('');
  return (
    <Dialog open onClose={onClose} title={t('market.contact')}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); m.mutate({ id: offer.id, message: message.trim() }, { onSuccess: onSent }); }}>
        <p>{t('market.contactHelp')}</p>
        <Field label={t('market.message')} hint={t('market.messageHint')} error={fieldError(m.error, 'message')}>
          {(p) => <textarea {...p} rows={4} maxLength={1000} className={`${inputCls} py-2`} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
        {m.error && <ErrorState error={m.error} />}
        <Button type="submit" busy={m.isPending}>{t('market.send')}</Button>
      </form>
    </Dialog>
  );
}

function CreateOfferDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const vc = useVcSelect();
  const deps = useDepartments();
  const m = useCreateOffer();
  const [v, setV] = useState({ type: 'offre' as OfferType, value_chain: '', qty: '', price: '', department: user?.department ?? '', commune: user?.commune ?? '', description: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const communes = deps.data?.find((d) => d.code === v.department)?.communes ?? [];
  const err = (name: string) => errs[name] ?? fieldError(m.error, name);
  return (
    <Dialog open onClose={onClose} title={t('market.create')}>
      <form noValidate className="flex flex-col gap-3" onSubmit={(e) => {
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
        m.mutate({ type: v.type, value_chain: v.value_chain, quantity_kg: qty, price_xof_per_kg: price, department: v.department, commune: v.commune, description: v.description.trim() }, { onSuccess: onDone });
      }}>
        <Field label={t('market.type.label')}>{(p) => <Select {...p} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as OfferType })} options={TYPES.map((x) => ({ value: x, label: t(`market.type.${x}`) }))} />}</Field>
        <Field label={t('common.valueChain')} error={err('value_chain')}>{(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder={t('common.choose')} options={vc.options} groups={vc.groups} />}</Field>
        <Field label={t('market.quantity')} error={err('quantity_kg')}>{(p) => <input {...p} inputMode="numeric" autoComplete="off" className={inputCls} value={v.qty} onChange={(e) => setV({ ...v, qty: e.target.value })} />}</Field>
        <Field label={t('market.price')} error={err('price_xof_per_kg')}>{(p) => <input {...p} inputMode="numeric" autoComplete="off" className={inputCls} value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} />}</Field>
        <Field label={t('common.department')}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, commune: '' })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label={t('common.commune')} error={err('commune')}>{(p) => <Select {...p} value={v.commune} disabled={!v.department} onChange={(e) => setV({ ...v, commune: e.target.value })} placeholder={t('common.choose')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        <Field label={t('market.description')} error={err('description')}>{(p) => <textarea {...p} rows={3} maxLength={1000} className={`${inputCls} py-2`} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />}</Field>
        {m.error && <ErrorState error={m.error} />}
        <Button type="submit" busy={m.isPending}>{t('market.publish')}</Button>
      </form>
    </Dialog>
  );
}

// ---- Mes mises en relation ----

function MatchesPanel({ onPay }: { onPay: (matchId: string) => void }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const q = useMatches();
  const decide = useDecide();
  return (
    <>
      {decide.error && <div className="mb-3"><ErrorState error={decide.error} /></div>}
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('market.matchesEmpty')}>{t('market.matchesEmptyHelp')}</EmptyState>}>
        {(d: Match[]) => (
          <ul className="flex flex-col gap-3">
            {d.map((m) => {
              const s = m.offer_summary;
              const busy = (accept: boolean) => decide.isPending && decide.variables?.id === m.id && decide.variables.accept === accept;
              return (
                <li key={m.id} className="flex flex-col gap-2 rounded border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={matchTone[m.status]}>{t(`market.matchStatus.${m.status}`)}</Badge>
                    <Badge>{m.is_owner ? t('market.received') : t('market.sent')}</Badge>
                  </div>
                  {s && <p className="text-lg font-semibold">{t(`market.type.${s.type}`)} : {t('market.line', { vc: vcName(s.value_chain), qty: fmtNum(s.quantity_kg), price: fmtNum(s.price_xof_per_kg) })}</p>}
                  {m.message && <p>{t('market.messageLabel')} : « {m.message} »</p>}
                  {m.status === 'acceptee' && m.counterpart_phone && (
                    <p>
                      {t('market.phone')} :{' '}
                      <a className="inline-flex min-h-touch items-center font-semibold text-brand underline" href={`tel:${m.counterpart_phone}`}>{m.counterpart_phone}</a>
                    </p>
                  )}
                  {m.status === 'proposee' && <p className="text-muted">{t('market.phoneHidden')}</p>}
                  <div className="flex flex-wrap gap-2">
                    {m.is_owner && m.status === 'proposee' && (
                      <>
                        <Button disabled={decide.isPending} busy={busy(true)} onClick={() => decide.mutate({ id: m.id, accept: true })}>{t('market.accept')}</Button>
                        <Button variant="danger" disabled={decide.isPending} busy={busy(false)} onClick={() => decide.mutate({ id: m.id, accept: false })}>{t('market.refuse')}</Button>
                      </>
                    )}
                    {m.status === 'acceptee' && <Button variant="secondary" onClick={() => onPay(m.id)}>{t('market.pay')}</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </>
  );
}

// ---- Paiement ----

function PaymentPanel({ isAdmin, match, onMatch }: { isAdmin: boolean; match: string; onMatch: (id: string) => void }) {
  const [paymentId, setPaymentId] = useState<string | null>(null);
  return (
    <>
      {isAdmin ? <LookupForm onFind={setPaymentId} /> : <PayForm match={match} onMatch={onMatch} onCreated={setPaymentId} />}
      {paymentId && <PaymentView key={paymentId} id={paymentId} isAdmin={isAdmin} />}
    </>
  );
}

function PayForm({ match, onMatch, onCreated }: { match: string; onMatch: (id: string) => void; onCreated: (id: string) => void }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const matches = useMatches();
  const create = useCreatePayment();
  const accepted = (matches.data ?? []).filter((m) => m.status === 'acceptee');
  const selected = match || (accepted.length === 1 ? accepted[0].id : '');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const err = (name: string) => errs[name] ?? fieldError(create.error, name);
  if (matches.isLoading || matches.isError) return <QueryState q={matches}>{() => null}</QueryState>;
  if (accepted.length === 0) return <EmptyState title={t('market.payNoMatch')}>{t('market.payNoMatchHelp')}</EmptyState>;
  return (
    <form noValidate className="flex max-w-lg flex-col gap-3" onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      const xof = toInt(amount);
      if (!selected) er.match = t('market.errMatch');
      if (xof < 1) er.amount_xof = t('market.errAmount');
      if (!/^01\d{8}$/.test(phone)) er.payer_phone = t('market.errPhone');
      setErrs(er);
      if (Object.keys(er).length) return;
      create.mutate({ match: selected, amount_xof: xof, payer_phone: phone }, { onSuccess: (p) => { setAmount(''); onCreated(p.id); } });
    }}>
      <Field label={t('market.matchField')} error={err('match')}>
        {(p) => (
          <Select {...p} value={selected} onChange={(e) => onMatch(e.target.value)} placeholder={t('common.choose')}
            options={accepted.map((m) => ({ value: m.id, label: m.offer_summary ? `${t(`market.type.${m.offer_summary.type}`)} : ${t('market.line', { vc: vcName(m.offer_summary.value_chain), qty: fmtNum(m.offer_summary.quantity_kg), price: fmtNum(m.offer_summary.price_xof_per_kg) })}` : m.id }))} />
        )}
      </Field>
      <Field label={t('market.amount')} error={err('amount_xof')}>{(p) => <input {...p} inputMode="numeric" autoComplete="off" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
      <Field label={t('market.payerPhone')} hint={t('market.payerHint')} error={err('payer_phone')}>{(p) => <input {...p} type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value.trim())} />}</Field>
      {create.error && <ErrorState error={create.error} />}
      <Button type="submit" busy={create.isPending}>{t('market.payConfirm')}</Button>
    </form>
  );
}

function LookupForm({ onFind }: { onFind: (id: string) => void }) {
  const { t } = useTranslation();
  const [id, setId] = useState('');
  return (
    <form className="flex max-w-lg flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (id.trim()) onFind(id.trim()); }}>
      <Field label={t('market.lookup')} hint={t('market.lookupHint')}>{(p) => <input {...p} autoComplete="off" className={inputCls} value={id} onChange={(e) => setId(e.target.value)} />}</Field>
      <Button type="submit" variant="secondary">{t('market.lookupGo')}</Button>
    </form>
  );
}

function PaymentView({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = usePayment(id);
  const refund = useRefund();
  const [ask, setAsk] = useState(false);
  const status = q.data?.status;
  // Un paiement réussi conclut l'annonce : on recharge la liste.
  useEffect(() => { if (status === 'reussi') void qc.invalidateQueries({ queryKey: ['offers'] }); }, [status, qc]);
  return (
    <section aria-labelledby="pay-title" className="mt-6 flex max-w-lg flex-col gap-3">
      <h2 id="pay-title" className="text-xl font-semibold">{t('market.paymentTitle')}</h2>
      <div className="flex flex-col gap-3">
        <QueryState q={q}>
          {(p) => (
            <>
              <p>{t('market.reference')} : <strong>{p.reference}</strong> ({p.provider})</p>
              <div role="status">
                {p.status === 'en_attente' && <Notice tone="warn">{t('market.pending')}</Notice>}
                {p.status === 'reussi' && <Notice tone="success">{t('market.succeeded')}</Notice>}
                {p.status === 'rembourse' && <Notice>{t('market.refunded')}</Notice>}
                {p.status === 'echoue' && <div role="alert"><Notice tone="error">{t('market.failed')}</Notice></div>}
              </div>
              {p.receipt && (
                <dl className="grid gap-2 rounded border border-border bg-surface p-3 sm:grid-cols-2">
                  <div><dt className="text-sm text-muted">{t('market.reference')}</dt><dd className="font-semibold">{p.receipt.reference}</dd></div>
                  <div><dt className="text-sm text-muted">{t('market.amount')}</dt><dd className="font-semibold">{fmtNum(p.receipt.amount_xof)} FCFA</dd></div>
                  <div><dt className="text-sm text-muted">{t('market.payer')}</dt><dd className="font-semibold">{p.receipt.payer_masked}</dd></div>
                  <div><dt className="text-sm text-muted">{t('market.payee')}</dt><dd className="font-semibold">{p.receipt.payee_masked}</dd></div>
                  <div><dt className="text-sm text-muted">{t('market.paidAt')}</dt><dd className="font-semibold">{fmtDateTime(p.receipt.paid_at)}</dd></div>
                </dl>
              )}
              {isAdmin && p.status === 'reussi' && (
                ask ? (
                  <div className="flex flex-col gap-2">
                    <p>{t('market.refundAsk')}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="danger" busy={refund.isPending} onClick={() => refund.mutate(p.id, { onSuccess: () => setAsk(false) })}>{t('market.refundConfirm')}</Button>
                      <Button variant="secondary" onClick={() => setAsk(false)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                ) : <Button variant="danger" className="self-start" onClick={() => setAsk(true)}>{t('market.refund')}</Button>
              )}
              {refund.error && <ErrorState error={refund.error} />}
            </>
          )}
        </QueryState>
      </div>
    </section>
  );
}
