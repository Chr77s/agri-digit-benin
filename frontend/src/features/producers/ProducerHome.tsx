import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, HandCoins, Map, MessageCircleQuestion, ShieldCheck, Sprout } from 'lucide-react';
import { ListenButton } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';

const tiles = [
  { to: '/parcelles', key: 'parcels', Icon: Map },
  { to: '/campagnes', key: 'campaigns', Icon: Sprout },
  { to: '/assistant', key: 'assistant', Icon: MessageCircleQuestion },
  { to: '/messages', key: 'notifications', Icon: Bell },
  { to: '/programmes', key: 'programs', Icon: HandCoins },
  { to: '/consentements', key: 'consents', Icon: ShieldCheck },
];

export function ProducerHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('home.hello', { name: user?.full_name ?? '' })}</h1>
          <p className="text-lg">{t('home.intro')}</p>
        </div>
        <ListenButton text={t('home.listen')} label={t('common.listen')} />
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map(({ to, key, Icon }) => (
          <li key={to}>
            <Link to={to} className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded border-2 border-brand bg-surface p-4 text-center text-lg font-semibold text-brand hover:bg-success-bg">
              <Icon aria-hidden size={40} strokeWidth={1.75} />
              {t(`nav.${key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
