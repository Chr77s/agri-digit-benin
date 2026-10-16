import '@testing-library/jest-dom/vitest';
import './i18n';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Le nettoyage automatique ne s'exécute pas quand plusieurs fichiers partagent un processus (singleFork) : on le force.
afterEach(cleanup);
