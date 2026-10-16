import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Button, Notice } from '../../shared/ui';
import { keepLocal, keepServer, useOfflineStatus, type Conflict, type PendingWrite } from './offlineQueue';

type InConflict = PendingWrite & { conflict: Conflict };

// Champs techniques de concurrence : ils ne font pas partie de la saisie de l'utilisateur.
const TECHNICAL = new Set(['base_version', 'force']);

const asRecord = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});

function ConflictItem({ it }: { it: InConflict }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const uid = useId();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const mine = asRecord(it.body);
  const server = it.conflict.server;
  const keys = Object.keys(mine).filter((k) => !TECHNICAL.has(k));
  const none = t('common.notAvailable');
  const show = (v: unknown) => (v === null || v === undefined || v === '' ? none : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const differs = (k: string) => show(mine[k]) !== show(server[k]);
  const baseVersion = typeof mine.base_version === 'number' ? mine.base_version : null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      void qc.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('conflicts.errSend'));
    } finally {
      setBusy(false);
    }
  };

  const rows = (values: Record<string, unknown>) => keys.length === 0 ? <p className="mt-2 text-muted">{t('conflicts.noFields')}</p> : (
    <dl className="mt-2 flex flex-col gap-2">
      {keys.map((k) => (
        <div key={k}>
          <dt className="text-sm text-muted">{t(`conflicts.field.${k}`, { defaultValue: k })}</dt>
          <dd className="break-words font-semibold">
            {show(values[k])}
            {differs(k) && <span className="ml-2 text-sm font-semibold text-warn">({t('conflicts.differs')})</span>}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <li className="rounded border border-warn bg-surface p-3">
      <h3 className="text-lg font-semibold">{it.label}</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <section aria-labelledby={`${uid}-mine`} className="rounded border border-border p-3">
          <h4 id={`${uid}-mine`} className="font-semibold">{t('conflicts.mine')}</h4>
          {baseVersion !== null && <p className="text-sm text-muted">{t('conflicts.basedOn', { version: baseVersion })}</p>}
          {rows(mine)}
        </section>
        <section aria-labelledby={`${uid}-server`} className="rounded border border-border p-3">
          <h4 id={`${uid}-server`} className="font-semibold">{t('conflicts.server')}</h4>
          <p className="text-sm text-muted">{t('conflicts.serverVersion', { version: it.conflict.server_version })}</p>
          {rows(server)}
        </section>
      </div>
      <div aria-live="polite" className="mt-3 flex flex-col gap-2">
        {error && <p role="alert" className="text-error">{error}</p>}
        {confirming ? (
          <Notice tone="warn" live>
            <p className="mb-2">{t('conflicts.confirmDrop')}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" busy={busy} onClick={() => void run(() => keepServer(it.id!))}>{t('conflicts.confirmDropYes')}</Button>
              <Button variant="secondary" autoFocus disabled={busy} onClick={() => setConfirming(false)}>{t('common.cancel')}</Button>
            </div>
          </Notice>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(true)}>{t('conflicts.keepServer')}</Button>
            <Button busy={busy} onClick={() => void run(() => keepLocal(it))}>{t('conflicts.sendMine')}</Button>
          </div>
        )}
      </div>
    </li>
  );
}

/** UC-25 : saisies hors ligne en conflit avec le serveur. Aucune n'est supprimée sans action explicite. */
export function ConflictsPanel() {
  const { t } = useTranslation();
  const { pending } = useOfflineStatus();
  const items = pending.filter((p): p is InConflict => !!p.conflict);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="conflicts-title" className="border-b border-warn bg-warn-bg">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <h2 id="conflicts-title" className="flex items-center gap-2 text-xl font-semibold text-warn">
          <AlertTriangle aria-hidden size={20} /> {t('nav.conflicts')} ({items.length})
        </h2>
        <p className="mb-3 text-warn">{t('conflicts.intro')}</p>
        <ul className="flex flex-col gap-3">
          {items.map((it) => <ConflictItem key={it.id} it={it} />)}
        </ul>
      </div>
    </section>
  );
}
