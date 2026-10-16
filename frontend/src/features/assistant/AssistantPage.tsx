import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mic, Send } from 'lucide-react';
import { api } from '../../shared/api/client';
import type { AssistantAnswer } from '../../shared/api/types';
import { Button, Field, inputCls, ListenButton, Notice, PageHeader, Select } from '../../shared/ui';
import { useValueChains } from '../../shared/api/ref';

const DISCLAIMER = 'Conseil indicatif, vérifiez avec votre agent ATDA';

const useAsk = () =>
  useMutation({ mutationFn: (b: { question: string; value_chain?: string; language?: string }) => api<AssistantAnswer>('/assistant/ask', { method: 'POST', body: b }) });

type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onerror: () => void; onend: () => void; start: () => void };
const SpeechRec = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;

export function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [vc, setVc] = useState('');
  const [err, setErr] = useState('');
  const [listening, setListening] = useState(false);
  const ask = useAsk();
  const vcs = useValueChains();

  const dictate = () => {
    if (!SpeechRec) return;
    const r = new SpeechRec();
    r.lang = 'fr-FR';
    r.interimResults = false;
    r.onresult = (e) => setQuestion(e.results[0][0].transcript);
    r.onerror = () => setErr('La dictée n’a pas fonctionné. Écrivez votre question.');
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 3) { setErr('Écrivez ou dictez votre question, par exemple « Quand semer le maïs ? ».'); return; }
    setErr('');
    ask.mutate({ question: question.trim(), value_chain: vc || undefined, language: 'fr' });
  };
  const a = ask.data;

  return (
    <>
      <PageHeader title="Poser une question" listen="Poser une question. Écrivez ou dictez votre question sur votre culture. La réponse vient des fiches de l'INRAB." />
      <p className="mb-4 rounded border border-warn bg-warn-bg p-3 font-semibold text-warn">{a?.disclaimer || DISCLAIMER}</p>
      <form onSubmit={submit} noValidate className="mb-4 flex flex-col gap-3 rounded border border-border bg-surface p-4">
        <Field label="Votre question" error={err}>
          {(p) => <textarea {...p} className={`${inputCls} min-h-24 py-2 text-lg`} value={question} onChange={(e) => setQuestion(e.target.value)} />}
        </Field>
        <div className="w-64">
          <Field label="Culture (facultatif)">
            {(p) => <Select {...p} value={vc} onChange={(e) => setVc(e.target.value)} placeholder="Toutes" options={(vcs.data ?? []).map((x) => ({ value: x.code, label: x.name }))} />}
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" busy={ask.isPending}><Send aria-hidden size={20} /> Envoyer la question</Button>
          {SpeechRec && <Button variant="secondary" onClick={dictate} disabled={listening}><Mic aria-hidden size={20} /> {listening ? 'Parlez maintenant...' : 'Dicter la question'}</Button>}
        </div>
      </form>
      <div aria-live="polite">
        {ask.isPending && <p>Recherche dans les fiches publiées...</p>}
        {ask.error && <Notice tone="error">{ask.error.message} <Button variant="ghost" onClick={() => ask.mutate({ question, value_chain: vc || undefined })}>Réessayer</Button></Notice>}
        {a && (
          <section className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
            {a.status === 'escalated' && <Notice tone="warn"><strong>Question transmise à un agent.</strong> Ce sujet (dosage, produit de traitement) demande un avis humain. Votre agent ATDA vous répondra.</Notice>}
            {a.status === 'unknown' && <Notice tone="warn"><strong>Je ne sais pas.</strong> Aucune fiche publiée ne répond à cette question. Demandez à votre agent ATDA.</Notice>}
            {a.answer && <p className="whitespace-pre-line text-lg">{a.answer}</p>}
            {a.citations.length > 0 && (
              <div>
                <h2 className="font-semibold">Sources</h2>
                <ul className="list-disc pl-6">
                  {a.citations.map((c) => <li key={c.doc_id}>{c.title}, {c.source}, version {c.version}</li>)}
                </ul>
              </div>
            )}
            <ListenButton text={`${a.answer || ''} ${a.disclaimer || DISCLAIMER}`} label="Écouter la réponse" />
          </section>
        )}
      </div>
    </>
  );
}
