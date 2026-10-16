import { Bell } from 'lucide-react';
import { Button, EmptyState, ListenButton, Notice, PageHeader, QueryState, fmtDateTime } from '../../shared/ui';
import { useMarkRead, useNotifications } from './api';

export function NotificationsPage() {
  const q = useNotifications();
  const read = useMarkRead();
  return (
    <>
      <PageHeader title="Mes messages" listen="Mes messages. Vos alertes et les nouvelles de votre inscription." />
      {read.error && <Notice tone="error" live>{read.error.message}</Notice>}
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title="Aucun message pour le moment.">Les alertes de votre agent et les décisions sur vos demandes apparaîtront ici.</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-2">
            {d.map((n) => {
              const unread = !(n.is_read ?? n.read_at);
              const text = n.body ?? n.message ?? '';
              return (
                <li key={n.id} className={`flex flex-col gap-2 rounded border bg-surface p-3 ${unread ? 'border-brand' : 'border-border'}`}>
                  <p className="flex items-center gap-2 font-semibold"><Bell aria-hidden size={18} /> {n.title ?? 'Message'} {unread && <span className="text-sm text-brand">(non lu)</span>}</p>
                  <p>{text}</p>
                  <p className="text-sm text-muted">{fmtDateTime(n.created_at)}</p>
                  <div className="flex flex-wrap gap-2">
                    <ListenButton text={`${n.title ?? ''}. ${text}`} />
                    {unread && <Button variant="ghost" busy={read.isPending && read.variables === n.id} onClick={() => read.mutate(n.id)}>Marquer comme lu</Button>}
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
