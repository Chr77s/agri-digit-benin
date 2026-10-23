import { ApiError } from '../../shared/api/client';
import { Alert } from '../../shared/ui';

/** Erreur du serveur qui ne vise aucun champ (droit refusé, doublon, enquête close…) ; les erreurs de champ s'affichent sous le champ. */
export function FormError({ error }: { error: unknown }) {
  if (!error || (error instanceof ApiError && error.body.fields)) return null;
  return <Alert tone="danger" live>{error instanceof Error ? error.message : ''}</Alert>;
}

export const gap = (n: number) => ({ '--gap': `${n}px` }) as React.CSSProperties;

/** Date locale AAAA-MM-JJ (toISOString passerait en UTC, soit la veille au Bénin le matin). */
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
