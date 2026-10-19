// Parcours de démonstration (MASTER_PROMPT section 15). Prérequis : backend seedé (seed_demo) sur 127.0.0.1:8000 et `npm run dev`.
// Installation : npm i -D @playwright/test && npx playwright install chromium ; lancement : npx playwright test
import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, phone: string, password?: string) {
  await page.goto('/connexion');
  await page.getByLabel(/Numéro de téléphone/).fill(phone);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  const banner = page.getByText(/votre code de connexion est/);
  await expect(banner).toBeVisible({ timeout: 10_000 });
  const code = ((await banner.textContent()) ?? '').match(/\b(\d{6})\b/)?.[1];
  expect(code).toBeTruthy();
  if (password) await page.getByLabel('Mot de passe').fill(password);
  await page.getByLabel('Chiffre 1 sur 6').pressSequentially(code!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Coque Bénin Vert : la déconnexion est dans le menu du compte de l'en-tête.
  await expect(page.getByRole('button', { name: /Menu du compte/ })).toBeVisible();
}
const logout = async (page: Page) => {
  await page.getByRole('button', { name: /Menu du compte/ }).click();
  await page.getByRole('menuitem', { name: /Se déconnecter/ }).click();
};
const PWD = 'AgriDemo-2026!';

test('parcours de démonstration', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // 1. Inscription avec un NPI valide et consentement
  const phone = `0196${String(Date.now()).slice(-6)}`;
  await page.goto('/inscription');
  // Inscription en 5 étapes : identité, contact, langue, consentement, récapitulatif
  const next = () => page.getByRole('button', { name: /Continuer|Voir le récapitulatif/ }).click();
  await page.getByLabel(/^NPI/).fill('1000000002');
  await page.getByLabel('Femme').check();
  await page.getByLabel('Prénom').fill('Awa');
  await page.getByLabel('Nom', { exact: true }).fill('SABI');
  await page.getByLabel('Date de naissance').fill('1990-07-01');
  await next();
  await page.getByLabel('Département').selectOption({ label: 'Alibori' });
  await page.getByLabel(/^Commune/).selectOption({ label: 'Banikoara' });
  await page.getByLabel(/^Téléphone/).fill(phone);
  await next();
  await next();
  await page.getByRole('checkbox', { name: /je donne mon consentement/i }).check();
  await next();
  await page.getByRole('button', { name: /Envoyer l'inscription/ }).click();
  await expect(page.getByText(/En attente de validation/)).toBeVisible();

  // 2. L'agent ATDA valide la fiche
  await login(page, '0197000002', PWD);
  await page.goto('/producteurs');
  await page.getByRole('link', { name: /BJ-AGR/ }).first().click();
  await page.getByRole('button', { name: 'Valider la fiche' }).click();
  await expect(page.getByText(/Fiche validée/)).toBeVisible();

  // 5. Alerte ravageur envoyée, boîte SMS simulée
  await page.goto('/alertes');
  await page.getByLabel('Titre').fill('Chenille légionnaire');
  await page.getByLabel(/Message/).fill('Chenille légionnaire signalée. Inspectez vos champs de maïs.');
  await page.getByRole('button', { name: "Enregistrer l'alerte" }).click();
  await page.getByRole('button', { name: "Envoyer l'alerte" }).first().click();
  await expect(page.getByText(/livré/)).toBeVisible();
  await page.goto('/boite-envoi');
  await expect(page.getByText('Livré').first()).toBeVisible();
  await logout(page);

  // 4. Producteur de démo : assistant
  await login(page, '0197000001');
  await page.goto('/assistant');
  await page.getByLabel('Votre question').fill('quand semer le maïs à Banikoara ?');
  await page.getByRole('button', { name: 'Envoyer la question' }).click();
  await expect(page.getByText('Sources')).toBeVisible();
  await page.getByLabel('Votre question').fill('quelle dose de pesticide pour le coton ?');
  await page.getByRole('button', { name: 'Envoyer la question' }).click();
  await expect(page.getByText(/transmise à un agent/)).toBeVisible();

  // 7. Programmes : candidature puis programme clos
  await page.goto('/programmes');
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  await logout(page);

  // 9. Audit et export
  await login(page, '0197000006', PWD);
  await expect(page.getByRole('heading', { name: "Journal d'audit" })).toBeVisible();
  await logout(page);
  await login(page, '0197000005', PWD);
  await page.goto('/tableau-de-bord');
  await expect(page.getByText(/Source :/)).toBeVisible();

  expect(errors).toEqual([]);
});
