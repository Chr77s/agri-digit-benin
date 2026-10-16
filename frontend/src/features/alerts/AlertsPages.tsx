import { VcOptions } from '../../shared/ui/VcOptions';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDateTime } from '../../shared/ui';
import type { Alert, AlertCategory, OutboxMessage, SendResult, Severity } from '../../shared/api/types';
import { useDepartments, usePlaceName, useValueChains } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { useAlertActions, useAlerts, useOutbox } from './api';

const sevTone = (s: Severity) => (s === 'urgent' ? 'error' : s === 'avertissement' ? 'warn' : 'neutral');

export function AlertsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const q = useAlerts();
  const a = useAlertActions();
  const deps = useDepartments();
  const vcs = useValueChains();
  const place = usePlaceName();
  const [v, setV] = useState({ title: '', message: '', category: 'ravageur' as AlertCategory, severity: 'avertissement' as Severity, department: user?.department ?? '', communes: [] as string[], value_chains: [] as string[] });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, SendResult>>({});
  const communes = deps.data?.find((d) => d.code === v.department || d.name === v.department)?.communes ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.title.trim()) er.title = t('alerts.errTitle');
    if (v.message.trim().length < 10) er.message = t('alerts.errMessage');
    if (!v.department) er.department = t('alerts.errDepartment');
    setErrs(er);
    if (!Object.keys(er).length) a.create.mutate(v, { onSuccess: () => setV({ ...v, title: '', message: '' }) });
  };

  return (
    <>
      <PageHeader title={t('nav.alerts')} />
      <form onSubmit={submit} noValidate className="mb-6 grid gap-3 rounded border border-border bg-surface p-4 md:grid-cols-2">
        <h2 className="text-xl font-semibold md:col-span-2">{t('alerts.new')}</h2>
        <Field label={t('alerts.titleLabel')} error={errs.title}>{(p) => <input {...p} className={inputCls} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <Field label={t('alerts.category')}>{(p) => <Select {...p} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as AlertCategory })} options={(['meteo', 'ravageur', 'programme', 'marche'] as const).map((c) => ({ value: c, label: t(`alerts.cat.${c}`) }))} />}</Field>
        <div className="md:col-span-2"><Field label={t('alerts.message')} hint={t('alerts.messageHint', { n: v.message.length })} error={errs.message}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />}</Field></div>
        <Field label={t('alerts.severityLabel')} hint={v.severity === 'urgent' ? t('alerts.urgentHint') : undefined}>{(p) => <Select {...p} value={v.severity} onChange={(e) => setV({ ...v, severity: e.target.value as Severity })} options={(['info', 'avertissement', 'urgent'] as const).map((s) => ({ value: s, label: t(`alerts.severity.${s}`) }))} />}</Field>
        <Field label={t('common.department')} error={errs.department}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, communes: [] })} placeholder={t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label={t('alerts.communes')}>{(p) => <select {...p} multiple className={`${inputCls} h-28`} value={v.communes} onChange={(e) => setV({ ...v, communes: Array.from(e.target.selectedOptions, (o) => o.value) })}>{communes.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>}</Field>
        <Field label={t('alerts.valueChains')}>{(p) => <select {...p} multiple className={`${inputCls} h-28`} value={v.value_chains} onChange={(e) => setV({ ...v, value_chains: Array.from(e.target.selectedOptions, (o) => o.value) })}><VcOptions vcs={vcs.data} /></select>}</Field>
        <div className="md:col-span-2 flex flex-col gap-2" aria-live="polite">
          {a.create.error && <Notice tone="error">{a.create.error.message}</Notice>}
          {a.create.isSuccess && <Notice tone="success">{a.create.data.status === 'en_attente_validation' ? t('alerts.savedPending') : t('alerts.saved')}</Notice>}
          <Button type="submit" busy={a.create.isPending} className="self-start">{t('alerts.save')}</Button>
        </div>
      </form>
      {(a.approve.error || a.send.error) && <Notice tone="error" live>{(a.approve.error ?? a.send.error)?.message}</Notice>}
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('alerts.empty')}>{t('alerts.emptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.map((al: Alert) => {
              const res = results[al.id] ?? (al.stats && al.stats.sent !== undefined ? (al.stats as SendResult) : undefined);
              const canApprove = al.status === 'en_attente_validation' && al.created_by !== user?.id && al.created_by !== user?.phone;
              const canSend = al.status !== 'en_attente_validation' && al.status !== 'envoyee' && !res;
              return (
                <li key={al.id} className="flex flex-col gap-2 rounded border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{al.title}</span>
                    <Badge tone={sevTone(al.severity)}>{t(`alerts.severity.${al.severity}`, al.severity)}</Badge>
                    <Badge>{t(`alerts.status.${al.status}`, al.status)}</Badge>
                  </div>
                  <p>{al.message}</p>
                  <p className="text-sm text-muted">{place(al.department)}{al.communes.length ? `, ${al.communes.map(place).join(', ')}` : ''}{al.created_at ? `, ${fmtDateTime(al.created_at)}` : ''}</p>
                  <div className="flex flex-wrap gap-2">
                    {canApprove && <Button variant="secondary" busy={a.approve.isPending && a.approve.variables === al.id} onClick={() => a.approve.mutate(al.id)}>{t('alerts.approve')}</Button>}
                    {al.status === 'en_attente_validation' && !canApprove && <p className="text-sm text-warn">{t('alerts.needOther')}</p>}
                    {canSend && <Button busy={a.send.isPending && a.send.variables === al.id} onClick={() => a.send.mutate(al.id, { onSuccess: (r) => setResults((x) => ({ ...x, [al.id]: r })) })}>{t('alerts.send')}</Button>}
                  </div>
                  <div aria-live="polite">
                    {(res || al.status === 'envoyee') && <Notice tone="success">{res ? t('alerts.sentStats', { sent: res.sent, delivered: res.delivered, failed: res.failed }) : t('alerts.sent')}</Notice>}
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

const outTone: Record<string, 'success' | 'error' | 'neutral'> = { livre: 'success', echoue: 'error', lu: 'neutral' };

export function OutboxPage() {
  const { t } = useTranslation();
  const [channel, setChannel] = useState('sms');
  const q = useOutbox(channel);
  return (
    <>
      <PageHeader title={t('nav.outbox')} />
      <Notice tone="warn">{t('alerts.simNotice')}</Notice>
      <div className="my-4 w-64"><Field label={t('alerts.channel')}>{(p) => <Select {...p} value={channel} onChange={(e) => setChannel(e.target.value)} options={[{ value: 'sms', label: t('alerts.sms') }, { value: 'voice', label: t('alerts.voice') }]} />}</Field></div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('alerts.outEmpty')}>{t('alerts.outEmptyHelp')}</EmptyState>}>
        {(d) => (
          <Table<OutboxMessage> caption={t('alerts.outCaption')} data={d} rowKey={(r) => r.id} exportName="boite-envoi" columns={[
            { key: 'created_at', label: t('common.date'), render: (r) => fmtDateTime(r.created_at) },
            { key: 'to', label: t('alerts.recipient') },
            { key: 'body', label: t('alerts.messageCol') },
            { key: 'segments', label: t('alerts.segments'), render: (r) => `${r.segments} (${r.encoding})` },
            { key: 'status', label: t('common.status'), render: (r) => <Badge tone={outTone[r.status] ?? 'neutral'}>{t(`alerts.outStatus.${r.status}`, r.status)}</Badge> },
          ]} />
        )}
      </QueryState>
    </>
  );
}
