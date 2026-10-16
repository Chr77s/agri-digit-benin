import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { Dashboard, FarmAggregate } from '../../shared/api/types';
import { EmptyState, Field, PageHeader, QueryState, Select, Table, fmtDateTime, fmtNum } from '../../shared/ui';
import { useDepartments } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';

const val = (v: number | null, unit: string) => (v === null || v === undefined ? 'non disponible' : `${fmtNum(v, 1)}${unit ? ` ${unit}` : ''}`);

export function DashboardPage() {
  const { user } = useAuth();
  const deps = useDepartments();
  const [dep, setDep] = useState(user?.department ?? '');
  const dash = useQuery({ queryKey: ['dashboard', dep], queryFn: () => api<Dashboard>(`/dashboard${qs({ department: dep })}`) });
  const agg = useQuery({ queryKey: ['farm-agg', dep], queryFn: async () => rows(await api<FarmAggregate[]>(`/farms/aggregates${qs({ level: dep ? 'commune' : 'department', department: dep })}`)) });

  return (
    <>
      <PageHeader title="Tableau de bord" />
      <div className="mb-4 w-64">
        <Field label="Département">{(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder="Tout le Bénin" options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
      </div>
      <QueryState q={dash} empty={(d) => d.indicators.length === 0} emptyText={<EmptyState title="Aucun indicateur pour ce périmètre." />}>
        {(d) => {
          const [main, ...rest] = d.indicators;
          const scope = typeof d.scope === 'string' ? d.scope : d.scope?.name ?? 'Bénin';
          return (
            <section className="mb-6 flex flex-col gap-4" aria-label={`Indicateurs ${scope}`}>
              <div className="rounded border border-border bg-surface p-4">
                <p className="text-muted">{main.label} ({scope})</p>
                <p className="text-2xl font-semibold">{val(main.value, main.unit)}</p>
                <p className="text-sm text-muted">Source : {main.source}, mise à jour {fmtDateTime(main.updated_at)}</p>
              </div>
              {rest.length > 0 && (
                <Table caption="Autres indicateurs" data={rest} rowKey={(r) => r.key} exportName="indicateurs" columns={[
                  { key: 'label', label: 'Indicateur' },
                  { key: 'value', label: 'Valeur', render: (r) => val(r.value, r.unit), csv: (r) => r.value ?? 'non disponible' },
                  { key: 'source', label: 'Source' },
                  { key: 'updated_at', label: 'Mise à jour', render: (r) => fmtDateTime(r.updated_at) },
                ]} />
              )}
            </section>
          );
        }}
      </QueryState>
      <h2 className="mb-2 text-xl font-semibold">Fermes du POC par {dep ? 'commune' : 'département'}</h2>
      <QueryState q={agg} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucune donnée POC pour ce périmètre." />}>
        {(d) => (
          <Table<FarmAggregate> caption="Agrégats des fermes POC par commune" data={d} rowKey={(r) => r.name} exportName="fermes-par-commune" columns={[
            { key: 'name', label: dep ? 'Commune' : 'Département' },
            { key: 'farms', label: 'Fermes détectées', render: (r) => fmtNum(r.farms) },
            { key: 'maize_ha', label: 'Maïs (ha)', render: (r) => fmtNum(r.maize_ha, 1) },
            { key: 'source', label: 'Source' },
            { key: 'updated_at', label: 'Date', render: (r) => fmtDateTime(r.updated_at) },
          ]} />
        )}
      </QueryState>
    </>
  );
}
