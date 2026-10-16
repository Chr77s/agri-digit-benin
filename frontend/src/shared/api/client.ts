import type { ApiErrorBody, Paginated } from './types';
import i18n from '../../i18n';

const BASE = '/api/v1';
let accessToken: string | null = null;
let onAuthLost: (() => void) | null = null;

export function setAccessToken(t: string | null) { accessToken = t; }
export function setOnAuthLost(fn: () => void) { onAuthLost = fn; }

export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) {
    super(
      body.detail ||
        (status === 0
          ? i18n.t('errors.network')
          : i18n.t('errors.http', { status })),
    );
  }
  get code() { return this.body.code; }
}

let refreshing: Promise<boolean> | null = null;
export function refreshAccess(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (r) => {
      if (!r.ok) return false;
      accessToken = ((await r.json()) as { access: string }).access;
      return true;
    })
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

type Opts = { method?: string; body?: unknown; form?: FormData; raw?: boolean; retry?: boolean; signal?: AbortSignal };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, form, raw = false, retry = true, signal } = opts;
  // raw : fichier (CSV, image) ; `*/*` évite un 406 de DRF quand aucun rendu ne correspond au type demandé
  const headers: Record<string, string> = { Accept: raw ? 'text/csv, */*;q=0.1' : 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';  // multipart : le navigateur fixe la frontière
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, headers, credentials: 'include', signal,
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch {
    throw new ApiError(0, {});
  }
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshAccess()) return api<T>(path, { ...opts, retry: false });
    accessToken = null;
    onAuthLost?.();
  }
  if (!res.ok) {
    let b: ApiErrorBody = {};
    try { b = (await res.json()) as ApiErrorBody; } catch { /* corps non JSON */ }
    throw new ApiError(res.status, b);
  }
  if (raw) return (await res.blob()) as T;
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Accepte une liste paginée ou un tableau simple. */
export function rows<T>(d: Paginated<T> | T[] | undefined | null): T[] {
  if (!d) return [];
  return Array.isArray(d) ? d : d.results ?? [];
}

export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** GET d'une liste (paginée ou non) ramenée à un tableau. Le serveur ne renvoie que 20 lignes par défaut : on demande 100 lignes par page et on suit les curseurs (10 pages au plus). */
export async function list<T>(path: string): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?';
  const out: T[] = [];
  let cursor = '';
  for (let i = 0; i < 10; i++) {
    const d = await api<Paginated<T> | T[]>(`${path}${sep}page_size=100${cursor}`);
    if (Array.isArray(d)) return d;
    out.push(...rows(d));
    const next = d.next ? new URL(d.next, window.location.origin).searchParams.get('cursor') : null;
    if (!next) break;
    cursor = `&cursor=${encodeURIComponent(next)}`;
  }
  return out;
}
