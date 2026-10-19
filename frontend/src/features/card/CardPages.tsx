import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../shared/api/client';
import type { ProducerCard, ProducerStatus, VerifyResult } from '../../shared/api/types';
import { usePlaceName } from '../../shared/api/ref';
import { Alert, Button, EmptyState, ErrorState, Icon, PageHeader, Skeleton, fmtDate, fmtDateTime, spriteHref, useMsg } from '../../shared/ui';
import { StatusBadge } from '../producers/ProducersPages';
import { useAuth } from '../auth/AuthContext';
import '../auth/access.css';
import './card.css';

export const useCard = (producerId?: string | null) =>
  useQuery({ queryKey: ['card', producerId], queryFn: () => api<ProducerCard>(`/producers/${producerId}/card`), enabled: !!producerId, retry: false });
export const useVerify = (code: string) =>
  useQuery({ queryKey: ['verify', code], queryFn: () => api<VerifyResult>(`/verify/${encodeURIComponent(code)}`), enabled: !!code, retry: false });

/** Adresse publique de vérification (verify_url désigne l'API JSON, pas la page). */
const verifyPage = (code: string) => `${window.location.origin}/verification/${code}`;

/** Carte du producteur (lui-même, ou l'agent via /producteurs/:id/carte). Pas de bibliothèque QR installée : le code de vérification tient lieu de QR. */
export function CardPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const q = useCard(id ?? user?.producer_id);
  const place = usePlaceName();
  const agent = !!id; // /producteurs/:id/carte : l'agent voit la carte d'un autre
  const title = agent ? t('card.titleAgent') : t('card.title');
  const crumbs = agent
    ? [{ label: t('card.crumbProducers'), to: '/producteurs' }, { label: t('card.crumbFile'), to: `/producteurs/${id}` }, { label: t('card.titleAgent') }]
    : [{ label: t('nav.home'), to: '/' }, { label: t('card.crumb') }];
  const head = (actions?: React.ReactNode) => (
    <PageHeader title={title} crumbs={crumbs} desc={agent ? undefined : t('card.desc')} listen={agent ? undefined : t('card.listen')} actions={actions} />
  );

  if (!id && !user?.producer_id) {
    return <>{head()}<Alert tone="warn">{t('card.noProducerHelp')}</Alert></>;
  }
  if (q.isError && q.error instanceof ApiError && q.error.code === 'not_validated') {
    return <>{head()}<div className="card"><EmptyState title={t('card.notValidated')} icon="clock">{t('card.notValidatedHelp')}</EmptyState></div></>;
  }
  if (q.isError) return <>{head()}<ErrorState error={q.error} onRetry={() => q.refetch()} /></>;
  if (!q.data) return <>{head()}<div className="card"><Skeleton lines={4} /></div></>;

  const c = q.data;
  const where = `${place(c.commune)}, ${place(c.department)}`;
  return (
    <>
      {head(<Button icon="printer" onClick={() => window.print()}>{t('card.print')}</Button>)}
      <div className="split">
        <div className="card-zone">
          <div className="pcard" role="img" aria-label={t('card.aria', { name: c.full_name, code: c.code, date: fmtDate(c.issued_at) })}>
            <div className="pc-top">
              <svg aria-hidden><use href={spriteHref('logo')} /></svg>
              <span><b>{t('app.name')}</b>{t('card.cardOf')}</span>
              {c.status !== 'valide' && <span className="pc-status"><StatusBadge s={c.status} /></span>}
            </div>
            <div className="pc-id">
              <span className="pc-name">{c.full_name}</span>
              <span className="small">{where}</span>
              <span className="pc-code num">{c.code}</span>
            </div>
            <div className="pc-qr" aria-hidden>
              <span className="pc-qr-label">{t('card.verificationCode')}</span>
              <span className="pc-qr-code">{c.verification_code}</span>
            </div>
            <div className="pc-foot">
              <span>{t('card.issued')} <b className="num">{fmtDate(c.issued_at)}</b></span>
              <span className="pc-url">{verifyPage(c.verification_code).replace(/^https?:\/\//, '')}</span>
            </div>
          </div>
          <p className="hint no-print">{t('card.noQr')}</p>
        </div>

        <div className="stack" style={{ ['--gap' as string]: '20px' }}>
          <section className="card" aria-labelledby="t-inf">
            <h2 className="card-title" id="t-inf" style={{ marginBottom: 12 }}>{t('card.infoTitle')}</h2>
            <dl className="dl">
              <dt>{t('card.code')}</dt><dd className="num">{c.code}</dd>
              <dt>{t('common.status')}</dt><dd><StatusBadge s={c.status} /></dd>
              <dt>{t('card.issued')}</dt><dd className="num">{fmtDate(c.issued_at)}</dd>
              <dt>{t('card.verificationCode')}</dt><dd className="num">{c.verification_code}</dd>
              <dt>{t('card.verifyAtShort')}</dt><dd><Link to={`/verification/${c.verification_code}`}>{verifyPage(c.verification_code)}</Link></dd>
            </dl>
          </section>
          <section className="card card--tint" aria-labelledby="t-use">
            <h2 className="card-title" id="t-use" style={{ marginBottom: 8 }}>{t('card.showsTitle')}</h2>
            <p className="small">{t('card.showsText')}</p>
          </section>
        </div>
      </div>
    </>
  );
}

const RESULT: Record<ProducerStatus, { cls: string; icon: 'check' | 'clock' | 'x'; key: string }> = {
  valide: { cls: 'res--ok', icon: 'check', key: 'ok' },
  en_attente: { cls: 'res--wait', icon: 'clock', key: 'wait' },
  rejete: { cls: 'res--bad', icon: 'x', key: 'bad' },
  ferme: { cls: 'res--bad', icon: 'x', key: 'closed' },
  efface: { cls: 'res--bad', icon: 'x', key: 'closed' },
};
const asList = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/; // alphabet des cartes : sans 0, O, 1 ni I

/** Page publique (sans connexion) : n'affiche que le nom et le statut (minimisation, art. 424). */
export function VerifyPage() {
  const { t } = useTranslation();
  const msg = useMsg();
  const nav = useNavigate();
  const { code: raw = '' } = useParams();
  const code = raw.toUpperCase();
  const q = useVerify(code);
  const [input, setInput] = useState('');
  const [err, setErr] = useState<string>();

  const onCheck = (e: FormEvent) => {
    e.preventDefault();
    const c = input.trim().toUpperCase();
    if (!CODE_RE.test(c)) return setErr('card.errCode');
    setErr(undefined);
    setInput('');
    nav(`/verification/${c}`);
  };

  const status = q.error instanceof ApiError ? q.error.status : 0;
  const r = q.data && RESULT[q.data.status];
  return (
    <div className="vf">
      <PageHeader title={t('card.verifyTitle')} desc={t('card.verifyDesc')} />
      {code && <p>{t('card.toCheck')} <span className="vf-code">{code}</span></p>}

      {code && (
        <div role="status" aria-live="polite">
          {q.isLoading ? <div className="card"><Skeleton lines={3} /></div>
            : status === 404 ? <div className="card"><EmptyState title={t('card.unknown')} icon="search">{t('card.unknownHelp')}</EmptyState></div>
            : status === 429 ? <Alert tone="warn" icon="clock" title={t('card.throttledTitle')}>{t('card.throttledText')}</Alert>
            : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
            : q.data && r && (
              <section className={`card result ${r.cls}`} aria-labelledby="res-h">
                <div className="res-top">
                  <span className="res-icon"><Icon name={r.icon} size="lg" /></span>
                  <div><h2 id="res-h">{t(`card.res.${r.key}.title`)}</h2><p>{t(`card.res.${r.key}.text`)}</p></div>
                </div>
                <div className="res-body">
                  <p className="res-name">{q.data.full_name}</p>
                  <dl className="dl">
                    <dt>{t('card.fileStatus')}</dt><dd><StatusBadge s={q.data.status} /></dd>
                    <dt>{t('card.checkedAt')}</dt><dd className="num">{fmtDateTime(new Date(q.dataUpdatedAt).toISOString())}</dd>
                  </dl>
                  {q.data.status === 'rejete'
                    ? <p className="res-privacy"><Icon name="alert" /><span>{t('card.rejectAdvice')}</span></p>
                    : <p className="res-privacy"><Icon name="lock" /><span>{t('card.privacy')}</span></p>}
                </div>
              </section>
            )}
        </div>
      )}

      <section className="card stack" aria-labelledby="h-autre" style={{ ['--gap' as string]: '14px' }}>
        <h2 className="card-title" id="h-autre">{code ? t('card.checkOther') : t('card.checkOne')}</h2>
        <form className="field" onSubmit={onCheck} noValidate>
          <label className="label" htmlFor="vf-input">{t('card.verificationCode')}</label>
          <div className="check-row">
            <input className="input" id="vf-input" maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false}
              placeholder={t('card.codePlaceholder')} value={input} onChange={(e) => setInput(e.target.value)}
              aria-invalid={err ? true : undefined} aria-describedby={`vf-h${err ? ' vf-e' : ''}`} />
            <Button type="submit" icon="search">{t('card.check')}</Button>
          </div>
          <span className="hint" id="vf-h">{t('card.codeHint')}</span>
          {err && <span className="error-msg" id="vf-e" role="alert"><Icon name="alert" />{msg(err)}</span>}
        </form>
      </section>

      <section aria-labelledby="h-conseil" className="stack" style={{ ['--gap' as string]: '10px' }}>
        <h2 className="card-title" id="h-conseil">{t('card.doubtTitle')}</h2>
        <ol className="steps-help">
          {(asList(t('card.doubtSteps', { returnObjects: true }))).map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>
    </div>
  );
}
