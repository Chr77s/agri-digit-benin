import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { api, ApiError } from '../../shared/api/client';
import type { ProducerCard, VerifyResult } from '../../shared/api/types';
import { usePlaceName } from '../../shared/api/ref';
import { Button, EmptyState, ErrorState, PageHeader, QueryState, Skeleton, fmtDate } from '../../shared/ui';
import { StatusBadge } from '../producers/ProducersPages';
import { useAuth } from '../auth/AuthContext';

export const useCard = (producerId?: string | null) =>
  useQuery({ queryKey: ['card', producerId], queryFn: () => api<ProducerCard>(`/producers/${producerId}/card`), enabled: !!producerId, retry: false });
export const useVerify = (code: string) =>
  useQuery({ queryKey: ['verify', code], queryFn: () => api<VerifyResult>(`/verify/${encodeURIComponent(code)}`), retry: false });

/** Carte du producteur (lui-même, ou l'agent via /producteurs/:id/carte). Pas de bibliothèque QR installée : code en gros caractères et adresse de vérification. */
export function CardPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const q = useCard(id ?? user?.producer_id);
  const place = usePlaceName();
  const title = id ? t('card.titleAgent') : t('card.title'); // /producteurs/:id/carte : l'agent voit la carte d'un autre
  if (q.isError && q.error instanceof ApiError && q.error.code === 'not_validated') {
    return <><PageHeader title={title} /><EmptyState title={t('card.notValidated')}>{t('card.notValidatedHelp')}</EmptyState></>;
  }
  if (!id && !user?.producer_id) return <EmptyState title={t('card.noProducer')} />;
  return (
    <>
      <PageHeader title={title} listen={id ? undefined : t('card.listen')} actions={q.data && <Button onClick={() => window.print()} className="print:hidden"><Printer aria-hidden size={18} /> {t('card.print')}</Button>} />
      <QueryState q={q}>
        {(c) => (
          <article aria-label={title} className="max-w-md rounded border-2 border-text bg-surface p-4">
            <p className="text-sm font-semibold uppercase text-muted">{t('app.name')}, {t('card.heading')}</p>
            <p className="mt-2 text-2xl font-semibold">{c.full_name}</p>
            <p>{place(c.commune)}, {place(c.department)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div><dt className="text-sm text-muted">{t('card.code')}</dt><dd className="font-semibold">{c.code}</dd></div>
              <div><dt className="text-sm text-muted">{t('common.status')}</dt><dd><StatusBadge s={c.status} /></dd></div>
              <div><dt className="text-sm text-muted">{t('card.issued')}</dt><dd>{fmtDate(c.issued_at)}</dd></div>
            </dl>
            <div className="mt-4 rounded border border-border p-3">
              <p className="text-sm text-muted">{t('card.verificationCode')}</p>
              <p className="font-mono text-[28px] font-semibold tracking-[0.3em]">{c.verification_code}</p>
              {/* verify_url désigne l'API JSON ; une personne qui scanne la carte doit ouvrir la page publique de vérification. */}
              <p className="mt-1 break-all text-sm">{t('card.verifyAt')} <span className="font-semibold">{`${window.location.origin}/verification/${c.verification_code}`}</span></p>
            </div>
          </article>
        )}
      </QueryState>
    </>
  );
}

/** Page publique : n'affiche que le statut et le nom. */
export function VerifyPage() {
  const { t } = useTranslation();
  const { code = '' } = useParams();
  const q = useVerify(code);
  return (
    <>
      <PageHeader title={t('card.verifyTitle')} />
      <p className="mb-3">{t('card.verifyCode', { code })}</p>
      {q.isLoading ? <Skeleton /> : q.isError ? (
        q.error instanceof ApiError && q.error.status === 404
          ? <EmptyState title={t('card.unknown')}>{t('card.unknownHelp')}</EmptyState>
          : <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data && (
        <div role="status" className="max-w-md rounded border border-border bg-surface p-4">
          <p className="text-2xl font-semibold">{q.data.full_name}</p>
          <p className="mt-2"><StatusBadge s={q.data.status} /></p>
        </div>
      )}
    </>
  );
}
