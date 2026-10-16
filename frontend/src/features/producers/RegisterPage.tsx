import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { Button, Field, inputCls, Notice, Select, ListenButton, useMsg } from '../../shared/ui';
import { ApiError } from '../../shared/api/client';
import { useDepartments } from '../../shared/api/ref';
import type { Producer } from '../../shared/api/types';
import { useRegisterProducer } from './api';
import { useAuth } from '../auth/AuthContext';

export function ageOn(birth: string, ref = new Date()) {
  const b = new Date(birth);
  let a = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) a--;
  return a;
}

// Les messages sont des clés de traduction : Field et useMsg les traduisent à l'affichage.
const schema = z
  .object({
    npi: z.string().regex(/^\d{10}$/, 'register.errNpi'),
    first_name: z.string().trim().min(1, 'register.errFirstName'),
    last_name: z.string().trim().min(1, 'register.errLastName'),
    sex: z.enum(['F', 'M'], { errorMap: () => ({ message: 'register.errSex' }) }),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'register.errBirth'),
    department: z.string().min(1, 'register.errDepartment'),
    commune: z.string().min(1, 'register.errCommune'),
    phone: z.string().regex(/^01\d{8}$/, 'register.errPhone'),
    language: z.enum(['fr', 'fon', 'bba', 'yo', 'dnd']),
    consent_accepted: z.boolean(),
    guardian_name: z.string().optional(),
    guardian_npi: z.string().optional(),
    guardian_consent: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.consent_accepted) ctx.addIssue({ code: 'custom', path: ['consent_accepted'], message: 'register.errConsent' });
    if (v.birth_date && ageOn(v.birth_date) < 16) {
      if (!v.guardian_name?.trim()) ctx.addIssue({ code: 'custom', path: ['guardian_name'], message: 'register.errGuardianName' });
      if (!/^\d{10}$/.test(v.guardian_npi ?? '')) ctx.addIssue({ code: 'custom', path: ['guardian_npi'], message: 'register.errGuardianNpi' });
      if (!v.guardian_consent) ctx.addIssue({ code: 'custom', path: ['guardian_consent'], message: 'register.errGuardianConsent' });
    }
  });
export type RegisterForm = z.infer<typeof schema>;

/** Code d'erreur ANIP du serveur → clé de traduction du message. */
const anipMessages: Record<string, string> = {
  npi_unknown: 'register.anip.npi_unknown',
  name_mismatch: 'register.anip.name_mismatch',
  birthdate_mismatch: 'register.anip.birthdate_mismatch',
  anip_unavailable: 'register.anip.anip_unavailable',
  guardian_required: 'register.anip.guardian_required',
};
const anipField: Record<string, keyof RegisterForm> = {
  npi_unknown: 'npi', name_mismatch: 'last_name', birthdate_mismatch: 'birth_date', guardian_required: 'guardian_consent',
};

export function RegisterPage() {
  const { t } = useTranslation();
  const msg = useMsg();
  const { user } = useAuth();
  const deps = useDepartments();
  const reg = useRegisterProducer();
  const [done, setDone] = useState<Producer | null>(null);
  const f = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { language: 'fr', consent_accepted: false, guardian_consent: false, department: '', commune: '' },
  });
  const { register, watch, formState: { errors }, handleSubmit, setError } = f;
  const dep = watch('department');
  const birth = watch('birth_date');
  const minor = !!birth && /^\d{4}-\d{2}-\d{2}$/.test(birth) && ageOn(birth) < 16;
  const communes = deps.data?.find((d) => d.code === dep)?.communes ?? [];

  const onSubmit = handleSubmit(async (v) => {
    try {
      const body = {
        ...v,
        consent_accepted: true as const,
        consent_text_version: 'v1' as const,
        ...(minor ? {} : { guardian_name: undefined, guardian_npi: undefined, guardian_consent: undefined }),
      };
      setDone(await reg.mutateAsync(body));
    } catch (e) {
      if (e instanceof ApiError) {
        const code = e.code ?? '';
        if (anipField[code]) setError(anipField[code], { message: anipMessages[code] });
        Object.entries(e.body.fields ?? {}).forEach(([k, m]) => setError(k as keyof RegisterForm, { message: m[0] }));
      }
    }
  });

  if (done) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4" role="status" aria-live="polite">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><CheckCircle2 aria-hidden className="text-success" /> {t('register.doneTitle')}</h1>
        <Notice tone="success">
          <p><Trans i18nKey="register.doneCode" values={{ code: done.code }} components={{ b: <strong /> }} /></p>
          <p><Trans i18nKey="register.doneStatus" components={{ b: <strong /> }} /></p>
        </Notice>
        <ListenButton text={t('register.doneListen', { code: done.code })} />
        <Link to={user ? '/' : '/connexion'} className="font-semibold text-brand underline">{user ? t('register.backHome') : t('register.toLogin')}</Link>
      </div>
    );
  }

  const err = reg.error instanceof ApiError ? reg.error : null;
  const errCode = err?.code ?? '';
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('register.title')}</h1>
        <ListenButton text={t('register.listen')} />
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <fieldset className="grid gap-4 rounded border border-border bg-surface p-4 md:grid-cols-2">
          <legend className="px-1 text-lg font-semibold">{t('register.identity')}</legend>
          <Field label={t('register.npi')} error={errors.npi?.message}>
            {(p) => <input {...p} {...register('npi')} className={inputCls} inputMode="numeric" maxLength={10} />}
          </Field>
          <Field label={t('register.sex')} error={errors.sex?.message}>
            {(p) => <Select {...p} {...register('sex')} placeholder={t('common.choose')} options={[{ value: 'F', label: t('register.female') }, { value: 'M', label: t('register.male') }]} />}
          </Field>
          <Field label={t('register.firstName')} error={errors.first_name?.message}>
            {(p) => <input {...p} {...register('first_name')} className={inputCls} autoComplete="given-name" />}
          </Field>
          <Field label={t('register.lastName')} error={errors.last_name?.message}>
            {(p) => <input {...p} {...register('last_name')} className={inputCls} autoComplete="family-name" />}
          </Field>
          <Field label={t('register.birthDate')} error={errors.birth_date?.message}>
            {(p) => <input {...p} {...register('birth_date')} className={inputCls} type="date" />}
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 rounded border border-border bg-surface p-4 md:grid-cols-2">
          <legend className="px-1 text-lg font-semibold">{t('register.contact')}</legend>
          <Field label={t('common.department')} error={errors.department?.message}>
            {(p) => <Select {...p} {...register('department', { onChange: () => f.setValue('commune', '') })} placeholder={deps.isLoading ? t('common.loadingDots') : t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}
          </Field>
          <Field label={t('common.commune')} error={errors.commune?.message} hint={!dep ? t('register.pickDepartmentFirst') : undefined}>
            {(p) => <Select {...p} {...register('commune')} disabled={!dep} placeholder={t('common.choose')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}
          </Field>
          <Field label={t('register.phone')} hint={t('login.phoneHint')} error={errors.phone?.message}>
            {(p) => <input {...p} {...register('phone')} className={inputCls} type="tel" inputMode="numeric" maxLength={10} />}
          </Field>
          <Field label={t('register.language')} error={errors.language?.message}>
            {(p) => <Select {...p} {...register('language')} options={[{ value: 'fr', label: 'Français' }, { value: 'fon', label: 'Fon' }, { value: 'bba', label: 'Bariba' }, { value: 'yo', label: 'Yoruba' }, { value: 'dnd', label: 'Dendi' }]} />}
          </Field>
          {deps.isError && <Notice tone="error">{t('register.depsDown')} <Button variant="ghost" onClick={() => deps.refetch()}>{t('common.retry')}</Button></Notice>}
        </fieldset>

        {minor && (
          <fieldset className="grid gap-4 rounded border border-warn bg-warn-bg p-4 md:grid-cols-2">
            <legend className="px-1 text-lg font-semibold text-warn">{t('register.guardianTitle')}</legend>
            <p className="md:col-span-2">{t('register.guardianLaw')}</p>
            <Field label={t('register.guardianName')} error={errors.guardian_name?.message}>
              {(p) => <input {...p} {...register('guardian_name')} className={inputCls} />}
            </Field>
            <Field label={t('register.guardianNpi')} error={errors.guardian_npi?.message}>
              {(p) => <input {...p} {...register('guardian_npi')} className={inputCls} inputMode="numeric" maxLength={10} />}
            </Field>
            <div className="md:col-span-2">
              <label className="flex min-h-touch items-start gap-3">
                <input type="checkbox" {...register('guardian_consent')} className="mt-1 h-6 w-6" aria-invalid={errors.guardian_consent ? true : undefined} aria-describedby="g-err" />
                <span>{t('register.guardianConsent')}</span>
              </label>
              {errors.guardian_consent && <p id="g-err" role="alert" className="text-sm text-error">{msg(errors.guardian_consent.message)}</p>}
            </div>
          </fieldset>
        )}

        <fieldset className="rounded border-2 border-brand bg-surface p-4">
          <legend className="px-1 text-lg font-semibold">{t('register.consentLegend')}</legend>
          <p id="consent-text" className="mb-3">{t('register.consentText')}</p>
          <label className="flex min-h-touch items-start gap-3">
            <input type="checkbox" {...register('consent_accepted')} className="mt-1 h-6 w-6" aria-describedby="consent-text consent-err" aria-invalid={errors.consent_accepted ? true : undefined} />
            <span className="font-semibold">{t('register.consentCheck')}</span>
          </label>
          {errors.consent_accepted && <p id="consent-err" role="alert" className="text-sm text-error">{msg(errors.consent_accepted.message)}</p>}
        </fieldset>

        {err && (
          <Notice tone="error" live>
            {errCode === 'duplicate' ? (
              <p>
                {t('register.duplicate')}{' '}
                {err.body.existing && (
                  user && user.role !== 'producteur'
                    ? <Link className="font-semibold underline" to={`/producteurs/${err.body.existing.id}`}>{t('register.openExisting', { code: err.body.existing.code })}</Link>
                    : <span><Trans i18nKey="register.existing" values={{ code: err.body.existing.code }} components={{ b: <strong /> }} /> <Link className="font-semibold underline" to="/connexion">{t('login.signIn')}</Link></span>
                )}
              </p>
            ) : (
              <p>{anipMessages[errCode] ? t(anipMessages[errCode]) : err.message}</p>
            )}
          </Notice>
        )}
        <Button type="submit" busy={reg.isPending} className="self-start">{t('register.submit')}</Button>
      </form>
    </div>
  );
}
