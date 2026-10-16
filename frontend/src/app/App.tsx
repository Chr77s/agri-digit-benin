import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/producers/RegisterPage';
import { ProducerHome } from '../features/producers/ProducerHome';
import { LegalPage } from '../features/legal/LegalPage';
import { Layout, NAV } from './Layout';
import { Skeleton } from '../shared/ui';
import type { Role } from '../shared/api/types';

function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { t } = useTranslation();
  const { user, ready } = useAuth();
  if (!ready) return <Skeleton />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (roles && !roles.includes(user.role)) return <p role="alert">{t('app.forbidden')}</p>;
  return <Suspense fallback={<Skeleton />}>{children}</Suspense>;
}

function Home() {
  const { user, ready } = useAuth();
  if (!ready) return <Skeleton />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (user.role === 'producteur') return <ProducerHome />;
  return <Navigate to={NAV[user.role]?.[0]?.to ?? '/mentions-legales'} replace />;
}

const ProducerDetailPage = lazy(() => import('../features/producers/ProducersPages').then((m) => ({ default: m.ProducerDetailPage })));
const ProducersListPage = lazy(() => import('../features/producers/ProducersPages').then((m) => ({ default: m.ProducersListPage })));
const ParcelsPage = lazy(() => import('../features/parcels/ParcelsPage').then((m) => ({ default: m.ParcelsPage })));
const CampaignsPage = lazy(() => import('../features/campaigns/CampaignsPage').then((m) => ({ default: m.CampaignsPage })));
const AssistantPage = lazy(() => import('../features/assistant/AssistantPage').then((m) => ({ default: m.AssistantPage })));
const NotificationsPage = lazy(() => import('../features/alerts/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const AlertsPage = lazy(() => import('../features/alerts/AlertsPages').then((m) => ({ default: m.AlertsPage })));
const OutboxPage = lazy(() => import('../features/alerts/AlertsPages').then((m) => ({ default: m.OutboxPage })));
const ConsentsPage = lazy(() => import('../features/consents/ConsentsPage').then((m) => ({ default: m.ConsentsPage })));
const ApplicationsPage = lazy(() => import('../features/programs/ProgramsPages').then((m) => ({ default: m.ApplicationsPage })));
const ProgramsPage = lazy(() => import('../features/programs/ProgramsPages').then((m) => ({ default: m.ProgramsPage })));
const SelectionPage = lazy(() => import('../features/selection/SelectionPage').then((m) => ({ default: m.SelectionPage })));
const KnowledgePage = lazy(() => import('../features/knowledge/KnowledgePage').then((m) => ({ default: m.KnowledgePage })));
const AccountsPage = lazy(() => import('../features/admin/AdminPages').then((m) => ({ default: m.AccountsPage })));
const ExportsPage = lazy(() => import('../features/admin/AdminPages').then((m) => ({ default: m.ExportsPage })));
const AuditPage = lazy(() => import('../features/audit/AuditPage').then((m) => ({ default: m.AuditPage })));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));

const LandingPage = lazy(() => import('../features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const CreditPage = lazy(() => import('../features/credit/CreditPage').then((m) => ({ default: m.CreditPage })));
const CardPage = lazy(() => import('../features/card/CardPages').then((m) => ({ default: m.CardPage })));
const VerifyPage = lazy(() => import('../features/card/CardPages').then((m) => ({ default: m.VerifyPage })));
const CooperativesPage = lazy(() => import('../features/cooperatives/CooperativesPages').then((m) => ({ default: m.CooperativesPage })));
const CooperativeDetailPage = lazy(() => import('../features/cooperatives/CooperativesPages').then((m) => ({ default: m.CooperativeDetailPage })));
const MyCooperativesPage = lazy(() => import('../features/cooperatives/CooperativesPages').then((m) => ({ default: m.MyCooperativesPage })));
const SupportsPage = lazy(() => import('../features/supports/SupportsPage').then((m) => ({ default: m.SupportsPage })));
const FlaggedHarvestsPage = lazy(() => import('../features/harvests/HarvestPages').then((m) => ({ default: m.FlaggedHarvestsPage })));
const MarketPage = lazy(() => import('../features/market/MarketPage').then((m) => ({ default: m.MarketPage })));
const DiagnosesPage = lazy(() => import('../features/diagnoses/DiagnosesPage').then((m) => ({ default: m.DiagnosesPage })));
const SatellitePage = lazy(() => import('../features/satellite/SatellitePage').then((m) => ({ default: m.SatellitePage })));
const TranslationsPage = lazy(() => import('../features/translations/TranslationsPage').then((m) => ({ default: m.TranslationsPage })));
const SeaPage = lazy(() => import('../features/dashboard/SeaPage').then((m) => ({ default: m.SeaPage })));
const ContestsPage = lazy(() => import('../features/contests/ContestsPage').then((m) => ({ default: m.ContestsPage })));

const AGENT: Role[] = ['agent_atda', 'admin_maep'];
const MARKET: Role[] = ['producteur', 'transformateur', 'distributeur', 'gestionnaire_cooperative', 'admin_maep'];

export function App() {
  const { t } = useTranslation();
  const { user, ready } = useAuth();
  const { pathname } = useLocation();
  // les visiteurs voient la landing plein écran ; le reste du site garde sa mise en page
  if (pathname === '/' && !user) return ready ? <Suspense fallback={<Skeleton />}><LandingPage /></Suspense> : <Skeleton />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/connexion" element={ready && user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/mentions-legales" element={<LegalPage />} />
        <Route path="/parcelles" element={<Guard roles={['producteur']}><ParcelsPage /></Guard>} />
        <Route path="/campagnes" element={<Guard roles={['producteur', 'agent_atda']}><CampaignsPage /></Guard>} />
        <Route path="/assistant" element={<Guard><AssistantPage /></Guard>} />
        <Route path="/messages" element={<Guard><NotificationsPage /></Guard>} />
        <Route path="/consentements" element={<Guard roles={['producteur']}><ConsentsPage /></Guard>} />
        <Route path="/programmes" element={<Guard><ProgramsPage /></Guard>} />
        <Route path="/producteurs" element={<Guard roles={AGENT}><ProducersListPage /></Guard>} />
        <Route path="/producteurs/:id" element={<Guard roles={AGENT}><ProducerDetailPage /></Guard>} />
        <Route path="/alertes" element={<Guard roles={AGENT}><AlertsPage /></Guard>} />
        <Route path="/boite-envoi" element={<Guard roles={AGENT}><OutboxPage /></Guard>} />
        <Route path="/candidatures" element={<Guard roles={[...AGENT, 'responsable_programme']}><ApplicationsPage /></Guard>} />
        <Route path="/selection" element={<Guard roles={[...AGENT, 'responsable_programme']}><SelectionPage /></Guard>} />
        <Route path="/fiches" element={<Guard roles={['agronome_inrab', 'admin_maep']}><KnowledgePage /></Guard>} />
        <Route path="/comptes" element={<Guard roles={['admin_maep']}><AccountsPage /></Guard>} />
        <Route path="/exports" element={<Guard roles={['admin_maep']}><ExportsPage /></Guard>} />
        <Route path="/journal" element={<Guard roles={['auditeur_copil', 'admin_maep']}><AuditPage /></Guard>} />
        <Route path="/tableau-de-bord" element={<Guard roles={['agent_atda', 'responsable_programme', 'admin_maep']}><DashboardPage /></Guard>} />
        <Route path="/credit" element={<Guard roles={['agent_financier']}><CreditPage /></Guard>} />
        <Route path="/verification/:code" element={<Suspense fallback={<Skeleton />}><VerifyPage /></Suspense>} />
        <Route path="/ma-carte" element={<Guard roles={['producteur']}><CardPage /></Guard>} />
        <Route path="/producteurs/:id/carte" element={<Guard roles={AGENT}><CardPage /></Guard>} />
        <Route path="/cooperatives" element={<Guard roles={[...AGENT, 'gestionnaire_cooperative']}><CooperativesPage /></Guard>} />
        <Route path="/cooperatives/:id" element={<Guard roles={[...AGENT, 'gestionnaire_cooperative']}><CooperativeDetailPage /></Guard>} />
        <Route path="/mes-cooperatives" element={<Guard roles={['producteur']}><MyCooperativesPage /></Guard>} />
        <Route path="/appuis" element={<Guard roles={['producteur', ...AGENT]}><SupportsPage /></Guard>} />
        <Route path="/recoltes-signalees" element={<Guard roles={AGENT}><FlaggedHarvestsPage /></Guard>} />
        <Route path="/marche" element={<Guard roles={MARKET}><MarketPage /></Guard>} />
        <Route path="/diagnostic" element={<Guard roles={['producteur', 'agronome_inrab']}><DiagnosesPage /></Guard>} />
        <Route path="/satellite" element={<Guard roles={['producteur', 'responsable_programme', 'repr_mtdi', ...AGENT]}><SatellitePage /></Guard>} />
        <Route path="/langues" element={<Guard roles={['repr_mtdi', 'admin_maep']}><TranslationsPage /></Guard>} />
        <Route path="/suivi-evaluation" element={<Guard roles={['responsable_programme', 'repr_mtdi', ...AGENT]}><SeaPage /></Guard>} />
        <Route path="/contestations" element={<Guard roles={['producteur', ...AGENT]}><ContestsPage /></Guard>} />
        <Route path="*" element={<p>{t('app.notFound')} <a className="text-brand underline" href="/">{t('app.backHome')}</a></p>} />
      </Route>
    </Routes>
  );
}
