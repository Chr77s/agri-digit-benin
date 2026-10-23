import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Dialog, EmptyState, Field, Icon, Input, PageHeader, QueryState, Select, Stat, Table, fieldError, fmtDate, fmtNum, toast } from '../../shared/ui';
import { useDepartments, usePlaceName, useVcName, useVcSelect } from '../../shared/api/ref';
import { useAuth } from '../auth/AuthContext';
import { useCloseSurvey, useCreateSurvey, useSurveyResults, useSurveys, type Survey } from './api';
import { FormError, gap } from './FormError';

const MAX_QUESTIONS = 10;
export const surveyLink = (code: string) => `${window.location.origin}/enquete/${code}`;

/** Copie le lien (ou le montre si le navigateur refuse) : pas de QR code, aucune bibliothèque n'est installée. */
async function copyLink(code: string, ok: string) {
  try { await navigator.clipboard.writeText(surveyLink(code)); toast(ok); } catch { toast({ type: 'info', text: surveyLink(code), timeout: 0 }); }
}

/** Enquêtes de satisfaction des consommateurs : création, lien à partager, résultats agrégés (personnel). */
export function SurveysPage() {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const q = useSurveys();
  return (
    <>
      <PageHeader title={t('mk.survey.title')} desc={t('mk.survey.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.surveys') }]}
        actions={<Button icon="plus" onClick={() => setAdding(true)}>{t('mk.survey.add')}</Button>} />
      <QueryState q={q} empty={(d) => d.length === 0}
        emptyText={<div className="card"><EmptyState title={t('mk.survey.empty')} icon="clipboard">{t('mk.survey.emptyHelp')}</EmptyState></div>}>
        {(d) => (
          <div className="stack" style={gap(20)}>
            {d.map((s) => <SurveyCard key={s.id} s={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} />)}
          </div>
        )}
      </QueryState>
      {adding && <SurveyDialog onClose={() => setAdding(false)} onCreated={(s) => { setAdding(false); setOpen(s.id); }} />}
    </>
  );
}

function SurveyCard({ s, open, onToggle }: { s: Survey; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const vcName = useVcName();
  const place = usePlaceName();
  const close = useCloseSurvey();
  const sub = [s.value_chain && vcName(s.value_chain), s.department ? place(s.department) : t('mk.survey.national'), fmtDate(s.created_at)].filter(Boolean).join(' · ');
  return (
    <Card title={s.title} sub={sub} actions={<Badge tone={s.status === 'active' ? 'ok' : 'draft'}>{t(`mk.survey.status.${s.status}`)}</Badge>}>
      <div className="stack" style={gap(12)}>
        <p className="small">{t('mk.survey.linkLabel')} <code className="num">{surveyLink(s.code)}</code> <span className="muted">({t('mk.survey.code')} <b>{s.code}</b>)</span></p>
        <div className="cluster">
          <Button variant="secondary" icon="copy" onClick={() => void copyLink(s.code, t('mk.survey.copied'))}>{t('mk.survey.copy')}</Button>
          <Button variant="secondary" icon="chart-bar" onClick={onToggle} aria-expanded={open}>{t('mk.survey.results', { count: s.responses ?? 0 })}</Button>
          {s.status === 'active' && <Button variant="ghost" busy={close.isPending} onClick={() => close.mutate(s.id, { onSuccess: () => toast(t('mk.survey.closed')) })}>{t('mk.survey.close')}</Button>}
        </div>
        <FormError error={close.error} />
        {open && <Results id={s.id} />}
      </div>
    </Card>
  );
}

function Results({ id }: { id: string }) {
  const { t } = useTranslation();
  const place = usePlaceName();
  const q = useSurveyResults(id);
  return (
    <QueryState q={q}>
      {(r) => (
        <div className="stack" style={gap(16)}>
          <div className="grid-fit" style={{ '--min': '170px' } as React.CSSProperties}>
            <Stat label={t('mk.survey.responses')} value={fmtNum(r.responses)} />
          </div>
          {r.responses === 0 ? <p className="muted">{t('mk.survey.noResponses')}</p> : (
            <>
              {r.low_sample && <Alert tone="warn" icon="alert">{t('mk.survey.lowSample', { min: r.min_cell })}</Alert>}
              <Table<(typeof r.questions)[number]> caption={t('mk.survey.perQuestion')} rowKey={(x) => String(x.index)} data={r.questions} pageSize={10}
                columns={[
                  { key: 'text', label: t('mk.survey.question'), primary: true },
                  { key: 'mean', label: t('mk.survey.mean'), num: true, render: (x) => (x.mean === null ? t('common.notAvailable') : <b>{String(x.mean).replace('.', ',')} / 5</b>), csv: (x) => x.mean },
                  { key: 'distribution', label: t('mk.survey.distribution'), render: (x) => (
                    <span className="small num" aria-label={[1, 2, 3, 4, 5].map((n) => t('mk.survey.notes', { note: n, count: x.distribution[String(n)] })).join(', ')}>
                      {[1, 2, 3, 4, 5].map((n) => <span key={n} aria-hidden style={{ marginRight: 8 }}>{n} : {x.distribution[String(n)]}</span>)}
                    </span>), csv: (x) => JSON.stringify(x.distribution) },
                ]} />
              <Card title={t('mk.survey.byDepartment')} headingLevel={3}>
                <Table<(typeof r.by_department)[number] & { id: string }> caption={t('mk.survey.byDepartment')} rowKey={(x) => x.id} pageSize={10}
                  data={r.by_department.map((x) => ({ ...x, id: x.department || '-' }))}
                  columns={[
                    { key: 'department', label: t('common.department'), primary: true, render: (x) => place(x.department) || t('mk.survey.unknownDepartment'), csv: (x) => x.department },
                    { key: 'responses', label: t('mk.survey.responses'), num: true, render: (x) => fmtNum(x.responses) },
                    { key: 'means', label: t('mk.survey.means'), render: (x) => (x.masked || !x.means
                      ? <span className="muted small"><Icon name="lock" /> {t('mk.survey.masked', { min: r.min_cell })}</span>
                      : <span className="num">{x.means.map((m) => String(m).replace('.', ',')).join(' · ')}</span>) },
                  ]} />
              </Card>
              <section aria-labelledby={`c-${id}`} className="stack" style={gap(8)}>
                <h3 className="card-title" id={`c-${id}`}>{t('mk.survey.comments', { count: r.comments.length })}</h3>
                {r.comments.length === 0 ? <p className="muted small">{t('mk.survey.noComments')}</p> : (
                  <ul className="stack" style={gap(6)}>
                    {r.comments.map((c, i) => <li key={i} className="small"><span className="muted">{fmtDate(c.date)}</span> · {c.text}</li>)}
                  </ul>
                )}
                <p className="hint">{t('mk.survey.commentsHelp')}</p>
              </section>
            </>
          )}
        </div>
      )}
    </QueryState>
  );
}

function SurveyDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Survey) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deps = useDepartments();
  const vc = useVcSelect();
  const m = useCreateSurvey();
  const agent = user?.role === 'agent_atda';
  const [v, setV] = useState({ title: '', value_chain: '', department: agent ? user?.department ?? '' : '' });
  const [questions, setQuestions] = useState(['']);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const setQ = (i: number, text: string) => setQuestions(questions.map((x, j) => (j === i ? text : x)));
  const err = (k: string) => errs[k] ?? fieldError(m.error, k);
  return (
    <Dialog open onClose={onClose} title={t('mk.survey.add')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" form="f-survey" busy={m.isPending}>{t('mk.survey.create')}</Button></>}>
      <form id="f-survey" noValidate className="stack" onSubmit={(e) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        const clean = questions.map((x) => x.trim()).filter(Boolean);
        if (v.title.trim().length < 3) er.title = t('mk.survey.errTitle');
        if (clean.length < 1) er.questions = t('mk.survey.errQuestions');
        setErrs(er);
        if (Object.keys(er).length) return;
        m.mutate({ title: v.title.trim(), value_chain: v.value_chain, department: v.department, questions: clean }, { onSuccess: (s) => { toast(t('mk.survey.created')); onCreated(s); } });
      }}>
        <Field label={t('mk.survey.titleLabel')} error={err('title')}>{(p) => <Input {...p} value={v.title} maxLength={150} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <div className="form-grid">
          <Field label={t('common.valueChain')} optional>{(p) => <Select {...p} value={v.value_chain} onChange={(e) => setV({ ...v, value_chain: e.target.value })} placeholder={t('common.all')} options={vc.options} groups={vc.groups} />}</Field>
          <Field label={t('common.department')} optional hint={agent ? t('mk.survey.ownDepartment') : undefined}>{(p) => (
            <Select {...p} value={v.department} disabled={agent && !!user?.department} onChange={(e) => setV({ ...v, department: e.target.value })} placeholder={t('mk.survey.national')} options={(deps.data ?? []).map((d) => ({ value: d.code, label: d.name }))} />
          )}</Field>
        </div>
        <fieldset className="fieldset">
          <legend className="label">{t('mk.survey.questionsLabel')}</legend>
          <p className="hint">{t('mk.survey.questionsHelp')}</p>
          <div className="stack" style={gap(8)}>
            {questions.map((x, i) => (
              <div key={i} className="cluster" style={{ alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Field label={t('mk.survey.questionN', { n: i + 1 })}>{(p) => <Input {...p} value={x} maxLength={200} onChange={(e) => setQ(i, e.target.value)} />}</Field>
                </div>
                {questions.length > 1 && <Button variant="ghost" iconOnly icon="trash" aria-label={t('mk.survey.removeQuestion', { n: i + 1 })} onClick={() => setQuestions(questions.filter((_, j) => j !== i))} />}
              </div>
            ))}
          </div>
          {err('questions') && <p className="field-error" role="alert">{err('questions')}</p>}
          {questions.length < MAX_QUESTIONS && <div className="mt-2"><Button variant="secondary" icon="plus" onClick={() => setQuestions([...questions, ''])}>{t('mk.survey.addQuestion')}</Button></div>}
        </fieldset>
        <p className="hint">{t('mk.survey.anonymousHelp')}</p>
        <FormError error={m.error} />
      </form>
    </Dialog>
  );
}
