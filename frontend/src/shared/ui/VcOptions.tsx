import { useTranslation } from 'react-i18next';
import type { ValueChain } from '../api/types';

/** Options d'un <select multiple> : filières principales puis groupe « Filières de réserve ». */
export function VcOptions({ vcs }: { vcs?: ValueChain[] }) {
  const { t } = useTranslation();
  const all = vcs ?? [];
  const reserve = all.filter((v) => v.reserve);
  return (
    <>
      {all.filter((v) => !v.reserve).map((v) => <option key={v.code} value={v.code}>{v.name}</option>)}
      {reserve.length > 0 && <optgroup label={t('common.reserveChains')}>{reserve.map((v) => <option key={v.code} value={v.code}>{v.name}</option>)}</optgroup>}
    </>
  );
}
