import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePlaceName } from '../../shared/api/ref';
import { Alert, Avatar, Badge, Button, Card, Icon, PageHeader, QueryState, Radio, buttonCls, fmtDate, toast } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { syncQueue, useOfflineStatus } from '../outbox/offlineQueue';
import { useProducer } from './api';
import { StatusBadge } from './ProducersPages';
import './producteur.css';

const LANGS = ['fr', 'fon', 'bba', 'yo', 'dnd'];
const maskPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 2)} ${p.slice(2, 4)} •• •• ${p.slice(-2)}` : p);

/** /profil (producteur) : identité lue sur la fiche, langue, saisies gardées sur le téléphone. Le serveur n'offre pas encore de changement de numéro ni de suppression en libre-service : la page l'explique au lieu de le simuler. */
export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <>
      <PageHeader title={t('profile.title')} desc={t('profile.desc')} crumbs={[{ label: t('nav.home'), to: '/' }, { label: t('profile.title') }]} />
      <div className="split">
        <div className="stack" style={{ ['--gap' as string]: '20px' }}>
          {user?.producer_id ? <Identity id={user.producer_id} /> : <Alert tone="warn">{t('profile.noProducer')}</Alert>}
          {user && (
            <Card title={t('profile.phoneTitle')}>
              <p>{t('profile.phoneNow')} <b className="num">{maskPhone(user.phone)}</b></p>
              <p className="hint mt-2">{t('profile.phoneHelp')}</p>
            </Card>
          )}
          <LanguageCard />
        </div>
        <div className="stack" style={{ ['--gap' as string]: '20px' }}>
          <OfflineCard />
          <Card title={t('profile.delTitle')}>
            <p className="small">{t('profile.delText')}</p>
            <Link className={`${buttonCls({ variant: 'secondary' })} mt-3`} to="/consentements"><Icon name="shield-check" />{t('profile.delLink')}</Link>
          </Card>
        </div>
      </div>
    </>
  );
}

function Identity({ id }: { id: string }) {
  const { t } = useTranslation();
  const q = useProducer(id);
  const place = usePlaceName();
  return (
    <QueryState q={q}>
      {(p) => {
        const name = `${p.first_name} ${p.last_name}`;
        return (
          <section className="card" aria-labelledby="prof-id">
            <div className="card-head">
              <div className="cluster" style={{ alignItems: 'center' }}>
                <Avatar name={name} size="lg" dark />
                <div><h2 className="card-title" id="prof-id">{name}</h2><p className="card-sub num">{t('profile.idSub', { code: p.code })}</p></div>
              </div>
              <StatusBadge s={p.status} />
            </div>
            <dl className="dl">
              <dt>{t('producers.npi')}</dt><dd className="num">{p.npi ? `•••• ${p.npi.slice(-4)}` : '—'} <Badge tone="sim">{t('profile.anip')}</Badge></dd>
              <dt>{t('producers.birth')}</dt><dd className="num">{fmtDate(p.birth_date)}</dd>
              <dt>{t('register.sex')}</dt><dd>{p.sex === 'F' ? t('register.female') : t('register.male')}</dd>
              <dt>{t('common.commune')}</dt><dd>{place(p.commune)} ({place(p.department)})</dd>
            </dl>
            <p className="hint mt-3">{t('profile.idHint')}</p>
          </section>
        );
      }}
    </QueryState>
  );
}

function LanguageCard() {
  const { t, i18n } = useTranslation();
  return (
    <Card title={t('profile.langTitle')}>
      <fieldset className="fieldset">
        <legend className="label">{t('profile.langLegend')}</legend>
        {LANGS.map((l) => (
          <Radio key={l} name="lang" checked={i18n.language === l} onChange={() => void i18n.changeLanguage(l)}
            label={<>{t(`ag.lang.${l}`)}{l !== 'fr' && <> <Badge tone="demo">{t('lang.toValidate')}</Badge></>}</>} />
        ))}
      </fieldset>
      <p className="hint mt-2">{t('profile.langHint')}</p>
    </Card>
  );
}

function OfflineCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { online, pending } = useOfflineStatus();
  return (
    <Card title={t('profile.offTitle')}>
      {!online && <Alert tone="warn" icon="wifi-off">{t('profile.offOffline')}</Alert>}
      {pending.length === 0
        ? <p className="small muted">{t('profile.offNone')}</p>
        : (
          <>
            <p><b className="num">{t('profile.offPending', { count: pending.length })}</b></p>
            <ul className="list">
              {pending.map((w) => <li key={w.id} className="list-item"><span className="li-icon"><Icon name={w.conflict || w.error ? 'alert' : 'cloud-upload'} /></span><span className="li-main"><span className="li-title">{w.label}</span><span className="li-meta num">{new Date(w.created_at).toLocaleString('fr-FR')}</span></span></li>)}
            </ul>
            <Button variant="secondary" className="mt-3" disabled={!online} onClick={() => { void syncQueue(qc).then(() => toast(t('profile.offSent'))); }}>{t('profile.offSend')}</Button>
          </>
        )}
      <p className="hint mt-3">{t('profile.offHint')}</p>
    </Card>
  );
}
