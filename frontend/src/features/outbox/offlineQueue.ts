import Dexie, { type Table } from 'dexie';
import { useEffect, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../shared/api/client';

type Method = 'POST' | 'PATCH';
/** Conflit de version (UC-25) : objet serveur courant renvoyé par le 409. */
export interface Conflict { server: Record<string, unknown>; server_version: number }
/** Saisie faite hors ligne, rejouée au retour du réseau. */
export interface PendingWrite { id?: number; path: string; method?: Method; body: unknown; label: string; created_at: string; error?: string; conflict?: Conflict }

class OfflineDb extends Dexie {
  pending!: Table<PendingWrite, number>;
  constructor() {
    super('agri-digit-offline');
    this.version(1).stores({ pending: '++id, created_at' });
  }
}
export const offlineDb = new OfflineDb();
const notify = () => window.dispatchEvent(new Event('offline-queue'));

export const isOfflineError = (e: unknown) => (e instanceof ApiError && e.status === 0) || !navigator.onLine;
const asConflict = (e: unknown): Conflict | null =>
  e instanceof ApiError && e.status === 409 && e.code === 'conflict' ? { server: (e.body.server ?? {}) as Record<string, unknown>, server_version: Number(e.body.server_version) } : null;

export class ConflictError extends Error {
  constructor() { super('Cette fiche a été modifiée sur le serveur entre-temps. Ouvrez « Conflits de saisie » pour choisir la version à garder.'); }
}

/** Envoie la saisie ; si le réseau manque, la garde en file locale (retourne 'queued'). Un 409 conflict est gardé pour résolution par l'agent. */
export async function sendOrQueue<T>(method: Method, path: string, body: unknown, label: string): Promise<T | 'queued'> {
  if (navigator.onLine) {
    try {
      return await api<T>(path, { method, body });
    } catch (e) {
      const c = asConflict(e);
      if (c) {
        await offlineDb.pending.add({ path, method, body, label, created_at: new Date().toISOString(), conflict: c });
        notify();
        throw new ConflictError();
      }
      if (!isOfflineError(e)) throw e;
    }
  }
  await offlineDb.pending.add({ path, method, body, label, created_at: new Date().toISOString() });
  notify();
  return 'queued';
}
export const postOrQueue = <T>(path: string, body: unknown, label: string) => sendOrQueue<T>('POST', path, body, label);

let syncing = false;
export async function syncQueue(qc?: QueryClient) {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const items = await offlineDb.pending.orderBy('created_at').toArray();
    for (const it of items) {
      if (it.error || it.conflict) continue; // attend une décision de l'utilisateur
      try {
        await api(it.path, { method: it.method ?? 'POST', body: it.body });
        await offlineDb.pending.delete(it.id!);
      } catch (e) {
        if (isOfflineError(e)) break;
        const c = asConflict(e);
        // Refus métier ou conflit : on garde la saisie (aucune perte) jusqu'à décision de l'utilisateur.
        await offlineDb.pending.update(it.id!, c ? { conflict: c } : { error: e instanceof Error ? e.message : 'Refusée par le serveur' });
      }
    }
    void qc?.invalidateQueries();
  } finally {
    syncing = false;
    notify();
  }
}

/** Garder la version serveur : la saisie locale est abandonnée (après confirmation dans l'interface). */
export async function keepServer(id: number) {
  await offlineDb.pending.delete(id);
  notify();
}

/** Garder la version locale : renvoi avec force: true (choix journalisé côté serveur). */
export async function keepLocal(it: PendingWrite) {
  const body = { ...(it.body as Record<string, unknown>), base_version: it.conflict?.server_version, force: true };
  try {
    await api(it.path, { method: it.method ?? 'PATCH', body });
    await offlineDb.pending.delete(it.id!);
  } catch (e) {
    // La saisie reste en file : nouveau conflit (le serveur a encore changé) ou refus métier, jamais de perte silencieuse.
    const c = asConflict(e);
    if (c) await offlineDb.pending.update(it.id!, { conflict: c });
    else if (!isOfflineError(e)) await offlineDb.pending.update(it.id!, { error: e instanceof Error ? e.message : 'Refusée par le serveur', conflict: undefined });
    throw e;
  } finally {
    notify();
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
  return { online, pending, discard: keepServer };
}
