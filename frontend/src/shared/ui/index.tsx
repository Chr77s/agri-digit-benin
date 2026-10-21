import * as RD from '@radix-ui/react-dialog';
import { forwardRef, useId, useMemo, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import i18n from '../../i18n';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

// Composants du kit « Bénin Vert » : les classes viennent de ./kit.css (copie de maquettes/web/kit.css). Voir aussi ./kit.tsx.
export { Icon, spriteHref, type IconName } from './Icon';
export * from './kit';

const KEY_RE = /^[a-z][A-Za-z]*(\.[A-Za-z0-9_]+)+$/;
/** Messages portés par une clé de traduction (schémas zod, erreurs choisies en code) : traduits à l'affichage. Un texte venu du serveur passe tel quel. */
export function useMsg() {
  const { t } = useTranslation();
  return (m?: string) => (m && KEY_RE.test(m) ? t(m) : m);
}

/* ---------- Boutons ---------- */
// danger = contour latérite (action destructive secondaire, comme avant) ; dangerSolid = plein latérite.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid' | 'accent';
const variants: Record<ButtonVariant, string> = {
  primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger-ghost', dangerSolid: 'btn-danger', accent: 'btn-accent',
};
export interface ButtonLook { variant?: ButtonVariant; size?: 'sm'; block?: boolean; iconOnly?: boolean }
/** Classes d'un bouton, pour styler un <Link> ou un <a> comme un bouton. */
export function buttonCls({ variant = 'primary', size, block, iconOnly }: ButtonLook = {}) {
  const v = iconOnly ? (variant === 'secondary' ? 'btn-icon btn-secondary' : 'btn-icon') : variants[variant];
  return `btn ${v}${size ? ' btn-sm' : ''}${block ? ' btn-block' : ''}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook & { busy?: boolean; icon?: IconName };
/** Bouton du kit. `icon` : icône de tête ; `iconOnly` exige un aria-label ; `busy` affiche une roue et bloque le bouton. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant, size, block, iconOnly, busy, icon, className = '', children, disabled, type = 'button', ...rest }, ref) {
    return (
      <button ref={ref} type={type} disabled={disabled || busy} aria-busy={busy || undefined}
        className={`${buttonCls({ variant, size, block, iconOnly })} ${className}`} {...rest}>
        {busy && <span className="spinner" aria-hidden />}
        {icon && <Icon name={icon} />}
        {children}
      </button>
    );
  },
);

/** Bascule clair/sombre : un seul libellé, l'état est porté par aria-pressed. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle} aria-pressed={theme === 'dark'} aria-label={t('app.darkMode')} className="btn btn-icon">
      <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
    </button>
  );
}

/* ---------- Champs ---------- */
type FieldChild = { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string };
/** Libellé, aide et erreur autour d'un contrôle ; le contrôle reçoit id et attributs ARIA par la fonction enfant. */
export function Field({ label, error, hint, optional, required, children, id }: { label: ReactNode; error?: string; hint?: ReactNode; optional?: boolean; required?: boolean; children: (p: FieldChild) => ReactNode; id?: string }) {
  const gen = useId();
  const msg = useMsg();
  const { t } = useTranslation();
  const fid = id ?? gen;
  const desc = [hint && `${fid}-hint`, error && `${fid}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={fid} className="label">
        {label}
        {optional && <span className="opt"> ({t('ui.optional')})</span>}
        {required && <span className="req" aria-hidden> *</span>}
      </label>
      {hint && <p id={`${fid}-hint`} className="hint">{hint}</p>}
      {children({ id: fid, 'aria-invalid': error ? true : undefined, 'aria-describedby': desc })}
      {error && <p id={`${fid}-err`} className="error-msg" role="alert"><Icon name="alert" />{msg(error)}</p>}
    </div>
  );
}

/** Classe des champs texte (input, textarea, select multiple). */
export const inputCls = 'input';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`input ${className}`} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = '', ...rest }, ref) {
  return <textarea ref={ref} className={`textarea ${className}`} {...rest} />;
});

type Opt = { value: string; label: string };
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { options: Opt[]; placeholder?: string; groups?: { label: string; options: Opt[] }[] }>(function Select({ options, placeholder, groups, className = '', ...rest }, ref) {
  return (
    <select ref={ref} className={`select ${className}`} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      {groups?.filter((g) => g.options.length).map((g) => (
        <optgroup key={g.label} label={g.label}>{g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
      ))}
    </select>
  );
});

/* ---------- Étiquettes d'état : toujours icône ou texte, jamais la couleur seule ---------- */
const BADGES = {
  ok: ['badge--ok', 'check'], wait: ['badge--wait', 'clock'], bad: ['badge--bad', 'x-circle'], draft: ['badge--draft'],
  urgent: ['badge--urgent', 'alert'], demo: ['badge--demo'], sim: ['badge--sim'], offline: ['badge--offline', 'wifi-off'], neutral: ['badge--neutral'],
  // anciens tons, gardés pour les pages pas encore refaites
  success: ['badge--ok', 'check'], warn: ['badge--bad', 'alert'], error: ['badge--bad', 'x-circle'],
} as const satisfies Record<string, readonly [string, IconName?]>;
export type BadgeTone = keyof typeof BADGES;
export function Badge({ tone = 'neutral', icon, children }: { tone?: BadgeTone; icon?: IconName | false; children: ReactNode }) {
  const [cls, def] = BADGES[tone] as readonly [string, IconName?];
  const ic = icon === false ? undefined : icon ?? def;
  return <span className={`badge ${cls}`}>{ic && <Icon name={ic} />}{children}</span>;
}

/* ---------- Encarts ---------- */
const ALERTS = { info: 'info', ok: 'check-circle', warn: 'alert', danger: 'x-circle', demo: 'info' } as const satisfies Record<string, IconName>;
export type AlertTone = keyof typeof ALERTS;
export function Alert({ tone = 'info', title, children, actions, live, icon }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode; actions?: ReactNode; live?: boolean; icon?: IconName }) {
  return (
    <div className={`alert alert--${tone}`} role={live ? 'status' : undefined} aria-live={live ? 'polite' : undefined}>
      <Icon name={icon ?? ALERTS[tone]} />
      <div className="al-body">
        {title && <span className="al-title">{title}</span>}
        {children && <div>{children}</div>}
        {actions && <div className="al-actions">{actions}</div>}
      </div>
    </div>
  );
}

const NOTICE: Record<'neutral' | 'success' | 'warn' | 'error', AlertTone> = { neutral: 'info', success: 'ok', warn: 'warn', error: 'danger' };
/** Ancienne API, gardée pour les pages : préférer Alert. */
export function Notice({ tone = 'neutral', children, live }: { tone?: keyof typeof NOTICE | AlertTone; children: ReactNode; live?: boolean }) {
  const t = tone in NOTICE ? NOTICE[tone as keyof typeof NOTICE] : (tone as AlertTone);
  return <Alert tone={t} live={live}>{children}</Alert>;
}

export function SimulationBanner({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return <Alert tone="warn" live title={t('common.simulation')}>{children}</Alert>;
}

/* ---------- États : chargement, vide, erreur ---------- */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t('common.loading')}>
      <span className="skel skel-title" />
      {Array.from({ length: lines }).map((_, i) => <span key={i} className="skel skel-line" style={{ width: `${90 - i * 12}%` }} />)}
    </div>
  );
}

export function EmptyState({ title, children, action, icon = 'sprout' }: { title: string; children?: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size="lg" /></span>
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="muted">{children}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const msg = error instanceof Error ? error.message : t('common.errorGeneric');
  return (
    <div role="alert" className="state-error">
      <span className="se-icon"><Icon name="alert" size="lg" /></span>
      <p className="text-lg font-bold">{msg}</p>
      {onRetry && <Button variant="secondary" icon="sync" onClick={onRetry}>{t('common.retry')}</Button>}
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

export function ListenButton({ text, label }: { text: string; label?: string }) {
  const { t } = useTranslation();
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  // lb-label : masqué sous 640 px (bouton rond de la maquette), toujours lu par les lecteurs d'écran.
  return <Button variant="secondary" className="btn-listen" onClick={() => speak(text)}><Volume2 aria-hidden size={20} /> <span className="lb-label">{label ?? t('common.listen')}</span></Button>;
}

/** En-tête de page : fil d'Ariane facultatif, titre en grotesque, description, actions à droite. Sous 640 px : retour vers le dernier lien du fil d'Ariane. */
export function PageHeader({ title, desc, crumbs, listen, actions }: { title: string; desc?: ReactNode; crumbs?: { label: string; to?: string }[]; listen?: string; actions?: ReactNode }) {
  const { t } = useTranslation();
  const back = crumbs?.filter((c) => c.to).pop();
  return (
    <div className="page-head">
      <div>
        {back && <Link className="btn btn-icon ph-back" to={back.to!} aria-label={t('mobile.back', { page: back.label })}><Icon name="arrow-left" /></Link>}
        {crumbs && crumbs.length > 0 && (
          <nav className="crumbs" aria-label={t('ui.crumbs')}>
            <ol>{crumbs.map((c, i) => <li key={i}>{c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>)}</ol>
          </nav>
        )}
        <h1 className="page-title">{title}</h1>
        {desc && <p className="page-desc">{desc}</p>}
      </div>
      {(actions || listen) && <div className="page-actions">{actions}{listen && <ListenButton text={listen} />}</div>}
    </div>
  );
}

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR') : i18n.t('common.notAvailable'));
export const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString('fr-FR') : i18n.t('common.notAvailable'));
export const fmtNum = (n?: number | null, digits = 0) =>
  n === null || n === undefined ? i18n.t('common.notAvailable') : n.toLocaleString('fr-FR', { maximumFractionDigits: digits });

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

/** num : chiffres alignés à droite ; primary : titre de la fiche sous 640 px (par défaut la 1re colonne) ; actions : colonne de boutons. */
export interface Column<T> { key: string; label: string; render?: (r: T) => ReactNode; csv?: (r: T) => unknown; sortable?: boolean; num?: boolean; primary?: boolean; actions?: boolean }

interface TableProps<T> {
  columns: Column<T>[]; data: T[]; caption: string; rowKey: (r: T) => string;
  pageSize?: number; exportName?: string;
  /** Titre visible dans la barre d'outils (sinon la légende reste réservée aux lecteurs d'écran). */
  title?: string;
  /** Contrôles ajoutés à la barre d'outils (filtres Chips, boutons). */
  toolbar?: ReactNode;
  /** Cases de sélection et barre d'actions groupées. */
  selectable?: boolean;
  bulkActions?: (keys: string[], clear: () => void) => ReactNode;
}

/** Tableau du kit : recherche, tri, sélection, pagination, export CSV ; sous 640 px chaque ligne devient une fiche. */
export function Table<T extends object>({ columns, data, caption, pageSize = 10, exportName, rowKey, title, toolbar, selectable, bulkActions }: TableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const sid = useId();
  const { t } = useTranslation();
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
  // La sélection ne garde que les lignes encore présentes.
  const keys = new Set(data.map(rowKey));
  const sel = [...picked].filter((k) => keys.has(k));
  const viewKeys = view.map(rowKey);
  const allOn = viewKeys.length > 0 && viewKeys.every((k) => picked.has(k));
  const someOn = viewKeys.some((k) => picked.has(k));
  const toggle = (k: string) => setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const toggleAll = () => setPicked((p) => { const n = new Set(p); viewKeys.forEach((k) => (allOn ? n.delete(k) : n.add(k))); return n; });
  const primaryKey = (columns.find((c) => c.primary) ?? columns[0])?.key;
  const span = columns.length + (selectable ? 1 : 0);
  return (
    <section className="table-card">
      <div className="table-toolbar">
        {title && <h2 className="card-title mr-auto">{title}</h2>}
        <div className="search">
          <Icon name="search" />
          <label htmlFor={sid} className="sr-only">{t('table.search')}</label>
          <input id={sid} type="search" className="input" placeholder={t('table.search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        {toolbar}
        {exportName && (
          <Button variant="secondary" size="sm" iconOnly icon="download" aria-label={t('table.exportCsv')} title={t('table.exportCsv')}
            onClick={() => downloadBlob(new Blob(['﻿' + toCsv(columns as Column<never>[], filtered)], { type: 'text/csv' }), `${exportName}.csv`)} />
        )}
        <p className="sr-only" aria-live="polite">{t('table.rows', { count: filtered.length })}</p>
      </div>
      {selectable && sel.length > 0 && (
        <div className="bulkbar" role="region" aria-label={t('ui.selected', { count: sel.length })}>
          <span>{t('ui.selected', { count: sel.length })}</span>
          {bulkActions?.(sel, () => setPicked(new Set()))}
        </div>
      )}
      <div className="table-scroll">
        <table className="data-table table--cards">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {selectable && (
                <th scope="col" className="col-check">
                  <input type="checkbox" className="cb" aria-label={t('ui.selectAll')} checked={allOn}
                    ref={(el) => { if (el) el.indeterminate = someOn && !allOn; }} onChange={toggleAll} />
                </th>
              )}
              {columns.map((c) => {
                const on = sort?.key === c.key;
                const cls = c.actions ? 'col-actions' : c.num ? 'num' : undefined;
                if (c.sortable === false || c.actions) return <th key={c.key} scope="col" className={cls}>{c.actions ? <span className="sr-only">{c.label}</span> : c.label}</th>;
                return (
                  <th key={c.key} scope="col" className={cls} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="th-sort" onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 }))}>
                      {c.label}<Icon name={on ? (sort.dir === 1 ? 'sort-asc' : 'sort-desc') : 'sort'} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && <tr><td className="muted td-primary" colSpan={span}>{t('table.noMatch')}</td></tr>}
            {view.map((r) => {
              const k = rowKey(r);
              return (
                <tr key={k} className={picked.has(k) ? 'is-selected' : undefined}>
                  {selectable && (
                    <td className="col-check">
                      <input type="checkbox" className="cb" aria-label={t('ui.selectRow')} checked={picked.has(k)} onChange={() => toggle(k)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} data-label={c.label}
                      className={`${c.key === primaryKey ? 'td-primary ' : ''}${c.actions ? 'col-actions ' : c.num ? 'num ' : ''}break-words [&_a]:inline-flex [&_a]:min-h-touch [&_a]:items-center`}>
                      {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label={t('table.pagination')} className="pagination">
          <span>{t('table.page', { page: cur + 1, pages })}</span>
          <div className="pages">
            <button type="button" className="page-btn" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
              <Icon name="chevron-left" /><span className="sr-only">{t('table.prev')}</span>
            </button>
            {pageList(cur, pages).map((p, i) => (p === null
              ? <span key={`gap${i}`} aria-hidden>…</span>
              : <button key={p} type="button" className="page-btn" aria-current={p === cur ? 'page' : undefined} onClick={() => setPage(p)}>{p + 1}</button>))}
            <button type="button" className="page-btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
              <Icon name="chevron-right" /><span className="sr-only">{t('table.next')}</span>
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
/** Nouveau nom, même composant. */
export const DataTable = Table;

/** Pages affichées : la première, la dernière et deux voisines de la courante ; null = trou. */
export function pageList(cur: number, pages: number): (number | null)[] {
  const keep = [...new Set([0, pages - 1, cur - 1, cur, cur + 1])].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b);
  return keep.flatMap((p, i) => (i > 0 && p - keep[i - 1] > 1 ? [null, p] : [p]));
}

/* ---------- Modale et tiroir latéral (Radix : focus piégé, Échap, voile, retour du focus) ---------- */
export function Modal({ open, onClose, title, children, footer, sheet }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; sheet?: boolean }) {
  const { t } = useTranslation();
  return (
    <RD.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <RD.Portal>
        <RD.Overlay className="modal-backdrop" />
        <RD.Content className={`modal modal--radix${sheet ? ' modal--sheet' : ''}`} aria-describedby={undefined}>
          <div className="modal-head">
            <RD.Title className="modal-title">{title}</RD.Title>
            <RD.Close asChild><button type="button" className="btn btn-icon" aria-label={t('common.close')}><Icon name="x" /></button></RD.Close>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
export const Sheet = (p: Omit<Parameters<typeof Modal>[0], 'sheet'>) => <Modal {...p} sheet />;
/** Ancien nom, gardé pour les pages. */
export const Dialog = Modal;
