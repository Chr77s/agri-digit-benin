import { useState } from 'react';
import { Badge, Button, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDateTime } from '../../shared/ui';
import type { Alert, AlertCategory, OutboxMessage, SendResult, Severity } from '../../shared/api/types';
import { useDepartments, useValueChains } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { useAlertActions, useAlerts, useOutbox } from './api';

const statusLabel: Record<string, string> = { brouillon: 'Brouillon', en_attente_validation: 'En attente de seconde validation', validee: 'Validée', approuvee: 'Validée', envoyee: 'Envoyée' };
const sevTone = (s: Severity) => (s === 'urgent' ? 'error' : s === 'avertissement' ? 'warn' : 'neutral');

export function AlertsPage() {
  const { user } = useAuth();
  const q = useAlerts();
  const a = useAlertActions();
  const deps = useDepartments();
  const vcs = useValueChains();
  const [v, setV] = useState({ title: '', message: '', category: 'ravageur' as AlertCategory, severity: 'avertissement' as Severity, department: user?.department ?? '', communes: [] as string[], value_chains: [] as string[] });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, SendResult>>({});
  const communes = deps.data?.find((d) => d.code === v.department || d.name === v.department)?.communes ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.title.trim()) er.title = 'Donnez un titre court, par exemple « Chenille légionnaire ».';
    if (v.message.trim().length < 10) er.message = 'Écrivez le message complet (10 caractères minimum).';
    if (!v.department) er.department = 'Choisissez le département visé.';
    setErrs(er);
    if (!Object.keys(er).length) a.create.mutate(v, { onSuccess: () => setV({ ...v, title: '', message: '' }) });
  };

  return (
    <>
      <PageHeader title="Alertes" />
      <form onSubmit={submit} noValidate className="mb-6 grid gap-3 rounded border border-border bg-surface p-4 md:grid-cols-2">
        <h2 className="text-xl font-semibold md:col-span-2">Nouvelle alerte</h2>
        <Field label="Titre" error={errs.title}>{(p) => <input {...p} className={inputCls} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <Field label="Catégorie">{(p) => <Select {...p} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as AlertCategory })} options={[{ value: 'meteo', label: 'Météo' }, { value: 'ravageur', label: 'Ravageur' }, { value: 'programme', label: 'Programme' }, { value: 'marche', label: 'Marché' }]} />}</Field>
        <div className="md:col-span-2"><Field label="Message (SMS)" hint={`${v.message.length} caractères, 160 par SMS en GSM-7`} error={errs.message}>{(p) => <textarea {...p} className={`${inputCls} py-2`} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />}</Field></div>
        <Field label="Gravité" hint={v.severity === 'urgent' ? 'Une alerte urgente doit être validée par un second agent avant envoi.' : undefined}>{(p) => <Select {...p} value={v.severity} onChange={(e) => setV({ ...v, severity: e.target.value as Severity })} options={[{ value: 'info', label: 'Information' }, { value: 'avertissement', label: 'Avertissement' }, { value: 'urgent', label: 'Urgent' }]} />}</Field>
        <Field label="Département" error={errs.department}>{(p) => <Select {...p} value={v.department} onChange={(e) => setV({ ...v, department: e.target.value, communes: [] })} placeholder="Choisir" options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label="Communes (aucune = tout le département)">{(p) => <select {...p} multiple className={`${inputCls} h-28`} value={v.communes} onChange={(e) => setV({ ...v, communes: Array.from(e.target.selectedOptions, (o) => o.value) })}>{communes.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>}</Field>
        <Field label="Filières (aucune = toutes)">{(p) => <select {...p} multiple className={`${inputCls} h-28`} value={v.value_chains} onChange={(e) => setV({ ...v, value_chains: Array.from(e.target.selectedOptions, (o) => o.value) })}>{(vcs.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>}</Field>
        <div className="md:col-span-2 flex flex-col gap-2" aria-live="polite">
          {a.create.error && <Notice tone="error">{a.create.error.message}</Notice>}
          {a.create.isSuccess && <Notice tone="success">Alerte enregistrée{a.create.data.status === 'en_attente_validation' ? ', en attente de seconde validation.' : '. Vous pouvez maintenant l’envoyer.'}</Notice>}
          <Button type="submit" busy={a.create.isPending} className="self-start">Enregistrer l'alerte</Button>
        </div>
      </form>
      {(a.approve.error || a.send.error) && <Notice tone="error" live>{(a.approve.error ?? a.send.error)?.message}</Notice>}
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune alerte.">Rédigez une alerte avec le formulaire ci-dessus.</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.map((al: Alert) => {
              const res = results[al.id];
              const canApprove = al.status === 'en_attente_validation' && al.created_by !== user?.id && al.created_by !== user?.phone;
              const canSend = al.status !== 'en_attente_validation' && al.status !== 'envoyee' && !res;
              return (
                <li key={al.id} className="flex flex-col gap-2 rounded border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{al.title}</span>
                    <Badge tone={sevTone(al.severity)}>{al.severity}</Badge>
                    <Badge>{statusLabel[al.status] ?? al.status}</Badge>
                  </div>
                  <p>{al.message}</p>
                  <p className="text-sm text-muted">{al.department}{al.communes.length ? `, ${al.communes.join(', ')}` : ''}{al.created_at ? `, ${fmtDateTime(al.created_at)}` : ''}</p>
                  <div className="flex flex-wrap gap-2">
                    {canApprove && <Button variant="secondary" busy={a.approve.isPending && a.approve.variables === al.id} onClick={() => a.approve.mutate(al.id)}>Valider (seconde validation)</Button>}
                    {al.status === 'en_attente_validation' && !canApprove && <p className="text-sm text-warn">Un autre agent ou un administrateur doit valider cette alerte urgente.</p>}
                    {canSend && <Button busy={a.send.isPending && a.send.variables === al.id} onClick={() => a.send.mutate(al.id, { onSuccess: (r) => setResults((x) => ({ ...x, [al.id]: r })) })}>Envoyer l'alerte</Button>}
                  </div>
                  <div aria-live="polite">
                    {(res || al.status === 'envoyee') && <Notice tone="success">Envoyée{res ? ` : ${res.sent} message(s), ${res.delivered} livré(s), ${res.failed} échoué(s).` : '.'} Voir la boîte d'envoi simulée.</Notice>}
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

const outStatus: Record<string, { l: string; t: 'success' | 'error' | 'neutral' }> = { livre: { l: 'Livré', t: 'success' }, echoue: { l: 'Échoué', t: 'error' }, lu: { l: 'Lu', t: 'neutral' } };

export function OutboxPage() {
  const [channel, setChannel] = useState('sms');
  const q = useOutbox(channel);
  return (
    <>
      <PageHeader title="Boîte d'envoi simulée" />
      <Notice tone="warn">Simulation : aucun SMS ni appel réel n'est envoyé. Les numéros sont masqués.</Notice>
      <div className="my-4 w-64"><Field label="Canal">{(p) => <Select {...p} value={channel} onChange={(e) => setChannel(e.target.value)} options={[{ value: 'sms', label: 'SMS' }, { value: 'voice', label: 'Vocal' }]} />}</Field></div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucun message sur ce canal.">Envoyez une alerte pour voir les messages ici.</EmptyState>}>
        {(d) => (
          <Table<OutboxMessage> caption="Messages simulés" data={d} rowKey={(r) => r.id} exportName="boite-envoi" columns={[
            { key: 'created_at', label: 'Date', render: (r) => fmtDateTime(r.created_at) },
            { key: 'to', label: 'Destinataire' },
            { key: 'body', label: 'Message' },
            { key: 'segments', label: 'Segments', render: (r) => `${r.segments} (${r.encoding})` },
            { key: 'status', label: 'Statut', render: (r) => <Badge tone={outStatus[r.status]?.t ?? 'neutral'}>{outStatus[r.status]?.l ?? r.status}</Badge> },
          ]} />
        )}
      </QueryState>
    </>
  );
}
