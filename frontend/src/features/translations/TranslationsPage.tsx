import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, ApiError, list, qs } from '../../shared/api/client';
import type { Paginated, TrLang, TrStatus, TranslationEntry, TranslationSummary } from '../../shared/api/types';
import { Badge, Button, Dialog, EmptyState, Field, Notice, PageHeader, QueryState, Select, fmtNum, inputCls } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

const LANGS: TrLang[] = ['fon', 'bba', 'yo', 'dnd'];
const STATUSES: TrStatus[] = ['a_traduire', 'propose', 'valide', 'rejete'];
const OPEN_THRESHOLD_PCT = 80; // LANGUAGE_OPEN_THRESHOLD côté serveur (UC-15)
const TONE: Record<TrStatus, 'neutral' | 'warn' | 'success' | 'error'> = { a_traduire: 'neutral', propose: 'warn', valide: 'success', rejete: 'error' };

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
    <li className="rounded border border-border bg-surface p-4">
      <h3 className="text-lg font-semibold">{lang}</h3>
      <p className="mt-1 flex flex-wrap items-center gap-2">
        <span>{t('translations.open')} :</span>
        <Badge tone={s.open_to_producers ? 'success' : 'warn'}>{s.open_to_producers ? t('common.yes') : t('common.no')}</Badge>
      </p>
      <div className="relative mt-3 h-4 w-full rounded border border-border bg-bg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('translations.progressLabel', { lang })}>
        <div className="h-full rounded-l bg-brand" style={{ width: `${pct}%` }} />
        <span aria-hidden className="absolute top-0 h-full w-0.5 bg-text" style={{ left: `${OPEN_THRESHOLD_PCT}%` }} />
      </div>
      <p className="mt-1 font-semibold">{t('translations.progressText', { valide: s.valide, total: s.total, pct })}</p>
      <p className="text-sm text-muted">{t('translations.threshold', { pct: OPEN_THRESHOLD_PCT })}</p>
      <p className="text-sm text-muted">{t('translations.avg')} : {s.average_score === null ? t('common.notAvailable') : `${fmtNum(s.average_score, 1)} / 5`}</p>
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
  return (
    <li className="rounded border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{t(`translations.lang.${e.language}`, { defaultValue: e.language })}</Badge>
        <Badge tone={TONE[e.status]}>{t(`translations.status.${e.status}`)}</Badge>
        <span className="break-all font-mono text-sm text-muted">{e.key}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{t('translations.source')}</p>
      <p className="break-words font-semibold">{e.source_text}</p>
      <p className="mt-2 text-sm text-muted">{t('translations.current')}</p>
      <p className="break-words font-semibold">{e.text || t('translations.noText')}</p>
      <p className="mt-1 text-sm text-muted">
        {t('translations.avg')} : {e.average_score === null ? t('common.notAvailable') : `${fmtNum(e.average_score, 1)} / 5`} ({t('translations.reviewsCount', { count: e.reviews_count })})
      </p>
      {canEdit && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onPropose}>{e.text ? t('translations.edit') : t('translations.propose')}</Button>
          {e.text && <Button onClick={onReview}>{t('translations.review')}</Button>}
        </div>
      )}
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
    <>
      <PageHeader title={t('translations.title')} />
      <Notice tone="warn">{t('translations.reminder')}</Notice>
      {!canEdit && <p className="mt-3 text-muted">{t('translations.readOnly')}</p>}
      <div aria-live="polite" className="my-3">{msg && <Notice tone="success">{msg}</Notice>}</div>

      <h2 className="mb-2 mt-2 text-xl font-semibold">{t('translations.summaryTitle')}</h2>
      <QueryState q={summary} empty={(d) => d.length === 0} emptyText={<EmptyState title={t('translations.summaryEmpty')} />}>
        {(d) => <ul className="mb-6 grid gap-3 md:grid-cols-2">{d.map((s) => <SummaryCard key={s.language} s={s} />)}</ul>}
      </QueryState>

      <h2 className="mb-2 text-xl font-semibold">{t('translations.entriesTitle')}</h2>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-xs">
          <Field label={t('translations.language')}>
            {(p) => <Select {...p} value={language} onChange={(e) => setLanguage(e.target.value)} placeholder={t('common.all')} options={LANGS.map((l) => ({ value: l, label: t(`translations.lang.${l}`) }))} />}
          </Field>
        </div>
        <div className="w-full max-w-xs">
          <Field label={t('common.status')}>
            {(p) => <Select {...p} value={status} onChange={(e) => setStatus(e.target.value)} placeholder={t('common.all')} options={STATUSES.map((s) => ({ value: s, label: t(`translations.status.${s}`) }))} />}
          </Field>
        </div>
      </div>
      <QueryState q={entries} empty={(d) => d.pages.every((pg) => pg.results.length === 0)} emptyText={<EmptyState title={t('translations.entriesEmpty')} />}>
        {(d) => (
          <>
            <ul className="flex flex-col gap-2">
              {d.pages.flatMap((pg) => pg.results).map((e) => (
                <EntryCard key={e.id} e={e} canEdit={canEdit} onPropose={() => { setMsg(''); setProposing(e); }} onReview={() => { setMsg(''); setReviewing(e); }} />
              ))}
            </ul>
            {entries.hasNextPage && (
              <Button variant="secondary" className="mt-3" busy={entries.isFetchingNextPage} onClick={() => void entries.fetchNextPage()}>{t('translations.loadMore')}</Button>
            )}
          </>
        )}
      </QueryState>

      {proposing && <ProposeDialog e={proposing} onClose={() => setProposing(null)} onDone={() => { setProposing(null); setMsg(t('translations.proposed')); }} />}
      {reviewing && (
        <ReviewDialog e={reviewing} onClose={() => setReviewing(null)}
          onDone={(r) => { setReviewing(null); setMsg(t('translations.reviewed', { status: t(`translations.status.${r.status}`) })); }} />
      )}
    </>
  );
}
