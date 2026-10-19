import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { Alert, Badge, Button, Card, Chips, EmptyState, Icon, PageHeader, QueryState, Switch, fmtDateTime, speak, toast } from '../../shared/ui';
import type { Notification } from '../../shared/api/types';
import '../producers/producteur.css';
import { useMarkRead, useNotifications } from './api';

const isUnread = (n: Notification) => !(n.is_read ?? n.read_at);

export function NotificationsPage() {
  const { t } = useTranslation();
  const q = useNotifications();
  const read = useMarkRead();
  const qc = useQueryClient();
  const [filter, setFilter] = useState(['all']);
  const [allBusy, setAllBusy] = useState(false);
  const unread = (q.data ?? []).filter(isUnread);

  // Pas d'endpoint groupé : on marque chaque message, puis on recharge une fois.
  const markAll = async () => {
    setAllBusy(true);
    try {
      for (const n of unread) await api(`/notifications/${n.id}/read`, { method: 'POST', body: {} });
      toast({ text: t('notifications.allRead', { count: unread.length }) });
    } catch (e) {
      toast({ type: 'error', text: e instanceof Error ? e.message : t('common.errorGeneric') });
    } finally {
      setAllBusy(false);
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  return (
    <>
      <PageHeader title={t('nav.notifications')} desc={t('notifications.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.notifications') }]}
        actions={unread.length > 0 ? <Button variant="secondary" icon="check" busy={allBusy} onClick={() => void markAll()}>{t('notifications.markAll')}</Button> : undefined} />
      <div className="split">
        <div className="stack" style={{ ['--gap' as string]: '14px' }}>
          {read.error && <Alert tone="danger" live>{read.error.message}</Alert>}
          <QueryState q={q} empty={(d) => d.length === 0}
            emptyText={<div className="card"><EmptyState icon="bell" title={t('notifications.empty')}>{t('notifications.emptyHelp')}</EmptyState></div>}>
            {(d) => {
              const list = filter[0] === 'unread' ? d.filter(isUnread) : d;
              return (
                <>
                  <Chips single label={t('notifications.filter')} value={filter} onChange={setFilter}
                    options={[{ value: 'all', label: t('common.all'), count: d.length }, { value: 'unread', label: t('notifications.unreadF'), count: unread.length }]} />
                  <section className="card inbox" aria-label={t('notifications.list')}>
                    {list.length === 0 && <p className="muted" style={{ padding: '14px 18px' }}>{t('notifications.noneUnread')}</p>}
                    {list.map((n) => {
                      const un = isUnread(n);
                      const text = n.body ?? n.message ?? '';
                      return (
                        <article key={n.id} className={`msg-row${un ? ' is-unread' : ''}`}>
                          <span className="li-icon"><Icon name="bell" /></span>
                          <div>
                            <h2>
                              {un && <><span className="unread-dot" aria-hidden /><span className="sr-only">{t('notifications.unreadSr')}</span></>}
                              {n.title ?? t('notifications.message')}
                            </h2>
                            {text && <p>{text}</p>}
                            <div className="m-meta"><span className="num">{fmtDateTime(n.created_at)}</span></div>
                          </div>
                          <div className="m-act">
                            {'speechSynthesis' in window && (
                              <Button variant="ghost" size="sm" icon="megaphone" aria-label={t('notifications.listenNamed', { title: n.title ?? t('notifications.message') })} onClick={() => speak(`${n.title ?? ''}. ${text}`)}>{t('common.listen')}</Button>
                            )}
                            {un
                              ? <Button variant="ghost" size="sm" busy={read.isPending && read.variables === n.id} onClick={() => read.mutate(n.id)}>{t('notifications.markRead')}</Button>
                              : <Badge tone="neutral">{t('notifications.read')}</Badge>}
                          </div>
                        </article>
                      );
                    })}
                  </section>
                </>
              );
            }}
          </QueryState>
        </div>
        <Prefs />
      </div>
    </>
  );
}

/** Canaux de notification : pas encore d'API de préférences, l'état reste sur cet écran (étiqueté). */
function Prefs() {
  const { t } = useTranslation();
  const [on, setOn] = useState<Record<string, boolean>>({ urgent: true, decisions: true, voice: false, prices: true });
  return (
    <Card title={t('notifications.prefsTitle')} actions={<Badge tone="demo">{t('pr.demo')}</Badge>}>
      <fieldset className="fieldset">
        <legend className="sr-only">{t('notifications.prefsTitle')}</legend>
        {Object.keys(on).map((k) => <Switch key={k} label={t(`notifications.pref.${k}`)} checked={on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} />)}
      </fieldset>
      <p className="hint mt-2.5">{t('notifications.prefsHint')}</p>
    </Card>
  );
}
