import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Avatar, Badge, Button, Chips, Dialog, EmptyState, Field, Icon, Input, PageHeader, PhoneInput, QueryState, Select, Table, Tabs, Textarea, Timeline, buttonCls, fmtDate, fmtDateTime, fmtNum, toast } from '../../shared/ui';
import type { Parcel, Producer, ProducerStatus, ProducerVersion } from '../../shared/api/types';
import { list } from '../../shared/api/client';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { useSupports } from '../supports/SupportsPage';
import { useProducer, useProducerActions, useProducers, useProducerVersions } from './api';
import { daysSince, LATE_DAYS } from './AgentHome';
import './agent.css';

const tone = (s: ProducerStatus) => (s === 'valide' ? 'ok' : s === 'rejete' ? 'bad' : 'wait');

export function StatusBadge({ s }: { s: ProducerStatus }) {
  const { t } = useTranslation();
  return <Badge tone={tone(s)}>{t(`status.${s}`)}</Badge>;
}

/** NPI masqué dans les listes : seuls les 4 derniers chiffres. */
const maskNpi = (npi?: string) => (npi ? `•••• ${npi.slice(-4)}` : '');

export function ProducersListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState('en_attente');
  const [commune, setCommune] = useState('');
  const [age, setAge] = useState('');
  const q = useProducers({ status });
  const place = usePlaceName();
  const deps = useDepartments();
  const communes = deps.data?.find((d) => d.code === user?.department)?.communes ?? deps.data?.flatMap((d) => d.communes) ?? [];
  const filtered = (d: Producer[]) => d.filter((p) => (!commune || p.commune === commune)
    && (!age || (age === 'late' ? daysSince(p.created_at) > LATE_DAYS : daysSince(p.created_at) <= LATE_DAYS)));
  const clear = () => { setCommune(''); setAge(''); };
  const filters = (
    <>
      <Chips single label={t('producers.filterStatus')} value={[status]} onChange={(v) => setStatus(v[0])}
        options={[{ value: 'en_attente', label: t('producers.filter.pending') }, { value: 'valide', label: t('producers.filter.valid') }, { value: 'rejete', label: t('producers.filter.rejected') }]} />
      <div className="field min-w-[180px]"><label className="sr-only" htmlFor="f-com">{t('common.commune')}</label>
        <Select id="f-com" value={commune} onChange={(e) => setCommune(e.target.value)} placeholder={t('ag.prod.allCommunes')} options={communes.map((c) => ({ value: c.code, label: c.name }))} /></div>
      <div className="field min-w-[180px]"><label className="sr-only" htmlFor="f-age">{t('ag.prod.age')}</label>
        <Select id="f-age" value={age} onChange={(e) => setAge(e.target.value)} placeholder={t('ag.prod.allAges')} options={[{ value: 'late', label: t('ag.prod.ageLate', { n: LATE_DAYS }) }, { value: 'recent', label: t('ag.prod.ageRecent', { n: LATE_DAYS }) }]} /></div>
    </>
  );
  return (
    <>
      <PageHeader title={t('producers.listTitle')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.producers') }]} desc={t('ag.prod.listDesc')}
        actions={<Link to="/inscription" className={buttonCls()}><Icon name="plus" />{t('producers.register')}</Link>} />
      <QueryState q={q}>
        {(all) => {
          const d = filtered(all);
          if (!d.length) return (
            <div className="stack">
              <div className="cluster">{filters}</div>
              <div className="card"><EmptyState title={t('producers.empty')} action={(commune || age) ? <Button variant="secondary" onClick={clear}>{t('ag.prod.clear')}</Button> : undefined}>{t('producers.emptyHelp')}</EmptyState></div>
            </div>
          );
          return (
            <Table<Producer>
              caption={t('ag.prod.caption')}
              rowKey={(r) => r.id}
              data={d}
              exportName="producteurs"
              toolbar={filters}
              columns={[
                { key: 'last_name', label: t('common.producer'), csv: (r) => `${r.first_name} ${r.last_name} (${r.code})`, render: (r) => (
                  <Link style={{ flexDirection: 'column', alignItems: 'flex-start' }} to={`/producteurs/${r.id}`}><span className="cell-main">{r.first_name} {r.last_name}</span><span className="cell-sub num">{r.code} · NPI {maskNpi(r.npi)}</span></Link>
                ) },
                { key: 'commune', label: t('common.commune'), render: (r) => place(r.commune), csv: (r) => place(r.commune) },
                { key: 'status', label: t('common.status'), render: (r) => r.status === 'en_attente'
                  ? <Badge tone="wait">{t('ag.prod.pendingDays', { count: daysSince(r.created_at) })}</Badge> : <StatusBadge s={r.status} /> },
                { key: 'created_at', label: t('producers.registeredOn'), num: true, render: (r) => fmtDate(r.created_at) },
                { key: 'act', label: t('common.action'), actions: true, render: (r) => <Link className={buttonCls({ variant: 'secondary', size: 'sm' })} to={`/producteurs/${r.id}`}>{r.status === 'en_attente' ? t('ag.prod.instruct') : t('ag.home.open')}</Link> },
              ]}
            />
          );
        }}
      </QueryState>
    </>
  );
}

const REJECT_TYPES = ['duplicate', 'npi', 'outside', 'incomplete'] as const;
const VERSION_FIELDS = ['first_name', 'last_name', 'phone', 'npi', 'sex', 'birth_date', 'department', 'commune', 'language'] as const;

export function ProducerDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id = '' } = useParams();
  const q = useProducer(id);
  const place = usePlaceName();
  const versions = useProducerVersions(id);
  const parcels = useQuery({ queryKey: ['parcels', { producer: id }], queryFn: () => list<Parcel>(`/parcels?producer=${id}`) });
  const supports = useSupports(id);
  const a = useProducerActions(id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rType, setRType] = useState<string>(REJECT_TYPES[0]);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');

  return (
    <QueryState q={q}>
      {(p) => {
        const name = `${p.first_name} ${p.last_name}`;
        const checks = [
          { ok: !!p.npi, text: p.npi ? t('ag.prod.chkNpi') : t('ag.prod.chkNoNpi') },
          { ok: !!p.phone, text: t('ag.prod.chkPhone') },
          { ok: !user?.department || p.department === user.department, text: t('ag.prod.chkSector', { dep: place(p.department) }) },
          { ok: (parcels.data?.length ?? 0) > 0, text: parcels.isLoading ? t('common.loadingDots') : t('ag.prod.chkParcels', { count: parcels.data?.length ?? 0 }) },
        ];
        return (
          <>
            <div className="page-head">
              <div>
                <nav className="crumbs" aria-label={t('ui.crumbs')}><ol><li><Link to="/">{t('nav.home')}</Link></li><li><Link to="/producteurs">{t('nav.producers')}</Link></li><li><span aria-current="page">{name}</span></li></ol></nav>
                <div className="who">
                  <Avatar name={name} size="lg" />
                  <div>
                    <h1 className="page-title">{name}</h1>
                    <div className="cluster mt-1"><StatusBadge s={p.status} /><span className="small muted num">{t('ag.prod.headLine', { code: p.code, date: fmtDate(p.created_at) })}</span></div>
                  </div>
                </div>
              </div>
              <div className="page-actions">
                <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>{t('producers.edit')}</Button>
                {p.status === 'valide'
                  ? <Link to={`/producteurs/${p.id}/carte`} className={buttonCls({ variant: 'ghost' })}><Icon name="id-card" />{t('producers.card')}</Link>
                  : <span className={`${buttonCls({ variant: 'ghost' })} opacity-60`} aria-disabled="true"><Icon name="id-card" />{t('ag.prod.cardAfter')}</span>}
              </div>
            </div>

            <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
              {(a.validate.error || a.reject.error) && <Alert tone="danger" live title={t('ag.prod.saveFailed')}>{(a.validate.error ?? a.reject.error)?.message}</Alert>}
              <div className="split">
                <section className="card" aria-label={t('ag.prod.dossier')}>
                  <Tabs label={t('ag.prod.dossier')} tabs={[
                    { id: 'id', label: t('ag.prod.tabIdentity'), content: (
                      <dl className="dl">
                        <dt>{t('common.code')}</dt><dd className="num">{p.code}</dd>
                        <dt>{t('producers.npi')}</dt><dd className="num">{p.npi} <Badge tone="sim">{t('ag.prod.anipSim')}</Badge></dd>
                        <dt>{t('register.sex')}</dt><dd>{p.sex === 'F' ? t('register.female') : t('register.male')}</dd>
                        <dt>{t('producers.birth')}</dt><dd className="num">{fmtDate(p.birth_date)}</dd>
                        <dt>{t('common.department')}</dt><dd>{place(p.department)}</dd>
                        <dt>{t('common.commune')}</dt><dd>{place(p.commune)}</dd>
                        <dt>{t('register.phone')}</dt><dd className="num">+229 {p.phone}</dd>
                        <dt>{t('producers.language')}</dt><dd>{t(`ag.lang.${p.language}`, p.language)}</dd>
                        <dt>{t('producers.registeredOn')}</dt><dd className="num">{fmtDateTime(p.created_at)}</dd>
                        <dt>{t('producers.validatedOn')}</dt><dd className={p.validated_at ? 'num' : 'muted'}>{p.validated_at ? fmtDateTime(p.validated_at) : t('ag.prod.notYet')}</dd>
                        {p.reject_reason && <><dt>{t('producers.rejectReason')}</dt><dd>{p.reject_reason}</dd></>}
                      </dl>
                    ) },
                    { id: 'parcels', label: t('ag.prod.tabParcels'), count: parcels.data?.length, content: (
                      <QueryState q={parcels} empty={(d) => d.length === 0} emptyText={<p className="muted">{t('ag.prod.noParcel')}</p>}>
                        {(d) => (
                          <ul className="list">
                            {d.map((x) => (
                              <li key={x.id} className="list-item"><span className="li-icon"><Icon name="parcel" /></span>
                                <span className="li-main"><span className="li-title">{x.name}</span><span className="li-meta num">{t('ag.prod.parcelMeta', { ha: fmtNum(x.area_ha, 2) })}</span></span>
                                {x.overlap_warning && <span className="li-end"><Badge tone="wait" icon="alert">{t('ag.prod.overlap')}</Badge></span>}</li>
                            ))}
                          </ul>
                        )}
                      </QueryState>
                    ) },
                    { id: 'supports', label: t('nav.supports'), count: supports.data?.length, content: (
                      <QueryState q={supports} empty={(d) => d.length === 0} emptyText={<p className="muted">{p.status === 'valide' ? t('ag.prod.noSupport') : t('ag.prod.noSupportYet')}</p>}>
                        {(d) => (
                          <ul className="list">
                            {d.map((s) => (
                              <li key={s.id} className="list-item"><span className="li-icon"><Icon name="gift" /></span>
                                <span className="li-main"><span className="li-title">{s.item}, {fmtNum(Number(s.quantity), 2)} {t(`supports.unit.${s.unit}`, s.unit)}</span><span className="li-meta num">{t('supports.value', { v: fmtNum(s.value_xof) })}</span></span>
                                <span className="li-end"><Badge tone={s.status === 'confirme' ? 'ok' : 'wait'}>{t(`supports.status.${s.status}`)}</Badge></span></li>
                            ))}
                          </ul>
                        )}
                      </QueryState>
                    ) },
                    { id: 'history', label: t('ag.prod.tabHistory'), count: versions.data?.length, content: (
                      <QueryState q={versions} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('producers.noVersion')}>{t('producers.noVersionHelp')}</EmptyState>}>
                        {(vs) => <Timeline items={[...vs].reverse().map((v, i, arr) => versionItem(v, arr[i + 1], t))} />}
                      </QueryState>
                    ) },
                  ]} />
                </section>

                <aside className="card decision" aria-labelledby="h-dec">
                  <h2 className="card-title" id="h-dec">{t('ag.prod.decisionTitle')}</h2>
                  <p className="card-sub mb-3">{t('ag.prod.checksSub')}</p>
                  <ul className="checklist">
                    {checks.map((c) => <li key={c.text}><Icon name={c.ok ? 'check-circle' : 'alert'} className={c.ok ? 'ok' : 'ko'} /><span>{c.text}</span></li>)}
                  </ul>
                  <div className="stack mt-4" style={{ '--gap': '10px' } as React.CSSProperties} aria-live="polite">
                    {p.status === 'valide' && <Alert tone="ok" title={t('ag.prod.validTitle')}>{t('ag.prod.validText')}</Alert>}
                    {p.status === 'rejete' && <Alert tone="danger" title={t('ag.prod.rejectedTitle')}>{p.reject_reason && t('producers.rejectReason') + ' : ' + p.reject_reason}</Alert>}
                    {p.status !== 'valide' && <Button block icon="check" busy={a.validate.isPending} onClick={() => a.validate.mutate(undefined, { onSuccess: () => toast({ title: t('ag.prod.validTitle'), text: t('producers.validated') }) })}>{t('producers.validate')}</Button>}
                    {p.status !== 'rejete' && <Button block variant="danger" onClick={() => { setReasonErr(''); setRejectOpen(true); }}>{t('ag.prod.rejectWith')}</Button>}
                  </div>
                  <p className="hint mt-3">{t('ag.prod.decisionHint')}</p>
                </aside>
              </div>
            </div>

            <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title={t('ag.prod.rejectTitle', { name })}
              footer={<><Button variant="ghost" onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button><Button type="submit" form="f-reject" variant="dangerSolid" busy={a.reject.isPending}>{t('producers.rejectConfirm')}</Button></>}>
              <form id="f-reject" noValidate className="stack" onSubmit={(e) => {
                e.preventDefault();
                if (reason.trim().length < 5) { setReasonErr(t('producers.errReason')); return; }
                a.reject.mutate(`${t(`ag.prod.reject.${rType}`)}. ${reason.trim()}`, { onSuccess: () => { setRejectOpen(false); setReason(''); toast(t('producers.rejected')); } });
              }}>
                <p className="muted">{t('ag.prod.rejectIntro')}</p>
                <Field label={t('ag.prod.rejectType')}>{(fp) => <Select {...fp} value={rType} onChange={(e) => setRType(e.target.value)} options={REJECT_TYPES.map((r) => ({ value: r, label: t(`ag.prod.reject.${r}`) }))} />}</Field>
                <Field label={t('producers.rejectLabel')} error={reasonErr}>
                  {(fp) => <Textarea {...fp} value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(''); }} />}
                </Field>
                {a.reject.error && <Alert tone="danger" live>{a.reject.error.message}</Alert>}
              </form>
            </Dialog>

            <EditDialog open={editOpen} onClose={() => setEditOpen(false)} p={p} onSaved={() => { setEditOpen(false); toast(t('producers.saved')); }} />
          </>
        );
      }}
    </QueryState>
  );
}

/** Une version de la fiche : auteur, date et champs modifiés par rapport à la version précédente. */
function versionItem(v: ProducerVersion, prev: ProducerVersion | undefined, t: (k: string, o?: Record<string, unknown>) => string) {
  const data = (v.data ?? {}) as Record<string, unknown>;
  const before = (prev?.data ?? {}) as Record<string, unknown>;
  const changed = prev ? VERSION_FIELDS.filter((k) => k in data && String(data[k] ?? '') !== String(before[k] ?? '')) : [];
  return {
    state: 'done' as const,
    time: [v.created_at ? fmtDateTime(String(v.created_at)) : '', v.changed_by ? String(v.changed_by) : ''].filter(Boolean).join(' · '),
    title: `${t('producers.version', { n: String(v.version ?? '') })}${v.reason ? ` : ${String(v.reason)}` : ''}`,
    text: changed.length ? (
      <div className="diff">{changed.map((k) => <span key={k}>{t(`ag.prod.field.${k}`)} : <del className="num">{String(before[k] ?? '')}</del> <ins className="num">{String(data[k] ?? '')}</ins></span>)}</div>
    ) : undefined,
  };
}

function EditDialog({ open, onClose, p, onSaved }: { open: boolean; onClose: () => void; p: Producer; onSaved: () => void }) {
  const { t } = useTranslation();
  const a = useProducerActions(p.id);
  const [v, setV] = useState({ first_name: p.first_name, last_name: p.last_name, phone: p.phone });
  return (
    <Dialog open={open} onClose={onClose} title={t('producers.edit')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-edit" busy={a.patch.isPending}>{t('producers.saveFix')}</Button></>}>
      <form id="f-edit" className="stack" onSubmit={(e) => { e.preventDefault(); a.patch.mutate(v, { onSuccess: onSaved }); }}>
        <div className="form-grid">
          <Field label={t('register.firstName')}>{(fp) => <Input {...fp} value={v.first_name} onChange={(e) => setV({ ...v, first_name: e.target.value })} />}</Field>
          <Field label={t('register.lastName')}>{(fp) => <Input {...fp} value={v.last_name} onChange={(e) => setV({ ...v, last_name: e.target.value })} />}</Field>
        </div>
        <Field label={t('register.phone')} hint={t('ag.prod.versionHint')}>{(fp) => <PhoneInput {...fp} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />}</Field>
        {a.patch.error && <Alert tone="danger" live>{a.patch.error.message}</Alert>}
      </form>
    </Dialog>
  );
}
