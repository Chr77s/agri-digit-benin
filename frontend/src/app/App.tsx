import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/producers/RegisterPage';
import { ProducerHome } from '../features/producers/ProducerHome';
import { LegalPage } from '../features/legal/LegalPage';
import { Layout, NAV } from './Layout';
import { Skeleton } from '../shared/ui';
import type { Role } from '../shared/api/types';

function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Skeleton />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (roles && !roles.includes(user.role)) return <p role="alert">Cette page n'est pas accessible avec votre rôle.</p>;
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

const AGENT: Role[] = ['agent_atda', 'admin_maep'];

export function App() {
  const { user, ready } = useAuth();
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
        <Route path="/tableau-de-bord" element={<Guard><DashboardPage /></Guard>} />
        <Route path="*" element={<p>Page introuvable. <a className="text-brand underline" href="/">Retour à l'accueil</a></p>} />
      </Route>
    </Routes>
  );
}
