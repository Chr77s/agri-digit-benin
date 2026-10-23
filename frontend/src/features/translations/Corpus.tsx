import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { Badge, Button, Card, Dialog, EmptyState, ErrorState, Field, Input, QueryState, Textarea, toast } from '../../shared/ui';

interface Entry { id: string; language: string; question: string; answer: string; paraphrases: string[]; french_question: string; french_answer: string; status: string; asked_count: number }
interface Stat { language: string; valid: number; pending: number; waiting: number; accuracy: number | null }

/** Corpus de l'assistant par langue : questions restées sans réponse, textes à valider, justesse mesurée. */
export function CorpusSection({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ['corpus', 'stats'], queryFn: () => api<{ results: Stat[] }>('/corpus/stats') });
  const list = useQuery({ queryKey: ['corpus', 'list'], queryFn: () => api<{ results: Entry[] }>('/corpus') });
  const [write, setWrite] = useState<Entry | null>(null);
  const validate = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) => api(`/corpus/${id}/validate`, { method: 'POST', body: { decision } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['corpus'] }); toast(t('corpus.saved')); },
  });
  const by = (s: string) => (list.data?.results ?? []).filter((e) => e.status === s);
  return (
    <Card title={t('corpus.title')} sub={t('corpus.desc')}>
      <div className="stack" style={{ ['--gap' as string]: '16px' }}>
        <QueryState q={stats}>
          {(d) => (
            <ul className="lang-grid">
              {d.results.map((s) => (
                <li key={s.language} className="card">
                  <b>{t(`translations.lang.${s.language}`)}</b>
                  <p className="small">{t('corpus.counts', { valid: s.valid, pending: s.pending, waiting: s.waiting })}</p>
                  <p className="small">{s.accuracy == null ? t('corpus.noAccuracy') : t('corpus.accuracy', { pct: s.accuracy })}</p>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
        <QueryState q={list}>
          {() => (
            <>
              <section>
                <h3 className="card-title">{t('corpus.waiting')}</h3>
                {by('a_traduire').length === 0 ? <EmptyState title={t('corpus.noWaiting')} /> : (
                  <ul className="stack" style={{ ['--gap' as string]: '8px', listStyle: 'none', padding: 0 }}>
                    {by('a_traduire').map((e) => (
                      <li key={e.id} className="between">
                        <span><Badge>{t(`translations.lang.${e.language}`)}</Badge> {e.french_question} <span className="small muted">· {t('corpus.asked', { count: e.asked_count })}</span></span>
                        {canEdit && <Button variant="secondary" size="sm" onClick={() => setWrite(e)}>{t('corpus.write')}</Button>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="card-title">{t('corpus.toValidate')}</h3>
                {by('propose').length === 0 ? <p className="muted">{t('corpus.noneToValidate')}</p> : (
                  <ul className="stack" style={{ ['--gap' as string]: '10px', listStyle: 'none', padding: 0 }}>
                    {by('propose').map((e) => (
                      <li key={e.id} className="card">
                        <p><Badge>{t(`translations.lang.${e.language}`)}</Badge> <b>{e.question}</b></p>
                        <p>{e.answer}</p>
                        <p className="small muted">{t('corpus.source', { q: e.french_question, a: e.french_answer || '—' })}</p>
                        {canEdit && (
                          <div className="cluster">
                            <Button size="sm" busy={validate.isPending} onClick={() => validate.mutate({ id: e.id, decision: 'valide' })}>{t('corpus.validate')}</Button>
                            <Button variant="ghost" size="sm" onClick={() => validate.mutate({ id: e.id, decision: 'rejete' })}>{t('corpus.reject')}</Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {validate.error && <ErrorState error={validate.error} />}
              </section>
            </>
          )}
        </QueryState>
      </div>
      {write && <WriteDialog entry={write} onClose={() => setWrite(null)} />}
    </Card>
  );
}

function WriteDialog({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [v, setV] = useState({ question: '', answer: '', paraphrases: '', french_answer: '' });
  const m = useMutation({
    mutationFn: () => api(`/corpus/${entry.id}/answer`, { method: 'POST', body: { question: v.question, answer: v.answer, french_answer: v.french_answer,
      paraphrases: v.paraphrases.split('\n').map((s) => s.trim()).filter(Boolean) } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['corpus'] }); toast(t('corpus.saved')); onClose(); },
  });
  return (
    <Dialog open onClose={onClose} title={t('corpus.writeTitle', { lang: t(`translations.lang.${entry.language}`) })}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button busy={m.isPending} disabled={!v.question.trim() || !v.answer.trim()} onClick={() => m.mutate()}>{t('corpus.propose')}</Button></>}>
      <div className="stack" style={{ ['--gap' as string]: '12px' }}>
        <p className="muted">{t('corpus.asked_fr', { q: entry.french_question })}</p>
        <Field label={t('corpus.question')}>{(p) => <Input {...p} value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} />}</Field>
        <Field label={t('corpus.answer')}>{(p) => <Textarea {...p} rows={3} value={v.answer} onChange={(e) => setV({ ...v, answer: e.target.value })} />}</Field>
        <Field label={t('corpus.paraphrases')} hint={t('corpus.paraphrasesHint')} optional>{(p) => <Textarea {...p} rows={3} value={v.paraphrases} onChange={(e) => setV({ ...v, paraphrases: e.target.value })} />}</Field>
        <Field label={t('corpus.frenchAnswer')} optional>{(p) => <Textarea {...p} rows={2} value={v.french_answer} onChange={(e) => setV({ ...v, french_answer: e.target.value })} />}</Field>
        {m.error && <ErrorState error={m.error} />}
      </div>
    </Dialog>
  );
}
