import { Component, type ReactNode } from 'react';
import { ErrorState } from '../shared/ui';

/** Affiche une erreur avec reprise si un écran plante (par exemple chargement de page échoué hors réseau). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError() {
    return { error: new Error('Cet écran n’a pas pu s’afficher. Vérifiez la connexion puis réessayez.') };
  }
  render() {
    if (this.state.error) return <ErrorState error={this.state.error} onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}
