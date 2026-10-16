import type { ApiErrorBody, Paginated } from './types';

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
          ? 'Le serveur ne répond pas. Vérifiez la connexion puis réessayez.'
          : `Erreur ${status}. Réessayez dans un instant.`),
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

type Opts = { method?: string; body?: unknown; raw?: boolean; retry?: boolean };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, raw = false, retry = true } = opts;
  const headers: Record<string, string> = { Accept: raw ? 'text/csv' : 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body),
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
