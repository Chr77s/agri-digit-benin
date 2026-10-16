import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { api, qs, rows } from '../../shared/api/client';
import type { Dashboard, FarmAggregate } from '../../shared/api/types';
import { EmptyState, Field, PageHeader, QueryState, Select, Table, fmtDateTime, fmtNum } from '../../shared/ui';
import { useDepartments } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';

const val = (v: number | null, unit: string) => (v === null || v === undefined ? i18n.t('common.notAvailable') : `${fmtNum(v, 1)}${unit ? ` ${unit}` : ''}`);

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const [dep, setDep] = useState(user?.department ?? '');
  const dash = useQuery({ queryKey: ['dashboard', dep], queryFn: () => api<Dashboard>(`/dashboard${qs({ department: dep })}`) });
  const agg = useQuery({ queryKey: ['farm-agg', dep], queryFn: async () => rows(await api<FarmAggregate[]>(`/farms/aggregates${qs({ level: dep ? 'commune' : 'department', department: dep })}`)) });

  return (
    <>
      <PageHeader title={t('nav.dashboard')} />
      <div className="mb-4 w-64">
        <Field label={t('common.department')}>{(p) => <Select {...p} value={dep} onChange={(e) => setDep(e.target.value)} placeholder={t('dashboard.allCountry')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
      </div>
      <QueryState q={dash} empty={(d) => d.indicators.length === 0} emptyText={<EmptyState title={t('dashboard.emptyIndicators')} />}>
        {(d) => {
          const [main, ...rest] = d.indicators;
          const scope = typeof d.scope === 'string' ? d.scope : d.scope?.name ?? t('dashboard.benin');
          return (
            <section className="mb-6 flex flex-col gap-4" aria-label={t('dashboard.indicatorsOf', { scope })}>
              <div className="rounded border border-border bg-surface p-4">
                <p className="text-muted">{main.label} ({scope})</p>
                <p className="text-2xl font-semibold">{val(main.value, main.unit)}</p>
                <p className="text-sm text-muted">{t('dashboard.sourceLine', { source: main.source, date: fmtDateTime(main.updated_at) })}</p>
              </div>
              {rest.length > 0 && (
                <Table caption={t('dashboard.others')} data={rest} rowKey={(r) => r.key} exportName="indicateurs" columns={[
                  { key: 'label', label: t('dashboard.indicator') },
                  { key: 'value', label: t('dashboard.value'), render: (r) => val(r.value, r.unit), csv: (r) => r.value ?? t('common.notAvailable') },
                  { key: 'source', label: t('common.source') },
                  { key: 'updated_at', label: t('dashboard.updated'), render: (r) => fmtDateTime(r.updated_at) },
                ]} />
              )}
            </section>
          );
        }}
      </QueryState>
      <h2 className="mb-2 text-xl font-semibold">{dep ? t('dashboard.farmsByCommune') : t('dashboard.farmsByDepartment')}</h2>
      <QueryState q={agg} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('dashboard.emptyFarms')} />}>
        {(d) => (
          <Table<FarmAggregate> caption={t('dashboard.farmsCaption')} data={d} rowKey={(r) => r.name} exportName="fermes-par-commune" columns={[
            { key: 'name', label: dep ? t('common.commune') : t('common.department') },
            { key: 'farms', label: t('dashboard.farmsDetected'), render: (r) => fmtNum(r.farms) },
            { key: 'maize_ha', label: t('dashboard.maizeHa'), render: (r) => fmtNum(r.maize_ha, 1) },
            { key: 'source', label: t('common.source') },
            { key: 'updated_at', label: t('common.date'), render: (r) => fmtDateTime(r.updated_at) },
          ]} />
        )}
      </QueryState>
    </>
  );
}
