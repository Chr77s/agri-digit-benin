import { useTranslation } from 'react-i18next';
import { EmptyState, PageHeader } from '../../shared/ui';

/** Amorce de la refonte : la page est construite en phase 1 d'après maquettes/web. */
export function InteropPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.interop')} />
      <EmptyState title={t('app.comingSoon')} />
    </>
  );
}
