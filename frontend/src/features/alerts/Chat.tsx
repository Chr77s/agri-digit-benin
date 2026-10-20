import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { Alert, Badge, Button, Card, EmptyState, Field, QueryState, Textarea, fmtDateTime } from '../../shared/ui';

interface ChatMsg { id: string; body: string; created_at: string; read_at: string | null; from_producer: boolean; mine: boolean }
interface Thread { producer: { id: string; code: string; name: string }; results: ChatMsg[] }
interface ThreadRow { producer_id: string; code: string; name: string; commune: string; last_at: string; unread: number }

/** Fil d'un producteur : le sien (producteur, sans `producerId`) ou celui d'un producteur du secteur (agent). */
export function ChatThread({ producerId }: { producerId?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const url = producerId ? `/chat/${producerId}` : '/chat';
  const q = useQuery({ queryKey: ['chat', producerId ?? 'mine'], queryFn: () => api<Thread>(url), refetchInterval: 15000 });
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => api<Thread>(url, { method: 'POST', body: { body } }),
    onSuccess: (d) => { setBody(''); qc.setQueryData(['chat', producerId ?? 'mine'], d); void qc.invalidateQueries({ queryKey: ['chat', 'threads'] }); },
  });
  return (
    <Card title={producerId ? (q.data ? `${q.data.producer.name} · ${q.data.producer.code}` : t('chat.title')) : t('chat.titleProducer')}>
      <QueryState q={q}>
        {(d) => (
          <div className="stack" style={{ ['--gap' as string]: '12px' }}>
            {d.results.length === 0 && <p className="muted">{producerId ? t('chat.emptyAgent') : t('chat.emptyProducer')}</p>}
            <ol className="stack" style={{ ['--gap' as string]: '8px', listStyle: 'none', padding: 0 }} aria-label={t('chat.list')}>
              {d.results.map((m) => (
                <li key={m.id} className={`bubble${m.mine ? ' is-mine' : ''}`} style={{ marginInlineStart: m.mine ? 'auto' : 0, maxWidth: '85%' }}>
                  <p className="small muted">{m.mine ? t('chat.me') : m.from_producer ? d.producer.name : t('chat.agent')} · <span className="num">{fmtDateTime(m.created_at)}</span></p>
                  <p className="whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ol>
            <form className="stack" style={{ ['--gap' as string]: '8px' }} onSubmit={(e) => { e.preventDefault(); if (body.trim()) send.mutate(); }}>
              <Field label={t('chat.write')} hint={t('chat.hint')}>
                {(p) => <Textarea {...p} rows={3} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />}
              </Field>
              {send.error && <Alert tone="danger" live>{send.error.message}</Alert>}
              <Button type="submit" icon="send" busy={send.isPending} disabled={!body.trim()}>{t('chat.send')}</Button>
            </form>
          </div>
        )}
      </QueryState>
    </Card>
  );
}

/** Agent : fils des producteurs de son secteur, puis le fil choisi. */
export function AgentInbox() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['chat', 'threads'], queryFn: () => api<{ results: ThreadRow[] }>('/chat/threads'), refetchInterval: 15000 });
  const [cur, setCur] = useState<string | null>(null);
  return (
    <div className="split">
      <QueryState q={q} empty={(d) => d.results.length === 0}
        emptyText={<div className="card"><EmptyState icon="users" title={t('chat.noThreads')}>{t('chat.noThreadsHelp')}</EmptyState></div>}>
        {(d) => (
          <section className="card inbox" aria-label={t('chat.threads')}>
            {d.results.map((r) => (
              <button key={r.producer_id} type="button" className={`msg-row${r.unread ? ' is-unread' : ''}`} aria-current={cur === r.producer_id ? 'true' : undefined}
                onClick={() => setCur(r.producer_id)} style={{ width: '100%', textAlign: 'start' }}>
                <div>
                  <h2>{r.name} <span className="small muted">· {r.code}</span></h2>
                  <div className="m-meta"><span className="num">{fmtDateTime(r.last_at)}</span></div>
                </div>
                <div className="m-act">{r.unread > 0 && <Badge tone="wait">{t('chat.unread', { count: r.unread })}</Badge>}</div>
              </button>
            ))}
          </section>
        )}
      </QueryState>
      {cur ? <ChatThread key={cur} producerId={cur} /> : <Card><p className="muted">{t('chat.pick')}</p></Card>}
    </div>
  );
}
