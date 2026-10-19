// Scénarios P2 : carte producteur, coopérative, appui remis puis confirmé, marché, accessibilité.
// Mêmes prérequis que demo.spec.ts : backend seedé (seed_demo) sur 127.0.0.1:8000 et `npm run dev`.
// Ces spécifications cherchent les textes français de src/i18n/fr.json : si une clé change, mettre à jour ici.
// @axe-core/playwright n'est pas dans package.json : les contrôles d'accessibilité vérifient seulement rôles et libellés.
import { test, expect, type Page } from '@playwright/test';

const PWD = 'AgriDemo-2026!';
const COOP = 'Coopérative des producteurs de maïs de Banikoara';

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

async function logout(page: Page) {
  await page.getByRole('button', { name: /Menu du compte/ }).click();
  await page.getByRole('menuitem', { name: /Se déconnecter/ }).click();
  await expect(page.getByRole('button', { name: /Menu du compte/ })).toHaveCount(0);
}

// ---------------------------------------------------------------------------------------------
// UC-07 : carte producteur
// ---------------------------------------------------------------------------------------------
test('carte producteur : « Ma carte » puis vérification publique', async ({ page }) => {
  await login(page, '0197000001');
  await page.goto('/ma-carte');
  await expect(page.getByRole('heading', { level: 1, name: 'Ma carte de producteur' })).toBeVisible();
  const card = page.getByRole('img', { name: /Carte de producteur de .*GOUNOU/ });
  await expect(card).toBeVisible();
  await expect(page.getByText(/Vérifiable à l'adresse/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimer la carte' })).toBeVisible();
  // Le code de vérification (8 caractères) suit son libellé dans « Informations de la carte ».
  const code = (await page.locator('dt', { hasText: /^Code de vérification$/ }).locator('xpath=following-sibling::dd[1]').innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{8}$/);
  await logout(page);

  // Page publique, sans connexion : seuls le nom et le statut apparaissent.
  await page.goto(`/verification/${code}`);
  await expect(page.getByRole('heading', { level: 1, name: "Vérification d'une carte de producteur" })).toBeVisible();
  const result = page.getByRole('status');
  await expect(result).toContainText('Bio GOUNOU');
  await expect(result).toContainText('Validé');
  await expect(page.locator('body')).not.toContainText('0197000001');
  await expect(page.locator('body')).not.toContainText('1000000001');

  // Un code inconnu ne révèle rien.
  await page.goto('/verification/ZZZZZZZZ');
  await expect(page.getByText('Code inconnu')).toBeVisible();
});

// ---------------------------------------------------------------------------------------------
// UC-06 : coopérative (compte gestionnaire)
// ---------------------------------------------------------------------------------------------
test('coopérative : le gestionnaire met fin à une adhésion puis la rétablit', async ({ page }) => {
  await login(page, '0197000008', PWD);
  await expect(page.getByRole('heading', { level: 1, name: 'Ma coopérative' })).toBeVisible();
  await page.getByRole('link', { name: COOP }).click();

  const members = page.getByRole('table', { name: 'Membres' });
  const first = members.locator('tbody tr').first();
  await expect(first).toBeVisible();
  const code = (await first.innerText()).match(/BJ-AGR-\d{4}-\d{6}/)?.[0];
  expect(code).toBeTruthy();

  // Fin d'adhésion avec motif obligatoire (5 caractères au moins).
  await first.getByRole('button', { name: 'Mettre fin' }).click();
  const end = page.getByRole('dialog');
  await end.getByRole('button', { name: "Confirmer la fin d'adhésion" }).click();
  await expect(end.getByRole('alert')).toContainText('motif');
  await end.getByLabel("Motif de fin d'adhésion").fill('Départ de la coopérative (test e2e)');
  await end.getByRole('button', { name: "Confirmer la fin d'adhésion" }).click();
  await expect(page.getByText(/Adhésion terminée\. Elle reste visible dans l'historique/)).toBeVisible();

  // L'adhésion terminée reste visible dans l'historique.
  await page.getByLabel('Afficher', { exact: true }).selectOption('false');
  await expect(members.getByText(code!).first()).toBeVisible();

  // Le gestionnaire n'a pas accès au registre : il saisit le code du producteur.
  await page.getByRole('button', { name: 'Ajouter un membre' }).click();
  const add = page.getByRole('dialog', { name: 'Ajouter un membre' });
  await add.getByLabel('Producteur', { exact: true }).fill(code!);
  await add.getByRole('button', { name: 'Ajouter à la coopérative' }).click();
  await expect(page.getByText('Membre ajouté.')).toBeVisible();
  await page.getByLabel('Afficher', { exact: true }).selectOption('true');
  await expect(members.getByText(code!).first()).toBeVisible();
});

// ---------------------------------------------------------------------------------------------
// UC-10 : appui remis par l'agent, confirmé par le producteur
// ---------------------------------------------------------------------------------------------
test('appui : remis par l’agent ATDA puis confirmé par le producteur', async ({ page }) => {
  const item = `Semences de maïs e2e ${Date.now()}`;

  await login(page, '0197000002', PWD);
  await page.goto('/appuis');
  await expect(page.getByRole('heading', { level: 1, name: 'Appuis' })).toBeVisible();
  const submit = page.getByRole('button', { name: "Enregistrer l'appui" });
  // Champs obligatoires : message à côté du champ, rien n'est envoyé.
  await submit.click();
  await expect(page.getByRole('alert').first()).toBeVisible();

  const producer = page.getByLabel('Producteur', { exact: true });
  const value = await producer.locator('option', { hasText: 'GOUNOU' }).first().getAttribute('value');
  expect(value).toBeTruthy();
  await producer.selectOption(value!);
  await page.getByLabel('Appui', { exact: true }).fill(item);
  await page.getByLabel('Quantité', { exact: true }).fill('25');
  await page.getByLabel('Valeur (FCFA)').fill('37500');
  await submit.click();
  await expect(page.getByText('Appui enregistré. Le producteur doit maintenant le confirmer.')).toBeVisible();
  await page.getByLabel('Rechercher').fill(item); // le tableau est paginé : on isole la ligne
  await expect(page.getByRole('row', { name: new RegExp(item) })).toContainText('Remis');
  await logout(page);

  await login(page, '0197000001');
  await page.goto('/appuis');
  await expect(page.getByRole('heading', { level: 1, name: 'Mes appuis' })).toBeVisible();
  const mine = page.getByRole('listitem').filter({ hasText: item });
  await expect(mine).toBeVisible();
  await mine.getByRole('button', { name: 'Confirmer la réception' }).click();
  await expect(page.getByText('Merci. Votre confirmation est enregistrée.')).toBeVisible();
  await expect(mine).toContainText('Confirmé le');
  await expect(mine.getByRole('button', { name: 'Confirmer la réception' })).toHaveCount(0);
});

// ---------------------------------------------------------------------------------------------
// UC-21 : marché, offre puis mise en relation (comptes transformateur et distributeur)
// ---------------------------------------------------------------------------------------------
test('marché : offre du transformateur, demande du distributeur, acceptation', async ({ page }) => {
  const description = `Offre e2e ${Date.now()}`;
  const message = 'Intéressé par votre maïs (test e2e).';

  // 1. Le transformateur publie une offre.
  await login(page, '0197000009', PWD);
  await page.goto('/marche');
  await expect(page.getByRole('heading', { level: 1, name: 'Marché : offres et demandes' })).toBeVisible();
  await expect(page.getByText(/Simulation FakePay/)).toBeVisible();
  await page.getByRole('button', { name: 'Publier une annonce' }).click();
  const create = page.getByRole('dialog', { name: 'Publier une annonce' });
  await create.getByRole('button', { name: "Publier l'annonce" }).click(); // formulaire vide : erreurs, rien n'est envoyé
  await expect(create.getByRole('alert').first()).toBeVisible();
  await create.getByRole('group', { name: "Type d'annonce" }).getByRole('radio', { name: /^Offre/ }).check();
  await create.getByLabel('Filière').selectOption('mais');
  await create.getByLabel('Quantité (kg)').fill('1200');
  await create.getByLabel('Prix proposé (FCFA par kg)').fill('210');
  await create.getByLabel('Département').selectOption('borgou');
  await create.getByLabel('Commune').selectOption('parakou');
  await create.getByLabel('Description (facultatif)').fill(description);
  await create.getByRole('button', { name: "Publier l'annonce" }).click();
  await expect(page.getByText('Annonce publiée.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: description })).toBeVisible();
  await logout(page);

  // 2. Le distributeur répond à l'annonce ; le numéro reste masqué.
  await login(page, '0197000010', PWD);
  await page.goto('/marche');
  await page.getByLabel('Filière').selectOption('mais'); // filtres : la liste peut compter beaucoup d'annonces
  await page.getByLabel('Département').selectOption('borgou');
  const offer = page.getByRole('listitem').filter({ hasText: description });
  await expect(offer).toBeVisible();
  await expect(offer.getByRole('button', { name: 'Prendre contact' })).toBeVisible();
  await offer.getByRole('button', { name: 'Prendre contact' }).click();
  const contact = page.getByRole('dialog', { name: 'Prendre contact' });
  await contact.getByLabel('Votre message (facultatif)').fill(message);
  await contact.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(page.getByText(/Vous la retrouverez dans/)).toBeVisible();
  await page.getByRole('tab', { name: 'Mes mises en relation' }).click();
  await expect(page.getByText(/sera visible après acceptation/).first()).toBeVisible();
  await logout(page);

  // 3. Le transformateur accepte : le numéro de l'autre partie apparaît.
  await login(page, '0197000009', PWD);
  await page.goto('/marche');
  await page.getByRole('tab', { name: 'Mes mises en relation' }).click();
  const pending = page.getByRole('listitem')
    .filter({ hasText: 'test e2e' })
    .filter({ has: page.getByRole('button', { name: 'Accepter' }) })
    .first();
  await expect(pending).toBeVisible();
  await pending.getByRole('button', { name: 'Accepter' }).click();
  const accepted = page.getByRole('listitem').filter({ hasText: 'test e2e' }).filter({ hasText: "Téléphone de l'autre partie" }).first();
  await expect(accepted).toBeVisible();
  await expect(accepted).toContainText('Acceptée');
  await expect(accepted).toContainText(/01\d{8}/);
});

// ---------------------------------------------------------------------------------------------
// Accessibilité : rôles, repères et libellés (sans bibliothèque externe) + aucune clé de traduction brute
// ---------------------------------------------------------------------------------------------
const NAMESPACES = 'app|nav|home|common|status|stage|table|lang|login|register|producers|parcels|campaigns|card|harvest|supports|offline|assistant|alerts|notifications|programs|consents|credit|selection|knowledge|roles|admin|exports|audit|legal|dashboard|coop|market|diagnosis|satellite|translations|sea|contests|conflicts|errors';
const RAW_KEY = new RegExp(`\\b(${NAMESPACES})\\.[a-z][A-Za-z0-9_]*\\b`);

/** Repère les champs sans libellé, boutons et liens sans nom, images sans alt et identifiants en double (hors carte Leaflet et zones masquées). */
async function structureProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const ignored = (el: Element) => !!el.closest('.leaflet-container, [hidden], [aria-hidden="true"]');
    const hasName = (el: Element) => {
      if ((el.getAttribute('aria-label') ?? '').trim() || (el.getAttribute('title') ?? '').trim()) return true;
      const by = el.getAttribute('aria-labelledby');
      if (by && by.split(/\s+/).some((id) => (document.getElementById(id)?.textContent ?? '').trim())) return true;
      return (el.textContent ?? '').trim().length > 0;
    };
    document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((el) => {
      if (ignored(el)) return;
      const labels = (el as HTMLInputElement).labels;
      const labelled = (labels && Array.from(labels).some((l) => (l.textContent ?? '').trim())) || (el.getAttribute('aria-label') ?? '').trim() || el.getAttribute('aria-labelledby');
      if (!labelled) out.push(`champ sans libellé : ${el.outerHTML.slice(0, 90)}`);
    });
    document.querySelectorAll('button, [role="button"], a[href]').forEach((el) => {
      if (!ignored(el) && !hasName(el)) out.push(`contrôle sans nom : ${el.outerHTML.slice(0, 90)}`);
    });
    document.querySelectorAll('img:not([alt])').forEach((el) => { if (!ignored(el)) out.push(`image sans alt : ${el.outerHTML.slice(0, 90)}`); });
    const seen = new Set<string>();
    document.querySelectorAll('[id]').forEach((el) => {
      if (ignored(el)) return;
      if (seen.has(el.id)) out.push(`identifiant en double : ${el.id}`);
      seen.add(el.id);
    });
    return out;
  });
}

async function checkScreen(page: Page, path: string, withNav: boolean) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 }), `titre de ${path}`).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toHaveCount(1);
  if (withNav) await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
  expect(await structureProblems(page), `structure de ${path}`).toEqual([]);
  expect(await page.locator('body').innerText(), `clé de traduction brute sur ${path}`).not.toMatch(RAW_KEY);
}

test('accessibilité : écrans publics', async ({ page }) => {
  for (const path of ['/connexion', '/inscription', '/mentions-legales']) await checkScreen(page, path, false);
});

test('accessibilité : écrans du producteur', async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, '0197000001');
  for (const path of ['/', '/parcelles', '/campagnes', '/assistant', '/messages', '/programmes', '/consentements', '/ma-carte', '/appuis', '/mes-cooperatives', '/marche']) {
    await checkScreen(page, path, true);
  }
});

test('accessibilité : écrans de l’agent ATDA', async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, '0197000002', PWD);
  for (const path of ['/producteurs', '/alertes', '/boite-envoi', '/candidatures', '/selection', '/cooperatives', '/appuis', '/recoltes-signalees', '/tableau-de-bord']) {
    await checkScreen(page, path, true);
  }
});

test('langue sans traduction : repli sur le français, aucune clé brute', async ({ page }) => {
  await login(page, '0197000001');
  // fon.json et bba.json sont vides tant que le MTDI n'a rien validé : le texte reste en français.
  await page.getByLabel('Langue').selectOption('fon');
  await page.getByRole('link', { name: 'Mes parcelles' }).first().click(); // navigation sans rechargement : la langue choisie est conservée
  await expect(page.getByRole('heading', { level: 1, name: 'Mes parcelles' })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(RAW_KEY);
});
