// Composants du kit « Bénin Vert » absents de l'ancienne bibliothèque. Classes : ./kit.css. Réexportés par ./index.tsx.
//
// Présentation mobile (lot 1, maquettes/mobile/) : la même PWA, les mêmes routes, sous 640 px (styles : ./mobile.css).
// - La coque (app/Layout.tsx) pose l'en-tête compact et, pour les rôles listés dans TABS, la barre d'onglets du bas (<TabBar>).
//   Une page n'a rien à faire pour en profiter ; un rôle qui veut ses onglets s'ajoute à TABS (lot 4 : agent_atda).
// - <PageHeader> devient la barre de titre de la maquette (retour vers le dernier fil d'Ariane, titre, sous-titre, « Écouter ») :
//   donner `crumbs` suffit pour avoir le bouton retour.
// - Feuille du bas : <Modal> (index.tsx) s'ouvre déjà depuis le bas sous 640 px ; ne pas en créer d'autre.
// - États : <Skeleton>, <EmptyState>, <ErrorState> (index.tsx) prennent la forme mobile seuls ; <SuccessState> ci-dessous pour « c'est fait, et ensuite ».
// - Une page dont la structure change sur mobile (pas seulement le style) lit useIsMobile() ; sinon, préférer une règle dans mobile.css.
// - Bouton d'action collé en bas d'écran : envelopper les boutons dans <div className="m-cta"> (sans effet au-dessus de 640 px).
import { forwardRef, useId, useRef, useState, useSyncExternalStore, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from './Icon';

/* ---------- Mobile ---------- */
const MOBILE_Q = '(max-width: 640px)';
const subscribeMobile = (cb: () => void) => {
  const mq = typeof window !== 'undefined' ? window.matchMedia?.(MOBILE_Q) : undefined;
  mq?.addEventListener('change', cb);
  return () => mq?.removeEventListener('change', cb);
};
const readMobile = () => (typeof window !== 'undefined' && window.matchMedia?.(MOBILE_Q).matches) || false;
/** Vrai sous 640 px (même seuil que mobile.css). Sans matchMedia (tests), faux : la présentation web. */
export const useIsMobile = () => useSyncExternalStore(subscribeMobile, readMobile, () => false);

export interface TabBarItem { to: string; label: string; icon: IconName; end?: boolean }
/** Barre d'onglets du bas (5 entrées au plus) ; masquée au-dessus de 640 px. Rendue par la coque, pas par les pages. */
export function TabBar({ items, label }: { items: TabBarItem[]; label: string }) {
  return (
    <nav className="tabbar" aria-label={label}>
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className="tabbar-link">
          <span className="tabbar-pill"><Icon name={it.icon} /></span>{it.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Écran de réussite : marque ronde, titre, ce qui a été fait, puis la suite. `wait` : envoyé, en attente d'une validation. */
export function SuccessState({ title, children, actions, wait }: { title: string; children?: ReactNode; actions?: ReactNode; wait?: boolean }) {
  return (
    <div className="success-state" role="status">
      <span className={`okmark${wait ? ' okmark--wait' : ''}`}><Icon name={wait ? 'clock' : 'check'} /></span>
      <h2>{title}</h2>
      {children && <div className="success-text">{children}</div>}
      {actions && <div className="m-cta">{actions}</div>}
    </div>
  );
}

/* ---------- Cases, boutons radio, interrupteur ---------- */
type CheckProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; hint?: ReactNode };
const makeCheck = (type: 'checkbox' | 'radio', cls: string, role?: 'switch') =>
  forwardRef<HTMLInputElement, CheckProps>(function Check({ label, hint, className = '', ...rest }, ref) {
    return (
      <label className={`check ${className}`}>
        <input ref={ref} type={type} role={role} className={cls} {...rest} />
        <span>{label}{hint && <span className="hint block">{hint}</span>}</span>
      </label>
    );
  });
/** Case à cocher libellée (cible 44 px). Compatible react-hook-form (ref). */
export const Checkbox = makeCheck('checkbox', 'cb');
export const Radio = makeCheck('radio', 'radio');
/** Interrupteur : une case à cocher annoncée comme « switch ». */
export const Switch = makeCheck('checkbox', 'switch', 'switch');

/* ---------- Téléphone béninois ---------- */
/** Numéro national (10 chiffres, 01…) précédé de l'indicatif +229 affiché. La valeur reste le numéro saisi, sans indicatif. */
export const PhoneInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(function PhoneInput({ className = '', ...rest }, ref) {
  const { t } = useTranslation();
  return (
    <div className="input-group">
      <span className="addon"><span aria-hidden>+229</span><span className="sr-only">{t('ui.phonePrefix')} +229</span></span>
      <input ref={ref} type="tel" inputMode="numeric" autoComplete="tel-national" className={`input input-num ${className}`} {...rest} />
    </div>
  );
});

/* ---------- Code à usage unique ---------- */
/** Cases d'un code OTP (6 par défaut) : avance seule, retour arrière, flèches, collage du code entier. */
export function OtpInput({ value, onChange, length = 6, label, invalid, id, autoFocus }: { value: string; onChange: (v: string) => void; length?: number; label: string; invalid?: boolean; id?: string; autoFocus?: boolean }) {
  const { t } = useTranslation();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const set = (i: number, d: string) => onChange(digits.map((c, k) => (k === i ? d : c)).join('').slice(0, length));
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) { e.preventDefault(); set(i - 1, ''); focus(i - 1); }
    if (e.key === 'ArrowLeft') focus(i - 1);
    if (e.key === 'ArrowRight') focus(i + 1);
  };
  return (
    <div className="otp" role="group" aria-label={label} data-invalid={invalid || undefined}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} id={i === 0 ? id : undefined} value={d} placeholder=" "
          inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? length : 1} autoFocus={autoFocus && i === 0}
          aria-label={t('ui.otpDigit', { n: i + 1, total: length })} aria-invalid={invalid || undefined}
          onChange={(e) => {
            const all = e.target.value.replace(/\D/g, '');
            // saisie automatique du SMS (« one-time-code ») : le code entier arrive dans la première case
            if (all.length > 1 && i === 0) { onChange(all.slice(0, length)); focus(all.length); return; }
            const c = all.slice(-1); set(i, c); if (c) focus(i + 1);
          }}
          onKeyDown={onKey(i)}
          onPaste={(e) => {
            const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!p) return;
            e.preventDefault(); onChange(p); focus(p.length);
          }} />
      ))}
    </div>
  );
}

/* ---------- Étapes ---------- */
/** Parcours en étapes ; `current` commence à 0. Sous 640 px, seule l'étape courante garde son libellé. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="steps-compact" aria-hidden>{t('ui.step', { n: current + 1, total: steps.length })} · {steps[current]}</p>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={s} className={`step${i < current ? ' is-done' : ''}`} aria-current={i === current ? 'step' : undefined}>
            <span className="st-label">{s}{i < current && <span className="sr-only"> ({t('ui.stepDone')})</span>}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Onglets ---------- */
export interface TabItem { id: string; label: ReactNode; count?: number; content: ReactNode }
/** Onglets ARIA (flèches, Début, Fin). Contrôlé si `value` est fourni. */
export function Tabs({ tabs, value, onChange, label }: { tabs: TabItem[]; value?: string; onChange?: (id: string) => void; label: string }) {
  const uid = useId();
  const [own, setOwn] = useState(tabs[0]?.id);
  const cur = value ?? own;
  const pick = (id: string, focus?: boolean) => {
    setOwn(id); onChange?.(id);
    if (focus) document.getElementById(`${uid}-t-${id}`)?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((x) => x.id === cur);
    const n = { ArrowRight: i + 1, ArrowLeft: i - 1 + tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
    if (n === undefined) return;
    e.preventDefault(); pick(tabs[n % tabs.length].id, true);
  };
  return (
    <div>
      <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
        {tabs.map((x) => (
          <button key={x.id} type="button" role="tab" id={`${uid}-t-${x.id}`} className="tab" aria-selected={x.id === cur}
            aria-controls={`${uid}-p-${x.id}`} tabIndex={x.id === cur ? 0 : -1} onClick={() => pick(x.id)}>
            {x.label}{x.count !== undefined && <span className="count">{x.count}</span>}
          </button>
        ))}
      </div>
      {tabs.map((x) => (
        <div key={x.id} role="tabpanel" id={`${uid}-p-${x.id}`} aria-labelledby={`${uid}-t-${x.id}`} className="tab-panel" hidden={x.id !== cur} tabIndex={0}>
          {x.id === cur && x.content}
        </div>
      ))}
    </div>
  );
}

/* ---------- Puces de filtre ---------- */
export interface ChipOption { value: string; label: ReactNode; count?: number }
/** Filtres en puces (aria-pressed). `single` : une seule valeur active à la fois. */
export function Chips({ options, value, onChange, label, single }: { options: ChipOption[]; value: string[]; onChange: (v: string[]) => void; label: string; single?: boolean }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" className="chip" aria-pressed={on}
            onClick={() => onChange(single ? [o.value] : on ? value.filter((v) => v !== o.value) : [...value, o.value])}>
            {o.label}{o.count !== undefined && <span className="count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Carte ---------- */
/** Carte de contenu. Avec `title`, la section est nommée par son titre (h2 par défaut). */
export function Card({ title, sub, actions, foot, tone, as: Tag = 'section', headingLevel = 2, className = '', children }: {
  title?: ReactNode; sub?: ReactNode; actions?: ReactNode; foot?: ReactNode; tone?: 'flat' | 'tint' | 'dark';
  as?: 'section' | 'div' | 'article'; headingLevel?: 2 | 3; className?: string; children?: ReactNode;
}) {
  const hid = useId();
  const H = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <Tag className={`card${tone ? ` card--${tone}` : ''} ${className}`} aria-labelledby={title ? hid : undefined}>
      {(title || actions) && (
        <div className="card-head">
          <div>{title && <H className="card-title" id={hid}>{title}</H>}{sub && <p className="card-sub">{sub}</p>}</div>
          {actions}
        </div>
      )}
      {children}
      {foot && <div className="card-foot">{foot}</div>}
    </Tag>
  );
}

/* ---------- Chronologie ---------- */
export interface TimelineItem { time?: ReactNode; title: ReactNode; text?: ReactNode; state?: 'done' | 'now' | 'alert' }
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((it, i) => (
        <li key={i} className={it.state ? `tl-${it.state}` : undefined} aria-current={it.state === 'now' ? 'step' : undefined}>
          <span className="tl-dot" aria-hidden />
          {it.time && <div className="tl-time">{it.time}</div>}
          <div className="tl-title">{it.title}</div>
          {it.text && <div className="tl-text">{it.text}</div>}
        </li>
      ))}
    </ol>
  );
}

/* ---------- Tuile de chiffre (avec parcimonie : un chiffre qui sert une décision) ---------- */
export function Stat({ label, value, unit, delta, foot, tone }: { label: ReactNode; value: ReactNode; unit?: ReactNode; delta?: { text: ReactNode; down?: boolean }; foot?: ReactNode; icon?: IconName; tone?: 'mint' | 'peach' | 'butter' | 'sky' }) {
  const { t } = useTranslation();
  return (
    <div className={`stat${tone ? ` stat--${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value num">{value}{unit && <small>{unit}</small>}</span>
      {delta && <span className={`stat-delta${delta.down ? ' stat-delta--down' : ''}`}><Icon name={delta.down ? 'arrow-down' : 'arrow-up'} />{delta.text}</span>}
      {foot && <details className="stat-src"><summary aria-label={t('refonte.statInfo')} title={t('refonte.statInfo')}><Icon name="info" /></summary><span className="stat-foot">{foot}</span></details>}
    </div>
  );
}

/* ---------- Carte d'accueil (image 2 : « Bonjour, Mia ! ») et tuiles d'accès rapide (image 1) ---------- */
export function Hero({ title, text, actions, aside }: { title: ReactNode; text?: ReactNode; actions?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="hero">
      <div className="hero-body">
        <h1 className="page-title">{title}</h1>
        {text && <p className="hero-text">{text}</p>}
        {actions && <div className="cluster hero-actions" style={{ ['--gap' as string]: '10px' }}>{actions}</div>}
      </div>
      {aside && <div className="hero-aside">{aside}</div>}
    </section>
  );
}

export function QuickTiles({ label, items }: { label: string; items: { to: string; icon: IconName; label: string; sub?: string }[] }) {
  return (
    <nav className="tiles" aria-label={label}>
      {items.map((it, i) => (
        <Link key={it.to} className={`tile tile--${['mint', 'peach', 'butter', 'sky'][i % 4]}`} to={it.to}>
          <span className="tile-ic"><Icon name={it.icon} /></span>
          <span className="tile-t">{it.label}{it.sub && <small>{it.sub}</small>}</span>
        </Link>
      ))}
    </nav>
  );
}

/* ---------- Avatar ---------- */
export const initials = (name: string) => name.replace(/^Dr\.? /, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
export function Avatar({ name, size, dark, src }: { name: string; size?: 'sm' | 'lg'; dark?: boolean; src?: string }) {
  return (
    <span className={`avatar${size ? ` avatar--${size}` : ''}${dark ? ' avatar--dark' : ''}`} aria-hidden>
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}

/* ---------- Notifications éphémères ---------- */
export type ToastType = 'ok' | 'error' | 'demo' | 'info' | 'offline';
interface ToastItem { id: number; text: string; title?: string; type: ToastType; leaving?: boolean }
let toasts: ToastItem[] = [];
let nextId = 1;
const subs = new Set<() => void>();
const emit = () => subs.forEach((l) => l());
const TOAST_ICON: Record<ToastType, IconName> = { ok: 'check-circle', error: 'alert', demo: 'info', info: 'info', offline: 'wifi-off' };

/** Retire une notification après sa courte animation de sortie. */
export function dismissToast(id: number) {
  toasts = toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x)); emit();
  setTimeout(() => { toasts = toasts.filter((x) => x.id !== id); emit(); }, 220);
}
/** Affiche une notification (5 s par défaut, `timeout: 0` = jusqu'à fermeture). Rendue par <Toaster />, monté dans la coque. */
export function toast(o: string | { text: string; title?: string; type?: ToastType; timeout?: number }) {
  const opts = typeof o === 'string' ? { text: o } : o;
  const id = nextId++;
  toasts = [...toasts, { id, text: opts.text, title: opts.title, type: opts.type ?? 'ok' }]; emit();
  if (opts.timeout !== 0) setTimeout(() => dismissToast(id), opts.timeout ?? 5000);
  return id;
}
const subscribe = (l: () => void) => { subs.add(l); return () => { subs.delete(l); }; };
const snapshot = () => toasts;

export function Toaster() {
  const { t } = useTranslation();
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  // Région vivante toujours présente (pas de role="status" : il y en a déjà d'autres dans la page).
  return (
    <div className="toasts" aria-live="polite">
      {list.map((x) => (
        <div key={x.id} className={`toast toast--${x.type}${x.leaving ? ' is-leaving' : ''}`}>
          <Icon name={TOAST_ICON[x.type]} />
          <div className="to-body">{x.title && <b>{x.title}</b>}<span>{x.text}</span></div>
          <button type="button" className="btn btn-icon" aria-label={t('ui.closeToast')} onClick={() => dismissToast(x.id)}><Icon name="x" /></button>
        </div>
      ))}
    </div>
  );
}
