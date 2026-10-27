// Console satellite. Prérequis : backend seedé (seed_demo) sur 127.0.0.1:8000, `npm run dev`, mode démonstration ou Copernicus.
import { test, expect, type Page } from '@playwright/test';

const PWD = 'AgriDemo-2026!';

async function login(page: Page, phone: string) {
  await page.goto('/connexion');
  await page.getByRole('tab', { name: 'Agent ou partenaire' }).click();
  await page.getByLabel(/Numéro de téléphone/).fill(phone);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  const banner = page.getByText(/votre code de connexion est/);
  await expect(banner).toBeVisible({ timeout: 10_000 });
  const code = ((await banner.textContent()) ?? '').match(/\b(\d{6})\b/)?.[1];
  expect(code).toBeTruthy();
  await page.getByLabel('Mot de passe', { exact: true }).fill(PWD);
  await page.getByLabel('Chiffre 1 sur 6').pressSequentially(code!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('button', { name: /Menu du compte/ })).toBeVisible();
}

test('console satellite : indice, curseur de passages et honnêteté des valeurs', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await login(page, '0197000004'); // responsable de programme : tous les départements
  await page.goto('/satellite');

  await expect(page.getByRole('heading', { name: "Console d'analyse" })).toBeVisible();
  await expect(page.locator('.sat-map path.leaflet-interactive')).toHaveCount(12);

  // changer d'indice recolore la carte et la légende
  await page.getByRole('radio', { name: /NDMI/ }).check();
  await expect(page.getByRole('radio', { name: /NDMI/ })).toBeChecked();

  // le curseur parcourt les 9 passages et la période affichée change
  const label = page.locator('.sat-time-label span');
  const before = await label.textContent();
  await page.getByRole('slider', { name: 'Frise des passages' }).fill('2');
  await expect(label).not.toHaveText(before ?? '');

  // jamais de NaN ni de valeur « undefined » à l'écran
  await expect(page.locator('body')).not.toContainText(/NaN|undefined/);
  // le tableau garde son titre et ses colonnes d'origine
  await expect(page.getByText('Passages du satellite')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Humidité de la végétation \(NDMI\)/ })).toBeVisible();
  expect(errors.filter((e) => !/tile|Failed to load resource/i.test(e))).toEqual([]);
});
