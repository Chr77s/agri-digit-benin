// Comptes de test créés par `python manage.py seed_demo` (voir docs/DEMO.md et docs/MOCKS.md).
// Prototype de démonstration : ces identifiants sont fictifs et publics.

export const DEMO_PASSWORD = 'AgriDemo-2026!';

/** Producteur de démonstration (Bio GOUNOU, Banikoara) : connexion par code seul. */
export const DEMO_PRODUCER = { phone: '0197000001', role: 'producteur' } as const;

/** Agents et partenaires de démonstration : code SMS + mot de passe. */
export const DEMO_STAFF = [
  { phone: '0197000002', role: 'agent_atda' },
  { phone: '0197000003', role: 'agronome_inrab' },
  { phone: '0197000004', role: 'responsable_programme' },
  { phone: '0197000005', role: 'admin_maep' },
  { phone: '0197000006', role: 'auditeur_copil' },
  { phone: '0197000007', role: 'agent_financier' },
  { phone: '0197000008', role: 'gestionnaire_cooperative' },
  { phone: '0197000009', role: 'transformateur' },
  { phone: '0197000010', role: 'distributeur' },
  { phone: '0197000011', role: 'repr_mtdi' },
] as const;

/** Inscription de démonstration. Le bouton demande d'abord une fiche neuve au serveur (GET /demo/registration) ;
 * ces valeurs (Awa SABI) servent de repli et fixent le département et la commune. */
export const DEMO_REGISTRATION = {
  npi: '1000000002',
  first_name: 'Awa',
  last_name: 'SABI',
  sex: 'F',
  birth_date: '1990-07-01',
  department_name: 'Alibori',
  commune_name: 'Banikoara',
  phone: '0197000099',
  language: 'fr',
} as const;

/** Extrait le code à 6 chiffres d'un SMS simulé. */
export const otpFromSms = (body: string) => body.match(/\b(\d{6})\b/)?.[1];
