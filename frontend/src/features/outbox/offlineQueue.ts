import Dexie, { type Table } from 'dexie';
import { useEffect, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../shared/api/client';

/** Saisie faite hors ligne, rejouée au retour du réseau. */
export interface PendingWrite { id?: number; path: string; body: unknown; label: string; created_at: string; error?: string }

class OfflineDb extends Dexie {
  pending!: Table<PendingWrite, number>;
  constructor() {
    super('agri-digit-offline');
    this.version(1).stores({ pending: '++id, created_at' });
  }
}
export const offlineDb = new OfflineDb();

export const isOfflineError = (e: unknown) => (e instanceof ApiError && e.status === 0) || !navigator.onLine;

/** Envoie la saisie ; si le réseau manque, la garde en file locale. Retourne 'queued' dans ce cas. */
export async function postOrQueue<T>(path: string, body: unknown, label: string): Promise<T | 'queued'> {
  if (navigator.onLine) {
    try {
      return await api<T>(path, { method: 'POST', body });
    } catch (e) {
      if (!isOfflineError(e)) throw e;
    }
  }
  await offlineDb.pending.add({ path, body, label, created_at: new Date().toISOString() });
  window.dispatchEvent(new Event('offline-queue'));
  return 'queued';
}

let syncing = false;
export async function syncQueue(qc?: QueryClient) {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const items = await offlineDb.pending.orderBy('created_at').toArray();
    for (const it of items) {
      try {
        await api(it.path, { method: 'POST', body: it.body });
        await offlineDb.pending.delete(it.id!);
      } catch (e) {
        if (isOfflineError(e)) break;
        // Refus métier : on garde la saisie avec le motif pour que l'utilisateur la voie (aucune perte).
        await offlineDb.pending.update(it.id!, { error: e instanceof Error ? e.message : 'Refusée par le serveur' });
      }
    }
    void qc?.invalidateQueries();
  } finally {
    syncing = false;
    window.dispatchEvent(new Event('offline-queue'));
  }
}

export function useOfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState<PendingWrite[]>([]);
  useEffect(() => {
    const refresh = () => { void offlineDb.pending.toArray().then(setPending).catch(() => setPending([])); };
    const on = () => { setOnline(true); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('offline-queue', refresh);
    refresh();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('offline-queue', refresh); };
  }, []);
  return { online, pending, discard: async (id: number) => { await offlineDb.pending.delete(id); window.dispatchEvent(new Event('offline-queue')); } };
}
