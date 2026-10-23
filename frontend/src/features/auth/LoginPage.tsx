import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Badge, Button, Field, Icon, ListenButton, OtpInput, PhoneInput, Tabs, fmtDateTime, useMsg } from '../../shared/ui';
import { ApiError } from '../../shared/api/client';
import { useOtpInbox, useRequestOtp, useVerifyOtp } from './api';
import { useAuth } from './AuthContext';
import './access.css';
import art from './img/champ-1440.jpg';
import artSm from './img/champ-390.jpg';

// Les messages sont des clés de traduction : Field les traduit à l'affichage.
export const phoneSchema = z.string().regex(/^01\d{8}$/, 'login.errPhone');
const phoneForm = z.object({ phone: phoneSchema });
const RESEND_S = 45;

const subscribeOnline = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
};
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine);

/** Numéro national lisible : 0197421806 -> 01 97 42 18 06. */
const spaced = (p: string) => p.replace(/(\d{2})(?=\d)/g, '$1 ');

type Kind = 'prod' | 'agent';

export function LoginPage() {
  const { t } = useTranslation();
  const msg = useMsg();
  const nav = useNavigate();
  const { signIn } = useAuth();
  const online = useOnline();
  const [kind, setKind] = useState<Kind>('prod');
  const [phone, setPhone] = useState<string | null>(null);
  const [serverWantsPassword, setServerWantsPassword] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState<string>();
  const [password, setPassword] = useState('');
  const [pwErr, setPwErr] = useState<string>();
  const [showPw, setShowPw] = useState(false);
  const [wait, setWait] = useState(0);
  const req = useRequestOtp();
  const verify = useVerifyOtp();
  const inbox = useOtpInbox(phone ?? '', !!phone);
  const f1 = useForm<z.infer<typeof phoneForm>>({ resolver: zodResolver(phoneForm) });
  // Agent ou partenaire : mot de passe toujours demandé ; producteur : seulement si le serveur l'exige pour ce compte.
  const needsPassword = serverWantsPassword || kind === 'agent';

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const send = async (p: string) => {
    const r = await req.mutateAsync(p);
    setServerWantsPassword(r.requires_password);
    setPhone(p);
    setWait(RESEND_S);
    verify.reset();
  };
  const onPhone = f1.handleSubmit(async ({ phone: p }) => { try { await send(p); } catch { /* message affiché sous le formulaire */ } });
  const resend = async () => { try { await send(phone!); setCode(''); } catch { /* idem */ } };

  const onCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const badCode = !/^\d{6}$/.test(code);
    const noPw = needsPassword && !password;
    setCodeErr(badCode ? 'login.errCode' : undefined);
    setPwErr(noPw ? 'login.errPassword' : undefined);
    if (badCode || noPw) return;
    try {
      const r = await verify.mutateAsync({ phone: phone!, code, ...(needsPassword ? { password } : {}) });
      signIn(r.access, r.user);
      nav('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_password') setPwErr(err.message);
      else if (err instanceof ApiError && err.code === 'invalid_code') setCodeErr(err.message);
    }
  };
  const back = () => { setPhone(null); setCode(''); setPassword(''); setCodeErr(undefined); setPwErr(undefined); verify.reset(); };

  const reqErr = req.error;
  const verErr = verify.error instanceof ApiError ? verify.error : null;
  const lastSms = inbox.data?.[0];

  const stepPhone = (
    <form onSubmit={onPhone} noValidate className="card stack" style={{ ['--gap' as string]: '18px' }}>
      <Field label={t('login.phone')} hint={t('login.phoneHint')} error={f1.formState.errors.phone?.message}>
        {(p) => <PhoneInput {...p} {...f1.register('phone')} maxLength={10} />}
      </Field>
      {reqErr && <Alert tone="danger" icon={reqErr instanceof ApiError && reqErr.code === 'locked' ? 'lock' : undefined} live>{reqErr.message}</Alert>}
      {!online && <div className="banner banner--offline" style={{ borderRadius: 'var(--r-md)' }}><Icon name="wifi-off" /><span>{t('login.offline')}</span></div>}
      <Button type="submit" block busy={req.isPending} disabled={!online}>{t('login.getCode')}</Button>
    </form>
  );

  const stepCode = phone && (
    <form onSubmit={onCode} noValidate className="card stack" style={{ ['--gap' as string]: '18px' }}>
      <p aria-live="polite"><Trans i18nKey="login.codeSent" values={{ phone: spaced(phone) }} components={{ b: <strong className="num" /> }} /></p>
      <fieldset className="fieldset">
        <legend className="label">{t('login.code')}</legend>
        <OtpInput value={code} onChange={(v) => { setCode(v); setCodeErr(undefined); }} label={t('login.code')} invalid={!!codeErr} autoFocus />
        <span className="hint">{t(kind === 'prod' ? 'login.codeHintFull' : 'login.codeHint')}</span>
        {codeErr && <span className="error-msg" role="alert"><Icon name="alert" />{msg(codeErr)}</span>}
      </fieldset>
      {needsPassword && (
        <Field label={t('login.password')} hint={t('login.passwordHint')} error={pwErr}>
          {(p) => (
            <div className="pw">
              <input {...p} className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
                onChange={(e) => { setPassword(e.target.value); setPwErr(undefined); }} />
              <button type="button" className="btn btn-icon" aria-pressed={showPw} aria-label={t(showPw ? 'login.hidePassword' : 'login.showPassword')} onClick={() => setShowPw((s) => !s)}>
                <Icon name={showPw ? 'eye-off' : 'eye'} />
              </button>
            </div>
          )}
        </Field>
      )}
      <div className="resend-row">
        {wait > 0 ? (
          <div className="timer" role="timer">
            <Icon name="clock" /><span>{t('login.resendIn')} <b>{`0:${String(wait).padStart(2, '0')}`}</b></span>
            <span className="timer-bar" aria-hidden><span style={{ ['--v' as string]: `${(wait / RESEND_S) * 100}%` }} /></span>
          </div>
        ) : <span />}
        <Button variant="ghost" size="sm" disabled={wait > 0 || !online} busy={req.isPending} onClick={() => void resend()}>{t('login.resend')}</Button>
      </div>
      {verErr?.code === 'locked' && (
        <Alert tone="danger" icon="lock" live title={verErr.message}>{t('login.lockedHelp')}</Alert>
      )}
      {verErr?.code === 'code_expired' && (
        <Alert tone="warn" icon="clock" live title={verErr.message}
          actions={<Button variant="secondary" size="sm" disabled={!online} onClick={() => void resend()}>{t('login.resend')}</Button>}>
          {t('login.expiredHelp')}
        </Alert>
      )}
      {verErr && !['locked', 'code_expired', 'invalid_code', 'invalid_password'].includes(verErr.code ?? '') && <Alert tone="danger" live>{verErr.message}</Alert>}
      <Alert tone="demo" icon="phone" live
        title={<>{lastSms ? t('login.smsAt', { date: fmtDateTime(lastSms.created_at) }) : t('login.waitingSms')} <Badge tone="sim">{t('common.simulation')}</Badge></>}>
        {lastSms ? <span className="sms">{lastSms.body}</span> : inbox.isError ? t('login.inboxDown') : t('login.waitingHelp')}
      </Alert>
      <div className="stack" style={{ ['--gap' as string]: '8px' }}>
        <Button type="submit" block busy={verify.isPending} disabled={verErr?.code === 'locked'}>{t('login.signIn')}</Button>
        <Button variant="ghost" block onClick={back}>{t('login.changeNumber')}</Button>
      </div>
    </form>
  );

  const flow = (
    <div className="stack" style={{ ['--gap' as string]: '18px' }}>
      {phone ? stepCode : stepPhone}
    </div>
  );

  return (
    <div className="auth">
      <div className="auth-inner">
        <div>
          <div className="title-row">
            <h1 className="page-title">{t('login.title')}</h1>
            <ListenButton text={t('login.listen')} />
          </div>
          <p className="page-desc">{t('login.desc')}</p>
        </div>
        <Tabs label={t('login.accountType')} value={kind} onChange={(k) => setKind(k as Kind)}
          tabs={[{ id: 'prod', label: t('login.tabProducer'), content: flow }, { id: 'agent', label: t('login.tabAgent'), content: flow }]} />
        <nav className="aside-links" aria-label={t('login.otherAccess')}>
          <Link to="/inscription">{t('login.registerLink')}<Icon name="arrow-right" /></Link>
          <Link to="/verification"><Icon name="qr" />{t('login.verifyLink')}</Link>
        </nav>
      </div>
      <figure className="auth-art">
        <picture><source media="(max-width: 1023px)" srcSet={artSm} /><img src={art} alt="" width={1440} height={900} /></picture>
      </figure>
    </div>
  );
}
