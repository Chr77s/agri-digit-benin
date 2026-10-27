import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../shared/ui';

/** Commandes de l'outil de tracé de la carte (leaflet-draw), exposées aux gros boutons ci-dessous. */
export interface DrawApi {
  start: () => void;
  finish: () => void;
  undo: () => void;
  cancel: () => void;
  clear: () => void;
}

interface Props {
  api: RefObject<DrawApi | null>;
  drawing: boolean;
  hasShape: boolean;
}

/** Gros boutons (44 px) pour tracer le contour : la barre d'icônes de leaflet-draw est trop petite au doigt. */
export function DrawBar({ api, drawing, hasShape }: Props) {
  const { t } = useTranslation();
  return (
    <div className="np-bar" role="group" aria-label={t('parcels.trace.group')}>
      {drawing ? (
        <>
          <Button icon="check" onClick={() => api.current?.finish()}>{t('parcels.trace.finish')}</Button>
          <Button variant="secondary" onClick={() => api.current?.undo()}>{t('parcels.trace.undo')}</Button>
          <Button variant="secondary" icon="x" onClick={() => api.current?.cancel()}>{t('common.cancel')}</Button>
          <p className="hint">{t('parcels.trace.drawing')}</p>
        </>
      ) : (
        <>
          <Button icon="edit" variant={hasShape ? 'secondary' : 'primary'} onClick={() => api.current?.start()}>
            {t(hasShape ? 'parcels.trace.redo' : 'parcels.trace.start')}
          </Button>
          {hasShape && <Button variant="secondary" icon="trash" onClick={() => api.current?.clear()}>{t('parcels.trace.clear')}</Button>}
          {!hasShape && <p className="hint">{t('parcels.trace.idle')}</p>}
        </>
      )}
    </div>
  );
}
