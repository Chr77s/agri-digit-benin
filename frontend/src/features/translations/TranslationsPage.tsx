import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, ApiError, list, qs } from '../../shared/api/client';
import type { Paginated, TrLang, TrStatus, TranslationEntry, TranslationSummary } from '../../shared/api/types';
import { Alert, Badge, Button, Card, Chips, Dialog, EmptyState, Field, Notice, PageHeader, QueryState, Select, fmtNum, inputCls } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { CorpusSection } from './Corpus';
import '../dashboard/pilotage.css';
import './translations.css';

const LANGS: TrLang[] = ['fon', 'bba', 'yo', 'dnd'];
const STATUSES: TrStatus[] = ['a_traduire', 'propose', 'valide', 'rejete'];
const OPEN_THRESHOLD_PCT = 80; // LANGUAGE_OPEN_THRESHOLD côté serveur (UC-15)
const TONE: Record<TrStatus, 'draft' | 'wait' | 'ok' | 'bad'> = { a_traduire: 'draft', propose: 'wait', valide: 'ok', rejete: 'bad' };

/** L'API renvoie `next` sous forme d'URL absolue : seul le paramètre `cursor` nous intéresse. */
function cursorOf(next: string | null): string | undefined {
  if (!next) return undefined;
  try { return new URL(next, window.location.origin).searchParams.get('cursor') ?? undefined; } catch { return undefined; }
}

const useSummary = () => useQuery({ queryKey: ['translations', 'summary'], queryFn: () => list<TranslationSummary>('/translations/summary') });

const useEntries = (language: string, status: string) =>
  useInfiniteQuery({
    queryKey: ['translations', 'entries', language, status],
    initialPageParam: '',
    queryFn: ({ pageParam }) => api<Paginated<TranslationEntry>>(`/translations${qs({ language, status, cursor: pageParam })}`),
    getNextPageParam: (last) => cursorOf(last.next),
  });

function useEntryActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['translations'] });
  return {
    propose: useMutation({
      mutationFn: ({ id, text }: { id: string; text: string }) => api<TranslationEntry>(`/translations/${id}`, { method: 'PATCH', body: { text } }),
      onSuccess: done,
    }),
    review: useMutation({
      mutationFn: ({ id, score, comment }: { id: string; score: number; comment: string }) =>
        api<TranslationEntry>(`/translations/${id}/review`, { method: 'POST', body: { score, comment } }),
      onSuccess: done,
    }),
  };
}

function SummaryCard({ s }: { s: TranslationSummary }) {
  const { t } = useTranslation();
  const pct = s.total > 0 ? Math.round((100 * s.valide) / s.total) : 0;
  const lang = t(`translations.lang.${s.language}`, { defaultValue: s.language });
  return (
    <li className="card lang">
      <div className="card-head" style={{ marginBottom: 4 }}>
        <h3>{lang}</h3>
        {s.open_to_producers ? <Badge tone="ok">{t('translations.open')}</Badge> : <Badge tone="wait">{t('pilotage.tr.notOpen')}</Badge>}
      </div>
      <div className="gauge" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('translations.progressLabel', { lang })}>
        <span style={{ '--v': `${pct}%` } as React.CSSProperties} />
        <i style={{ left: `${OPEN_THRESHOLD_PCT}%` }} />
        <b style={{ left: `${OPEN_THRESHOLD_PCT}%` }} aria-hidden>{OPEN_THRESHOLD_PCT}&nbsp;%</b>
      </div>
      <p className="num"><b>{t('translations.progressText', { valide: s.valide, total: s.total, pct })}</b></p>
      <p className="small muted num">{t('translations.avg')} : {s.average_score === null ? <span className="na">{t('common.notAvailable')}</span> : `${fmtNum(s.average_score, 1)} / 5`}</p>
    </li>
  );
}

function ErrorLine({ message }: { message?: string }) {
  return message ? <div role="alert"><Notice tone="error">{message}</Notice></div> : null;
}

function SourceBlock({ e }: { e: TranslationEntry }) {
  const { t } = useTranslation();
  return (
    <dl className="mb-3 flex flex-col gap-2 rounded border border-border bg-bg p-3">
      <div><dt className="text-sm text-muted">{t('translations.key')}</dt><dd className="break-all font-mono text-sm">{e.key}</dd></div>
      <div><dt className="text-sm text-muted">{t('translations.source')}</dt><dd className="break-words font-semibold">{e.source_text}</dd></div>
      {e.text && <div><dt className="text-sm text-muted">{t('translations.current')}</dt><dd className="break-words font-semibold">{e.text}</dd></div>}
    </dl>
  );
}

function ProposeDialog({ e, onClose, onDone }: { e: TranslationEntry; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const { propose } = useEntryActions();
  const [text, setText] = useState(e.text);
  const [err, setErr] = useState('');
  return (
    <Dialog open onClose={onClose} title={t('translations.proposeTitle', { lang: t(`translations.lang.${e.language}`, { defaultValue: e.language }) })}>
      <SourceBlock e={e} />
      <form noValidate className="flex flex-col gap-3" onSubmit={(ev) => {
        ev.preventDefault();
        if (!text.trim()) { setErr(t('translations.errText')); return; }
        propose.mutate({ id: e.id, text: text.trim() }, { onSuccess: onDone });
      }}>
        <Field label={t('translations.textLabel')} hint={t('translations.proposeHint')} error={err}>
          {(p) => <textarea {...p} className={`${inputCls} py-2`} rows={4} maxLength={2000} value={text} onChange={(x) => { setText(x.target.value); setErr(''); }} />}
        </Field>
        <ErrorLine message={propose.error?.message} />
        <Button type="submit" busy={propose.isPending}>{t('translations.proposeSubmit')}</Button>
      </form>
    </Dialog>
  );
}

function ReviewDialog({ e, onClose, onDone }: { e: TranslationEntry; onClose: () => void; onDone: (r: TranslationEntry) => void }) {
  const { t } = useTranslation();
  const { review } = useEntryActions();
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const code = review.error instanceof ApiError ? review.error.code : undefined;
  // Le serveur refuse la note de l'auteur du texte (403) ou une seconde note sur le même texte (409).
  const message = code === 'own_translation' ? t('translations.errOwn') : code === 'already_reviewed' ? t('translations.errAlready') : review.error?.message;
  return (
    <Dialog open onClose={onClose} title={t('translations.reviewTitle')}>
      <SourceBlock e={e} />
      <form noValidate className="flex flex-col gap-3" onSubmit={(ev) => {
        ev.preventDefault();
        if (!score) { setErr(t('translations.errScore')); return; }
        review.mutate({ id: e.id, score: Number(score), comment: comment.trim() }, { onSuccess: onDone });
      }}>
        <Field label={t('translations.scoreLabel')} hint={t('translations.scoreHint')} error={err}>
          {(p) => (
            <Select {...p} value={score} placeholder={t('common.choose')} onChange={(x) => { setScore(x.target.value); setErr(''); }}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: t('translations.scoreOption', { n }) }))} />
          )}
        </Field>
        <Field label={t('translations.commentLabel')}>
          {(p) => <textarea {...p} className={`${inputCls} py-2`} rows={3} maxLength={1000} value={comment} onChange={(x) => setComment(x.target.value)} />}
        </Field>
        <ErrorLine message={message} />
        <Button type="submit" busy={review.isPending}>{t('translations.reviewSubmit')}</Button>
      </form>
    </Dialog>
  );
}

function EntryCard({ e, canEdit, onPropose, onReview }: { e: TranslationEntry; canEdit: boolean; onPropose: () => void; onReview: () => void }) {
  const { t } = useTranslation();
  const lang = t(`translations.lang.${e.language}`, { defaultValue: e.language });
  return (
    <li className="entry">
      <div className="entry-head">
        <Badge>{lang}</Badge>
        <Badge tone={TONE[e.status]}>{t(`translations.status.${e.status}`)}</Badge>
        <span className="key">{e.key}</span>
      </div>
      <div className="txt"><small>{t('translations.source')}</small>{e.source_text}</div>
      <div className="txt"><small>{t('pilotage.tr.proposedIn', { lang })}</small>{e.text ? <span lang={e.language}>{e.text}</span> : <span className="muted">{t('translations.noText')}</span>}</div>
      <div className="entry-foot">
        {e.text && (
          <span className="small muted num">
            {t('translations.avg')} : {e.average_score === null ? <span className="na">{t('common.notAvailable')}</span> : `${fmtNum(e.average_score, 1)} / 5`} ({t('translations.reviewsCount', { count: e.reviews_count })})
          </span>
        )}
        <span style={{ flex: 1 }} />
        {canEdit && <>
          <Button size="sm" variant={e.text ? 'secondary' : 'primary'} onClick={onPropose}>{e.text ? t('translations.edit') : t('translations.propose')}</Button>
          {e.text && <Button size="sm" onClick={onReview}>{t('translations.review')}</Button>}
        </>}
      </div>
    </li>
  );
}

export function TranslationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canEdit = user?.role === 'repr_mtdi';
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState('');
  const [proposing, setProposing] = useState<TranslationEntry | null>(null);
  const [reviewing, setReviewing] = useState<TranslationEntry | null>(null);
  const [msg, setMsg] = useState('');
  const summary = useSummary();
  const entries = useEntries(language, status);
  return (
    <div className="pv">
      <PageHeader title={t('translations.title')} crumbs={[{ label: t('pilotage.tr.crumb') }, { label: t('pilotage.tr.crumbValidation') }]} desc={t('pilotage.tr.desc')} />
      <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
        <Alert tone="warn" title={t('translations.reminder')}>{t('pilotage.tr.reminderText')}</Alert>
        {!canEdit && <Alert tone="info">{t('translations.readOnly')}</Alert>}
        <div aria-live="polite">{msg && <Alert tone="ok">{msg}</Alert>}</div>

        <section aria-labelledby="h-sum">
          <h2 className="section-title mb-3" id="h-sum">{t('translations.summaryTitle')}</h2>
          <QueryState q={summary} empty={(d) => d.length === 0} emptyText={<EmptyState icon="languages" title={t('translations.summaryEmpty')} />}>
            {(d) => <ul className="lang-grid">{d.map((s) => <SummaryCard key={s.language} s={s} />)}</ul>}
          </QueryState>
          <p className="hint mt-2.5">{t('translations.threshold', { pct: OPEN_THRESHOLD_PCT })}</p>
        </section>

        <CorpusSection canEdit={canEdit} />

        <Card title={t('translations.entriesTitle')}>
          <div className="cluster mb-2" style={{ alignItems: 'flex-end' }}>
            <div style={{ minWidth: 'min(100%, 200px)' }}>
              <Field label={t('translations.language')}>
                {(p) => <Select {...p} value={language} onChange={(e) => setLanguage(e.target.value)} placeholder={t('common.allF')} options={LANGS.map((l) => ({ value: l, label: t(`translations.lang.${l}`) }))} />}
              </Field>
            </div>
            <Chips single label={t('pilotage.tr.filterStatus')} value={[status]} onChange={(v) => setStatus(v[0])}
              options={[{ value: '', label: t('common.all') }, ...STATUSES.map((s) => ({ value: s, label: t(`translations.status.${s}`) }))]} />
          </div>
          <QueryState q={entries} empty={(d) => d.pages.every((pg) => pg.results.length === 0)} emptyText={<EmptyState icon="languages" title={t('translations.entriesEmpty')} />}>
            {(d) => {
              const items = d.pages.flatMap((pg) => pg.results);
              return (
                <>
                  <ul className="entries">
                    {items.map((e) => (
                      <EntryCard key={e.id} e={e} canEdit={canEdit} onPropose={() => { setMsg(''); setProposing(e); }} onReview={() => { setMsg(''); setReviewing(e); }} />
                    ))}
                  </ul>
                  <div className="card-foot">
                    <span className="small muted num">{t('pilotage.tr.shown', { count: items.length })}</span>
                    {entries.hasNextPage && <Button variant="secondary" busy={entries.isFetchingNextPage} onClick={() => void entries.fetchNextPage()}>{t('translations.loadMore')}</Button>}
                  </div>
                </>
              );
            }}
          </QueryState>
        </Card>
      </div>

      {proposing && <ProposeDialog e={proposing} onClose={() => setProposing(null)} onDone={() => { setProposing(null); setMsg(t('translations.proposed')); }} />}
      {reviewing && (
        <ReviewDialog e={reviewing} onClose={() => setReviewing(null)}
          onDone={(r) => { setReviewing(null); setMsg(t('translations.reviewed', { status: t(`translations.status.${r.status}`) })); }} />
      )}
    </div>
  );
}
