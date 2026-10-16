import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Field, inputCls, Notice, SimulationBanner, fmtDateTime, ListenButton } from '../../shared/ui';
import { ApiError } from '../../shared/api/client';
import { useOtpInbox, useRequestOtp, useVerifyOtp } from './api';
import { useAuth } from './AuthContext';

export const phoneSchema = z.string().regex(/^01\d{8}$/, 'Saisissez 10 chiffres commençant par 01, par exemple 0197000001.');
const phoneForm = z.object({ phone: phoneSchema });
const codeForm = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code contient 6 chiffres. Recopiez le code reçu par SMS.'),
  password: z.string().optional(),
});

export function LoginPage() {
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
      f2.setError('password', { message: 'Saisissez votre mot de passe de compte agent ou administrateur.' });
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
        <h1 className="text-2xl font-semibold">Connexion</h1>
        <ListenButton text="Connexion. Saisissez votre numéro de téléphone, puis le code reçu par SMS." />
      </div>
      {!phone ? (
        <form onSubmit={onPhone} noValidate className="flex flex-col gap-4 rounded border border-border bg-surface p-4">
          <Field label="Numéro de téléphone" hint="10 chiffres, commence par 01" error={f1.formState.errors.phone?.message}>
            {(p) => <input {...p} {...f1.register('phone')} className={inputCls} type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} />}
          </Field>
          {reqErr && <Notice tone="error" live>{reqErr.message}</Notice>}
          <Button type="submit" busy={req.isPending}>Recevoir le code</Button>
        </form>
      ) : (
        <form onSubmit={onCode} noValidate className="flex flex-col gap-4 rounded border border-border bg-surface p-4">
          <p aria-live="polite">Code envoyé au <strong>{phone}</strong>.</p>
          {needsPassword && (
            <Field label="Mot de passe" error={f2.formState.errors.password?.message}>
              {(p) => <input {...p} {...f2.register('password')} className={inputCls} type="password" autoComplete="current-password" />}
            </Field>
          )}
          <Field label="Code à 6 chiffres" hint="Valable 10 minutes" error={f2.formState.errors.code?.message}>
            {(p) => <input {...p} {...f2.register('code')} className={inputCls} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />}
          </Field>
          {verErr && <Notice tone="error" live>{verErr.message}</Notice>}
          <Button type="submit" busy={verify.isPending}>Se connecter</Button>
          <Button variant="ghost" onClick={() => { setPhone(null); verify.reset(); f2.reset(); }}>Changer de numéro</Button>
        </form>
      )}
      {phone && (
        <SimulationBanner>
          {lastCode ? (
            <p>Dernier SMS simulé ({fmtDateTime(lastCode.created_at)}) : <strong>{lastCode.body}</strong></p>
          ) : inbox.isError ? (
            <p>Boîte de réception simulée indisponible.</p>
          ) : (
            <p>En attente du SMS simulé...</p>
          )}
        </SimulationBanner>
      )}
      <p>
        Pas encore inscrit ? <Link className="font-semibold text-brand underline" to="/inscription">S'inscrire comme producteur</Link>
      </p>
    </div>
  );
}
