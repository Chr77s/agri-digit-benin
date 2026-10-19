import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Checkbox, Chips, Dialog, EmptyState, Field, Icon, Input, PageHeader, QueryState, Select, Stat, Table, Textarea, buttonCls, fmtDateTime, fmtNum, speak, toast } from '../../shared/ui';
import type { Alert as AlertT, AlertCategory, OutboxMessage, SendResult, Severity } from '../../shared/api/types';
import { useDepartments, usePlaceName, useValueChains, useVcName } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { useAlertActions, useAlerts, useOutbox } from './api';
import '../producers/agent.css';
import { PhoneSimulator } from '../ussd/PhoneSimulator';

// Alphabet GSM 03.38 (base + extension). Un seul caractère hors alphabet fait passer tout le SMS en UCS-2.
const GSM = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
const GSM_EXT = /[\^{}\\[~\]|€]/g;

/** Encodage et nombre de segments d'un SMS (les caractères d'extension GSM comptent double). */
export function smsInfo(text: string) {
  const gsm = GSM.test(text);
  const length = gsm ? text.length + (text.match(GSM_EXT)?.length ?? 0) : text.length;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
  return { gsm, length, single, multi, segments };
}
/** Découpe d'aperçu, segment par segment (approximation : un caractère d'extension compte pour un). */
const chunks = (text: string, size: number, n: number) => (n <= 1 ? [text] : Array.from({ length: n }, (_, i) => text.slice(i * size, (i + 1) * size)));

const CATEGORIES = ['ravageur', 'meteo', 'programme', 'marche'] as const;
const SEVERITIES = ['info', 'avertissement', 'urgent'] as const;
const DRAFT_KEY = 'agent-alert-draft';
type Draft = { title: string; message: string; category: AlertCategory; severity: Severity; department: string; communes: string[]; value_chains: string[] };

function readDraft(): Partial<Draft> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<Draft>; } catch { return {}; }
}

const sevTone = (s: Severity) => (s === 'urgent' ? 'urgent' : 'neutral');
type Bucket = 'pending' | 'ready' | 'sent';
const bucket = (a: AlertT): Bucket => (a.status === 'en_attente_validation' ? 'pending' : a.status === 'envoyee' ? 'sent' : 'ready');

export function AlertsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const q = useAlerts();
  const a = useAlertActions();
  const deps = useDepartments();
  const vcs = useValueChains();
  const vcName = useVcName();
  const place = usePlaceName();
  const empty: Draft = { title: '', message: '', category: 'ravageur', severity: 'avertissement', department: user?.department ?? '', communes: [], value_chains: [] };
  const [v, setV] = useState<Draft>(() => ({ ...empty, ...readDraft() }));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, SendResult>>({});
  const [filter, setFilter] = useState<string[]>([]);
  const [approving, setApproving] = useState<AlertT | null>(null);
  const [reread, setReread] = useState(false);
  const communes = deps.data?.find((d) => d.code === v.department || d.name === v.department)?.communes ?? [];
  const sms = smsInfo(v.message);
  const mine = (by?: string) => by !== undefined && (by === user?.id || by === user?.phone);

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch { /* stockage indisponible : pas de brouillon */ } }, [v]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.title.trim()) er.title = t('alerts.errTitle');
    if (v.message.trim().length < 10) er.message = t('alerts.errMessage');
    if (!v.department) er.department = t('alerts.errDepartment');
    setErrs(er);
    if (Object.keys(er).length) return;
    a.create.mutate(v, {
      onSuccess: (r) => {
        setV({ ...v, title: '', message: '' });
        toast(r.status === 'en_attente_validation' ? { title: t('ag.alerts.urgentSavedTitle'), text: t('ag.alerts.urgentSavedText') } : t('alerts.saved'));
      },
    });
  };
  const toggleCommune = (c: string) => setV({ ...v, communes: v.communes.includes(c) ? v.communes.filter((x) => x !== c) : [...v.communes, c] });
  const errCount = Object.keys(errs).length;

  return (
    <>
      <PageHeader title={t('nav.alerts')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.alerts') }]} desc={t('ag.alerts.desc')}
        actions={<Link className={buttonCls({ variant: 'secondary' })} to="/boite-envoi"><Icon name="send" />{t('nav.outbox')}</Link>} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <div className="split">
          <form onSubmit={submit} noValidate className="card stack" style={{ '--gap': '18px' } as React.CSSProperties} aria-labelledby="h-new">
            <div className="card-head m-0"><h2 className="card-title" id="h-new">{t('alerts.new')}</h2><Badge tone="draft" icon="edit">{t('ag.alerts.draftKept')}</Badge></div>
            {errCount > 0 && <Alert tone="danger" title={t('ag.alerts.errCount', { count: errCount })} />}
            <div className="form-grid">
              <Field label={t('alerts.titleLabel')} hint={t('ag.alerts.titleHint')} error={errs.title}>{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
              <Field label={t('alerts.category')}>{(p) => <Select {...p} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as AlertCategory })} options={CATEGORIES.map((c) => ({ value: c, label: t(`alerts.cat.${c}`) }))} />}</Field>
              <div className="span-all">
                <Field label={t('alerts.message')} error={errs.message}
                  hint={<span className="counter"><span>{t('ag.alerts.counter', { n: fmtNum(sms.length), enc: sms.gsm ? 'GSM-7' : 'UCS-2', per: sms.single })}</span><span>{t('ag.alerts.segments', { count: sms.segments })}</span></span>}>
                  {(p) => <Textarea {...p} rows={4} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />}
                </Field>
                <p className="hint mt-1">{t('ag.alerts.accentHint')}</p>
              </div>
            </div>
            <fieldset className="fieldset"><legend className="label">{t('alerts.severityLabel')}</legend>
              <div className="choice-grid">
                {SEVERITIES.map((s) => (
                  <label key={s} className="choice-card"><input className="radio" type="radio" name="sev" checked={v.severity === s} onChange={() => setV({ ...v, severity: s })} />
                    <span><b>{t(`alerts.severity.${s}`)}</b><br /><span className="small muted">{s === 'urgent' ? t('ag.alerts.sevUrgent') : t('ag.alerts.sevDirect')}</span></span></label>
                ))}
              </div>
            </fieldset>
            <div className="form-grid">
              <Field label={t('common.department')} error={errs.department}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, communes: [] })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
              <div className="field"><span className="label" id="a-fil-l">{t('common.valueChains')} <span className="opt">{t('ag.alerts.noneAll')}</span></span>
                <Chips label={t('alerts.valueChains')} value={v.value_chains} onChange={(x) => setV({ ...v, value_chains: x })}
                  options={(vcs.data ?? []).filter((c) => !c.reserve).map((c) => ({ value: c.code, label: c.name }))} /></div>
            </div>
            {communes.length > 0 && (
              <fieldset className="fieldset"><legend className="label">{t('ag.alerts.communesLegend')} <span className="opt">{t('ag.alerts.noneDep')}</span></legend>
                <div className="communes">{communes.map((c) => <Checkbox key={c.code} label={c.name} checked={v.communes.includes(c.code)} onChange={() => toggleCommune(c.code)} />)}</div>
              </fieldset>
            )}
            <Alert tone="info" icon="users" title={t('ag.alerts.targetTitle')}>
              {t('ag.alerts.targetText', { dep: place(v.department) || '…', communes: v.communes.length ? v.communes.map(place).join(', ') : t('ag.alerts.allCommunes'), vcs: v.value_chains.length ? v.value_chains.map(vcName).join(', ') : t('ag.alerts.allVcs'), count: sms.segments })}
            </Alert>
            {a.create.error && <Alert tone="danger" live>{a.create.error.message}</Alert>}
            <div className="cluster justify-end">
              <Button variant="ghost" onClick={() => { setV(empty); setErrs({}); }}>{t('ag.alerts.clear')}</Button>
              <Button type="submit" busy={a.create.isPending}>{t('alerts.save')}</Button>
            </div>
          </form>

          <aside className="stack" aria-label={t('ag.alerts.preview')}>
            <section className="card" aria-labelledby="h-prev">
              <div className="card-head"><h2 className="card-title" id="h-prev">{t('ag.alerts.previewTitle')}</h2><Badge tone="sim">{t('ag.sim')}</Badge></div>
              <div className="phone-prev">
                <div className="pp-head"><span>ATDA-ALERTE</span><span className="num">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                {v.message
                  ? chunks(v.message, sms.multi, sms.segments).map((c, i) => <div key={i} className="sms">{c}<span className="seg">{i + 1}/{sms.segments}</span></div>)
                  : <div className="sms">{t('ag.alerts.previewEmpty')}</div>}
              </div>
              <p className="hint mt-3">{t('ag.alerts.previewHint')}</p>
            </section>
            <section className="card" aria-labelledby="h-voc">
              <div className="card-head"><h2 className="card-title" id="h-voc">{t('ag.alerts.voiceTitle')}</h2><Badge tone="sim">{t('ag.alerts.voiceSim')}</Badge></div>
              <p className="small muted">{t('ag.alerts.voiceText')}</p>
              <Button variant="secondary" size="sm" icon="mic" className="mt-3" disabled={!v.message} onClick={() => speak(`${v.title}. ${v.message}`)}>{t('ag.alerts.listen')}</Button>
            </section>
          </aside>
        </div>

        <section className="card" aria-labelledby="h-hist">
          <div className="card-head">
            <h2 className="card-title" id="h-hist">{t('ag.alerts.histTitle')}</h2>
            <Chips label={t('ag.alerts.filterLabel')} value={filter} onChange={setFilter} options={(['pending', 'ready', 'sent'] as const).map((b) => ({ value: b, label: t(`ag.alerts.bucket.${b}`), count: (q.data ?? []).filter((x) => bucket(x) === b).length }))} />
          </div>
          {(a.approve.error || a.send.error) && <Alert tone="danger" live>{(a.approve.error ?? a.send.error)?.message}</Alert>}
          <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('alerts.empty')}>{t('alerts.emptyHelp')}</EmptyState>}>
            {(d) => {
              const shown = d.filter((x) => !filter.length || filter.includes(bucket(x)));
              if (!shown.length) return <p className="muted">{t('ag.alerts.noneFilter')}</p>;
              return (
                <div>
                  {shown.map((al) => {
                    const res = results[al.id] ?? (al.stats && al.stats.sent !== undefined ? (al.stats as SendResult) : undefined);
                    const pending = al.status === 'en_attente_validation';
                    const canApprove = pending && !mine(al.created_by);
                    const canSend = !pending && al.status !== 'envoyee' && !res;
                    return (
                      <article key={al.id} className="alert-item" id={`a-${al.id}`}>
                        <div className="cluster">
                          <h3 className="card-title">{al.title}</h3>
                          <Badge tone={sevTone(al.severity)}>{t(`alerts.severity.${al.severity}`, al.severity)}</Badge>
                          <Badge tone={pending ? 'wait' : 'ok'} icon={al.status === 'envoyee' ? 'send' : undefined}>{t(`alerts.status.${al.status}`, al.status)}</Badge>
                        </div>
                        <p>{al.message}</p>
                        <p className="small muted">{[t(`alerts.cat.${al.category}`, al.category), `${place(al.department)}${al.communes.length ? ` : ${al.communes.map(place).join(', ')}` : ''}`, al.value_chains.length ? al.value_chains.map(vcName).join(', ') : '', mine(al.created_by) ? t('ag.alerts.byYou') : '', al.created_at ? fmtDateTime(al.created_at) : ''].filter(Boolean).join(' · ')}</p>
                        {pending && !canApprove && <p className="small text-[color:var(--bad-ink)]">{t('alerts.needOther')}</p>}
                        {(canApprove || canSend) && (
                          <div className="cluster">
                            {canApprove && <Button size="sm" onClick={() => { setReread(false); setApproving(al); }}>{t('alerts.approve')}</Button>}
                            {canSend && <Button size="sm" icon="send" busy={a.send.isPending && a.send.variables === al.id} onClick={() => a.send.mutate(al.id, { onSuccess: (r) => setResults((x) => ({ ...x, [al.id]: r })) })}>{t('alerts.send')}</Button>}
                          </div>
                        )}
                        <div aria-live="polite">
                          {(res || al.status === 'envoyee') && (
                            <Alert tone="ok">{res ? t('alerts.sentStats', { sent: res.sent, delivered: res.delivered, failed: res.failed }) : t('alerts.sent')} <Link to="/boite-envoi">{t('ag.alerts.seeOutbox')}</Link></Alert>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              );
            }}
          </QueryState>
        </section>
      </div>

      <Dialog open={!!approving} onClose={() => setApproving(null)} title={t('ag.alerts.approveTitle')}
        footer={<><Button variant="ghost" onClick={() => setApproving(null)}>{t('common.cancel')}</Button>
          <Button disabled={!reread} busy={a.approve.isPending} onClick={() => approving && a.approve.mutate(approving.id, { onSuccess: () => { setApproving(null); toast(t('ag.alerts.approved')); } })}>{t('ag.alerts.approveConfirm')}</Button></>}>
        {approving && (
          <div className="stack">
            <p className="muted">{t('ag.alerts.approveIntro')}</p>
            <div className="card card--tint"><b>{approving.title}</b><p className="small mt-1">{approving.message}</p></div>
            <Checkbox label={t('ag.alerts.reread')} checked={reread} onChange={(e) => setReread(e.target.checked)} />
          </div>
        )}
      </Dialog>
    </>
  );
}

const OUT_BADGE: Record<string, { tone: 'ok' | 'bad' | 'neutral' | 'wait'; icon: 'check' | 'x' | 'eye' | 'clock' }> = {
  livre: { tone: 'ok', icon: 'check' }, echoue: { tone: 'bad', icon: 'x' }, lu: { tone: 'neutral', icon: 'eye' },
};

export function OutboxPage() {
  const { t } = useTranslation();
  const [channel, setChannel] = useState('sms');
  const [status, setStatus] = useState('');
  const q = useOutbox(channel);
  return (
    <>
      <PageHeader title={t('nav.outbox')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.alerts'), to: '/alertes' }, { label: t('nav.outbox') }]} desc={t('ag.out.desc')} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="warn" title={t('common.simulation')}>{t('alerts.simNotice').replace(/^Simulation : /, '')}</Alert>
        <QueryState q={q}>
          {(all) => {
            const d = all.filter((m) => !status || m.status === status);
            const count = (s: string) => all.filter((m) => m.status === s).length;
            return (
              <>
                <div className="grid-fit" style={{ '--min': '180px' } as React.CSSProperties}>
                  <Stat label={t('ag.out.delivered')} value={fmtNum(count('livre') + count('lu'))} foot={<Badge tone="sim">{t('ag.sim')}</Badge>} />
                  <Stat label={t('ag.out.failed')} value={fmtNum(count('echoue'))} foot={t('ag.out.failedFoot')} />
                  <Stat label={t('ag.out.billed')} value={fmtNum(all.reduce((s, m) => s + (m.segments ?? 0), 0))} foot={t('ag.out.billedFoot', { count: all.length })} />
                </div>
                {all.length === 0 ? (
                  <div className="card"><EmptyState title={t('alerts.outEmpty')} action={<Link className={buttonCls({ variant: 'secondary' })} to="/alertes">{t('ag.home.writeAlert')}</Link>}>{t('alerts.outEmptyHelp')}</EmptyState></div>
                ) : (
                  <Table<OutboxMessage> title={t('alerts.outCaption')} caption={t('alerts.outCaption')} data={d} rowKey={(r) => r.id} exportName="boite-envoi"
                    toolbar={<>
                      <Chips single label={t('alerts.channel')} value={[channel]} onChange={(x) => setChannel(x[0])} options={[{ value: 'sms', label: t('alerts.sms') }, { value: 'voice', label: t('alerts.voice') }]} />
                      <div className="field min-w-[180px]"><label className="sr-only" htmlFor="o-st">{t('common.status')}</label>
                        <Select id="o-st" value={status} onChange={(e) => setStatus(e.target.value)} placeholder={t('ag.out.allStatus')} options={(['livre', 'echoue', 'lu'] as const).map((s) => ({ value: s, label: t(`alerts.outStatus.${s}`) }))} /></div>
                    </>}
                    columns={[
                      { key: 'created_at', label: t('common.date'), num: true, render: (r) => fmtDateTime(r.created_at) },
                      { key: 'to', label: t('alerts.recipient'), render: (r) => <span className="num">{r.to}</span> },
                      { key: 'body', label: t('alerts.messageCol'), render: (r) => <span className="msg-cell" title={r.body}>{r.body}</span> },
                      { key: 'segments', label: t('alerts.segments'), num: true, render: (r) => `${r.segments} (${r.encoding})` },
                      { key: 'status', label: t('common.status'), render: (r) => { const b = OUT_BADGE[r.status] ?? { tone: 'wait', icon: 'clock' }; return <Badge tone={b.tone} icon={b.icon}>{t(`alerts.outStatus.${r.status}`, r.status)}</Badge>; } },
                    ]} />
                )}
              </>
            );
          }}
        </QueryState>
        <PhoneSimulator />
      </div>
    </>
  );
}
