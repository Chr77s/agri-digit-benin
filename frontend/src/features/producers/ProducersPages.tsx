import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDate, fmtDateTime } from '../../shared/ui';
import type { Producer, ProducerStatus } from '../../shared/api/types';
import { useProducer, useProducerActions, useProducers, useProducerVersions } from './api';

const tone = (s: ProducerStatus) => (s === 'valide' ? 'success' : s === 'rejete' ? 'error' : 'warn');

export function StatusBadge({ s }: { s: ProducerStatus }) {
  const { t } = useTranslation();
  return <Badge tone={tone(s)}>{t(`status.${s}`)}</Badge>;
}

export function ProducersListPage() {
  const [status, setStatus] = useState('en_attente');
  const q = useProducers({ status });
  return (
    <>
      <PageHeader title="Producteurs de mon périmètre" actions={<Link to="/inscription" className="inline-flex min-h-touch items-center rounded border border-brand px-4 font-semibold text-brand">Inscrire un producteur</Link>} />
      <div className="mb-4 w-64">
        <Field label="Filtrer par statut">
          {(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Tous" options={[{ value: 'en_attente', label: 'En attente' }, { value: 'valide', label: 'Validés' }, { value: 'rejete', label: 'Rejetés' }]} />}
        </Field>
      </div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucun producteur pour ce filtre.">Changez le statut ou inscrivez un producteur.</EmptyState>}>
        {(d) => (
          <Table<Producer>
            caption="Producteurs"
            rowKey={(r) => r.id}
            data={d}
            exportName="producteurs"
            columns={[
              { key: 'code', label: 'Code', render: (r) => <Link className="font-semibold text-brand underline" to={`/producteurs/${r.id}`}>{r.code}</Link> },
              { key: 'last_name', label: 'Nom', render: (r) => `${r.first_name} ${r.last_name}`, csv: (r) => `${r.first_name} ${r.last_name}` },
              { key: 'commune', label: 'Commune' },
              { key: 'status', label: 'Statut', render: (r) => <StatusBadge s={r.status} /> },
              { key: 'created_at', label: 'Inscrit le', render: (r) => fmtDate(r.created_at) },
            ]}
          />
        )}
      </QueryState>
    </>
  );
}

export function ProducerDetailPage() {
  const { id = '' } = useParams();
  const q = useProducer(id);
  const versions = useProducerVersions(id);
  const a = useProducerActions(id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [msg, setMsg] = useState('');

  return (
    <QueryState q={q}>
      {(p) => (
        <>
          <PageHeader title={`${p.first_name} ${p.last_name}`} />
          <div aria-live="polite" className="mb-3">{msg && <Notice tone="success">{msg}</Notice>}</div>
          <dl className="mb-4 grid gap-2 rounded border border-border bg-surface p-4 md:grid-cols-2">
            {[
              ['Code', p.code], ['NPI', p.npi], ['Sexe', p.sex === 'F' ? 'Femme' : 'Homme'], ['Naissance', fmtDate(p.birth_date)],
              ['Département', p.department], ['Commune', p.commune], ['Téléphone', p.phone], ['Langue', p.language],
              ['Inscrit le', fmtDateTime(p.created_at)], ['Validé le', fmtDateTime(p.validated_at)],
            ].map(([k, v]) => (<div key={k}><dt className="text-sm text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>))}
            <div><dt className="text-sm text-muted">Statut</dt><dd><StatusBadge s={p.status} /></dd></div>
            {p.reject_reason && <div><dt className="text-sm text-muted">Motif du rejet</dt><dd>{p.reject_reason}</dd></div>}
          </dl>
          {(a.validate.error || a.reject.error) && <Notice tone="error" live>{(a.validate.error ?? a.reject.error)?.message}</Notice>}
          <div className="mb-6 flex flex-wrap gap-2">
            {p.status !== 'valide' && <Button busy={a.validate.isPending} onClick={() => a.validate.mutate(undefined, { onSuccess: () => setMsg('Fiche validée. Le producteur a été notifié.') })}>Valider la fiche</Button>}
            {p.status !== 'rejete' && <Button variant="danger" onClick={() => setRejectOpen(true)}>Rejeter</Button>}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>Corriger la fiche</Button>
          </div>

          <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title="Rejeter l'inscription">
            <form className="flex flex-col gap-3" onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim().length < 5) { setReasonErr('Expliquez le motif en une phrase (5 caractères minimum). Le producteur le recevra.'); return; }
              a.reject.mutate(reason.trim(), { onSuccess: () => { setRejectOpen(false); setMsg('Inscription rejetée. Le producteur a reçu le motif.'); } });
            }}>
              <Field label="Motif du rejet (obligatoire)" error={reasonErr}>
                {(fp) => <textarea {...fp} className={`${inputCls} min-h-24 py-2`} value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(''); }} />}
              </Field>
              <Button type="submit" variant="danger" busy={a.reject.isPending}>Confirmer le rejet</Button>
            </form>
          </Dialog>

          <EditDialog open={editOpen} onClose={() => setEditOpen(false)} p={p} onSaved={() => { setEditOpen(false); setMsg('Correction enregistrée. Une nouvelle version a été créée.'); }} />

          <h2 className="mb-2 text-xl font-semibold">Historique des versions</h2>
          <QueryState q={versions} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune version antérieure.">Chaque correction crée une version ici.</EmptyState>}>
            {(vs) => (
              <ol className="flex flex-col gap-2">
                {vs.map((v, i) => (
                  <li key={String(v.id ?? i)} className="rounded border border-border bg-surface p-3">
                    <p className="font-semibold">Version {String(v.version ?? vs.length - i)} {v.created_at ? `du ${fmtDateTime(String(v.created_at))}` : ''} {v.changed_by ? `par ${String(v.changed_by)}` : ''}</p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-sm text-muted">{JSON.stringify(v.data ?? v.snapshot ?? v.changes ?? v, null, 1)}</pre>
                  </li>
                ))}
              </ol>
            )}
          </QueryState>
        </>
      )}
    </QueryState>
  );
}

function EditDialog({ open, onClose, p, onSaved }: { open: boolean; onClose: () => void; p: Producer; onSaved: () => void }) {
  const a = useProducerActions(p.id);
  const [v, setV] = useState({ first_name: p.first_name, last_name: p.last_name, phone: p.phone });
  return (
    <Dialog open={open} onClose={onClose} title="Corriger la fiche">
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); a.patch.mutate(v, { onSuccess: onSaved }); }}>
        {(['first_name', 'last_name', 'phone'] as const).map((k) => (
          <Field key={k} label={{ first_name: 'Prénom', last_name: 'Nom', phone: 'Téléphone' }[k]}>
            {(fp) => <input {...fp} className={inputCls} value={v[k]} inputMode={k === 'phone' ? 'numeric' : undefined} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}
          </Field>
        ))}
        {a.patch.error && <Notice tone="error" live>{a.patch.error.message}</Notice>}
        <Button type="submit" busy={a.patch.isPending}>Enregistrer la correction</Button>
      </form>
    </Dialog>
  );
}
