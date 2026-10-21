import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import './shared/ui/kit.css'; // composants du kit avant Tailwind : les utilitaires l'emportent
import './shared/ui/mobile.css'; // présentation sous 640 px (maquettes/mobile)
import './shared/ui/skin.css'; // « Argile et verre » : l'aspect du kit (docs/REFONTE_FRONTEND.md)
import './index.css';
import './i18n';
import { AuthProvider } from './features/auth/AuthContext';
import { App } from './app/App';
import { makeQueryClient } from './shared/api/queryClient';

const qc = makeQueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

// Service worker (PWA installable, hors ligne). Un échec d'enregistrement ne bloque pas l'application.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}
