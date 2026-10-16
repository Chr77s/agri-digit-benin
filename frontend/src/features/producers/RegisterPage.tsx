import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { Button, Field, inputCls, Notice, Select, ListenButton } from '../../shared/ui';
import { ApiError } from '../../shared/api/client';
import { useDepartments } from '../../shared/api/ref';
import type { Producer } from '../../shared/api/types';
import { useRegisterProducer } from './api';
import { useAuth } from '../auth/AuthContext';

export const CONSENT_TEXT_V1 =
  "J'accepte que le ministère de l'Agriculture, de l'Élevage et de la Pêche (MAEP), responsable du traitement, enregistre mes informations (identité, téléphone, commune, parcelles) pour me fournir des conseils agricoles, des alertes et l'accès aux programmes d'appui. Mes données ne sont pas vendues ni envoyées hors du Bénin. Je peux retirer ce consentement à tout moment dans « Mes consentements ».";

export function ageOn(birth: string, ref = new Date()) {
  const b = new Date(birth);
  let a = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) a--;
  return a;
}

const schema = z
  .object({
    npi: z.string().regex(/^\d{10}$/, 'Le NPI contient 10 chiffres. Recopiez-le depuis votre carte ou votre certificat.'),
    first_name: z.string().trim().min(1, 'Saisissez le prénom tel qu’il figure sur la fiche ANIP.'),
    last_name: z.string().trim().min(1, 'Saisissez le nom tel qu’il figure sur la fiche ANIP.'),
    sex: z.enum(['F', 'M'], { errorMap: () => ({ message: 'Choisissez Femme ou Homme.' }) }),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choisissez la date de naissance.'),
    department: z.string().min(1, 'Choisissez un département.'),
    commune: z.string().min(1, 'Choisissez une commune du département.'),
    phone: z.string().regex(/^01\d{8}$/, 'Saisissez 10 chiffres commençant par 01.'),
    language: z.enum(['fr', 'fon', 'bba', 'yo', 'dnd']),
    consent_accepted: z.boolean(),
    guardian_name: z.string().optional(),
    guardian_npi: z.string().optional(),
    guardian_consent: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.consent_accepted) ctx.addIssue({ code: 'custom', path: ['consent_accepted'], message: 'Cochez la case pour donner votre consentement. Sans lui, l’inscription n’est pas possible.' });
    if (v.birth_date && ageOn(v.birth_date) < 16) {
      if (!v.guardian_name?.trim()) ctx.addIssue({ code: 'custom', path: ['guardian_name'], message: 'Moins de 16 ans : saisissez le nom du parent ou tuteur légal.' });
      if (!/^\d{10}$/.test(v.guardian_npi ?? '')) ctx.addIssue({ code: 'custom', path: ['guardian_npi'], message: 'Saisissez le NPI du parent ou tuteur (10 chiffres).' });
      if (!v.guardian_consent) ctx.addIssue({ code: 'custom', path: ['guardian_consent'], message: 'Le parent ou tuteur doit cocher cette case.' });
    }
  });
export type RegisterForm = z.infer<typeof schema>;

const anipMessages: Record<string, string> = {
  npi_unknown: 'Ce NPI est inconnu de l’ANIP. Vérifiez les 10 chiffres.',
  name_mismatch: 'Le nom ou le prénom ne correspond pas à la fiche ANIP. Recopiez-les exactement comme sur la carte.',
  birthdate_mismatch: 'La date de naissance ne correspond pas à la fiche ANIP. Vérifiez jour, mois et année.',
  anip_unavailable: 'Le service de vérification ANIP ne répond pas. Réessayez dans quelques minutes.',
  guardian_required: 'Moins de 16 ans : le consentement du parent ou tuteur légal est obligatoire.',
};
const anipField: Record<string, keyof RegisterForm> = {
  npi_unknown: 'npi', name_mismatch: 'last_name', birthdate_mismatch: 'birth_date', guardian_required: 'guardian_consent',
};

export function RegisterPage() {
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
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><CheckCircle2 aria-hidden className="text-success" /> Inscription enregistrée</h1>
        <Notice tone="success">
          <p>Votre code producteur : <strong>{done.code}</strong></p>
          <p>Statut : <strong>en attente de validation</strong> par l'agent ATDA de votre commune. Vous recevrez un message dès qu'il aura vérifié votre fiche.</p>
        </Notice>
        <ListenButton text={`Inscription enregistrée. Votre code producteur est ${done.code}. Votre fiche attend la validation de votre agent.`} />
        <Link to={user ? '/' : '/connexion'} className="font-semibold text-brand underline">{user ? 'Retour à l’accueil' : 'Aller à la connexion'}</Link>
      </div>
    );
  }

  const err = reg.error instanceof ApiError ? reg.error : null;
  const errCode = err?.code ?? '';
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Inscription d'un producteur</h1>
        <ListenButton text="Inscription. Saisissez votre numéro N P I, votre nom, votre date de naissance, votre commune et votre téléphone. Puis lisez et cochez le consentement." />
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <fieldset className="grid gap-4 rounded border border-border bg-surface p-4 md:grid-cols-2">
          <legend className="px-1 text-lg font-semibold">Identité (vérifiée auprès de l'ANIP)</legend>
          <Field label="NPI (numéro personnel d'identification)" error={errors.npi?.message}>
            {(p) => <input {...p} {...register('npi')} className={inputCls} inputMode="numeric" maxLength={10} />}
          </Field>
          <Field label="Sexe" error={errors.sex?.message}>
            {(p) => <Select {...p} {...register('sex')} placeholder="Choisir" options={[{ value: 'F', label: 'Femme' }, { value: 'M', label: 'Homme' }]} />}
          </Field>
          <Field label="Prénom" error={errors.first_name?.message}>
            {(p) => <input {...p} {...register('first_name')} className={inputCls} autoComplete="given-name" />}
          </Field>
          <Field label="Nom" error={errors.last_name?.message}>
            {(p) => <input {...p} {...register('last_name')} className={inputCls} autoComplete="family-name" />}
          </Field>
          <Field label="Date de naissance" error={errors.birth_date?.message}>
            {(p) => <input {...p} {...register('birth_date')} className={inputCls} type="date" />}
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 rounded border border-border bg-surface p-4 md:grid-cols-2">
          <legend className="px-1 text-lg font-semibold">Contact et localisation</legend>
          <Field label="Département" error={errors.department?.message}>
            {(p) => <Select {...p} {...register('department', { onChange: () => f.setValue('commune', '') })} placeholder={deps.isLoading ? 'Chargement...' : 'Choisir'} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}
          </Field>
          <Field label="Commune" error={errors.commune?.message} hint={!dep ? 'Choisissez d’abord le département.' : undefined}>
            {(p) => <Select {...p} {...register('commune')} disabled={!dep} placeholder="Choisir" options={communes.map((c) => ({ value: c.code, label: c.name }))} />}
          </Field>
          <Field label="Téléphone" hint="10 chiffres, commence par 01" error={errors.phone?.message}>
            {(p) => <input {...p} {...register('phone')} className={inputCls} type="tel" inputMode="numeric" maxLength={10} />}
          </Field>
          <Field label="Langue préférée" error={errors.language?.message}>
            {(p) => <Select {...p} {...register('language')} options={[{ value: 'fr', label: 'Français' }, { value: 'fon', label: 'Fon' }, { value: 'bba', label: 'Bariba' }, { value: 'yo', label: 'Yoruba' }, { value: 'dnd', label: 'Dendi' }]} />}
          </Field>
          {deps.isError && <Notice tone="error">Liste des départements indisponible. <Button variant="ghost" onClick={() => deps.refetch()}>Réessayer</Button></Notice>}
        </fieldset>

        {minor && (
          <fieldset className="grid gap-4 rounded border border-warn bg-warn-bg p-4 md:grid-cols-2">
            <legend className="px-1 text-lg font-semibold text-warn">Moins de 16 ans : parent ou tuteur légal</legend>
            <p className="md:col-span-2">Le consentement d'un titulaire de l'autorité parentale est obligatoire (loi n° 2017-20, art. 446).</p>
            <Field label="Nom complet du parent ou tuteur" error={errors.guardian_name?.message}>
              {(p) => <input {...p} {...register('guardian_name')} className={inputCls} />}
            </Field>
            <Field label="NPI du parent ou tuteur" error={errors.guardian_npi?.message}>
              {(p) => <input {...p} {...register('guardian_npi')} className={inputCls} inputMode="numeric" maxLength={10} />}
            </Field>
            <div className="md:col-span-2">
              <label className="flex min-h-touch items-start gap-3">
                <input type="checkbox" {...register('guardian_consent')} className="mt-1 h-6 w-6" aria-invalid={errors.guardian_consent ? true : undefined} aria-describedby="g-err" />
                <span>Je suis le parent ou tuteur légal et j'accepte l'inscription de cet enfant aux conditions ci-dessous.</span>
              </label>
              {errors.guardian_consent && <p id="g-err" role="alert" className="text-sm text-error">{errors.guardian_consent.message}</p>}
            </div>
          </fieldset>
        )}

        <fieldset className="rounded border-2 border-brand bg-surface p-4">
          <legend className="px-1 text-lg font-semibold">Consentement (texte v1)</legend>
          <p id="consent-text" className="mb-3">{CONSENT_TEXT_V1}</p>
          <label className="flex min-h-touch items-start gap-3">
            <input type="checkbox" {...register('consent_accepted')} className="mt-1 h-6 w-6" aria-describedby="consent-text consent-err" aria-invalid={errors.consent_accepted ? true : undefined} />
            <span className="font-semibold">J'ai lu ce texte et je donne mon consentement.</span>
          </label>
          {errors.consent_accepted && <p id="consent-err" role="alert" className="text-sm text-error">{errors.consent_accepted.message}</p>}
        </fieldset>

        {err && (
          <Notice tone="error" live>
            {errCode === 'duplicate' ? (
              <p>
                Ce producteur est déjà inscrit (NPI ou téléphone déjà utilisé).{' '}
                {err.body.existing && (
                  user && user.role !== 'producteur'
                    ? <Link className="font-semibold underline" to={`/producteurs/${err.body.existing.id}`}>Ouvrir la fiche existante {err.body.existing.code}</Link>
                    : <span>Fiche existante : <strong>{err.body.existing.code}</strong>. <Link className="font-semibold underline" to="/connexion">Se connecter</Link></span>
                )}
              </p>
            ) : (
              <p>{anipMessages[errCode] ?? err.message}</p>
            )}
          </Notice>
        )}
        <Button type="submit" busy={reg.isPending} className="self-start">Envoyer l'inscription</Button>
      </form>
    </div>
  );
}
