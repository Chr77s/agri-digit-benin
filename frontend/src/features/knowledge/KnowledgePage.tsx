import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { KnowledgeDoc, Paginated } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, inputCls, Notice, PageHeader, QueryState, Select, fmtDateTime } from '../../shared/ui';
import { useValueChains, useVcName } from '../../shared/api/ref';

const statusL = { brouillon: 'Brouillon', relu: 'Relu', publie: 'Publié' } as const;
const statusT = { brouillon: 'neutral', relu: 'warn', publie: 'success' } as const;

export function KnowledgePage() {
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
      <PageHeader title="Fiches techniques" actions={<Button onClick={() => setEdit('new')}>Rédiger une fiche</Button>} />
      <p className="mb-4 text-muted">Seules les fiches publiées alimentent l'assistant. Circuit : brouillon, relecture, publication.</p>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-56"><Field label="Filière">{(p) => <Select {...p} value={vc} onChange={(e) => setVc(e.target.value)} placeholder="Toutes" options={(vcs.data ?? []).map((x) => ({ value: x.code, label: x.name }))} />}</Field></div>
        <div className="w-56"><Field label="Statut">{(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Tous" options={Object.entries(statusL).map(([value, label]) => ({ value, label }))} />}</Field></div>
      </div>
      {step.error && <Notice tone="error" live>{step.error.message}</Notice>}
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune fiche pour ce filtre.">Rédigez une fiche ou changez de filière.</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.map((k) => (
              <li key={k.id} className="flex flex-col gap-2 rounded border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">{k.title}</span>
                  <Badge tone={statusT[k.status]}>{statusL[k.status]}</Badge>
                  <Badge>v{k.version}</Badge>
                  {k.language !== 'fr' && <Badge tone={k.language_validation === 'valide' ? 'success' : 'warn'}>{k.language} {k.language_validation === 'valide' ? 'validé' : 'non validé'}</Badge>}
                </div>
                <p className="text-sm text-muted">{vcName(k.value_chain)}, source : {k.source}, mise à jour {fmtDateTime(k.updated_at)}</p>
                <p className="line-clamp-3">{k.body}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setEdit(k)}>Modifier (nouvelle version)</Button>
                  {k.status === 'brouillon' && <Button variant="secondary" busy={step.isPending} onClick={() => step.mutate({ id: k.id, action: 'review' })}>Marquer comme relue</Button>}
                  {k.status === 'relu' && <Button busy={step.isPending} onClick={() => step.mutate({ id: k.id, action: 'publish' })}>Publier</Button>}
                  <Button variant="ghost" onClick={() => setVersionsOf(k)}>Versions</Button>
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
  const qc = useQueryClient();
  const vcs = useValueChains();
  const [v, setV] = useState({ value_chain: doc?.value_chain ?? '', title: doc?.title ?? '', body: doc?.body ?? '', source: doc?.source ?? 'INRAB', language: doc?.language ?? 'fr' });
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => (doc ? api(`/knowledge/${doc.id}`, { method: 'PATCH', body: v }) : api('/knowledge', { method: 'POST', body: v })),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['knowledge'] }); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} title={doc ? 'Modifier la fiche' : 'Nouvelle fiche'}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!v.value_chain || !v.title || v.body.length < 20 || !v.source) { setErr('Filière, titre, source et texte (20 caractères minimum) sont obligatoires.'); return; } setErr(''); m.mutate(); }}>
        <Field label="Filière">{(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder="Choisir" options={(vcs.data ?? []).map((x) => ({ value: x.code, label: x.name }))} />}</Field>
        <Field label="Titre">{(p) => <input {...p} className={inputCls} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <Field label="Texte de la fiche">{(p) => <textarea {...p} className={`${inputCls} min-h-40 py-2`} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />}</Field>
        <Field label="Source">{(p) => <input {...p} className={inputCls} value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })} />}</Field>
        <Field label="Langue" error={err}>{(p) => <Select {...p} value={v.language} onChange={(e) => setV({ ...v, language: e.target.value as KnowledgeDoc['language'] })} options={[{ value: 'fr', label: 'Français' }, { value: 'fon', label: 'Fon (non validé)' }, { value: 'bba', label: 'Bariba (non validé)' }]} />}</Field>
        {m.error && <Notice tone="error" live>{m.error.message}</Notice>}
        <Button type="submit" busy={m.isPending}>Enregistrer la fiche</Button>
      </form>
    </Dialog>
  );
}

function Versions({ doc, onClose }: { doc: KnowledgeDoc; onClose: () => void }) {
  const q = useQuery({ queryKey: ['knowledge', doc.id, 'versions'], queryFn: async () => rows(await api<Paginated<Record<string, unknown>> | Record<string, unknown>[]>(`/knowledge/${doc.id}/versions`)) });
  return (
    <Dialog open onClose={onClose} title={`Versions : ${doc.title}`}>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Une seule version." />}>
        {(d) => <ol className="flex flex-col gap-2">{d.map((x, i) => <li key={String(x.id ?? i)} className="rounded border border-border p-2"><strong>v{String(x.version ?? '')}</strong> {String(x.title ?? '')} <span className="text-sm text-muted">{x.updated_at || x.created_at ? fmtDateTime(String(x.updated_at ?? x.created_at)) : ''}</span></li>)}</ol>}
      </QueryState>
    </Dialog>
  );
}
