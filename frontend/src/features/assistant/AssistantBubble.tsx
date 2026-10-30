import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from '../../shared/ui';
import '../producers/producteur.css';

// Le chat n'est chargé qu'à la première ouverture ; il reste ensuite monté (fermé) pour garder la conversation en cours.
const Chat = lazy(() => import('./AssistantChat').then((m) => ({ default: m.AssistantChat })));

/** Bulle de discussion : l'assistant sur toutes les pages connectées, sauf sur sa page dédiée. */
export function AssistantBubble() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); opener.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  if (pathname.startsWith('/assistant')) return null;
  return (
    <>
      <button ref={opener} type="button" className="bubble-fab" aria-label={t('assistant.openBubble')} aria-expanded={open} aria-controls="assistant-bubble"
        hidden={open} onClick={() => { setLoaded(true); setOpen(true); }}>
        <Icon name="chat" />
      </button>
      <div id="assistant-bubble" className="bubble-panel" role="dialog" aria-label={t('nav.assistant')} hidden={!open}>
        {loaded && (
          <Suspense fallback={<p className="bubble-wait">{t('assistant.searching')}</p>}>
            <Chat variant="bubble" active={open}
              headerExtra={<Button variant="ghost" iconOnly icon="x" aria-label={t('assistant.closeBubble')} title={t('assistant.closeBubble')} onClick={close} />} />
          </Suspense>
        )}
      </div>
    </>
  );
}
