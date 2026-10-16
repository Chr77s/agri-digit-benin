import { vcSelect } from '../../shared/api/ref';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs, rows } from '../../shared/api/client';
import type { KnowledgeDoc, Paginated } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, fmtDateTime } from '../../shared/ui';
import { useValueChains, useVcName } from '../../shared/api/ref';

const statusT = { brouillon: 'neutral', relu: 'warn', publie: 'success' } as const;

export function KnowledgePage() {
  const { t } = useTranslation();
  const [vc, setVc] = useState('');
  const [status, setStatus] = useState('');
  const vcs = useValueChains();
  const vcName = useVcName();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['knowledge', vc, status], queryFn: async () => rows(await api<Paginated<KnowledgeDoc> | KnowledgeDoc[]>(`/knowledge${qs({ value_chain: vc, status, page_size: 100 })}`)) });
  const step = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'review' | 'publish' }) => api<KnowledgeDoc>(`/knowledge/${id}/${action}`, { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  });
  const [edit, setEdit] = useState<KnowledgeDoc | 'new' | null>(null);
  const [versionsOf, setVersionsOf] = useState<KnowledgeDoc | null>(null);

  return (
    <>
      <PageHeader title={t('nav.knowledge')} actions={<Button onClick={() => setEdit('new')}>{t('knowledge.write')}</Button>} />
      <p className="mb-4 text-muted">{t('knowledge.intro')}</p>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-56"><Field label={t('common.valueChain')}>{(p) => <Select {...p} value={vc} onChange={(e) => setVc(e.target.value)} placeholder={t('common.allF')} {...vcSelect(vcs.data)} />}</Field></div>
        <div className="w-56"><Field label={t('common.status')}>{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)} placeholder={t('common.all')} options={(Object.keys(statusT) as (keyof typeof statusT)[]).map((value) => ({ value, label: t(`knowledge.status.${value}`) }))} />}</Field></div>
      </div>
      {step.error && <Notice tone="error" live>{step.error.message}</Notice>}
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('knowledge.empty')}>{t('knowledge.emptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.map((k) => (
              <li key={k.id} className="flex flex-col gap-2 rounded border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">{k.title}</span>
                  <Badge tone={statusT[k.status]}>{t(`knowledge.status.${k.status}`)}</Badge>
                  <Badge>{t('knowledge.versionShort', { n: k.version })}</Badge>
                  {k.language !== 'fr' && <Badge tone={k.language_validation === 'valide' ? 'success' : 'warn'}>{k.language} {k.language_validation === 'valide' ? t('knowledge.validated') : t('lang.notValidated')}</Badge>}
                </div>
                <p className="text-sm text-muted">{t('knowledge.meta', { vc: vcName(k.value_chain), source: k.source, date: fmtDateTime(k.updated_at) })}</p>
                <p className="line-clamp-3">{k.body}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setEdit(k)}>{t('knowledge.edit')}</Button>
                  {k.status === 'brouillon' && <Button variant="secondary" busy={step.isPending} onClick={() => step.mutate({ id: k.id, action: 'review' })}>{t('knowledge.markReviewed')}</Button>}
                  {k.status === 'relu' && <Button busy={step.isPending} onClick={() => step.mutate({ id: k.id, action: 'publish' })}>{t('knowledge.publish')}</Button>}
                  <Button variant="ghost" onClick={() => setVersionsOf(k)}>{t('knowledge.versions')}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      {edit && <EditDoc doc={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {versionsOf && <Versions doc={versionsOf} onClose={() => setVersionsOf(null)} />}
    </>
  );
}

function EditDoc({ doc, onClose }: { doc: KnowledgeDoc | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vcs = useValueChains();
  const [v, setV] = useState({ value_chain: doc?.value_chain ?? '', title: doc?.title ?? '', body: doc?.body ?? '', source: doc?.source ?? 'INRAB', language: doc?.language ?? 'fr' });
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => (doc ? api(`/knowledge/${doc.id}`, { method: 'PATCH', body: v }) : api('/knowledge', { method: 'POST', body: v })),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['knowledge'] }); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} title={doc ? t('knowledge.editTitle') : t('knowledge.newTitle')}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!v.value_chain || !v.title || v.body.length < 20 || !v.source) { setErr(t('knowledge.errFields')); return; } setErr(''); m.mutate(); }}>
        <Field label={t('common.valueChain')}>{(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder={t('common.choose')} {...vcSelect(vcs.data)} />}</Field>
        <Field label={t('knowledge.titleLabel')}>{(p) => <input {...p} className={inputCls} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <Field label={t('knowledge.body')}>{(p) => <textarea {...p} className={`${inputCls} min-h-40 py-2`} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />}</Field>
        <Field label={t('common.source')}>{(p) => <input {...p} className={inputCls} value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })} />}</Field>
        <Field label={t('knowledge.language')} error={err}>{(p) => <Select {...p} value={v.language} onChange={(e) => setV({ ...v, language: e.target.value as KnowledgeDoc['language'] })} options={[{ value: 'fr', label: 'Français' }, { value: 'fon', label: `Fon (${t('lang.notValidated')})` }, { value: 'bba', label: `Bariba (${t('lang.notValidated')})` }]} />}</Field>
        {m.error && <Notice tone="error" live>{m.error.message}</Notice>}
        <Button type="submit" busy={m.isPending}>{t('knowledge.save')}</Button>
      </form>
    </Dialog>
  );
}

function Versions({ doc, onClose }: { doc: KnowledgeDoc; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['knowledge', doc.id, 'versions'], queryFn: async () => rows(await api<Paginated<Record<string, unknown>> | Record<string, unknown>[]>(`/knowledge/${doc.id}/versions`)) });
  return (
    <Dialog open onClose={onClose} title={t('knowledge.versionsTitle', { title: doc.title })}>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('knowledge.oneVersion')} />}>
        {(d) => <ol className="flex flex-col gap-2">{d.map((x, i) => <li key={String(x.id ?? i)} className="rounded border border-border p-2"><strong>{t('knowledge.versionShort', { n: String(x.version ?? '') })}</strong> {String(x.title ?? '')} <span className="text-sm text-muted">{x.updated_at || x.created_at ? fmtDateTime(String(x.updated_at ?? x.created_at)) : ''}</span></li>)}</ol>}
      </QueryState>
    </Dialog>
  );
}
