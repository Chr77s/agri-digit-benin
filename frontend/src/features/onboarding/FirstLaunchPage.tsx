import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Icon, spriteHref, speak, type IconName } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { GALLERY } from '../landing/gallery';
import './onboarding.css';

/** Premier lancement (maquettes/mobile : langue, intro-1..3, autorisations) : montré une fois, sous 640 px, puis mémorisé sur le téléphone. */
const DONE_KEY = 'adb-first-launch';
export const firstLaunchDone = () => { try { return localStorage.getItem(DONE_KEY) === 'done'; } catch { return true; } };
const markDone = () => { try { localStorage.setItem(DONE_KEY, 'done'); } catch { /* stockage indisponible : l'écran reviendra, sans gêner */ } };

export const LANGS: [string, string, string][] = [['fr', 'Français', 'fr'], ['fon', 'Fɔngbè', 'fon'], ['bba', 'Baatɔnum', 'bba'], ['yo', 'Yorùbá', 'yo'], ['dnd', 'Dendi', 'dnd']];

export function FirstLaunchPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  // Changement d'écran : le titre reçoit le focus (lecteur d'écran, clavier).
  useEffect(() => { if (first.current) { first.current = false; return; } heading.current?.focus(); }, [step]);
  const finish = () => { markDone(); nav(user ? '/' : '/connexion', { replace: true }); };

  return (
    <main className="fl" id="main">
      {step === 0 && <LanguageStep heading={heading} onNext={() => setStep(1)} />}
      {step >= 1 && step <= 3 && <IntroStep n={step} heading={heading} onNext={() => setStep(step + 1)} onSkip={() => setStep(4)} />}
      {step === 4 && <PermissionsStep heading={heading} onBack={() => setStep(3)} onDone={finish} />}
      <p className="sr-only" aria-live="polite">{t('mobile.fl.screen', { n: step + 1, total: 5 })}</p>
    </main>
  );
}

type H = { heading: React.RefObject<HTMLHeadingElement> };

function LanguageStep({ heading, onNext }: H & { onNext: () => void }) {
  const { t, i18n } = useTranslation();
  const cur = LANGS.find(([c]) => c === i18n.language) ?? LANGS[0];
  return (
    <>
      <div className="fl-scroll">
        <div className="fl-brand">
          <svg aria-hidden><use href={spriteHref('logo')} /></svg>
          <div><p className="fl-tiny">{t('app.name')}</p><h1 className="fl-title" ref={heading} tabIndex={-1}>{t('mobile.fl.langTitle')}</h1></div>
        </div>
        <p className="fl-lead">{t('mobile.fl.langLead')}</p>
        <fieldset className="fl-langs">
          <legend className="sr-only">{t('mobile.fl.langTitle')}</legend>
          {LANGS.map(([code, name, key]) => (
            <div key={code} className={`fl-lang${code === cur[0] ? ' is-on' : ''}`}>
              <label>
                <input type="radio" className="radio" name="fl-lang" checked={code === cur[0]} onChange={() => void i18n.changeLanguage(code)} />
                <span><b>{name}</b><span>{t(`mobile.fl.langSub.${key}`)}</span></span>
              </label>
              {code !== 'fr' && <Badge tone="wait" icon={false}>{t('mobile.fl.toValidate')}</Badge>}
              <button type="button" className="fl-say" aria-label={t('mobile.fl.listenLang', { name })} onClick={() => speak(`${name}. ${t(`mobile.fl.langSub.${key}`)}`)}>
                <Icon name="megaphone" />
              </button>
            </div>
          ))}
        </fieldset>
        <p className="fl-tiny fl-note"><Icon name="info" size="sm" />{t('mobile.fl.langNote')}</p>
      </div>
      <div className="fl-cta"><Button onClick={onNext}>{cur[0] === 'fr' ? t('mobile.fl.continueFr') : t('mobile.fl.continueIn', { name: cur[1] })}<Icon name="chevron-right" /></Button></div>
    </>
  );
}

const INTRO: { photo: number; key: string; overlay: (t: (k: string) => string) => ReactNode }[] = [
  { photo: 0, key: 'i1', overlay: (t) => <><p className="fl-msg fl-msg--me">{t('mobile.fl.i1.q')}</p><p className="fl-msg">{t('mobile.fl.i1.a')}</p></> },
  { photo: 2, key: 'i2', overlay: (t) => <div className="fl-ov-card"><span className="fl-ov-ic fl-ov-ic--bad"><Icon name="alert" /></span><span><b>{t('mobile.fl.i2.card')}</b><small>{t('mobile.fl.i2.cardSub')}</small></span></div> },
  { photo: 1, key: 'i3', overlay: (t) => <div className="fl-ov-card"><span className="fl-ov-ic"><Icon name="check" /></span><span><b className="num">{t('mobile.fl.i3.card')}</b><small>{t('mobile.fl.i3.cardSub')}</small></span><Badge tone="sim">{t('common.simulation')}</Badge></div> },
];

function IntroStep({ n, heading, onNext, onSkip }: H & { n: number; onNext: () => void; onSkip: () => void }) {
  const { t } = useTranslation();
  const it = INTRO[n - 1];
  const photo = GALLERY[it.photo];
  const title = t(`mobile.fl.${it.key}.title`);
  const text = t(`mobile.fl.${it.key}.text`);
  return (
    <>
      <div className="fl-top">
        <button type="button" className="fl-say" aria-label={t('common.listen')} onClick={() => speak(`${title}. ${text}`)}><Icon name="megaphone" /></button>
        <Button variant="ghost" size="sm" onClick={onSkip}>{t('mobile.fl.skip')}</Button>
      </div>
      <figure className="fl-illus">
        <img src={photo.src} alt="" width={photo.width} height={photo.height} />
        <figcaption className="fl-credit">{t('mobile.fl.credit', { author: photo.author, license: photo.license })}</figcaption>
        <div className="fl-ov" aria-hidden>{it.overlay(t)}</div>
      </figure>
      <div className="fl-scroll">
        <h1 className="fl-title" ref={heading} tabIndex={-1}>{title}</h1>
        <p className="fl-lead">{text}</p>
      </div>
      <div className="fl-cta">
        <div className="fl-dots" aria-hidden>{[1, 2, 3].map((i) => <i key={i} className={i === n ? 'is-on' : undefined} />)}</div>
        <Button onClick={onNext}>{n < 3 ? t('mobile.fl.next') : t('mobile.fl.start')}<Icon name="chevron-right" /></Button>
      </div>
    </>
  );
}

/* ---------- Autorisations : vraies demandes du navigateur, une par une ---------- */
type PermState = 'ask' | 'ok' | 'no' | 'none';
type PermId = 'geo' | 'camera' | 'mic' | 'notif';
const PERMS: { id: PermId; icon: IconName; query: string }[] = [
  { id: 'geo', icon: 'map-pin', query: 'geolocation' }, { id: 'camera', icon: 'camera', query: 'camera' },
  { id: 'mic', icon: 'mic', query: 'microphone' }, { id: 'notif', icon: 'bell', query: 'notifications' },
];

const media = async (c: MediaStreamConstraints): Promise<PermState> => {
  if (!navigator.mediaDevices?.getUserMedia) return 'none';
  try { (await navigator.mediaDevices.getUserMedia(c)).getTracks().forEach((tr) => tr.stop()); return 'ok'; } catch (e) {
    return e instanceof DOMException && e.name === 'NotFoundError' ? 'none' : 'no';
  }
};
export const REQUEST: Record<PermId, () => Promise<PermState>> = {
  // Seul le refus (code 1) compte : une position introuvable n'empêche pas l'accès.
  geo: () => (navigator.geolocation
    ? new Promise((res) => navigator.geolocation.getCurrentPosition(() => res('ok'), (e) => res(e.code === 1 ? 'no' : 'ok'), { timeout: 15000, maximumAge: 600000 }))
    : Promise.resolve('none')),
  camera: () => media({ video: true }),
  mic: () => media({ audio: true }),
  notif: async () => {
    if (typeof Notification === 'undefined') return 'none';
    const p = await Notification.requestPermission();
    return p === 'granted' ? 'ok' : p === 'denied' ? 'no' : 'ask';
  },
};

function PermissionsStep({ heading, onBack, onDone }: H & { onBack: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const [st, setSt] = useState<Record<PermId, PermState>>({ geo: 'ask', camera: 'ask', mic: 'ask', notif: 'ask' });
  const [busy, setBusy] = useState(false);
  // État déjà connu du navigateur (accordé ou refusé avant) : rien à redemander.
  useEffect(() => {
    PERMS.forEach(({ id, query }) => {
      navigator.permissions?.query({ name: query as PermissionName })
        .then((r) => r.state !== 'prompt' && setSt((s) => ({ ...s, [id]: r.state === 'granted' ? 'ok' : 'no' })))
        .catch(() => undefined);
    });
  }, []);
  const ask = async (id: PermId) => { const r = await REQUEST[id](); setSt((s) => ({ ...s, [id]: r })); };
  const askAll = async () => {
    setBusy(true);
    try { for (const { id } of PERMS) if (st[id] === 'ask') await ask(id); } finally { setBusy(false); }
  };
  const left = PERMS.some(({ id }) => st[id] === 'ask');
  return (
    <>
      <div className="fl-bar">
        <button type="button" className="btn btn-icon" aria-label={t('mobile.fl.back')} onClick={onBack}><Icon name="arrow-left" /></button>
        <div className="fl-bar-t"><h1 ref={heading} tabIndex={-1}>{t('mobile.fl.permTitle')}</h1><p>{t('mobile.fl.permSub')}</p></div>
      </div>
      <div className="fl-scroll">
        <p className="fl-lead">{t('mobile.fl.permLead')}</p>
        <ul className="fl-perms">
          {PERMS.map(({ id, icon }) => (
            <li key={id}>
              <span className="fl-ico"><Icon name={icon} /></span>
              <span className="fl-perm-t"><b>{t(`mobile.fl.perm.${id}`)}</b><span>{t(`mobile.fl.perm.${id}Why`)}</span></span>
              {st[id] === 'ask'
                ? <Button variant="secondary" size="sm" disabled={busy} onClick={() => void ask(id)} aria-label={t('mobile.fl.allowNamed', { name: t(`mobile.fl.perm.${id}`) })}>{t('mobile.fl.allow')}</Button>
                : <Badge tone={st[id] === 'ok' ? 'ok' : 'neutral'} icon={st[id] === 'ok' ? 'check' : false}>{t(`mobile.fl.state.${st[id]}`)}</Badge>}
            </li>
          ))}
        </ul>
        <p className="fl-tiny">{t('mobile.fl.permLater')}</p>
      </div>
      <div className="fl-cta">
        {left
          ? <><Button icon="check" busy={busy} onClick={() => void askAll()}>{t('mobile.fl.allowAll')}</Button><Button variant="ghost" onClick={onDone}>{t('mobile.fl.later')}</Button></>
          : <Button onClick={onDone}>{t('mobile.fl.finish')}<Icon name="chevron-right" /></Button>}
      </div>
    </>
  );
}
