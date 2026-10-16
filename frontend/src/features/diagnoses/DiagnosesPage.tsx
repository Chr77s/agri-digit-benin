import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, EmptyState, ErrorState, Field, fieldError, fmtDateTime, inputCls, Notice, PageHeader, QueryState, Select, SimulationBanner } from '../../shared/ui';
import { useVcName, useVcSelect } from '../../shared/api/ref';
import type { Diagnosis } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';
import { fetchDiagnosisImage, useCreateDiagnosis, useDiagnoses, useReviewDiagnosis } from './api';

const MAX_BYTES = 5 * 1024 * 1024;
const FORMATS = ['image/jpeg', 'image/png'];
// Codes acceptés par POST /diagnoses/{id}/review (pathologies de démonstration du serveur) ; « autre » exige un commentaire.
const PATHOLOGIES = [
  'chenille_legionnaire', 'striure_mais', 'jasside_coton', 'mosaique_manioc', 'thrips_niebe', 'anthracnose_anacarde',
  'pyriculariose_riz', 'mildiou_tomate', 'fletrissure_tomate', 'newcastle_volaille', 'autre',
];

export function DiagnosesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAgronome = user?.role === 'agronome_inrab';
  return (
    <>
      <PageHeader title={isAgronome ? t('nav.diagnosisQueue') : t('nav.diagnosis')} listen={isAgronome ? undefined : t('diagnosis.listen')} />
      {isAgronome ? <ReviewQueue /> : <ProducerView />}
    </>
  );
}

/** L'endpoint image exige le jeton : on charge l'image par fetch puis on l'affiche via une URL d'objet, libérée au démontage. */
function DiagImage({ id }: { id: string }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    let obj: string | null = null;
    fetchDiagnosisImage(id, ctl.signal)
      .then((b) => {
        if (ctl.signal.aborted) return;
        obj = URL.createObjectURL(b);
        setUrl(obj);
      })
      .catch(() => { if (!ctl.signal.aborted) setFailed(true); });
    return () => {
      ctl.abort();
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [id]);
  return (
    <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-bg p-1 text-center text-muted sm:w-52">
      {url
        ? <img src={url} alt={t('diagnosis.imageAlt')} className="h-full w-full object-contain" />
        : <span>{failed ? t('diagnosis.imageMissing') : t('diagnosis.imageLoading')}</span>}
    </div>
  );
}

function DiagnosisCard({ d, review }: { d: Diagnosis; review?: boolean }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  return (
    <article className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row">
      <DiagImage id={d.id} />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={d.status === 'transmis_agronome' ? 'warn' : 'success'}>{t(`diagnosis.status.${d.status}`)}</Badge>
          {d.value_chain && <Badge>{vcName(d.value_chain)}</Badge>}
        </div>
        <h3 className="text-lg font-semibold">{d.pathology_label}</h3>
        <p>{t('diagnosis.confidence', { pct: Math.round(d.confidence * 100) })}</p>
        <p>{d.advice}</p>
        {!review && d.status === 'transmis_agronome' && <p className="text-muted">{t('diagnosis.lowConfidence')}</p>}
        {d.status === 'revu' && d.review_comment && <p><strong>{t('diagnosis.reviewComment')}</strong> : {d.review_comment}</p>}
        {d.created_at && <p className="text-sm text-muted">{fmtDateTime(d.created_at)}</p>}
      </div>
    </article>
  );
}

// ---- Producteur ----

function ProducerView() {
  const { t } = useTranslation();
  const vc = useVcSelect();
  const create = useCreateDiagnosis();
  const q = useDiagnoses();
  const [file, setFile] = useState<File | null>(null);
  const [chain, setChain] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const err = (name: string) => errs[name] || fieldError(create.error, name);
  const imageError = (f: File) => (!FORMATS.includes(f.type) ? t('diagnosis.errFormat') : f.size > MAX_BYTES ? t('diagnosis.errSize') : undefined);
  // Le résultat apparaît sous le formulaire : on y déplace le focus pour que le lecteur d'écran l'annonce.
  useEffect(() => { if (create.data) resultRef.current?.focus(); }, [create.data]);
  return (
    <>
      <form noValidate className="mb-6 flex max-w-lg flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        const bad = file ? imageError(file) : t('diagnosis.errNoFile');
        if (bad) er.image = bad;
        if (!chain) er.value_chain = t('diagnosis.errChain');
        setErrs(er);
        if (Object.keys(er).length || !file) return;
        create.mutate({ image: file, value_chain: chain }, {
          onSuccess: () => { setFile(null); if (fileRef.current) fileRef.current.value = ''; },
        });
      }}>
        <Field label={t('diagnosis.photo')} hint={t('diagnosis.help')} error={err('image')}>
          {(p) => (
            <input {...p} ref={fileRef} type="file" accept="image/jpeg,image/png" capture="environment" className={`${inputCls} py-2`}
              onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setErrs((x) => ({ ...x, image: f ? imageError(f) ?? '' : '' })); }} />
          )}
        </Field>
        <Field label={t('common.valueChain')} error={err('value_chain')}>
          {(p) => <Select {...p} value={chain} onChange={(e) => setChain(e.target.value)} placeholder={t('common.choose')} options={vc.options} groups={vc.groups} />}
        </Field>
        {create.error && <ErrorState error={create.error} />}
        <Button type="submit" busy={create.isPending}>{t('diagnosis.send')}</Button>
      </form>

      {create.data && (
        <section aria-labelledby="diag-result" className="mb-6 flex flex-col gap-3">
          <h2 id="diag-result" ref={resultRef} tabIndex={-1} className="text-xl font-semibold">{t('diagnosis.result')}</h2>
          <SimulationBanner>{t('diagnosis.simulation')}</SimulationBanner>
          <DiagnosisCard d={create.data} />
        </section>
      )}

      <section aria-labelledby="diag-history" className="flex flex-col gap-3">
        <h2 id="diag-history" className="text-xl font-semibold">{t('diagnosis.history')}</h2>
        <QueryState q={q} empty={(d) => d.filter((x) => x.id !== create.data?.id).length === 0} emptyText={<EmptyState title={t('diagnosis.historyEmpty')}>{t('diagnosis.historyEmptyHelp')}</EmptyState>}>
          {(d) => (
            <ul className="flex flex-col gap-3">
              {d.filter((x) => x.id !== create.data?.id).map((x) => <li key={x.id}><DiagnosisCard d={x} /></li>)}
            </ul>
          )}
        </QueryState>
      </section>
    </>
  );
}

// ---- Agronome ----

function ReviewQueue() {
  const { t } = useTranslation();
  const q = useDiagnoses();
  const [msg, setMsg] = useState('');
  return (
    <>
      <div className="mb-4"><SimulationBanner>{t('diagnosis.simulationReview')}</SimulationBanner></div>
      <div aria-live="polite" className="mb-3">{msg && <Notice tone="success">{msg}</Notice>}</div>
      <QueryState q={q} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('diagnosis.queueEmpty')}>{t('diagnosis.queueEmptyHelp')}</EmptyState>}>
        {(d) => (
          <ul className="flex flex-col gap-6">
            {d.map((x) => (
              <li key={x.id} className="flex flex-col gap-3">
                <DiagnosisCard d={x} review />
                <ReviewForm d={x} onDone={() => setMsg(t('diagnosis.reviewed'))} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}

function ReviewForm({ d, onDone }: { d: Diagnosis; onDone: () => void }) {
  const { t } = useTranslation();
  const m = useReviewDiagnosis();
  const [pathology, setPathology] = useState(PATHOLOGIES.includes(d.pathology) ? d.pathology : '');
  const [comment, setComment] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const err = (name: string) => errs[name] ?? fieldError(m.error, name);
  return (
    <form noValidate className="flex flex-col gap-3 rounded border border-border bg-surface p-3" onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      if (!pathology) er.pathology = t('diagnosis.errPathology');
      if (pathology === 'autre' && comment.trim().length < 5) er.comment = t('diagnosis.errComment');
      setErrs(er);
      if (Object.keys(er).length) return;
      m.mutate({ id: d.id, pathology, comment: comment.trim() }, { onSuccess: onDone });
    }}>
      <h3 className="text-lg font-semibold">{t('diagnosis.reviewTitle')}</h3>
      <Field label={t('diagnosis.pathologyField')} error={err('pathology')}>
        {(p) => <Select {...p} value={pathology} onChange={(e) => setPathology(e.target.value)} placeholder={t('common.choose')} options={PATHOLOGIES.map((c) => ({ value: c, label: t(`diagnosis.pathology.${c}`) }))} />}
      </Field>
      <Field label={t('common.comment')} error={err('comment')}>
        {(p) => <textarea {...p} rows={3} maxLength={1000} className={`${inputCls} py-2`} value={comment} onChange={(e) => setComment(e.target.value)} />}
      </Field>
      {m.error && <ErrorState error={m.error} />}
      <Button type="submit" busy={m.isPending}>{t('diagnosis.reviewSend')}</Button>
    </form>
  );
}
