import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../shared/api/client';
import type { User } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Field, OtpInput, PhoneInput, fmtDateTime } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useOtpInbox } from '../auth/api';
import { phoneSchema } from '../auth/LoginPage';
import { useOfflineStatus } from '../outbox/offlineQueue';

export const maskPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 2)} ${p.slice(2, 4)} •• •• ${p.slice(-2)}` : p);

/** Changement de numéro (producteur) : code SMS envoyé au nouveau numéro, puis confirmation ; maquette web/producteur/profil.html. */
export function PhoneChangeCard() {
  const { t } = useTranslation();
  const { user, signIn } = useAuth();
  const { online } = useOfflineStatus();
  const [phone, setPhone] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [phoneErr, setPhoneErr] = useState<string>();
  const req = useMutation({ mutationFn: (new_phone: string) => api('/auth/phone-change/request', { method: 'POST', body: { new_phone } }) });
  const confirm = useMutation({ mutationFn: (c: string) => api<{ access: string; user: User }>('/auth/phone-change/confirm', { method: 'POST', body: { code: c } }) });
  const inbox = useOtpInbox(sentTo ?? '', !!sentTo);
  const lastSms = inbox.data?.[0];
  if (!user) return null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = phone.replace(/\D/g, '');
    if (!phoneSchema.safeParse(p).success) return setPhoneErr('login.errPhone');
    setPhoneErr(undefined);
    try { await req.mutateAsync(p); setSentTo(p); setCode(''); confirm.reset(); } catch { /* erreur affichée ci-dessous */ }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    try { const r = await confirm.mutateAsync(code); signIn(r.access, r.user); setSentTo(null); setPhone(''); } catch { /* idem */ }
  };
  const reqErr = req.error instanceof ApiError ? req.error : null;
  const confErr = confirm.error instanceof ApiError ? confirm.error : null;

  return (
    <Card title={t('profile.phoneTitle')}>
      <p>{t('profile.phoneNow')} <b className="num">{maskPhone(user.phone)}</b> · {t('profile.phoneUse')}</p>
      {confirm.isSuccess && <div className="mt-3"><Alert tone="ok" live>{t('profile.phoneDone')}</Alert></div>}
      {!online && <div className="mt-3"><Alert tone="warn" icon="wifi-off">{t('profile.phoneOffline')}</Alert></div>}
      {!sentTo ? (
        <form className="mt-3 stack" style={{ ['--gap' as string]: '12px' }} onSubmit={(e) => void send(e)} noValidate>
          <Field label={t('profile.phoneNew')} hint={t('login.phoneHint')} error={phoneErr ?? reqErr?.body.fields?.new_phone?.[0]}>
            {(p) => <PhoneInput {...p} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} />}
          </Field>
          {reqErr && !reqErr.body.fields && <Alert tone="danger" live>{reqErr.message}</Alert>}
          <div><Button type="submit" variant="secondary" icon="phone" busy={req.isPending} disabled={!online}>{t('profile.phoneSend')}</Button></div>
        </form>
      ) : (
        <form className="mt-3 stack" style={{ ['--gap' as string]: '12px' }} onSubmit={(e) => void submit(e)} noValidate>
          <Alert tone="ok" live>{t('profile.phoneSent', { phone: maskPhone(sentTo) })}</Alert>
          <OtpInput value={code} onChange={(v) => { setCode(v); confirm.reset(); }} label={t('login.code')} invalid={!!confErr} autoFocus />
          {confErr && <Alert tone="danger" live>{confErr.message}</Alert>}
          <Alert tone="demo" icon="phone" live
            title={<>{lastSms ? t('login.smsAt', { date: fmtDateTime(lastSms.created_at) }) : t('login.waitingSms')} <Badge tone="sim">{t('common.simulation')}</Badge></>}>
            {lastSms ? <span className="sms">{lastSms.body}</span> : t('login.waitingHelp')}
          </Alert>
          <div className="cluster">
            <Button type="submit" busy={confirm.isPending} disabled={code.length !== 6 || !online}>{t('profile.phoneConfirm')}</Button>
            <Button variant="ghost" onClick={() => { setSentTo(null); confirm.reset(); }}>{t('login.changeNumber')}</Button>
          </div>
        </form>
      )}
      <p className="hint mt-3">{t('profile.phoneHelp')}</p>
    </Card>
  );
}
