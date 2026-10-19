import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../../shared/api/client';
import type { SatelliteData } from '../../shared/api/types';

export const useSatellite = (department = '') =>
  useQuery({ queryKey: ['satellite', department], queryFn: () => api<SatelliteData>(`/satellite${qs({ department })}`) });

// Repères de lecture indicatifs (démonstration), pas des seuils agronomiques officiels.
export const ndviLevel = (v: number) => (v < 0.4 ? 'low' : v < 0.6 ? 'mid' : 'high');
export const moistureLevel = (v: number) => (v < 20 ? 'low' : v < 30 ? 'mid' : 'high');
