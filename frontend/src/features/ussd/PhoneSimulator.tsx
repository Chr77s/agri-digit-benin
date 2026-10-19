import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../shared/api/client';
import { Alert, Badge, Button, Card, Field, Input, PhoneInput } from '../../shared/ui';
import './ussd.css';

const CODE = '*000#'; // code d'exemple : le vrai code court sera attribué par l'opérateur

/** Simulateur de téléphone simple (maquette mobile « Téléphone simple ») : USSD et SMS passent par les passerelles
 * du serveur, ouvertes seulement en mode démonstration. Les SMS de réponse arrivent aussi dans la boîte d'envoi. */
export function PhoneSimulator() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [phone, setPhone] = useState('0197000001');
  const [path, setPath] = useState<string[] | null>(null); // null : pas d'appel en cours
  const [screen, setScreen] = useState('');
  const [ended, setEnded] = useState(false);
  const [input, setInput] = useState('');
  const [sms, setSms] = useState('PRIX MAIS');
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);

  const ussd = useMutation({
    mutationFn: async (next: string[]) => {
      const b = await api<Blob>('/ussd/gateway', { method: 'POST', raw: true, body: { sessionId: `sim-${phone}`, phoneNumber: phone, text: next.join('*') } });
      return { next, reply: await b.text() };
    },
    onSuccess: ({ next, reply }) => {
      setPath(next); setEnded(reply.startsWith('END')); setScreen(reply.replace(/^(CON|END) /, '')); setInput('');
    },
  });
  const send = useMutation({
    mutationFn: (text: string) => api<{ reply: string }>('/sms/inbound', { method: 'POST', body: { sender: phone, text } }),
    onSuccess: (r, text) => { setThread((th) => [...th, { q: text, a: r.reply }]); void qc.invalidateQueries({ queryKey: ['outbox'] }); },
  });
  const closed = (e: unknown) => e instanceof ApiError && e.status === 404;
  const hangUp = () => { setPath(null); setScreen(''); setEnded(false); setInput(''); ussd.reset(); };

  return (
    <Card title={t('ussd.title')} sub={t('ussd.sub', { code: CODE })} actions={<Badge tone="sim">{t('common.simulation')}</Badge>}>
      <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
        <div style={{ maxWidth: 260 }}>
          <Field label={t('ussd.phone')} hint={t('ussd.phoneHint')}>{(p) => <PhoneInput {...p} value={phone} maxLength={10} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); hangUp(); setThread([]); }} />}</Field>
        </div>
        {(closed(ussd.error) || closed(send.error)) && <Alert tone="warn">{t('ussd.closed')}</Alert>}
        <div className="grid-fit" style={{ '--min': '260px', '--gap': '20px' } as React.CSSProperties}>
          <section aria-labelledby="sim-ussd" className="fp">
            <h3 className="card-title" id="sim-ussd">{t('ussd.ussd')}</h3>
            <div className="fp-lcd" role="status" aria-live="polite">{path === null ? t('ussd.idle', { code: CODE }) : screen}</div>
            {path === null ? (
              <Button block icon="phone" busy={ussd.isPending} disabled={phone.length !== 10} onClick={() => ussd.mutate([])}>{t('ussd.call', { code: CODE })}</Button>
            ) : (
              <form className="stack" style={{ '--gap': '8px' } as React.CSSProperties} onSubmit={(e) => { e.preventDefault(); if (!ended && input.trim()) ussd.mutate([...path, input.trim()]); }}>
                {!ended && <Input aria-label={t('ussd.answer')} value={input} onChange={(e) => setInput(e.target.value)} autoFocus inputMode={path[0] === '3' && path.length === 1 ? 'text' : 'numeric'} />}
                <div className="cluster">
                  {!ended && <Button type="submit" busy={ussd.isPending} disabled={!input.trim()}>{t('ussd.reply')}</Button>}
                  <Button variant="secondary" onClick={hangUp}>{ended ? t('ussd.close') : t('ussd.hangUp')}</Button>
                </div>
              </form>
            )}
            {ussd.error && !closed(ussd.error) && <Alert tone="danger" live>{ussd.error.message}</Alert>}
          </section>
          <section aria-labelledby="sim-sms" className="fp">
            <h3 className="card-title" id="sim-sms">{t('ussd.sms')}</h3>
            <ol className="fp-thread" aria-live="polite">
              {thread.length === 0 && <li className="small muted">{t('ussd.smsHelp')}</li>}
              {thread.map((m, i) => (
                <li key={i}><p className="fp-out">{m.q}</p><p className="fp-in">{m.a}</p></li>
              ))}
            </ol>
            <form className="cluster" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); if (sms.trim()) send.mutate(sms.trim()); }}>
              <Input aria-label={t('ussd.smsText')} value={sms} onChange={(e) => setSms(e.target.value)} />
              <Button type="submit" busy={send.isPending} disabled={!sms.trim() || phone.length !== 10}>{t('ussd.send')}</Button>
            </form>
            {send.error && !closed(send.error) && <Alert tone="danger" live>{send.error.message}</Alert>}
          </section>
        </div>
      </div>
    </Card>
  );
}
