import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs, rows } from '../../shared/api/client';
import type { Paginated } from '../../shared/api/types';
import { demoPriceHistory, demoPrices } from '../weather/demo';

/* ---------- Relevés de prix ---------- */
export type Form = 'brut' | 'transforme';
export interface PriceRow { market: string; department: string; form: Form; product: string; price: number; observed_on: string | null; change: number | null; simulated: boolean }
export interface PricePoint { week: string; form: Form; price: number; n: number }
export interface PriceOverview { value_chain: string; simulated: boolean; source: string; window_days: number; latest: PriceRow[]; history: PricePoint[] }
export interface Margin { value_chain: string; department: string; product: string; raw_xof: number; transformed_xof: number; gap_xof: number; gap_pct: number; raw_markets: number; transformed_markets: number; observed_on: string }
export type PriceBody = { market: string; department: string; value_chain: string; form: Form; product: string; price_xof_per_kg: number; observed_on: string };

export const PRICE_WRITERS = ['agent_atda', 'admin_maep', 'gestionnaire_cooperative', 'transformateur', 'distributeur'];

export const usePrices = (chain: string, department?: string) =>
  useQuery({ queryKey: ['prices', chain, department ?? ''], queryFn: () => api<PriceOverview>(`/prices${qs({ value_chain: chain, department })}`), enabled: !!chain, staleTime: 60_000 });

/** Prix d'une filière : derniers relevés du serveur ; sans réseau, démonstration signalée (`simulated`). */
export function usePriceRows(chain: string, department?: string) {
  const q = usePrices(chain, department);
  if (q.data) return { ...q.data, loading: false, offline: false };
  const demo = q.isError;
  return {
    value_chain: chain, simulated: demo, source: '', window_days: 30, loading: !demo && !!chain, offline: demo,
    latest: demo ? demoPrices(chain).map((r): PriceRow => ({ ...r, form: 'brut', product: chain, observed_on: null, change: r.change, simulated: true })) : [],
    history: [] as PricePoint[],
  };
}

/** Courbe : moyennes hebdomadaires réelles (forme brute) ; en démonstration, la courbe simulée. */
export function priceCurve(o: { value_chain: string; simulated: boolean; history: PricePoint[] }): { date: Date; price: number }[] {
  if (o.simulated) return demoPriceHistory(o.value_chain);
  return o.history.filter((h) => h.form === 'brut').map((h) => { const [y, m, d] = h.week.split('-').map(Number); return { date: new Date(y, m - 1, d), price: h.price }; });
}

export function useRecordPrice() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: PriceBody) => api<PriceRow>('/prices', { method: 'POST', body: b }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['prices'] }) });
}

export const useMargins = (enabled: boolean) =>
  useQuery({ queryKey: ['prices', 'margins'], queryFn: () => api<{ results: Margin[]; note: string }>('/prices/margins'), enabled });

/* ---------- Analyses des marchés ---------- */
export interface Trend {
  market: string | null; department: string; form: Form; product: string; observations: number; span_days: number; moving_avg_xof: number | null;
  variation_pct: number | null; trend: 'hausse' | 'baisse' | 'stable' | null; reliability: 'insuffisante' | 'faible' | 'moyenne' | 'bonne';
  projection: { horizon_days: number; price_xof: number; low_xof: number; high_xof: number } | null; text: string;
}
export interface Supply {
  value_chain: string; department: string; season: string; producers: number | null; campaigns_pending: number; without_estimate: number; yield_source: string | null;
  previous_season: string | null; masked: boolean; expected_kg: number | null; harvested_kg: number | null; season_total_kg: number | null; previous_harvest_kg: number | null; change_pct: number | null;
}
export interface Analysis { value_chain: string; department: string | null; method: { window_days: number; trend_threshold_pct: number; min_observations: number; min_span_days: number; horizon_days: number }; prices: Trend[]; supply: Supply[] }

export const useAnalysis = (chain: string, department?: string) =>
  useQuery({ queryKey: ['market-analysis', chain, department ?? ''], queryFn: () => api<Analysis>(`/market-analysis${qs({ value_chain: chain, department })}`), enabled: !!chain });

/* ---------- Enquêtes de satisfaction ---------- */
export interface Survey { id: string; code: string; title: string; value_chain: string; department: string; questions: string[]; status: 'active' | 'close'; path: string; created_at: string; closed_at: string | null; responses?: number }
export interface SurveyResults {
  code: string; title: string; status: string; responses: number; low_sample: boolean; min_cell: number;
  questions: { index: number; text: string; mean: number | null; distribution: Record<string, number> }[];
  by_department: { department: string; responses: number; masked: boolean; means: number[] | null }[];
  comments: { text: string; date: string }[];
}
export interface PublicSurvey { code: string; title: string; value_chain: string; department: string; questions: string[]; status: 'active' | 'close' }

export const useSurveys = () => useQuery({ queryKey: ['surveys'], queryFn: async () => rows(await api<Paginated<Survey>>('/surveys')) });
export const useSurveyResults = (id: string | null) =>
  useQuery({ queryKey: ['surveys', 'results', id], queryFn: () => api<SurveyResults>(`/surveys/${id}/results`), enabled: !!id });
export function useCreateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { title: string; value_chain: string; department: string; questions: string[] }) => api<Survey>('/surveys', { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['surveys'] }),
  });
}
export function useCloseSurvey() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api<Survey>(`/surveys/${id}/close`, { method: 'POST' }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['surveys'] }) });
}
export const usePublicSurvey = (code: string) =>
  useQuery({ queryKey: ['public-survey', code], queryFn: () => api<PublicSurvey>(`/public/surveys/${encodeURIComponent(code)}`), enabled: !!code, retry: false });
export const useRespond = (code: string) =>
  useMutation({ mutationFn: (b: Record<string, unknown>) => api<{ ok: boolean }>(`/public/surveys/${encodeURIComponent(code)}/respond`, { method: 'POST', body: b }) });

/* ---------- Formations ---------- */
export interface Training {
  id: string; title: string; theme: string; department: string; date: string; place: string; seats: number; audience: string[]; registered: number; seats_left: number; manage: boolean;
  my_registration?: { id: string; attended: boolean | null } | null; present?: number; absent?: number;
}
export interface Registrant { id: string; name: string; role: string; commune: string; attended: boolean | null }
export interface TrainingReportRow { department?: string; sessions: number; upcoming: number; seats: number; registered: number; present: number; absent: number; to_record: number; attendance_pct: number | null }
export const TRAINING_THEMES = ['production', 'transformation', 'stockage', 'commercialisation', 'gestion', 'qualite', 'numerique', 'autre'];
export const TRAINING_AUDIENCES = ['producteur', 'transformateur', 'distributeur', 'gestionnaire_cooperative'];

export const useTrainings = () => useQuery({ queryKey: ['trainings'], queryFn: async () => (await api<{ results: Training[] }>('/trainings')).results });
export const useTrainingReport = (enabled: boolean) =>
  useQuery({ queryKey: ['trainings', 'report'], queryFn: () => api<{ results: TrainingReportRow[]; total: TrainingReportRow }>('/trainings/report'), enabled });
export const useRegistrants = (id: string | null) =>
  useQuery({ queryKey: ['trainings', 'registrants', id], queryFn: async () => (await api<{ results: Registrant[] }>(`/trainings/${id}/registrations`)).results, enabled: !!id });
export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { title: string; theme: string; department: string; date: string; place: string; seats: number; audience: string[] }) => api<Training>('/trainings', { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
}
export function useRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, join }: { id: string; join: boolean }) => api(`/trainings/${id}/register`, { method: join ? 'POST' : 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
}
export function useAttendance(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { registration: string; present: boolean }) => api(`/trainings/${id}/attendance`, { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
}

/* ---------- Vitrine des produits ---------- */
export interface Showcase { id: string; company: string; name: string; description: string; value_chain: string; form: Form; price_xof_per_kg: number | null; department: string; contact: string; status: string; created_at: string; is_mine: boolean }
export const SHOWCASE_WRITERS = ['transformateur', 'distributeur', 'gestionnaire_cooperative'];
export const useShowcase = (f: { value_chain?: string; form?: string; department?: string }) =>
  useQuery({ queryKey: ['showcase', f], queryFn: async () => (await api<{ results: Showcase[] }>(`/showcase${qs(f)}`)).results });
export function usePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: Record<string, unknown>) => api<Showcase>('/showcase', { method: 'POST', body: b }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['showcase'] }),
  });
}
export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api<Showcase>(`/showcase/${id}/withdraw`, { method: 'POST' }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['showcase'] }) });
}
