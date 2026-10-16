import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { AuditLog, Paginated } from '../../shared/api/types';
import { EmptyState, Field, inputCls, PageHeader, QueryState, Table, fmtDateTime } from '../../shared/ui';

export function AuditPage() {
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const q = useQuery({ queryKey: ['audit', action, actor], queryFn: async () => rows(await api<Paginated<AuditLog> | AuditLog[]>(`/audit-logs${qs({ action, actor, page_size: 100 })}`)) });
  return (
    <>
      <PageHeader title="Journal d'audit" />
      <p className="mb-4 text-muted">Lecture seule. Le journal n'est pas modifiable (qui, quoi, quand, sur quelle donnée).</p>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-56"><Field label="Action">{(p) => <input {...p} className={inputCls} value={action} onChange={(e) => setAction(e.target.value)} />}</Field></div>
        <div className="w-56"><Field label="Acteur (téléphone)">{(p) => <input {...p} className={inputCls} inputMode="numeric" value={actor} onChange={(e) => setActor(e.target.value)} />}</Field></div>
      </div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune entrée pour ces filtres." />}>
        {(d) => (
          <Table<AuditLog> caption="Journal d'audit" data={d} rowKey={(r) => r.id} exportName="journal-audit" pageSize={20} columns={[
            { key: 'at', label: 'Date', render: (r) => fmtDateTime(r.at) },
            { key: 'actor_phone', label: 'Acteur' },
            { key: 'actor_role', label: 'Rôle' },
            { key: 'action', label: 'Action' },
            { key: 'object_type', label: 'Objet', render: (r) => `${r.object_type} ${r.object_id ?? ''}` },
            { key: 'details', label: 'Détails', sortable: false, render: (r) => <span className="text-sm">{typeof r.details === 'string' ? r.details : JSON.stringify(r.details)}</span>, csv: (r) => JSON.stringify(r.details) },
          ]} />
        )}
      </QueryState>
    </>
  );
}
