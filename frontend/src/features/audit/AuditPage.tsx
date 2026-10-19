import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs } from '../../shared/api/client';
import type { AuditLog, Paginated } from '../../shared/api/types';
import { Alert, Button, Dialog, EmptyState, Field, Icon, Input, PageHeader, QueryState, Select, Table } from '../../shared/ui';
import '../dashboard/pilotage.css';

/** Types d'objet inscrits au journal (nom de modèle côté serveur, ou valeur posée par l'action). */
const OBJECTS = ['Producer', 'dataset', 'User', 'partner', 'Payment', 'KnowledgeDoc', 'Parcel', 'Application', 'Support'];

/** L'API renvoie `next` sous forme d'URL absolue : seul le paramètre `cursor` nous intéresse. */
function cursorOf(next: string | null): string | undefined {
  if (!next) return undefined;
  try { return new URL(next, window.location.origin).searchParams.get('cursor') ?? undefined; } catch { return undefined; }
}

const fmtSec = (s: string) => new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

/** Résumé lisible des détails : « clé : valeur » ; le motif d'un export est cité tel quel. */
function summary(d: unknown): string {
  if (d === null || d === undefined) return '';
  if (typeof d !== 'object') return String(d);
  return Object.entries(d as Record<string, unknown>).map(([k, v]) => `${k} : ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ');
}

export function AuditPage() {
  const { t } = useTranslation();
  const empty = { action: '', actor: '', object_type: '', from: '', to: '' };
  const [f, setF] = useState(empty);
  const [open, setOpen] = useState<AuditLog | null>(null);
  const q = useInfiniteQuery({
    queryKey: ['audit', f],
    initialPageParam: '',
    queryFn: ({ pageParam }) => api<Paginated<AuditLog>>(`/audit-logs${qs({ ...f, cursor: pageParam })}`),
    getNextPageParam: (last) => cursorOf(last.next),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const objLabel = (o: string) => t(`pilotage.audit.obj.${o}`, { defaultValue: o });
  return (
    <div className="pv">
      <PageHeader title={t('nav.audit')} crumbs={[{ label: t('pilotage.crumbGov') }, { label: t('nav.audit') }]} desc={t('pilotage.audit.desc')} />
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <Alert tone="ok" icon="shield-check" title={t('pilotage.audit.appendTitle')}>{t('pilotage.audit.appendText')}</Alert>
        <form className="card card--flat grid-fit" style={{ '--min': '200px', '--gap': '12px 16px', alignItems: 'end' } as React.CSSProperties} role="search" aria-label={t('pilotage.audit.filters')} onSubmit={(e) => e.preventDefault()}>
          <Field label={t('common.action')}>{(p) => <Input {...p} className="mono" placeholder={t('pilotage.audit.actionPh')} value={f.action} onChange={set('action')} />}</Field>
          <Field label={t('audit.actorPhone')}>{(p) => <Input {...p} className="input-num" inputMode="numeric" maxLength={10} placeholder="01…" value={f.actor} onChange={(e) => setF({ ...f, actor: e.target.value.replace(/\D/g, '') })} />}</Field>
          <Field label={t('audit.object')}>{(p) => <Select {...p} value={f.object_type} onChange={set('object_type')} placeholder={t('common.all')} options={OBJECTS.map((o) => ({ value: o, label: objLabel(o) }))} />}</Field>
          <Field label={t('pilotage.audit.from')}>{(p) => <Input {...p} type="date" value={f.from} max={f.to || undefined} onChange={set('from')} />}</Field>
          <Field label={t('pilotage.audit.to')}>{(p) => <Input {...p} type="date" value={f.to} min={f.from || undefined} onChange={set('to')} />}</Field>
          <Button variant="ghost" disabled={JSON.stringify(f) === JSON.stringify(empty)} onClick={() => setF(empty)}>{t('pilotage.audit.clear')}</Button>
        </form>
        <QueryState q={q} empty={(d) => d.pages.every((pg) => pg.results.length === 0)} emptyText={<EmptyState icon="scroll" title={t('audit.empty')} />}>
          {(d) => {
            const list = d.pages.flatMap((pg) => pg.results);
            return (
              <>
                <Table<AuditLog> title={t('pilotage.audit.entries')} caption={t('pilotage.audit.caption')} data={list} rowKey={(r) => r.id} exportName="journal-audit" pageSize={20}
                  toolbar={<span className="small muted inline-flex items-center gap-2"><Icon name="lock" />{t('pilotage.audit.readOnly')}</span>}
                  columns={[
                    { key: 'at', label: t('common.date'), num: true, render: (r) => fmtSec(r.at) },
                    { key: 'actor_phone', label: t('audit.actor'), num: true, render: (r) => r.actor_phone || '—' },
                    { key: 'actor_role', label: t('admin.role'), render: (r) => t(`roles.${r.actor_role}`, { defaultValue: r.actor_role }) },
                    { key: 'action', label: t('common.action'), render: (r) => <span className="mono">{r.action}</span> },
                    { key: 'object_type', label: t('audit.object'), render: (r) => `${objLabel(r.object_type)} ${r.object_id ?? ''}` },
                    { key: 'details', label: t('audit.details'), sortable: false, render: (r) => <span className="small">{summary(r.details)}</span>, csv: (r) => JSON.stringify(r.details) },
                    { key: 'open', label: t('pilotage.audit.detail'), actions: true, render: (r) => <Button size="sm" variant="ghost" onClick={() => setOpen(r)}>{t('pilotage.audit.detail')}</Button> },
                  ]} />
                {q.hasNextPage && <Button variant="secondary" className="self-start" busy={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>{t('pilotage.audit.more')}</Button>}
              </>
            );
          }}
        </QueryState>
      </div>
      {open && (
        <Dialog open onClose={() => setOpen(null)} title={t('pilotage.audit.entryTitle')}>
          <dl className="dl mb-3">
            <dt>{t('common.date')}</dt><dd className="num">{fmtSec(open.at)}</dd>
            <dt>{t('audit.actor')}</dt><dd>{open.actor_phone || '—'} · {t(`roles.${open.actor_role}`, { defaultValue: open.actor_role })}</dd>
            <dt>{t('common.action')}</dt><dd className="mono">{open.action}</dd>
            <dt>{t('audit.object')}</dt><dd>{objLabel(open.object_type)} {open.object_id}</dd>
            <dt>{t('pilotage.audit.id')}</dt><dd className="mono">{open.id}</dd>
          </dl>
          <pre className="code-block">{JSON.stringify(open.details, null, 2)}</pre>
        </Dialog>
      )}
    </div>
  );
}
