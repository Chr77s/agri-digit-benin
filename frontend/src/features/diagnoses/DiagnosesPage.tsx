import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Chips, Dialog, EmptyState, Field, Icon, PageHeader, QueryState, Select, Table, Textarea, Timeline, buttonCls, fieldError, fmtDateTime, toast, type BadgeTone, type IconName } from '../../shared/ui';
import { useVcName, useVcSelect } from '../../shared/api/ref';
import type { Diagnosis } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';
import { Confidence, ListenGhost } from '../producers/producerKit';
import { fetchDiagnosisImage, useAskAgronome, useCreateDiagnosis, useDiagnoses, useReviewDiagnosis } from './api';

const MAX_BYTES = 5 * 1024 * 1024;
const FORMATS = ['image/jpeg', 'image/png'];
// Codes acceptés par POST /diagnoses/{id}/review (pathologies de démonstration du serveur) ; « autre » exige un commentaire.
const PATHOLOGIES = [
  'chenille_legionnaire', 'striure_mais', 'jasside_coton', 'mosaique_manioc', 'thrips_niebe', 'anthracnose_anacarde',
  'pyriculariose_riz', 'mildiou_tomate', 'fletrissure_tomate', 'newcastle_volaille', 'autre',
];
const TONE: Record<Diagnosis['status'], BadgeTone> = { transmis_agronome: 'wait', revu: 'ok', auto: 'neutral' };
const TIPS: [string, IconName][] = [['light', 'sun'], ['frame', 'target'], ['still', 'phone'], ['under', 'camera']];

export function DiagnosesPage() {
  const { user } = useAuth();
  return user?.role === 'agronome_inrab' ? <ReviewQueue /> : <ProducerView />;
}

/** L'endpoint image exige le jeton : on charge l'image par fetch puis on l'affiche via une URL d'objet, libérée au démontage. */
function DiagImage({ id }: { id: string }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    let obj: string | null = null;
    setUrl(null); setFailed(false);
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
    <div className="photo">
      {url
        ? <img src={url} alt={t('diagnosis.imageAlt')} />
        : <span className="small">{failed ? t('diagnosis.imageMissing') : t('diagnosis.imageLoading')}</span>}
    </div>
  );
}

// ---- Producteur ----

function ProducerView() {
  const { t } = useTranslation();
  const q = useDiagnoses();
  const create = useCreateDiagnosis();
  const vcName = useVcName();
  const [sel, setSel] = useState<string | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const shown = (sel ? q.data?.find((x) => x.id === sel) : undefined) ?? create.data ?? q.data?.[0];
  const focusResult = () => setTimeout(() => resultRef.current?.focus(), 0);
  // Le résultat apparaît en haut : on y déplace le focus pour que le lecteur d'écran l'annonce.
  useEffect(() => { if (create.data) { setSel(null); focusResult(); } }, [create.data]);

  return (
    <>
      <PageHeader title={t('nav.diagnosis')} desc={t('diagnosis.help')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.diagnosis') }]}
        actions={<ListenGhost text={t('diagnosis.listen')} />} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Alert tone="demo" title={t('diagnosis.simTitle')}>{t('diagnosis.simulation')}</Alert>
        <div className="split">
          {shown ? <ResultCard d={shown} headingRef={resultRef} vcName={vcName} /> : (
            <Card title={t('diagnosis.result')}>
              {q.isLoading ? null : <EmptyState icon="leaf-scan" title={t('diagnosis.historyEmpty')}>{t('diagnosis.historyEmptyHelp')}</EmptyState>}
            </Card>
          )}
          <div className="stack" style={{ ['--gap' as string]: '20px' }}>
            <NewPhoto create={create} />
            {shown && <ReviewTrack d={shown} />}
          </div>
        </div>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={null}>
          {(d) => (
            <Table<Diagnosis> title={t('diagnosis.history')} caption={t('diagnosis.history')} rowKey={(r) => r.id} data={d} pageSize={8}
              columns={[
                { key: 'created_at', label: t('common.date'), render: (r) => <span className="cell-main num">{fmtDateTime(r.created_at)}</span> },
                { key: 'value_chain', label: t('common.valueChain'), render: (r) => (r.value_chain ? vcName(r.value_chain) : '') },
                { key: 'pathology_label', label: t('diagnosis.resultCol'), render: (r) => <>{r.pathology_label}{r.status === 'revu' && r.review_comment && <><br /><span className="small muted">{t('diagnosis.reviewedSay', { comment: r.review_comment })}</span></>}</> },
                { key: 'confidence', label: t('diagnosis.confidenceCol'), num: true, render: (r) => `${Math.round(r.confidence * 100)} %` },
                { key: 'status', label: t('common.status'), render: (r) => <Badge tone={TONE[r.status]}>{t(`diagnosis.status.${r.status}`)}</Badge> },
                { key: 'see', label: t('ui.actions'), actions: true, render: (r) => <Button variant="ghost" size="sm" aria-label={t('diagnosis.seeNamed', { date: fmtDateTime(r.created_at) })} onClick={() => { setSel(r.id); focusResult(); }}>{t('diagnosis.see')}</Button> },
              ]} />
          )}
        </QueryState>
      </div>
    </>
  );
}

function ResultCard({ d, headingRef, vcName }: { d: Diagnosis; headingRef: React.Ref<HTMLHeadingElement>; vcName: (c: string) => string }) {
  const { t } = useTranslation();
  return (
    <section className="card" aria-labelledby="t-res">
      <div className="card-head">
        <div>
          <h2 className="card-title" id="t-res" ref={headingRef} tabIndex={-1}>{t('diagnosis.result')}</h2>
          <p className="card-sub num">{[fmtDateTime(d.created_at), d.value_chain && vcName(d.value_chain)].filter(Boolean).join(' · ')}</p>
        </div>
        <Badge tone={TONE[d.status]}>{t(`diagnosis.status.${d.status}`)}</Badge>
      </div>
      <div className="result-grid">
        <DiagImage id={d.id} />
        <div className="stack" style={{ ['--gap' as string]: '14px' }}>
          <div><p className="small muted">{t('diagnosis.probable')}</p><p className="card-title" style={{ fontSize: '1.25rem' }}>{d.pathology_label}</p></div>
          <div><p className="small muted">{t('diagnosis.confidenceCol')}</p><Confidence value={d.confidence} /></div>
          {d.risk && <div><p className="small muted">{t('diagnosis.riskLabel')}</p><Badge tone={d.risk === 'eleve' ? 'bad' : 'wait'}>{t(`diagnosis.risk.${d.risk}`)}</Badge></div>}
          {d.status === 'transmis_agronome' && <Alert tone="info" icon="user">{t('diagnosis.lowConfidence')}</Alert>}
          {d.status === 'revu' && d.review_comment && <Alert tone="ok" title={t('diagnosis.reviewComment')}>{d.review_comment}</Alert>}
        </div>
      </div>
      {d.advice && (
        <>
          <h3 className="card-title" style={{ margin: '20px 0 12px' }}>{d.status === 'transmis_agronome' ? t('diagnosis.whileWaiting') : t('diagnosis.advice')}</h3>
          <p>{d.advice}</p>
        </>
      )}
      {d.producer_note && <p className="small mt-3"><b>{t('diagnosis.yourNote')}</b> « {d.producer_note} »</p>}
      <div className="card-foot">
        <span className="small muted">{t('diagnosis.adviceNote')}</span>
        <span className="cluster">
          {d.status === 'auto' && <AskAgronome id={d.id} />}
          <Link className={buttonCls({ variant: 'secondary', size: 'sm' })} to="/assistant"><Icon name="chat" />{t('nav.assistant')}</Link>
        </span>
      </div>
    </section>
  );
}

/** « Pas sûr ? » : un diagnostic automatique peut être renvoyé à un agronome, avec un mot du producteur. */
function AskAgronome({ id }: { id: string }) {
  const { t } = useTranslation();
  const ask = useAskAgronome();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  return (
    <>
      <Button variant="ghost" size="sm" icon="user" onClick={() => { ask.reset(); setOpen(true); }}>{t('diagnosis.ask')}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('diagnosis.askTitle')}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit" form="f-ask" busy={ask.isPending}>{t('diagnosis.askSend')}</Button></>}>
        <form id="f-ask" noValidate className="stack" onSubmit={(e) => {
          e.preventDefault();
          ask.mutate({ id, note: note.trim() }, { onSuccess: () => { setOpen(false); setNote(''); toast(t('diagnosis.asked')); } });
        }}>
          <Field label={t('diagnosis.askNote')} optional error={fieldError(ask.error, 'note')}>
            {(p) => <Textarea {...p} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
          <Alert tone="info" icon="clock">{t('diagnosis.askInfo')}</Alert>
          {ask.error && !fieldError(ask.error, 'note') && <Alert tone="danger" live>{ask.error.message}</Alert>}
        </form>
      </Dialog>
    </>
  );
}

function ReviewTrack({ d }: { d: Diagnosis }) {
  const { t } = useTranslation();
  const at = d.created_at ? new Date(d.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined;
  const pct = Math.round(d.confidence * 100);
  return (
    <Card title={t('diagnosis.track')}>
      <Timeline items={[
        { state: 'done', time: at, title: t('diagnosis.trackReceived') },
        { state: 'done', time: at, title: t('diagnosis.trackAuto'), text: t('diagnosis.trackAutoText', { pct }) },
        ...(d.status === 'auto' ? [] : [d.status === 'revu'
          ? { state: 'done' as const, time: fmtDateTime(d.reviewed_at), title: t('diagnosis.trackReviewed') }
          : { state: 'now' as const, time: t('diagnosis.inProgress'), title: t('diagnosis.trackReview'), text: t('diagnosis.trackReviewText') }]),
      ]} />
    </Card>
  );
}

function NewPhoto({ create }: { create: ReturnType<typeof useCreateDiagnosis> }) {
  const { t } = useTranslation();
  const vc = useVcSelect();
  const [file, setFile] = useState<File | null>(null);
  const [chain, setChain] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [tips, setTips] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const err = (name: string) => errs[name] || fieldError(create.error, name);
  const imageError = (f: File) => (!FORMATS.includes(f.type) ? t('diagnosis.errFormat') : f.size > MAX_BYTES ? t('diagnosis.errSize') : undefined);
  return (
    <form noValidate className="card stack" style={{ ['--gap' as string]: '14px' }} aria-labelledby="t-env" onSubmit={(e) => {
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
      <div className="between">
        <h2 className="card-title" id="t-env">{t('diagnosis.newPhoto')}</h2>
        <Button variant="ghost" size="sm" icon="help" onClick={() => setTips(true)}>{t('diagnosis.tipsBtn')}</Button>
      </div>
      <Dialog open={tips} onClose={() => setTips(false)} title={t('diagnosis.tipsTitle')} footer={<Button onClick={() => setTips(false)}>{t('diagnosis.tipsOk')}</Button>}>
        <ul className="list">
          {TIPS.map(([k, icon]) => (
            <li key={k} className="list-item"><span className="li-icon"><Icon name={icon} /></span>
              <span className="li-main"><span className="li-title">{t(`diagnosis.tip.${k}.t`)}</span><span className="li-meta">{t(`diagnosis.tip.${k}.d`)}</span></span></li>
          ))}
        </ul>
        <ListenGhost text={TIPS.map(([k]) => `${t(`diagnosis.tip.${k}.t`)}. ${t(`diagnosis.tip.${k}.d`)}`).join(' ')} />
      </Dialog>
      <Field label={t('diagnosis.photo')} error={err('image')}>
        {(p) => (
          <label className="dropzone">
            <span className="dz-icon"><Icon name="camera" /></span>
            <strong>{file ? file.name : t('diagnosis.pick')}</strong>
            <span className="small">{t('diagnosis.pickHint')}</span>
            <input {...p} ref={fileRef} type="file" accept="image/jpeg,image/png" capture="environment"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setErrs((x) => ({ ...x, image: f ? imageError(f) ?? '' : '' })); }} />
          </label>
        )}
      </Field>
      <Field label={t('common.valueChain')} error={err('value_chain')}>
        {(p) => <Select {...p} value={chain} onChange={(e) => setChain(e.target.value)} placeholder={t('common.choose')} options={vc.options} groups={vc.groups} />}
      </Field>
      {create.error && !fieldError(create.error, 'image') && <Alert tone="danger" live>{create.error.message}</Alert>}
      <Button type="submit" block icon="upload" busy={create.isPending}>{t('diagnosis.send')}</Button>
    </form>
  );
}

// ---- Agronome ----

function ReviewQueue() {
  const { t } = useTranslation();
  const q = useDiagnoses();
  const vcName = useVcName();
  const [msg, setMsg] = useState('');
  const [chain, setChain] = useState(['all']);
  const [order, setOrder] = useState<'old' | 'conf'>('old');
  const [shown, setShown] = useState(10);
  const all = q.data ?? [];
  const old = all.filter((x) => x.created_at && Date.now() - new Date(x.created_at).getTime() > 48 * 3600e3).length;
  const chains = [...new Set(all.map((x) => x.value_chain).filter((v): v is string => !!v))];
  return (
    <>
      <PageHeader title={t('nav.diagnosisQueue')} desc={t('diagnosis.queueDesc')}
        actions={old > 0 ? <Badge tone="urgent" icon="clock">{t('diagnosis.late', { count: old })}</Badge> : undefined} />
      <div className="stack" style={{ ['--gap' as string]: '20px' }}>
        <Alert tone="demo" title={t('common.simulation')}>{t('diagnosis.simulationReview')}</Alert>
        <div aria-live="polite">{msg && <Alert tone="ok">{msg}</Alert>}</div>
        <QueryState q={q} empty={(d) => d.length === 0} emptyText={<div className="card"><EmptyState icon="microscope" title={t('diagnosis.queueEmpty')}>{t('diagnosis.queueEmptyHelp')}</EmptyState></div>}>
          {(d) => {
            const list = d.filter((x) => chain[0] === 'all' || x.value_chain === chain[0])
              .sort((a, b) => (order === 'conf' ? a.confidence - b.confidence : String(a.created_at).localeCompare(String(b.created_at))));
            return (
              <>
                <div className="cluster" style={{ justifyContent: 'space-between' }}>
                  <Chips single label={t('diagnosis.filterChain')} value={chain} onChange={setChain}
                    options={[{ value: 'all', label: t('common.allF'), count: d.length }, ...chains.map((c) => ({ value: c, label: vcName(c), count: d.filter((x) => x.value_chain === c).length }))]} />
                  <div className="w-full sm:w-64">
                    <Field label={t('diagnosis.sortBy')}>
                      {(p) => <Select {...p} value={order} onChange={(e) => setOrder(e.target.value as 'old' | 'conf')} options={[{ value: 'old', label: t('diagnosis.sortOld') }, { value: 'conf', label: t('diagnosis.sortConf') }]} />}
                    </Field>
                  </div>
                </div>
                <ul className="stack" style={{ ['--gap' as string]: '16px', listStyle: 'none', margin: 0, padding: 0 }}>
                  {list.slice(0, shown).map((x) => (
                    <li key={x.id} className="card" style={{ padding: 0 }}>
                      <div className="dq">
                        <DiagImage id={x.id} />
                        <div className="stack" style={{ ['--gap' as string]: '8px' }}>
                          <div className="cluster" style={{ ['--gap' as string]: '6px' }}>
                            <Badge tone={TONE[x.status]}>{t(`diagnosis.status.${x.status}`)}</Badge>
                            {x.value_chain && <Badge tone="neutral">{vcName(x.value_chain)}</Badge>}
                          </div>
                          <h2 className="dq-h">{t('diagnosis.question', { label: x.pathology_label })}</h2>
                          <Confidence value={x.confidence} />
                          {x.advice && <p>{t('diagnosis.provisional', { advice: x.advice })}</p>}
                          {x.producer_note && <p><b>{t('diagnosis.producerSays')}</b> « {x.producer_note} »</p>}
                          <p className="small muted">{t('diagnosis.anonMeta', { date: fmtDateTime(x.created_at) })}</p>
                        </div>
                        <ReviewForm d={x} onDone={() => setMsg(t('diagnosis.reviewed'))} />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="pagination" style={{ border: 0 }}>
                  <span className="num">{t('diagnosis.countOf', { n: Math.min(shown, list.length), total: list.length })}</span>
                  {shown < list.length && <Button variant="secondary" onClick={() => setShown((s) => s + 10)}>{t('diagnosis.more')}</Button>}
                </div>
              </>
            );
          }}
        </QueryState>
      </div>
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
    <form noValidate className="stack" style={{ ['--gap' as string]: '12px' }} aria-label={t('diagnosis.reviewOf', { date: fmtDateTime(d.created_at) })} onSubmit={(e) => {
      e.preventDefault();
      const er: Record<string, string> = {};
      if (!pathology) er.pathology = t('diagnosis.errPathology');
      if (pathology === 'autre' && comment.trim().length < 5) er.comment = t('diagnosis.errComment');
      setErrs(er);
      if (Object.keys(er).length) return;
      m.mutate({ id: d.id, pathology, comment: comment.trim() }, { onSuccess: onDone });
    }}>
      <h2 className="dq-h">{t('diagnosis.reviewTitle')}</h2>
      <Field label={t('diagnosis.pathologyField')} error={err('pathology')}>
        {(p) => <Select {...p} value={pathology} onChange={(e) => setPathology(e.target.value)} placeholder={t('common.choose')} options={PATHOLOGIES.map((c) => ({ value: c, label: t(`diagnosis.pathology.${c}`) }))} />}
      </Field>
      <Field label={t('common.comment')} error={err('comment')}>
        {(p) => <Textarea {...p} rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />}
      </Field>
      {m.error && !fieldError(m.error, 'pathology') && !fieldError(m.error, 'comment') && <Alert tone="danger" live>{m.error.message}</Alert>}
      <Button type="submit" busy={m.isPending}>{t('diagnosis.reviewSend')}</Button>
    </form>
  );
}
