import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { useValueChains, useVcName, vcSelect } from '../../shared/api/ref';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, QueryState, Select, Textarea, fmtDateTime, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

interface Batch { batch: string; title: string; source: string; value_chain: string; created_at: string; chunks: number; status: { brouillon: number; relu: number; publie: number } }
type Action = 'review' | 'publish' | 'delete';

/** Documents de l'assistant : un fichier (PDF, Word, texte) est découpé en extraits en brouillon ; une autre personne les relit, puis on publie. */
export function ImportPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vcs = useValueChains();
  const vcName = useVcName();
  const [file, setFile] = useState<File | null>(null);
  const [chain, setChain] = useState('general');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const sel = vcSelect(vcs.data);
  const batches = useQuery({ queryKey: ['knowledge-batches'], queryFn: () => api<Batch[]>('/knowledge/batches') });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['knowledge-batches'] }); void qc.invalidateQueries({ queryKey: ['knowledge'] }); };
  const upload = useMutation({
    mutationFn: () => {
      const f = new FormData();
      f.append('file', file!);
      f.append('value_chain', chain);
      if (title.trim()) f.append('title', title.trim());
      if (source.trim()) f.append('source', source.trim());
      return api<{ chunks: number }>('/knowledge/import', { method: 'POST', form: f });
    },
    onSuccess: (r) => {
      toast(t('assistantDocs.imported', { count: r.chunks }));
      setFile(null); setTitle(''); setSource('');
      if (fileRef.current) fileRef.current.value = '';
      refresh();
    },
  });
  const act = useMutation({
    mutationFn: ({ batch, action }: { batch: string; action: Action }) => (action === 'delete'
      ? api<void>(`/knowledge/batches/${batch}`, { method: 'DELETE' })
      : api<unknown>(`/knowledge/batches/${batch}/${action}`, { method: 'POST', body: {} })),
    onSuccess: refresh,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr(t('assistantDocs.errFile')); return; }
    setErr('');
    upload.mutate();
  };

  return (
    <section className="card stack" style={{ '--gap': '14px', marginBottom: 20 } as React.CSSProperties} aria-labelledby="ad-title">
      <div>
        <h2 className="card-title" id="ad-title">{t('assistantDocs.title')}</h2>
        <p className="small muted">{t('assistantDocs.intro')}</p>
      </div>
      <form noValidate className="stack" style={{ '--gap': '12px' } as React.CSSProperties} onSubmit={submit}>
        <div className="form-grid">
          <Field label={t('assistantDocs.file')} required error={err} hint={t('assistantDocs.fileHint')}>
            {(p) => <input {...p} ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(''); }} />}
          </Field>
          <Field label={t('common.valueChain')}>
            {(p) => <Select {...p} value={chain} onChange={(e) => setChain(e.target.value)} options={[{ value: 'general', label: t('assistantDocs.general') }, ...sel.options]} groups={sel.groups} />}
          </Field>
          <Field label={t('assistantDocs.docTitle')} optional>{(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />}</Field>
          <Field label={t('assistantDocs.source')} optional hint={t('assistantDocs.sourceHint')}>{(p) => <Input {...p} value={source} onChange={(e) => setSource(e.target.value)} maxLength={500} />}</Field>
        </div>
        {upload.error && <Alert tone="danger" live>{upload.error.message}</Alert>}
        <div className="cluster justify-end"><Button type="submit" icon="upload" busy={upload.isPending}>{t('assistantDocs.add')}</Button></div>
      </form>
      <QueryState q={batches} empty={(d) => d.length === 0} emptyText={<EmptyState icon="book" title={t('assistantDocs.empty')}>{t('assistantDocs.emptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="list">
            {d.map((b) => (
              <li key={b.batch} className="list-item">
                <span className="li-main">
                  <span className="li-title">{b.title}</span>
                  <span className="li-meta">{vcName(b.value_chain)} · {t('assistantDocs.chunks', { count: b.chunks })} · {fmtDateTime(b.created_at)}</span>
                  <span className="cluster" style={{ '--gap': '6px' } as React.CSSProperties}>
                    {b.status.brouillon > 0 && <Badge tone="draft">{t('assistantDocs.nDraft', { count: b.status.brouillon })}</Badge>}
                    {b.status.relu > 0 && <Badge tone="wait">{t('assistantDocs.nReviewed', { count: b.status.relu })}</Badge>}
                    {b.status.publie > 0 && <Badge tone="ok">{t('assistantDocs.nPublished', { count: b.status.publie })}</Badge>}
                  </span>
                </span>
                <span className="li-end cluster">
                  {b.status.brouillon > 0 && <Button size="sm" variant="secondary" busy={act.isPending} onClick={() => act.mutate({ batch: b.batch, action: 'review' })}>{t('assistantDocs.review')}</Button>}
                  {b.status.relu > 0 && <Button size="sm" busy={act.isPending} onClick={() => act.mutate({ batch: b.batch, action: 'publish' })}>{t('assistantDocs.publish')}</Button>}
                  {b.status.publie === 0 && <Button size="sm" variant="ghost" icon="trash" aria-label={t('assistantDocs.deleteNamed', { title: b.title })} busy={act.isPending} onClick={() => act.mutate({ batch: b.batch, action: 'delete' })}>{t('assistantDocs.delete')}</Button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      {act.error && <Alert tone="danger" live>{act.error.message}</Alert>}
      <p className="hint">{t('assistantDocs.secondReader')}</p>
    </section>
  );
}

/** Nom et personnalité du chatbot (administrateur seulement) : les règles de sécurité ne se règlent pas ici. */
export function PersonaCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin_maep';
  const q = useQuery({ queryKey: ['assistant-profile', 'admin'], enabled: isAdmin, queryFn: () => api<{ name: string; persona: string; default_persona: string }>('/assistant/profile') });
  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [errs, setErrs] = useState<{ name?: string; persona?: string }>({});
  useEffect(() => { if (q.data) { setName(q.data.name); setPersona(q.data.persona); } }, [q.data]);
  const save = useMutation({
    mutationFn: () => api<unknown>('/assistant/profile', { method: 'PUT', body: { name: name.trim(), persona: persona.trim() } }),
    onSuccess: () => { toast(t('assistantDocs.personaSaved')); void qc.invalidateQueries({ queryKey: ['assistant-profile'] }); },
  });
  if (!isAdmin) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof errs = {};
    if (name.trim().length < 2) er.name = t('assistantDocs.errName');
    if (persona.trim().length < 20) er.persona = t('assistantDocs.errPersona');
    setErrs(er);
    if (!Object.keys(er).length) save.mutate();
  };
  return (
    <Card title={t('assistantDocs.personaTitle')} sub={t('assistantDocs.personaSub')}>
      <form noValidate className="stack" style={{ '--gap': '12px' } as React.CSSProperties} onSubmit={submit}>
        <Field label={t('assistantDocs.botName')} required error={errs.name}>{(p) => <Input {...p} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label={t('assistantDocs.persona')} required hint={t('assistantDocs.personaHint')} error={errs.persona}>
          {(p) => <Textarea {...p} rows={6} maxLength={1500} value={persona} onChange={(e) => setPersona(e.target.value)} />}
        </Field>
        {save.error && <Alert tone="danger" live>{save.error.message}</Alert>}
        <div className="cluster justify-end">
          {q.data && <Button variant="ghost" onClick={() => setPersona(q.data.default_persona)}>{t('assistantDocs.restore')}</Button>}
          <Button type="submit" busy={save.isPending}>{t('assistantDocs.savePersona')}</Button>
        </div>
      </form>
    </Card>
  );
}
