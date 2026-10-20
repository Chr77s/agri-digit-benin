import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/client';
import { Alert, Button, EmptyState, ErrorState, Field, PageHeader, Radio, Select, Skeleton, SuccessState, Textarea } from '../../shared/ui';
import { useDepartments, useVcName } from '../../shared/api/ref';
import { usePublicSurvey, useRespond } from './api';
import { FormError, gap } from './FormError';

const KEY = (code: string) => `adb-enq-${code}`;

/** Jeton tiré au hasard dans ce navigateur, lié à cette seule enquête : le serveur n'en garde que l'empreinte pour refuser une
 *  2e réponse du même appareil. Il ne désigne aucune personne ; vider le stockage du navigateur permet de répondre à nouveau. */
function readDevice(code: string): { token: string; done: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(code)) ?? 'null') as { token?: string; done?: boolean } | null;
    if (raw?.token) return { token: raw.token, done: !!raw.done };
  } catch { /* stockage indisponible ou illisible : on repart d'un jeton neuf */ }
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return { token, done: false };
}
function saveDevice(code: string, token: string, done: boolean) {
  try { localStorage.setItem(KEY(code), JSON.stringify({ token, done })); } catch { /* le serveur refusera quand même un doublon exact */ }
}

/** /enquete/:code : réponse publique, sans compte, anonyme (aucune IP, aucun téléphone gardés). */
export function SurveyPublicPage() {
  const { t } = useTranslation();
  const { code = '' } = useParams();
  const q = usePublicSurvey(code.toUpperCase());
  const status = q.error instanceof ApiError ? q.error.status : 0;
  return (
    <div className="stack" style={{ ...gap(16), maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title={q.data?.title ?? t('mk.pub.title')} desc={t('mk.pub.desc')} />
      {q.isLoading ? <div className="card"><Skeleton lines={4} /></div>
        : status === 404 ? <div className="card"><EmptyState title={t('mk.pub.unknown')} icon="search">{t('mk.pub.unknownHelp')}</EmptyState></div>
        : status === 429 ? <Alert tone="warn" icon="clock" title={t('mk.pub.throttledTitle')}>{t('mk.pub.throttledText')}</Alert>
        : q.isError || !q.data ? <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        : q.data.status === 'close' ? <div className="card"><EmptyState title={t('mk.pub.closed')} icon="lock">{t('mk.pub.closedHelp')}</EmptyState></div>
        : <Form code={q.data.code} questions={q.data.questions} chain={q.data.value_chain} />}
    </div>
  );
}

function Thanks({ already }: { already?: boolean }) {
  const { t } = useTranslation();
  return <div className="card"><SuccessState title={already ? t('mk.pub.alreadyTitle') : t('mk.pub.thanksTitle')}>{already ? t('mk.pub.alreadyText') : t('mk.pub.thanksText')}</SuccessState></div>;
}

function Form({ code, questions, chain }: { code: string; questions: string[]; chain: string }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const deps = useDepartments();
  const m = useRespond(code);
  const [device] = useState(() => readDevice(code));
  const [done, setDone] = useState(device.done);
  const [already, setAlready] = useState(false);
  const [ratings, setRatings] = useState<(number | null)[]>(() => questions.map(() => null));
  const [comment, setComment] = useState('');
  const [department, setDepartment] = useState('');
  const [commune, setCommune] = useState('');
  const [trap, setTrap] = useState('');
  const [err, setErr] = useState('');
  if (done) return <Thanks already={already || device.done} />;
  const communes = deps.data?.find((d) => d.code === department)?.communes ?? [];
  const answered = m.error instanceof ApiError && m.error.code === 'already_answered';
  const closedNow = m.error instanceof ApiError && m.error.code === 'survey_closed';
  return (
    <form noValidate aria-label={t('mk.pub.formLabel')} className="card stack" style={gap(18)} onSubmit={(e) => {
      e.preventDefault();
      if (ratings.some((r) => r === null)) return setErr(t('mk.pub.errAll'));
      setErr('');
      m.mutate({ ratings, comment: comment.trim(), department, commune, channel: 'web', device: device.token, website: trap }, {
        onSuccess: () => { saveDevice(code, device.token, true); setDone(true); },
        onError: (e2) => { if (e2 instanceof ApiError && e2.code === 'already_answered') { saveDevice(code, device.token, true); setAlready(true); setDone(true); } },
      });
    }}>
      {chain && <p className="muted">{t('mk.pub.about', { crop: vcName(chain) })}</p>}
      <p className="hint">{t('mk.pub.scale')}</p>
      {questions.map((text, i) => (
        <fieldset key={i} className="fieldset">
          <legend className="label">{text}</legend>
          <div className="cluster" style={gap(8)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Radio key={n} name={`q${i}`} className="choice-card" checked={ratings[i] === n} onChange={() => setRatings(ratings.map((r, j) => (j === i ? n : r)))}
                label={<b aria-label={t('mk.pub.noteLabel', { n, max: 5 })}>{n}</b>} />
            ))}
          </div>
        </fieldset>
      ))}
      <Field label={t('mk.pub.comment')} optional hint={t('mk.pub.commentHint')}>{(p) => <Textarea {...p} rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />}</Field>
      <div className="form-grid">
        <Field label={t('common.department')} optional>{(p) => <Select {...p} value={department} onChange={(e) => { setDepartment(e.target.value); setCommune(''); }} placeholder={t('mk.pub.skip')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />}</Field>
        <Field label={t('common.commune')} optional>{(p) => <Select {...p} value={commune} disabled={!department} onChange={(e) => setCommune(e.target.value)} placeholder={t('mk.pub.skip')} options={communes.map((c) => ({ value: c.code, label: c.name }))} />}</Field>
      </div>
      {/* Champ piège : invisible et hors du parcours au clavier ; un robot le remplit, une personne jamais. */}
      <div aria-hidden style={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }}>
        <label>{t('mk.pub.trap')}<input name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
      </div>
      {err && <p className="field-error" role="alert">{err}</p>}
      {closedNow && <Alert tone="warn" live>{t('mk.pub.closedHelp')}</Alert>}
      {!closedNow && !answered && <FormError error={m.error} />}
      <div className="cluster">
        <Button type="submit" icon="send" busy={m.isPending}>{t('mk.pub.send')}</Button>
        <span className="hint">{t('mk.pub.privacy')}</span>
      </div>
    </form>
  );
}
