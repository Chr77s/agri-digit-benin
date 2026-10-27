import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../../shared/api/client';
import type { SatelliteData, SatelliteZones } from '../../shared/api/types';

export const useSatellite = (department = '') =>
  useQuery({ queryKey: ['satellite', department], queryFn: () => api<SatelliteData>(`/satellite${qs({ department })}`) });

/** Contours des 12 départements : ils ne changent pas, une heure de cache suffit. */
export const useSatelliteZones = () =>
  useQuery({ queryKey: ['satellite', 'zones'], staleTime: 3_600_000, queryFn: () => api<SatelliteZones>('/satellite/zones') });

/** Indices de la parcelle ; le serveur retombe sur le département quand il n'a pas de mesure propre (voir `scope`). */
export const useParcelSatellite = (id: string) =>
  useQuery({ queryKey: ['satellite', 'parcel', id], queryFn: () => api<SatelliteData>(`/parcels/${id}/satellite`) });

// Repères de lecture indicatifs, pas des seuils agronomiques officiels.
export const ndviLevel = (v: number) => (v < 0.4 ? 'low' : v < 0.6 ? 'mid' : 'high');
export const ndmiLevel = (v: number) => (v < 0.1 ? 'low' : v < 0.3 ? 'mid' : 'high');
