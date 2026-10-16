import * as RD from '@radix-ui/react-dialog';
import { forwardRef, useId, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Download, Inbox, RotateCcw, Volume2 } from 'lucide-react';
import { ApiError } from '../api/client';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-surface border-brand hover:bg-brand-hover',
  secondary: 'bg-surface text-brand border-brand hover:bg-success-bg',
  danger: 'bg-surface text-error border-error hover:bg-error-bg',
  ghost: 'bg-transparent text-text border-transparent hover:bg-surface underline-offset-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }>(
  function Button({ variant = 'primary', busy, className = '', children, disabled, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        className={`inline-flex items-center justify-center gap-2 min-h-touch px-4 rounded border font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: (p: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode; id?: string }) {
  const gen = useId();
  const fid = id ?? gen;
  const desc = [hint && `${fid}-hint`, error && `${fid}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fid} className="font-semibold">{label}</label>
      {hint && <p id={`${fid}-hint`} className="text-sm text-muted">{hint}</p>}
      {children({ id: fid, 'aria-invalid': error ? true : undefined, 'aria-describedby': desc })}
      {error && <p id={`${fid}-err`} className="text-sm text-error" role="alert">{error}</p>}
    </div>
  );
}

export const inputCls = 'min-h-touch w-full rounded border border-muted bg-surface px-3 text-base text-text aria-[invalid=true]:border-error';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }>(function Select({ options, placeholder, ...rest }, ref) {
  return (
    <select ref={ref} className={inputCls} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
});

const tones = {
  neutral: 'bg-bg text-text border-border',
  success: 'bg-success-bg text-success border-success',
  warn: 'bg-warn-bg text-warn border-warn',
  error: 'bg-error-bg text-error border-error',
};
export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-block rounded border px-2 text-sm font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Notice({ tone = 'neutral', children, live }: { tone?: keyof typeof tones; children: ReactNode; live?: boolean }) {
  return <div role={live ? 'status' : undefined} aria-live={live ? 'polite' : undefined} className={`rounded border p-3 ${tones[tone]}`}>{children}</div>;
}

export function SimulationBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-warn bg-warn-bg p-3 text-warn" role="status" aria-live="polite">
      <p className="font-semibold">Simulation</p>
      {children}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Chargement en cours" className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="h-6 rounded bg-border" style={{ width: `${90 - i * 12}%` }} />)}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded border border-border bg-surface p-4">
      <Inbox aria-hidden className="text-muted" />
      <p className="font-semibold">{title}</p>
      {children && <div className="text-muted">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Une erreur est survenue.';
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded border border-error bg-error-bg p-4 text-error">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden size={20} /> {msg}</p>
      {onRetry && <Button variant="danger" onClick={onRetry}><RotateCcw aria-hidden size={18} /> Réessayer</Button>}
    </div>
  );
}

/** Rend les états chargement / erreur / vide d'une requête puis le contenu. */
export function QueryState<T>({ q, empty, emptyText, children }: { q: { isLoading: boolean; isError: boolean; error: unknown; data: T | undefined; refetch: () => unknown }; empty?: (d: T) => boolean; emptyText?: ReactNode; children: (d: T) => ReactNode }) {
  if (q.isLoading) return <Skeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (q.data === undefined) return <Skeleton />;
  if (empty?.(q.data)) return <>{emptyText}</>;
  return <>{children(q.data)}</>;
}

export function fieldError(err: unknown, name: string): string | undefined {
  return err instanceof ApiError ? err.body.fields?.[name]?.[0] : undefined;
}

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  window.speechSynthesis.speak(u);
}

export function ListenButton({ text, label = 'Écouter' }: { text: string; label?: string }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return <Button variant="secondary" onClick={() => speak(text)}><Volume2 aria-hidden size={20} /> {label}</Button>;
}

export function PageHeader({ title, listen, actions }: { title: string; listen?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex flex-wrap gap-2">{actions}{listen && <ListenButton text={listen} />}</div>
    </div>
  );
}

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR') : 'non disponible');
export const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString('fr-FR') : 'non disponible');
export const fmtNum = (n?: number | null, digits = 0) =>
  n === null || n === undefined ? 'non disponible' : n.toLocaleString('fr-FR', { maximumFractionDigits: digits });

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function toCsv(cols: Column<never>[], data: unknown[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map((c) => esc(c.label)).join(';'), ...data.map((r) => cols.map((c) => esc(c.csv ? c.csv(r as never) : (r as Record<string, unknown>)[c.key])).join(';'))].join('\n');
}

export interface Column<T> { key: string; label: string; render?: (r: T) => ReactNode; csv?: (r: T) => unknown; sortable?: boolean }

/** Tableau avec recherche, tri, pagination et export CSV ; sur mobile chaque ligne devient une fiche résumée. */
export function Table<T extends object>({ columns, data, caption, pageSize = 10, exportName, rowKey }: { columns: Column<T>[]; data: T[]; caption: string; pageSize?: number; exportName?: string; rowKey: (r: T) => string }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const sid = useId();
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let d = s ? data.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(s))) : data;
    if (sort) d = [...d].sort((a, b) => {
      const va = (a as Record<string, unknown>)[sort.key]; const vb = (b as Record<string, unknown>)[sort.key];
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), 'fr')) * sort.dir;
    });
    return d;
  }, [data, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const view = filtered.slice(cur * pageSize, cur * pageSize + pageSize);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={sid} className="text-sm font-semibold">Rechercher</label>
          <input id={sid} type="search" className={`${inputCls} w-64`} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        {exportName && (
          <Button variant="secondary" onClick={() => downloadBlob(new Blob(['﻿' + toCsv(columns as Column<never>[], filtered)], { type: 'text/csv' }), `${exportName}.csv`)}>
            <Download aria-hidden size={18} /> Exporter en CSV
          </Button>
        )}
        <p className="text-sm text-muted" aria-live="polite">{filtered.length} ligne(s)</p>
      </div>
      <div className="overflow-x-auto rounded border border-border bg-surface">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c.key} scope="col" className="p-2 text-sm font-semibold" aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  {c.sortable === false ? c.label : (
                    <button type="button" className="inline-flex min-h-touch items-center gap-1" onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 }))}>
                      {c.label}
                      {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp aria-hidden size={14} /> : <ArrowDown aria-hidden size={14} />)}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && <tr><td className="p-3 text-muted" colSpan={columns.length}>Aucune ligne ne correspond à la recherche.</td></tr>}
            {view.map((r) => (
              <tr key={rowKey(r)} className="block border-b border-border p-2 md:table-row md:p-0">
                {columns.map((c) => (
                  <td key={c.key} className="block py-1 md:table-cell md:p-2">
                    <span className="mr-2 text-sm font-semibold text-muted md:hidden">{c.label} :</span>
                    {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <Button variant="secondary" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Précédent</Button>
          <span>Page {cur + 1} sur {pages}</span>
          <Button variant="secondary" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Suivant</Button>
        </nav>
      )}
    </div>
  );
}

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <RD.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-[1000] bg-text/40" />
        <RD.Content className="fixed left-1/2 top-1/2 z-[1001] max-h-[90vh] w-[min(560px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded border border-border bg-surface p-4 shadow" aria-describedby={undefined}>
          <RD.Title className="mb-3 text-xl font-semibold">{title}</RD.Title>
          {children}
          <RD.Close asChild><Button variant="ghost" className="mt-3">Fermer</Button></RD.Close>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
