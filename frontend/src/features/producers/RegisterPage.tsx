import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Badge, Button, Checkbox, Field, Icon, ListenButton, PhoneInput, Radio, Select, Steps, Timeline, buttonCls, fmtDate, fmtDateTime, useMsg } from '../../shared/ui';
import { ApiError } from '../../shared/api/client';
import { useDepartments, usePlaceName } from '../../shared/api/ref';
import type { Producer } from '../../shared/api/types';
import { useRegisterProducer } from './api';
import { useAuth } from '../auth/AuthContext';
import '../auth/access.css';

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
type Key = keyof RegisterForm;

/** Champs vérifiés avant de quitter chaque étape (la dernière est le récapitulatif). */
const STEP_FIELDS: Key[][] = [
  ['npi', 'first_name', 'last_name', 'sex', 'birth_date'],
  ['department', 'commune', 'phone'],
  ['language'],
  ['consent_accepted', 'guardian_name', 'guardian_npi', 'guardian_consent'],
  [],
];
const stepOf = (k: string) => Math.max(0, STEP_FIELDS.findIndex((fs) => fs.includes(k as Key)));
const LANGS = [['fr', 'Français'], ['fon', 'Fon'], ['bba', 'Bariba'], ['yo', 'Yoruba'], ['dnd', 'Dendi']] as const;

/** Code d'erreur ANIP du serveur → clé de traduction du message. */
const anipMessages: Record<string, string> = {
  npi_unknown: 'register.anip.npi_unknown',
  name_mismatch: 'register.anip.name_mismatch',
  birthdate_mismatch: 'register.anip.birthdate_mismatch',
  anip_unavailable: 'register.anip.anip_unavailable',
  guardian_required: 'register.anip.guardian_required',
};
const anipField: Record<string, Key> = {
  npi_unknown: 'npi', name_mismatch: 'last_name', birthdate_mismatch: 'birth_date', guardian_required: 'guardian_consent',
};

export function RegisterPage() {
  const { t } = useTranslation();
  const msg = useMsg();
  const { user } = useAuth();
  const deps = useDepartments();
  const place = usePlaceName();
  const reg = useRegisterProducer();
  const [done, setDone] = useState<Producer | null>(null);
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const f = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { language: 'fr', consent_accepted: false, guardian_consent: false, department: '', commune: '' },
  });
  const { register, watch, getValues, trigger, formState: { errors }, handleSubmit, setError } = f;
  const dep = watch('department');
  const birth = watch('birth_date');
  const minor = !!birth && /^\d{4}-\d{2}-\d{2}$/.test(birth) && ageOn(birth) < 16;
  const communes = deps.data?.find((d) => d.code === dep)?.communes ?? [];
  const today = new Date().toISOString().slice(0, 10);

  // Changement d'étape : le titre de l'étape reçoit le focus (lecteur d'écran, clavier).
  useEffect(() => { if (first.current) { first.current = false; return; } heading.current?.focus(); }, [step, done]);

  const go = (n: number) => { reg.reset(); setStep(n); };
  const next = async () => { if (await trigger(STEP_FIELDS[step])) go(step + 1); };

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
        const bad: string[] = [];
        if (anipField[code]) { setError(anipField[code], { message: anipMessages[code] }); bad.push(anipField[code]); }
        Object.entries(e.body.fields ?? {}).forEach(([k, m]) => { setError(k as Key, { message: m[0] }); bad.push(k); });
        // l'erreur concerne un champ d'une étape précédente : on y retourne, la saisie est gardée
        if (bad.length) setStep(Math.min(...bad.map(stepOf)));
      }
    }
  }, (errs) => setStep(Math.min(...Object.keys(errs).map(stepOf))));

  if (done) {
    return (
      <div className="reg">
        <section className="card reg-step" role="status" aria-labelledby="reg-done">
          <div className="done-head">
            <span className="done-icon"><Icon name="check-circle" size="lg" className="d-only" /><Icon name="clock" size="lg" className="m-only" /></span>
            <h2 className="section-title" id="reg-done" ref={heading} tabIndex={-1}>{t('register.doneTitle')}</h2>
          </div>
          <div className="code-box"><span className="small muted">{t('register.yourCode')}</span><span className="code">{done.code}</span></div>
          <p><Trans i18nKey="register.doneStatusBadge" components={{ b: <Badge tone="wait">{t('status.en_attente')}</Badge> }} /></p>
          <Timeline items={[
            { state: 'done', time: done.created_at ? fmtDateTime(done.created_at) : undefined, title: t('register.tlSent') },
            { state: 'now', time: t('register.tlCheckWhen'), title: t('register.tlCheck'), text: t('register.tlCheckText') },
            { time: t('register.tlAfterWhen'), title: t('register.tlAfter') },
          ]} />
          <div className="cluster">
            <Link className={buttonCls()} to={user ? '/' : '/connexion'}>{user ? t('register.backHome') : t('register.toLogin')}</Link>
            <ListenButton text={t('register.doneListen', { code: done.code })} />
          </div>
        </section>
      </div>
    );
  }

  const err = reg.error instanceof ApiError ? reg.error : null;
  const errCode = err?.code ?? '';
  const v = getValues();
  const steps = [t('register.s1'), t('register.s2'), t('register.s3'), t('register.s4'), t('register.s5')];
  const titles = [t('register.identity'), t('register.contact'), t('register.language'), t('register.consentTitle'), t('register.recapTitle')];
  const subs = [t('register.identityHelp'), t('register.contactHelp'), t('register.languageHelp'), t('register.consentHelp'), t('register.recapHelp')];
  const nav = (
    <div className="step-nav">
      {step > 0 && <Button variant="ghost" icon="arrow-left" onClick={() => go(step - 1)}>{t('register.back')}</Button>}
      {step < 4
        ? <Button onClick={() => void next()}>{step === 3 ? t('register.toRecap') : t('register.next')}<Icon name="arrow-right" /></Button>
        : <Button type="submit" icon="send" busy={reg.isPending}>{t('register.submit')}</Button>}
    </div>
  );
  const edit = (n: number) => <Button variant="ghost" size="sm" icon="edit" onClick={() => go(n)}>{t('register.edit')}</Button>;
  const depName = deps.data?.find((d) => d.code === v.department)?.name ?? v.department;

  return (
    <div className="reg">
      <div className="page-head" style={{ margin: 0 }}>
        <div>
          <nav className="crumbs" aria-label={t('ui.crumbs')}><ol><li><Link to={user ? '/' : '/connexion'}>{user ? t('nav.home') : t('login.title')}</Link></li><li><span aria-current="page">{t('register.crumb')}</span></li></ol></nav>
          <h1 className="page-title">{t('register.title')}</h1>
          <p className="page-desc">{t('register.desc')}</p>
        </div>
        <div className="page-actions"><ListenButton text={t('register.listen')} /></div>
      </div>
      <Steps steps={steps} current={step} />

      <form onSubmit={onSubmit} noValidate>
        <section className="card reg-step" aria-labelledby="reg-h">
          <div>
            <h2 className="section-title" id="reg-h" ref={heading} tabIndex={-1}>{titles[step]}</h2>
            <p className="muted" style={{ marginTop: 4 }}>{subs[step]}</p>
          </div>

          {step === 0 && <>
            <Field label={<>NPI <span className="opt">({t('register.npiLong')})</span></>} hint={t('register.npiHint')} error={errors.npi?.message}>
              {(p) => <input {...p} {...register('npi')} className="input input-num" inputMode="numeric" maxLength={10} autoComplete="off" />}
            </Field>
            <div className="form-grid">
              <Field label={t('register.firstName')} error={errors.first_name?.message}>
                {(p) => <input {...p} {...register('first_name')} className="input" autoComplete="given-name" />}
              </Field>
              <Field label={t('register.lastName')} error={errors.last_name?.message}>
                {(p) => <input {...p} {...register('last_name')} className="input" autoComplete="family-name" />}
              </Field>
              <fieldset className="fieldset" aria-describedby={errors.sex ? 'sex-err' : undefined}>
                <legend className="label">{t('register.sex')}</legend>
                <div className="cluster" style={{ ['--gap' as string]: '4px 20px' }}>
                  <Radio {...register('sex')} value="F" label={t('register.female')} />
                  <Radio {...register('sex')} value="M" label={t('register.male')} />
                </div>
                {errors.sex && <span id="sex-err" className="error-msg" role="alert"><Icon name="alert" />{msg(errors.sex.message)}</span>}
              </fieldset>
              <Field label={t('register.birthDate')} error={errors.birth_date?.message}>
                {(p) => <input {...p} {...register('birth_date')} className="input" type="date" max={today} />}
              </Field>
            </div>
            {minor && <Alert tone="warn" icon="users" title={t('register.minorTitle')}>{t('register.minorText')}</Alert>}
          </>}

          {step === 1 && <>
            <div className="form-grid">
              <Field label={t('common.department')} error={errors.department?.message}>
                {(p) => <Select {...p} {...register('department', { onChange: () => f.setValue('commune', '') })} placeholder={deps.isLoading ? t('common.loadingDots') : t('common.choose')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}
              </Field>
              <Field label={t('common.commune')} error={errors.commune?.message} hint={!dep ? t('register.pickDepartmentFirst') : t('register.communeHint')}>
                {(p) => <Select {...p} {...register('commune')} disabled={!dep} placeholder={t('common.choose')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}
              </Field>
              <div className="span-all" style={{ maxWidth: 360 }}>
                <Field label={t('register.phone')} hint={t('register.phoneHint')} error={errors.phone?.message}>
                  {(p) => <PhoneInput {...p} {...register('phone')} maxLength={10} />}
                </Field>
              </div>
            </div>
            {deps.isError && (
              <Alert tone="danger" title={t('register.depsDown')} actions={<Button variant="secondary" size="sm" icon="sync" onClick={() => deps.refetch()}>{t('common.retry')}</Button>} />
            )}
          </>}

          {step === 2 && <>
            <fieldset className="fieldset">
              <legend className="sr-only">{t('register.language')}</legend>
              <div className="choice-grid">
                {LANGS.map(([code, name]) => (
                  <label key={code} className="choice-card">
                    <input className="radio" type="radio" value={code} {...register('language')} />
                    <span><b>{name}</b><span className="cc-sub">{code === 'fr' ? t('register.langAvailable') : t('register.langPending')}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Alert tone="info" icon="languages">{t('register.langNote')}</Alert>
          </>}

          {step === 3 && <>
            {minor && (
              <fieldset className="guardian">
                <legend>{t('register.guardianTitle')}</legend>
                <p className="span-all">{t('register.guardianLaw')}</p>
                <Field label={t('register.guardianName')} error={errors.guardian_name?.message}>
                  {(p) => <input {...p} {...register('guardian_name')} className="input" autoComplete="off" />}
                </Field>
                <Field label={t('register.guardianNpi')} error={errors.guardian_npi?.message}>
                  {(p) => <input {...p} {...register('guardian_npi')} className="input input-num" inputMode="numeric" maxLength={10} />}
                </Field>
                <div className="span-all">
                  <Checkbox {...register('guardian_consent')} label={t('register.guardianConsent')} aria-invalid={errors.guardian_consent ? true : undefined} aria-describedby={errors.guardian_consent ? 'g-err' : undefined} />
                  {errors.guardian_consent && <span id="g-err" className="error-msg" role="alert"><Icon name="alert" />{msg(errors.guardian_consent.message)}</span>}
                </div>
              </fieldset>
            )}
            <fieldset className="consent">
              <legend>{t('register.consentLegend')}</legend>
              <div className="consent-text" id="consent-text">{t('register.consentText')}</div>
              <div className="cluster">
                <ListenButton text={t('register.consentText')} label={t('register.listenText')} />
                <Link className="small" to="/confidentialite">{t('register.readPrivacy')}</Link>
              </div>
              <div>
                <Checkbox {...register('consent_accepted')} label={<b>{t('register.consentCheck')}</b>} aria-invalid={errors.consent_accepted ? true : undefined}
                  aria-describedby={errors.consent_accepted ? 'consent-text consent-err' : 'consent-text'} />
                {errors.consent_accepted && <span id="consent-err" className="error-msg" role="alert"><Icon name="alert" />{msg(errors.consent_accepted.message)}</span>}
              </div>
            </fieldset>
            <p className="small muted">{t('register.consentApart')}</p>
          </>}

          {step === 4 && <>
            <div className="recap">
              <div className="recap-block">
                <header><h3>{t('register.s1')}</h3>{edit(0)}</header>
                <dl className="dl">
                  <dt>NPI</dt><dd className="num">{v.npi}</dd>
                  <dt>{t('register.fullName')}</dt><dd>{v.first_name} {v.last_name}</dd>
                  <dt>{t('register.sex')}</dt><dd>{v.sex === 'F' ? t('register.female') : t('register.male')}</dd>
                  <dt>{t('register.birthDate')}</dt><dd className="num">{fmtDate(v.birth_date)}</dd>
                  <dt>{t('register.check')}</dt><dd>{t('register.anipAtSend')} <Badge tone="sim">{t('register.simulated')}</Badge></dd>
                </dl>
              </div>
              <div className="recap-block">
                <header><h3>{t('register.s2')}</h3>{edit(1)}</header>
                <dl className="dl">
                  <dt>{t('common.commune')}</dt><dd>{place(v.commune)}, {depName}</dd>
                  <dt>{t('register.phone')}</dt><dd className="num">{v.phone}</dd>
                </dl>
              </div>
              <div className="recap-block">
                <header><h3>{t('register.s3')}</h3>{edit(2)}</header>
                <dl className="dl"><dt>{t('register.language')}</dt><dd>{LANGS.find(([c]) => c === v.language)?.[1]}</dd></dl>
              </div>
              <div className="recap-block">
                <header><h3>{t('register.s4')}</h3>{edit(3)}</header>
                <dl className="dl">
                  <dt>{t('register.personalData')}</dt><dd>{t('register.consentGiven', { date: fmtDate(today) })}</dd>
                  {minor && <><dt>{t('register.guardianShort')}</dt><dd>{v.guardian_name}</dd></>}
                </dl>
              </div>
            </div>
            {err && (
              <Alert tone="danger" icon={errCode === 'duplicate' ? 'users' : undefined} live
                title={errCode === 'duplicate' ? t('register.duplicate') : anipMessages[errCode] ? t(anipMessages[errCode]) : err.message}
                actions={errCode === 'anip_unavailable' ? <Button variant="secondary" size="sm" icon="sync" busy={reg.isPending} type="submit">{t('common.retry')}</Button> : undefined}>
                {errCode === 'duplicate' && err.body.existing && (
                  user && user.role !== 'producteur'
                    ? <Link className="font-semibold underline" to={`/producteurs/${err.body.existing.id}`}>{t('register.openExisting', { code: err.body.existing.code })}</Link>
                    : <span><Trans i18nKey="register.existing" values={{ code: err.body.existing.code }} components={{ b: <strong /> }} /> <Link to="/connexion">{t('login.signIn')}</Link></span>
                )}
              </Alert>
            )}
          </>}
          {nav}
        </section>
      </form>
    </div>
  );
}
