import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, inputCls, Notice, SimulationBanner, fmtDateTime, ListenButton } from '../../shared/ui';
import { ApiError } from '../../shared/api/client';
import { useOtpInbox, useRequestOtp, useVerifyOtp } from './api';
import { useAuth } from './AuthContext';

// Les messages sont des clés de traduction : Field les traduit à l'affichage.
export const phoneSchema = z.string().regex(/^01\d{8}$/, 'login.errPhone');
const phoneForm = z.object({ phone: phoneSchema });
const codeForm = z.object({
  code: z.string().regex(/^\d{6}$/, 'login.errCode'),
  password: z.string().optional(),
});

export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const req = useRequestOtp();
  const verify = useVerifyOtp();
  const inbox = useOtpInbox(phone ?? '', !!phone);

  const f1 = useForm<z.infer<typeof phoneForm>>({ resolver: zodResolver(phoneForm) });
  const f2 = useForm<z.infer<typeof codeForm>>({ resolver: zodResolver(codeForm) });

  const onPhone = f1.handleSubmit(async ({ phone: p }) => {
    try {
      const r = await req.mutateAsync(p);
      setNeedsPassword(r.requires_password);
      setPhone(p);
    } catch { /* message affiché sous le formulaire */ }
  });

  const onCode = f2.handleSubmit(async ({ code, password }) => {
    if (needsPassword && !password) {
      f2.setError('password', { message: 'login.errPassword' });
      return;
    }
    try {
      const r = await verify.mutateAsync({ phone: phone!, code, ...(needsPassword ? { password } : {}) });
      signIn(r.access, r.user);
      nav('/', { replace: true });
    } catch { /* message affiché */ }
  });

  const lastCode = inbox.data?.[0];
  const reqErr = req.error instanceof ApiError ? req.error : null;
  const verErr = verify.error instanceof ApiError ? verify.error : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('login.title')}</h1>
        <ListenButton text={t('login.listen')} />
      </div>
      {!phone ? (
        <form onSubmit={onPhone} noValidate className="flex flex-col gap-4 rounded border border-border bg-surface p-4">
          <Field label={t('login.phone')} hint={t('login.phoneHint')} error={f1.formState.errors.phone?.message}>
            {(p) => <input {...p} {...f1.register('phone')} className={inputCls} type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} />}
          </Field>
          {reqErr && <Notice tone="error" live>{reqErr.message}</Notice>}
          <Button type="submit" busy={req.isPending}>{t('login.getCode')}</Button>
        </form>
      ) : (
        <form onSubmit={onCode} noValidate className="flex flex-col gap-4 rounded border border-border bg-surface p-4">
          <p aria-live="polite"><Trans i18nKey="login.codeSent" values={{ phone }} components={{ b: <strong /> }} /></p>
          {needsPassword && (
            <Field label={t('login.password')} error={f2.formState.errors.password?.message}>
              {(p) => <input {...p} {...f2.register('password')} className={inputCls} type="password" autoComplete="current-password" />}
            </Field>
          )}
          <Field label={t('login.code')} hint={t('login.codeHint')} error={f2.formState.errors.code?.message}>
            {(p) => <input {...p} {...f2.register('code')} className={inputCls} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />}
          </Field>
          {verErr && <Notice tone="error" live>{verErr.message}</Notice>}
          <Button type="submit" busy={verify.isPending}>{t('login.signIn')}</Button>
          <Button variant="ghost" onClick={() => { setPhone(null); verify.reset(); f2.reset(); }}>{t('login.changeNumber')}</Button>
        </form>
      )}
      {phone && (
        <SimulationBanner>
          {lastCode ? (
            <p><Trans i18nKey="login.lastSms" values={{ date: fmtDateTime(lastCode.created_at), body: lastCode.body }} components={{ b: <strong /> }} /></p>
          ) : inbox.isError ? (
            <p>{t('login.inboxDown')}</p>
          ) : (
            <p>{t('login.waitingSms')}</p>
          )}
        </SimulationBanner>
      )}
      <p>
        {t('login.noAccount')} <Link className="font-semibold text-brand underline" to="/inscription">{t('login.registerLink')}</Link>
      </p>
    </div>
  );
}
