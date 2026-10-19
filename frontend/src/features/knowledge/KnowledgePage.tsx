import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs, rows } from '../../shared/api/client';
import type { KnowledgeDoc, Paginated } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Chips, Dialog, EmptyState, Field, Icon, Input, PageHeader, QueryState, Select, Textarea, fmtDate, fmtDateTime } from '../../shared/ui';
import { useValueChains, useVcName, vcSelect } from '../../shared/api/ref';
import '../dashboard/pilotage.css';

const STATUS_TONE = { brouillon: 'draft', relu: 'wait', publie: 'ok' } as const;
// Plusieurs sources dans le champ `source` du serveur (500 caractères) : séparées par « ; ».
const SEP = ' ; ';
const splitSources = (s: string) => s.split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean);

/** Fiches techniques (maquette pilotage/fiches) : liste filtrable, éditeur, relecture par une autre personne, publication. */
export function KnowledgePage() {
  const { t } = useTranslation();
  const [vc, setVc] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [current, setCurrent] = useState<KnowledgeDoc | 'new' | null>(null);
  const vcs = useValueChains();
  const vcName = useVcName();
  const q = useQuery({ queryKey: ['knowledge', vc, status[0] ?? ''], queryFn: async () => rows(await api<Paginated<KnowledgeDoc> | KnowledgeDoc[]>(`/knowledge${qs({ value_chain: vc, status: status[0] ?? '', page_size: 100 })}`)) });

  return (
    <div className="pv">
      <PageHeader title={t('nav.knowledge')} desc={t('knowledge.intro')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.knowledge') }]}
        actions={<Button icon="plus" onClick={() => setCurrent('new')}>{t('knowledge.write')}</Button>} />
      <div className="split">
        <section className="card stack" style={{ '--gap': '14px' } as React.CSSProperties} aria-labelledby="kn-list">
          <div className="between">
            <h2 className="card-title" id="kn-list">{t('knowledge.listTitle', { n: q.data?.length ?? '…' })}</h2>
          </div>
          <div className="cluster" style={{ alignItems: 'end' }}>
            <div style={{ minWidth: 200 }}><Field label={t('common.valueChain')}>{(p) => <Select {...p} value={vc} onChange={(e) => setVc(e.target.value)} placeholder={t('common.allF')} {...vcSelect(vcs.data)} />}</Field></div>
            <Chips single label={t('common.status')} value={status} onChange={setStatus} options={(['brouillon', 'relu', 'publie'] as const).map((s) => ({ value: s, label: t(`knowledge.status.${s}`) }))} />
          </div>
          <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState icon="book" title={t('knowledge.empty')}>{t('knowledge.emptyHelp')}</EmptyState>}>
            {(d) => (
              <ul className="list">
                {d.map((k) => (
                  <li key={k.id}>
                    <button type="button" className="list-item w-full text-left" aria-current={current !== 'new' && current?.id === k.id ? 'true' : undefined} onClick={() => setCurrent(k)}>
                      <span className="li-main">
                        <span className="li-title">{k.title}</span>
                        <span className="li-meta">{vcName(k.value_chain)} · {t('knowledge.updated', { date: fmtDate(k.updated_at) })}</span>
                      </span>
                      <span className="li-end">
                        {k.language !== 'fr' && <Badge tone={k.language_validation === 'valide' ? 'ok' : 'warn'}>{t(`ag.lang.${k.language}`, { defaultValue: k.language })} · {k.language_validation === 'valide' ? t('knowledge.validated') : t('lang.notValidated')}</Badge>}
                        <Badge tone={STATUS_TONE[k.status]}>{t(`knowledge.status.${k.status}`)}</Badge>
                        <span className="num small muted">{t('knowledge.versionShort', { n: k.version })}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </section>
        <aside className="sticky-side">
          {current === null
            ? <div className="card"><EmptyState icon="edit" title={t('knowledge.pick')}>{t('knowledge.pickText')}</EmptyState></div>
            : <Editor key={current === 'new' ? 'new' : `${current.id}-${current.version}`} doc={current === 'new' ? null : current} onSaved={setCurrent} />}
        </aside>
      </div>
    </div>
  );
}

function Editor({ doc, onSaved }: { doc: KnowledgeDoc | null; onSaved: (d: KnowledgeDoc) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const vcs = useValueChains();
  const [v, setV] = useState({ value_chain: doc?.value_chain ?? '', title: doc?.title ?? '', body: doc?.body ?? '', language: doc?.language ?? 'fr' });
  const [sources, setSources] = useState<string[]>(() => (doc ? splitSources(doc.source) : ['INRAB']));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState(false);
  const done = (d: KnowledgeDoc) => { void qc.invalidateQueries({ queryKey: ['knowledge'] }); onSaved(d); };
  const save = useMutation({
    mutationFn: () => {
      const body = { ...v, source: sources.map((s) => s.trim()).filter(Boolean).join(SEP) };
      return doc ? api<KnowledgeDoc>(`/knowledge/${doc.id}`, { method: 'PATCH', body }) : api<KnowledgeDoc>('/knowledge', { method: 'POST', body });
    },
    onSuccess: done,
  });
  const step = useMutation({ mutationFn: (action: 'review' | 'publish') => api<KnowledgeDoc>(`/knowledge/${doc!.id}/${action}`, { method: 'POST', body: {} }), onSuccess: done });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.value_chain) er.value_chain = t('knowledge.errVc');
    if (v.title.trim().length < 3) er.title = t('knowledge.errTitle');
    if (v.body.trim().length < 20) er.body = t('knowledge.errBody');
    const joined = sources.map((s) => s.trim()).filter(Boolean).join(SEP);
    if (!joined) er.source = t('knowledge.errSource');
    else if (joined.length > 500) er.source = t('knowledge.errSourceLong');
    setErrs(er);
    if (!Object.keys(er).length) save.mutate();
  };
  const sub = !doc ? t('knowledge.newSub')
    : doc.status === 'brouillon' ? t('knowledge.subDraft', { n: doc.version })
      : t(doc.status === 'relu' ? 'knowledge.subReviewed' : 'knowledge.subPublished', { n: doc.version, next: doc.version + 1, date: doc.reviewed_at ? fmtDate(doc.reviewed_at) : '—', name: doc.reviewed_by_name ?? '—' });
  return (
    <Card title={doc ? t('knowledge.editTitle') : t('knowledge.newTitle')} sub={sub} actions={doc && <Badge tone={STATUS_TONE[doc.status]}>{t(`knowledge.status.${doc.status}`)}</Badge>}>
      <form noValidate className="stack" style={{ '--gap': '14px' } as React.CSSProperties} onSubmit={submit}>
        <div className="form-grid">
          <Field label={t('common.valueChain')} required error={errs.value_chain}>{(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder={t('common.choose')} {...vcSelect(vcs.data)} />}</Field>
          <Field label={t('knowledge.language')}>{(p) => <Select {...p} value={v.language} onChange={(e) => setV({ ...v, language: e.target.value as KnowledgeDoc['language'] })} options={[{ value: 'fr', label: 'Français' }, { value: 'fon', label: `Fon (${t('lang.notValidated')})` }, { value: 'bba', label: `Bariba (${t('lang.notValidated')})` }]} />}</Field>
        </div>
        <Field label={t('knowledge.titleLabel')} required error={errs.title}>{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <Field label={t('knowledge.body')} required hint={t('knowledge.bodyHint')} error={errs.body}>{(p) => <Textarea {...p} rows={10} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />}</Field>
        <fieldset className="fieldset stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <legend className="label">{t('knowledge.sources')} <span className="req" aria-hidden>*</span></legend>
          {sources.map((s, i) => (
            <div key={i} className="cluster" style={{ '--gap': '6px', flexWrap: 'nowrap' } as React.CSSProperties}>
              <Input aria-label={t('knowledge.sourceN', { n: i + 1 })} value={s} aria-invalid={errs.source ? true : undefined} onChange={(e) => setSources(sources.map((x, k) => (k === i ? e.target.value : x)))} />
              {sources.length > 1 && <Button variant="ghost" size="sm" iconOnly aria-label={t('knowledge.removeSource', { n: i + 1 })} onClick={() => setSources(sources.filter((_, k) => k !== i))}><Icon name="x" /></Button>}
            </div>
          ))}
          {errs.source && <p className="error-msg" role="alert"><Icon name="alert" />{errs.source}</p>}
          <div><Button variant="ghost" size="sm" icon="plus" onClick={() => setSources([...sources, ''])}>{t('knowledge.addSource')}</Button></div>
        </fieldset>
        {(save.error || step.error) && <Alert tone="danger" live>{(save.error ?? step.error)!.message}</Alert>}
        <div className="cluster justify-end">
          {doc && <Button variant="ghost" onClick={() => setVersions(true)}>{t('knowledge.versionsN', { n: doc.version })}</Button>}
          <Button type="submit" variant={doc && doc.status !== 'brouillon' ? 'secondary' : 'primary'} busy={save.isPending}>{doc ? t('knowledge.saveVersion') : t('knowledge.save')}</Button>
          {doc?.status === 'brouillon' && <Button variant="secondary" busy={step.isPending} onClick={() => step.mutate('review')}>{t('knowledge.markReviewed')}</Button>}
          {doc?.status === 'relu' && <Button busy={step.isPending} onClick={() => step.mutate('publish')}>{t('knowledge.publish')}</Button>}
        </div>
        {doc?.status === 'brouillon' && <p className="hint">{t('knowledge.secondReader')}</p>}
      </form>
      {doc && versions && <Versions doc={doc} onClose={() => setVersions(false)} />}
    </Card>
  );
}

function Versions({ doc, onClose }: { doc: KnowledgeDoc; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['knowledge', doc.id, 'versions'], queryFn: async () => rows(await api<Paginated<Record<string, unknown>> | Record<string, unknown>[]>(`/knowledge/${doc.id}/versions`)) });
  return (
    <Dialog open onClose={onClose} title={t('knowledge.versionsTitle', { title: doc.title })}>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('knowledge.oneVersion')} />}>
        {(d) => (
          <ol className="list">
            {d.map((x, i) => (
              <li key={String(x.id ?? i)} className="list-item">
                <span className="li-main">
                  <span className="li-title">{t('knowledge.versionShort', { n: String(x.version ?? '') })} · {String(x.title ?? '')}</span>
                  <span className="li-meta">{x.status ? t(`knowledge.status.${String(x.status)}`, { defaultValue: String(x.status) }) : ''}{x.created_at ? ` · ${fmtDateTime(String(x.created_at))}` : ''}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </QueryState>
    </Dialog>
  );
}
