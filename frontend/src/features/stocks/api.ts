import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export type StockLevel = 'rupture' | 'critique' | 'bas' | 'ok' | 'non_calculable';
/** Ligne du détenteur (produit, site) ou, pour le personnel, d'un département et d'une filière (sans identité). */
export interface StockRow {
  value_chain: string; product?: string; site?: string | null; site_name?: string | null; department: string; stock_kg: number; outflow_kg: number;
  observed_days?: number; daily_outflow_kg: number; days_cover: number | null; level: StockLevel; holders?: number; groups?: number; at_risk_holders?: number;
}
export interface StockOutlook { scope: 'mine' | 'aggregate'; window_days: number; thresholds: { critical_days: number; low_days: number }; summary: Record<StockLevel, number>; results: StockRow[] }

export const useStockOutlook = () => useQuery({ queryKey: ['stocks', 'outlook'], queryFn: () => api<StockOutlook>('/stocks/outlook') });
