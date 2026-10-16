import { Trans, useTranslation } from 'react-i18next';
import { PageHeader } from '../../shared/ui';

export function LegalPage() {
  const { t } = useTranslation();
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <PageHeader title={t('app.legal')} listen={t('legal.listen')} />
      <p className="rounded border border-warn bg-warn-bg p-3 text-warn">{t('legal.prototype')}</p>
      <section>
        <h2 className="text-xl font-semibold">{t('legal.publisherTitle')}</h2>
        <p>{t('legal.publisherText')}</p>
        <p>{t('legal.hosting')}</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">{t('legal.dataTitle')}</h2>
        <ul className="list-disc pl-6">
          <li>{t('legal.dataIdentity')}</li>
          <li>{t('legal.dataContact')}</li>
          <li>{t('legal.dataFarm')}</li>
          <li>{t('legal.dataAssistant')}</li>
        </ul>
        <p>{t('legal.dataNone')}</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">{t('legal.purposeTitle')}</h2>
        <p>{t('legal.purposeText')}</p>
        <p>{t('legal.noAutomated')}</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">{t('legal.rightsTitle')}</h2>
        <p>{t('legal.rightsText')}</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">{t('legal.contactTitle')}</h2>
        <p><Trans i18nKey="legal.contactText" components={{ b: <strong /> }} /></p>
      </section>
    </article>
  );
}
