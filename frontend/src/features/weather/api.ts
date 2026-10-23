import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { demoForecast, type DayForecast } from './demo';

interface WeatherApi { source: string; simulated: boolean; updated_at: string; place: string; days: { date: string; tmax: number; tmin: number; rain_mm: number; rain_pct: number }[] }

/** Prévision du serveur (Open-Meteo au point de la parcelle) ; hors ligne ou en attente : démonstration signalée. */
export function useForecast(place: string, days = 7) {
  const q = useQuery({ queryKey: ['weather'], queryFn: () => api<WeatherApi>('/weather'), staleTime: 30 * 60_000, retry: 1 });
  if (!q.data) return { days: demoForecast(place || 'benin', new Date(), days), simulated: true, source: '', updatedAt: '' };
  return {
    simulated: q.data.simulated, source: q.data.source, updatedAt: q.data.updated_at,
    days: q.data.days.slice(0, days).map((d): DayForecast => {
      const [y, m, j] = d.date.split('-').map(Number);
      return { date: new Date(y, m - 1, j), tmax: d.tmax, tmin: d.tmin, rainMm: d.rain_mm, rainPct: d.rain_pct,
        icon: d.rain_mm >= 10 ? 'drop' : d.rain_pct > 30 ? 'cloud-sun' : 'sun' };
    }),
  };
}
