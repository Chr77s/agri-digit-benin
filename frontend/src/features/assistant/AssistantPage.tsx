import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import { api } from '../../shared/api/client';
import type { AssistantAnswer } from '../../shared/api/types';
import { useVcName, useValueChains, vcSelect } from '../../shared/api/ref';
import { Alert, Button, Field, Icon, Input, Select, speak } from '../../shared/ui';
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
// Derniers échanges envoyés avec la question : l'assistant suit ainsi le fil (le serveur ne les garde pas).
const historyOf = (turns: Turn[]): NonNullable<Ask['history']> => turns.filter((x) => x.answer?.answer).slice(-3)
  .flatMap((x) => [{ role: 'user' as const, content: x.ask.question }, { role: 'assistant' as const, content: x.answer!.answer }]);
// La lecture à voix haute ne doit pas épeler les signes du Markdown.
const spoken = (md: string) => md.replace(/[*_`#>]/g, '').replace(/^\s*[-•]\s+/gm, '');

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
  const botName = profile.data?.name;
  const [convos, setConvos] = useState<Convo[]>(loadConvos);
  const [cur, setCur] = useState(() => convos[0].id);
  const [search, setSearch] = useState('');
  useEffect(() => saveConvos(convos), [convos]);
  const [question, setQuestion] = useState('');
  const [vc, setVc] = useState('');
  const [lang, setLang] = useState('fr');
  const [err, setErr] = useState('');
  const [panel, setPanel] = useState<'' | 'hist' | 'opts'>('');
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // la zone de saisie grandit avec le texte (plafonnée par le style), et revient à une ligne après l'envoi
  useEffect(() => { const el = taRef.current; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }, [question]);
  const convo = convos.find((c) => c.id === cur) ?? convos[0];
  const last = convo.turns[convo.turns.length - 1];
  const title = (c: Convo) => c.turns[0]?.ask.question ?? t('assistant.newConvo');
  // le dernier message reste visible, comme dans toute messagerie
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); }, [convo.id, convo.turns.length, last?.answer]);

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

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (question.trim().length < 3) { setErr(t('assistant.errQuestion')); return; }
    setErr('');
    send({ question: question.trim(), value_chain: vc || undefined, language: lang }, voice);
    setQuestion(''); setVoice(false);
  };
  // Entrée envoie, Maj+Entrée passe à la ligne (pas pendant la composition d'un caractère)
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
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
    setCur(id); setQuestion(''); setErr(''); setPanel('');
  };

  const s = search.trim().toLowerCase();
  const histItems = convos.filter((c) => c.turns.length > 0 && (!s || c.turns.some((x) => `${x.ask.question} ${x.answer?.answer ?? ''}`.toLowerCase().includes(s))));
  const clear = () => { setConvos([{ id: Math.max(...convos.map((c) => c.id)) + 1, turns: [] }]); setSearch(''); setPanel(''); };
  const toggle = (p: 'hist' | 'opts') => setPanel((cur) => (cur === p ? '' : p));

  return (
    <div className="chat">
      <header className="chat-top" onKeyDown={(e) => { if (e.key === 'Escape') setPanel(''); }}>
        <h1>{botName ?? t('nav.assistant')}</h1>
        <div className="chat-tools">
          <Button variant="ghost" iconOnly icon="history" aria-label={t('assistant.histTitle')} title={t('assistant.histTitle')} aria-expanded={panel === 'hist'} onClick={() => toggle('hist')} />
          <Button variant="ghost" iconOnly icon="settings" aria-label={t('assistant.options')} title={t('assistant.options')} aria-expanded={panel === 'opts'} onClick={() => toggle('opts')} />
          <Button variant="ghost" iconOnly icon="plus" aria-label={t('assistant.newConvo')} title={t('assistant.newConvo')} onClick={newConvo} />
        </div>
        {panel === 'hist' && (
          <div className="chat-panel" role="region" aria-label={t('assistant.histTitle')}>
            <Input type="search" aria-label={t('assistant.histSearch')} placeholder={t('assistant.histSearch')} value={search} onChange={(e) => setSearch(e.target.value)} />
            <ul className="hist-list">
              {histItems.map((c) => (
                <li key={c.id}>
                  <button type="button" aria-current={c.id === convo.id ? 'page' : undefined} onClick={() => { setCur(c.id); setPanel(''); }}>
                    {title(c)}
                    <small>{[c.turns[0].ask.value_chain && vcName(c.turns[0].ask.value_chain), t('assistant.msgCount', { count: c.turns.length }), c.turns.some((x) => x.answer?.status === 'escalated') && t('assistant.waitAgent')].filter(Boolean).join(' · ')}</small>
                  </button>
                </li>
              ))}
              {histItems.length === 0 && <li className="small muted">{s ? t('assistant.histNoMatch') : t('assistant.histEmpty')}</li>}
            </ul>
            {convos.some((c) => c.turns.length > 0) && <Button variant="ghost" size="sm" icon="trash" onClick={clear}>{t('assistant.histClear')}</Button>}
            <p className="hint">{t('assistant.histHint')}</p>
          </div>
        )}
        {panel === 'opts' && (
          <div className="chat-panel" role="region" aria-label={t('assistant.options')}>
            <Field label={t('assistant.lang')}>
              {(p) => <Select {...p} value={lang} onChange={(e) => setLang(e.target.value)} options={LANGS.map(([v, l]) => ({ value: v, label: v === 'fr' ? l : `${l} (${t('lang.toValidate')})` }))} />}
            </Field>
            <Field label={t('assistant.cropShort')} optional>
              {(p) => <Select {...p} value={vc} onChange={(e) => setVc(e.target.value)} placeholder={t('common.allF')} {...vcSelect(vcs.data)} />}
            </Field>
          </div>
        )}
      </header>

      <div className="msgs" aria-live="polite">
        {convo.turns.length === 0 ? (
          <div className="welcome">
            <span className="bot-ava bot-ava-lg" aria-hidden><Icon name="logo" /></span>
            <h2>{t('assistant.welcome', { name: botName ?? t('nav.assistant') })}</h2>
            <p>{t('assistant.start')}</p>
            <div className="suggest">
              {FAQ.map((k) => <button key={k} type="button" onClick={() => send({ question: t(`assistant.${k}`), value_chain: vc || undefined, language: lang })}>{t(`assistant.${k}`)}</button>)}
            </div>
          </div>
        ) : convo.turns.map((x) => (
          <TurnView key={x.id} x={x} pending={!x.answer && !x.error} onRetry={() => retry(x)} />
        ))}
        <div ref={endRef} />
      </div>

      <form className="composer" noValidate onSubmit={submit}>
        <div className="composer-box">
          <textarea ref={taRef} className="composer-input" rows={1} aria-label={t('assistant.question')} aria-invalid={err ? true : undefined} placeholder={t('assistant.placeholder')}
            value={question} onKeyDown={onKey} onChange={(e) => { setQuestion(e.target.value); setVoice(false); }} />
          {SpeechRec && <Button variant="ghost" iconOnly icon="mic" aria-label={listening ? t('assistant.speakNow') : t('assistant.dictate')} title={t('assistant.dictate')} onClick={dictate} disabled={listening} />}
          <Button type="submit" iconOnly icon="send" className="send-btn" aria-label={t('assistant.sendShort')} title={t('assistant.sendShort')} busy={ask.isPending} />
        </div>
        {err && <p className="chat-err" role="alert">{err}</p>}
        <p className="chat-note">{t('assistant.disclaimer')}.</p>
      </form>
    </div>
  );
}

function TurnView({ x, pending, onRetry }: { x: Turn; pending: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  const a = x.answer;
  return (
    <>
      <div className="msg msg-me"><div className="bubble">{x.ask.question}</div></div>
      <div className="msg msg-bot">
        <span className="bot-ava" aria-hidden><Icon name="logo" /></span>
        <div className="min-w-0">
          {pending && <p className="typing">{t('assistant.searching')}</p>}
          {x.error && <Alert tone="danger" actions={<Button variant="secondary" size="sm" icon="sync" onClick={onRetry}>{t('common.retry')}</Button>}>{x.error}</Alert>}
          {a?.status === 'escalated' && <Alert tone="warn" icon="user" title={t('assistant.escalatedTitle')}>{a.answer || t('assistant.escalatedText')}</Alert>}
          {a?.language_notice && <Alert tone="info" icon="languages">{t('assistant.noNative')}</Alert>}
          {a?.answer && a.status !== 'escalated' && (
            <div className="md">
              <Markdown components={{ a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}>{a.answer}</Markdown>
            </div>
          )}
          {a && a.citations.length > 0 && (
            <details className="cites">
              <summary>{t('assistant.sourcesCount', { count: a.citations.length })}<Icon name="chevron-down" /></summary>
              {a.citations.map((c) => <div key={c.doc_id} className="cite"><Icon name="book" /><span>{t('assistant.citation', { title: c.title, source: c.source, version: c.version })}</span></div>)}
            </details>
          )}
          {a?.answer && a.status !== 'escalated' && 'speechSynthesis' in window && (
            <div className="msg-meta">
              <Button variant="ghost" size="sm" iconOnly icon="megaphone" aria-label={t('assistant.listenAnswer')} title={t('assistant.listenAnswer')} onClick={() => speak(`${spoken(a.answer)} ${a.disclaimer || t('assistant.disclaimer')}`)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
