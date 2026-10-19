import { Component, type ReactNode } from 'react';
import { ErrorPage } from '../features/legal/StatusPages';

/** Affiche l'écran d'erreur avec reprise si un écran plante (par exemple chargement de page échoué hors réseau). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; error?: unknown }> {
  state: { failed: boolean; error?: unknown } = { failed: false };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, error };
  }
  render() {
    if (this.state.failed) return <ErrorPage error={this.state.error} />;
    return this.props.children;
  }
}
