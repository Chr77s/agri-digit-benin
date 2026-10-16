import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, Table, fmtDate, fmtDateTime } from '../../shared/ui';
import type { Producer, ProducerStatus } from '../../shared/api/types';
import { usePlaceName } from '../../shared/api/ref';
import { useProducer, useProducerActions, useProducers, useProducerVersions } from './api';

const tone = (s: ProducerStatus) => (s === 'valide' ? 'success' : s === 'rejete' ? 'error' : 'warn');

export function StatusBadge({ s }: { s: ProducerStatus }) {
  const { t } = useTranslation();
  return <Badge tone={tone(s)}>{t(`status.${s}`)}</Badge>;
}

export function ProducersListPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('en_attente');
  const q = useProducers({ status });
  const place = usePlaceName();
  return (
    <>
      <PageHeader title={t('producers.listTitle')} actions={<Link to="/inscription" className="inline-flex min-h-touch items-center rounded border border-brand px-4 font-semibold text-brand">{t('producers.register')}</Link>} />
      <div className="mb-4 w-full sm:w-64">
        <Field label={t('producers.filterStatus')}>
          {(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)} placeholder={t('common.all')} options={[{ value: 'en_attente', label: t('producers.filter.pending') }, { value: 'valide', label: t('producers.filter.valid') }, { value: 'rejete', label: t('producers.filter.rejected') }]} />}
        </Field>
      </div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('producers.empty')}>{t('producers.emptyHelp')}</EmptyState>}>
        {(d) => (
          <Table<Producer>
            caption={t('nav.producers')}
            rowKey={(r) => r.id}
            data={d}
            exportName="producteurs"
            columns={[
              { key: 'code', label: t('common.code'), render: (r) => <Link className="font-semibold text-brand underline" to={`/producteurs/${r.id}`}>{r.code}</Link> },
              { key: 'last_name', label: t('common.name'), render: (r) => `${r.first_name} ${r.last_name}`, csv: (r) => `${r.first_name} ${r.last_name}` },
              { key: 'commune', label: t('common.commune'), render: (r) => place(r.commune), csv: (r) => place(r.commune) },
              { key: 'status', label: t('common.status'), render: (r) => <StatusBadge s={r.status} /> },
              { key: 'created_at', label: t('producers.registeredOn'), render: (r) => fmtDate(r.created_at) },
            ]}
          />
        )}
      </QueryState>
    </>
  );
}

export function ProducerDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const q = useProducer(id);
  const place = usePlaceName();
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
              [t('common.code'), p.code], [t('producers.npi'), p.npi], [t('register.sex'), p.sex === 'F' ? t('register.female') : t('register.male')], [t('producers.birth'), fmtDate(p.birth_date)],
              [t('common.department'), place(p.department)], [t('common.commune'), place(p.commune)], [t('register.phone'), p.phone], [t('producers.language'), p.language],
              [t('producers.registeredOn'), fmtDateTime(p.created_at)], [t('producers.validatedOn'), fmtDateTime(p.validated_at)],
            ].map(([k, v]) => (<div key={k}><dt className="text-sm text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>))}
            <div><dt className="text-sm text-muted">{t('common.status')}</dt><dd><StatusBadge s={p.status} /></dd></div>
            {p.reject_reason && <div><dt className="text-sm text-muted">{t('producers.rejectReason')}</dt><dd>{p.reject_reason}</dd></div>}
          </dl>
          {(a.validate.error || a.reject.error) && <Notice tone="error" live>{(a.validate.error ?? a.reject.error)?.message}</Notice>}
          <div className="mb-6 flex flex-wrap gap-2">
            {p.status !== 'valide' && <Button busy={a.validate.isPending} onClick={() => a.validate.mutate(undefined, { onSuccess: () => setMsg(t('producers.validated')) })}>{t('producers.validate')}</Button>}
            {p.status !== 'rejete' && <Button variant="danger" onClick={() => setRejectOpen(true)}>{t('producers.reject')}</Button>}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>{t('producers.edit')}</Button>
            {p.status === 'valide' && <Link to={`/producteurs/${p.id}/carte`} className="inline-flex min-h-touch items-center rounded border border-brand px-4 font-semibold text-brand">{t('producers.card')}</Link>}
          </div>

          <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title={t('producers.rejectTitle')}>
            <form className="flex flex-col gap-3" onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim().length < 5) { setReasonErr(t('producers.errReason')); return; }
              a.reject.mutate(reason.trim(), { onSuccess: () => { setRejectOpen(false); setMsg(t('producers.rejected')); } });
            }}>
              <Field label={t('producers.rejectLabel')} error={reasonErr}>
                {(fp) => <textarea {...fp} className={`${inputCls} min-h-24 py-2`} value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(''); }} />}
              </Field>
              <Button type="submit" variant="danger" busy={a.reject.isPending}>{t('producers.rejectConfirm')}</Button>
            </form>
          </Dialog>

          <EditDialog open={editOpen} onClose={() => setEditOpen(false)} p={p} onSaved={() => { setEditOpen(false); setMsg(t('producers.saved')); }} />

          <h2 className="mb-2 text-xl font-semibold">{t('producers.history')}</h2>
          <QueryState q={versions} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('producers.noVersion')}>{t('producers.noVersionHelp')}</EmptyState>}>
            {(vs) => (
              <ol className="flex flex-col gap-2">
                {vs.map((v, i) => (
                  <li key={String(v.id ?? i)} className="rounded border border-border bg-surface p-3">
                    <p className="font-semibold">{t('producers.version', { n: String(v.version ?? vs.length - i) })} {v.created_at ? t('producers.versionOn', { date: fmtDateTime(String(v.created_at)) }) : ''} {v.changed_by ? t('producers.versionBy', { who: String(v.changed_by) }) : ''}</p>
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
  const { t } = useTranslation();
  const a = useProducerActions(p.id);
  const [v, setV] = useState({ first_name: p.first_name, last_name: p.last_name, phone: p.phone });
  return (
    <Dialog open={open} onClose={onClose} title={t('producers.edit')}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); a.patch.mutate(v, { onSuccess: onSaved }); }}>
        {(['first_name', 'last_name', 'phone'] as const).map((k) => (
          <Field key={k} label={{ first_name: t('register.firstName'), last_name: t('register.lastName'), phone: t('register.phone') }[k]}>
            {(fp) => <input {...fp} className={inputCls} value={v[k]} inputMode={k === 'phone' ? 'numeric' : undefined} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}
          </Field>
        ))}
        {a.patch.error && <Notice tone="error" live>{a.patch.error.message}</Notice>}
        <Button type="submit" busy={a.patch.isPending}>{t('producers.saveFix')}</Button>
      </form>
    </Dialog>
  );
}
