import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, qs, rows } from '../../shared/api/client';
import type { AuditLog, Paginated } from '../../shared/api/types';
import { EmptyState, Field, inputCls, PageHeader, QueryState, Table, fmtDateTime } from '../../shared/ui';

export function AuditPage() {
  const { t } = useTranslation();
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const q = useQuery({ queryKey: ['audit', action, actor], queryFn: async () => rows(await api<Paginated<AuditLog> | AuditLog[]>(`/audit-logs${qs({ action, actor, page_size: 100 })}`)) });
  return (
    <>
      <PageHeader title={t('nav.audit')} />
      <p className="mb-4 text-muted">{t('audit.intro')}</p>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-56"><Field label={t('common.action')}>{(p) => <input {...p} className={inputCls} value={action} onChange={(e) => setAction(e.target.value)} />}</Field></div>
        <div className="w-56"><Field label={t('audit.actorPhone')}>{(p) => <input {...p} className={inputCls} inputMode="numeric" value={actor} onChange={(e) => setActor(e.target.value)} />}</Field></div>
      </div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('audit.empty')} />}>
        {(d) => (
          <Table<AuditLog> caption={t('nav.audit')} data={d} rowKey={(r) => r.id} exportName="journal-audit" pageSize={20} columns={[
            { key: 'at', label: t('common.date'), render: (r) => fmtDateTime(r.at) },
            { key: 'actor_phone', label: t('audit.actor') },
            { key: 'actor_role', label: t('admin.role') },
            { key: 'action', label: t('common.action') },
            { key: 'object_type', label: t('audit.object'), render: (r) => `${r.object_type} ${r.object_id ?? ''}` },
            { key: 'details', label: t('audit.details'), sortable: false, render: (r) => <span className="text-sm">{typeof r.details === 'string' ? r.details : JSON.stringify(r.details)}</span>, csv: (r) => JSON.stringify(r.details) },
          ]} />
        )}
      </QueryState>
    </>
  );
}
