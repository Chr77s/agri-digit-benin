import { Component, type ReactNode } from 'react';
import { ErrorState } from '../shared/ui';
import i18n from '../i18n';

/** Affiche une erreur avec reprise si un écran plante (par exemple chargement de page échoué hors réseau). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <ErrorState error={new Error(i18n.t('app.errorScreen'))} onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}
