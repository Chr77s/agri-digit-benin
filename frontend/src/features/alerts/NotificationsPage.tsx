import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ListenButton, Notice, PageHeader, QueryState, fmtDateTime } from '../../shared/ui';
import { useMarkRead, useNotifications } from './api';

export function NotificationsPage() {
  const { t } = useTranslation();
  const q = useNotifications();
  const read = useMarkRead();
  return (
    <>
      <PageHeader title={t('nav.notifications')} listen={t('notifications.listen')} />
      {read.error && <Notice tone="error" live>{read.error.message}</Notice>}
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('notifications.empty')}>{t('notifications.emptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.map((n) => {
              const unread = !(n.is_read ?? n.read_at);
              const text = n.body ?? n.message ?? '';
              return (
                <li key={n.id} className={`flex flex-col gap-2 rounded border bg-surface p-3 ${unread ? 'border-brand' : 'border-border'}`}>
                  <p className="flex items-center gap-2 font-semibold"><Bell aria-hidden size={18} /> {n.title ?? t('notifications.message')} {unread && <span className="text-sm text-brand">({t('notifications.unread')})</span>}</p>
                  <p>{text}</p>
                  <p className="text-sm text-muted">{fmtDateTime(n.created_at)}</p>
                  <div className="flex flex-wrap gap-2">
                    <ListenButton text={`${n.title ?? ''}. ${text}`} />
                    {unread && <Button variant="ghost" busy={read.isPending && read.variables === n.id} onClick={() => read.mutate(n.id)}>{t('notifications.markRead')}</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </>
  );
}
