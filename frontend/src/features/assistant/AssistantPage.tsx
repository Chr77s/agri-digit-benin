import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import type { AssistantAnswer } from '../../shared/api/types';
import { useVcName, useValueChains, vcSelect } from '../../shared/api/ref';
import { Alert, Badge, Button, Chips, Field, Icon, Input, PageHeader, Select, Textarea, buttonCls, speak } from '../../shared/ui';
import '../producers/producteur.css';

type Ask = { question: string; value_chain?: string; language?: string; history?: { role: 'user' | 'assistant'; content: string }[] };
const useAsk = () => useMutation({ mutationFn: (b: Ask) => api<AssistantAnswer>('/assistant/ask', { method: 'POST', body: b }) });

type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onerror: () => void; onend: () => void; start: () => void };
const SpeechRec = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;

const LANGS: [string, string][] = [['fr', 'Français'], ['fon', 'Fɔngbè'], ['bba', 'Baatɔnum'], ['yo', 'Yorùbá'], ['dnd', 'Dendi']];
const FAQ = ['faq1', 'faq2', 'faq3'] as const;

interface Turn { id: number; ask: Ask; at: Date; answer?: AssistantAnswer; error?: string; voice?: boolean }
interface Convo { id: number; turns: Turn[] }
const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
// Derniers échanges envoyés avec la question : l'assistant suit ainsi le fil (le serveur ne les garde pas).
const historyOf = (turns: Turn[]): NonNullable<Ask['history']> => turns.filter((x) => x.answer?.answer).slice(-3)
  .flatMap((x) => [{ role: 'user' as const, content: x.ask.question }, { role: 'assistant' as const, content: x.answer!.answer }]);

// Historique gardé sur ce téléphone seulement (le serveur ne garde pas les questions avec leur auteur).
const HIST_KEY = 'adb-assistant';
const MAX_CONVOS = 30;
function loadConvos(): Convo[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HIST_KEY) ?? '[]') as Convo[];
    const done = raw.filter((c) => c.turns?.length).map((c) => ({ ...c, turns: c.turns.filter((x) => x.answer).map((x) => ({ ...x, at: new Date(x.at) })) }));
    return [{ id: Math.max(0, ...done.map((c) => c.id)) + 1, turns: [] }, ...done.filter((c) => c.turns.length)];
  } catch { return [{ id: 1, turns: [] }]; }
}
const saveConvos = (cs: Convo[]) => {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(cs.filter((c) => c.turns.some((x) => x.answer)).slice(0, MAX_CONVOS))); } catch { /* stockage plein ou refusé : l'historique reste le temps de la visite */ }
};

export function AssistantPage() {
  const { t } = useTranslation();
  const vcs = useValueChains();
  const vcName = useVcName();
  const ask = useAsk();
  const profile = useQuery({ queryKey: ['assistant-profile'], queryFn: () => api<{ name: string }>('/assistant/profile'), staleTime: 300_000 });
  const [convos, setConvos] = useState<Convo[]>(loadConvos);
  const [cur, setCur] = useState(() => convos[0].id);
  const [search, setSearch] = useState('');
  useEffect(() => saveConvos(convos), [convos]);
  const [question, setQuestion] = useState('');
  const [vc, setVc] = useState('');
  const [lang, setLang] = useState('fr');
  const [err, setErr] = useState('');
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const convo = convos.find((c) => c.id === cur) ?? convos[0];
  const title = (c: Convo) => c.turns[0]?.ask.question ?? t('assistant.newConvo');

  const patch = (cid: number, tid: number, p: Partial<Turn>) =>
    setConvos((cs) => cs.map((c) => (c.id !== cid ? c : { ...c, turns: c.turns.map((x) => (x.id === tid ? { ...x, ...p } : x)) })));

  const send = (b: Ask, isVoice = false) => {
    const cid = convo.id;
    const tid = Date.now();
    setConvos((cs) => cs.map((c) => (c.id === cid ? { ...c, turns: [...c.turns, { id: tid, ask: b, at: new Date(), voice: isVoice }] } : c)));
    ask.mutate({ ...b, history: historyOf(convo.turns) }, {
      onSuccess: (a) => patch(cid, tid, { answer: a }),
      onError: (e) => patch(cid, tid, { error: e.message }),
    });
  };
  const retry = (x: Turn) => {
    patch(convo.id, x.id, { error: undefined });
    ask.mutate({ ...x.ask, history: historyOf(convo.turns.slice(0, convo.turns.indexOf(x))) }, { onSuccess: (a) => patch(convo.id, x.id, { answer: a }), onError: (e) => patch(convo.id, x.id, { error: e.message }) });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 3) { setErr(t('assistant.errQuestion')); return; }
    setErr('');
    send({ question: question.trim(), value_chain: vc || undefined, language: lang }, voice);
    setQuestion(''); setVoice(false);
  };

  const dictate = () => {
    if (!SpeechRec) return;
    const r = new SpeechRec();
    r.lang = 'fr-FR';
    r.interimResults = false;
    r.onresult = (e) => { setQuestion(e.results[0][0].transcript); setVoice(true); };
    r.onerror = () => setErr(t('assistant.errDictation'));
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  };

  const newConvo = () => {
    const id = Math.max(...convos.map((c) => c.id)) + 1;
    setConvos((cs) => [{ id, turns: [] }, ...cs.filter((c) => c.turns.length > 0)]);
    setCur(id); setQuestion(''); setErr('');
  };

  const s = search.trim().toLowerCase();
  const histItems = convos.filter((c) => c.turns.length > 0 && (!s || c.turns.some((x) => `${x.ask.question} ${x.answer?.answer ?? ''}`.toLowerCase().includes(s))));
  const clear = () => { setConvos([{ id: Math.max(...convos.map((c) => c.id)) + 1, turns: [] }]); setSearch(''); };
  const hist = (
    <>
    <div className="px-2.5 pb-2"><Input type="search" aria-label={t('assistant.histSearch')} placeholder={t('assistant.histSearch')} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    <ul className="hist-list">
      {histItems.map((c) => (
        <li key={c.id}>
          <button type="button" aria-current={c.id === convo.id ? 'page' : undefined} onClick={() => setCur(c.id)}>
            {title(c)}
            <small>{[c.turns[0].ask.value_chain && vcName(c.turns[0].ask.value_chain), t('assistant.msgCount', { count: c.turns.length }), c.turns.some((x) => x.answer?.status === 'escalated') && t('assistant.waitAgent')].filter(Boolean).join(' · ')}</small>
          </button>
        </li>
      ))}
      {histItems.length === 0 && <li className="small muted px-2.5">{s ? t('assistant.histNoMatch') : t('assistant.histEmpty')}</li>}
    </ul>
    {convos.some((c) => c.turns.length > 0) && <div className="px-2.5 pt-2"><Button variant="ghost" size="sm" icon="trash" onClick={clear}>{t('assistant.histClear')}</Button></div>}
    </>
  );

  return (
    <>
      <PageHeader title={t('nav.assistant')} desc={t('assistant.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('nav.assistant') }]}
        actions={<Button variant="secondary" icon="plus" onClick={newConvo}>{t('assistant.newConvo')}</Button>} />
      <details className="card hist-mobile mb-4" style={{ padding: '4px 14px' }}>
        <summary className="flex min-h-touch cursor-pointer items-center gap-2 font-bold"><Icon name="history" />{t('assistant.histTitle')} ({histItems.length})</summary>
        <div className="pb-2.5">{hist}</div>
      </details>
      <div className="chat-wrap">
        <nav className="card chat-hist" aria-labelledby="t-hist">
          <h2 id="t-hist">{t('assistant.histTitle')}</h2>
          {hist}
          <p className="hint mt-2 px-2.5">{t('assistant.histHint')}</p>
        </nav>
        <section className="card convo" aria-labelledby="t-convo">
          <div className="convo-head">
            <h2 className="card-title" id="t-convo">{title(convo)}</h2>
            <Field label={t('assistant.lang')}>
              {(p) => <Select {...p} value={lang} onChange={(e) => setLang(e.target.value)} options={LANGS.map(([v, l]) => ({ value: v, label: v === 'fr' ? l : `${l} (${t('lang.toValidate')})` }))} />}
            </Field>
          </div>
          <div className="msgs" aria-live="polite">
            {convo.turns.length === 0 && <p className="muted">{t('assistant.start')}</p>}
            {convo.turns.map((x) => (
              <TurnView key={x.id} x={x} botName={profile.data?.name} pending={!x.answer && !x.error} onRetry={() => retry(x)} />
            ))}
          </div>
          <form className="composer" noValidate onSubmit={submit}>
            <div className="disclaimer"><Icon name="info" />{t('assistant.disclaimer')}.</div>
            <Chips label={t('assistant.faq')} value={[]} onChange={([v]) => v && setQuestion(t(`assistant.${v}`))}
              options={FAQ.map((k) => ({ value: k, label: t(`assistant.${k}`) }))} />
            <div className="composer-row">
              <div className="q-field">
                <Field label={<span className="sr-only">{t('assistant.question')}</span>} error={err}>
                  {(p) => <Textarea {...p} rows={2} placeholder={t('assistant.placeholder')} value={question} onChange={(e) => { setQuestion(e.target.value); setVoice(false); }} />}
                </Field>
              </div>
              <div className="vc-field">
                <Field label={t('assistant.cropShort')} optional>
                  {(p) => <Select {...p} value={vc} onChange={(e) => setVc(e.target.value)} placeholder={t('common.allF')} {...vcSelect(vcs.data)} />}
                </Field>
              </div>
              {SpeechRec && <Button variant="secondary" iconOnly icon="mic" aria-label={listening ? t('assistant.speakNow') : t('assistant.dictate')} title={t('assistant.dictate')} onClick={dictate} disabled={listening} />}
              <Button type="submit" icon="send" busy={ask.isPending}>{t('assistant.sendShort')}</Button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

function TurnView({ x, pending, onRetry, botName }: { x: Turn; pending: boolean; onRetry: () => void; botName?: string }) {
  const { t } = useTranslation();
  const a = x.answer;
  return (
    <>
      <div className="msg msg-me">
        <div>
          <div className="bubble">{x.ask.question}</div>
          <div className="msg-meta">{x.voice ? `${t('assistant.voiceNote')} · ` : ''}{hhmm(x.at)}</div>
        </div>
      </div>
      <div className="msg msg-bot">
        <span className="bot-ava" aria-hidden><Icon name="logo" /></span>
        <div className="min-w-0">
          <div className="bubble">
            {pending && <p>{t('assistant.searching')}</p>}
            {x.error && <Alert tone="danger" actions={<Button variant="secondary" size="sm" icon="sync" onClick={onRetry}>{t('common.retry')}</Button>}>{x.error}</Alert>}
            {a?.status === 'escalated' && <Alert tone="warn" icon="user" title={t('assistant.escalatedTitle')}>{a.answer || t('assistant.escalatedText')}</Alert>}
            {a?.language_notice && <Alert tone="info" icon="languages">{t('assistant.noNative')}</Alert>}
            {a?.status === 'unknown' && <Alert tone="info" title={t('assistant.unknownTitle')}>{t('assistant.unknownText')}</Alert>}
            {a?.answer && a.status !== 'escalated' && <p className="whitespace-pre-line">{a.answer}</p>}
            {a && a.citations.length > 0 && (
              <div className="cites">
                <p>{t('assistant.sources')}</p>
                {a.citations.map((c) => <div key={c.doc_id} className="cite"><Icon name="book" /><span>{t('assistant.citation', { title: c.title, source: c.source, version: c.version })}</span></div>)}
              </div>
            )}
          </div>
          {a && (
            <div className="msg-meta">
              {a.status === 'escalated' && <Badge tone="wait">{t('assistant.waitAgent')}</Badge>}
              {a.answer && 'speechSynthesis' in window && (
                <Button variant="ghost" size="sm" icon="megaphone" onClick={() => speak(`${a.answer} ${a.disclaimer || t('assistant.disclaimer')}`)}>{t('assistant.listenAnswer')}</Button>
              )}
              <Link className={buttonCls({ variant: 'ghost', size: 'sm' })} to="/diagnostic"><Icon name="leaf-scan" />{t('assistant.sendPhoto')}</Link>
              <span>{botName ? `${botName} · ` : ''}{hhmm(x.at)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
