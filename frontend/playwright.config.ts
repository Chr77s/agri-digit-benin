// Nécessite `npm i -D @playwright/test` (non installé : mémoire du poste de développement insuffisante).
// @ts-nocheck
import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: 'e2e', use: { baseURL: 'http://localhost:5173' }, timeout: 120_000 });
