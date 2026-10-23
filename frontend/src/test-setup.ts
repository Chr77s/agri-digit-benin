import '@testing-library/jest-dom/vitest';
import './i18n';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Le nettoyage automatique ne s'exécute pas quand plusieurs fichiers partagent un processus (singleFork) : on le force.
afterEach(cleanup);

// jsdom ne fournit pas Blob.text (présent dans les navigateurs) : lecture par FileReader, comme un navigateur.
if (!Blob.prototype.text) {
  Blob.prototype.text = function text(this: Blob) {
    return new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsText(this); });
  };
}

// jsdom n'implémente pas window.scrollTo (appelé à chaque changement de page par Layout.tsx)
window.scrollTo = () => {};
