import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { mockFetch } from '../../test-utils';
import { AssistantBubble } from './AssistantBubble';

const Go = ({ to }: { to: string }) => { const nav = useNavigate(); useEffect(() => nav(to), [nav, to]); return null; };
const renderAt = (to: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><AuthProvider><Go to={to} /><AssistantBubble /></AuthProvider></MemoryRouter>
  </QueryClientProvider>,
);

describe('Bulle de discussion', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

  it("s'ouvre en gardant le curseur dans la saisie, garde le focus après l'envoi et rend le focus en se fermant", async () => {
    mockFetch((u) => (u.includes('/assistant/ask') ? { body: { status: 'answered', answer: 'Semer en juin.', citations: [], disclaimer: '' } } : u.includes('/auth/') ? undefined : { body: [] }));
    const user = userEvent.setup();
    renderAt('/parcelles');
    const fab = await screen.findByRole('button', { name: "Ouvrir l'assistant" });
    expect(screen.queryByPlaceholderText('Écrivez votre question…')).not.toBeInTheDocument(); // rien n'est chargé avant l'ouverture
    await user.click(fab);
    const input = await screen.findByPlaceholderText('Écrivez votre question…');
    await vi.waitFor(() => expect(input).toHaveFocus());
    await user.type(input, 'Quand semer le maïs ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Semer en juin.')).toBeInTheDocument();
    expect(input).toHaveFocus(); // on peut enchaîner sans recliquer dans la zone de saisie
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { hidden: true })).not.toBeVisible();
    expect(await screen.findByRole('button', { name: "Ouvrir l'assistant" })).toHaveFocus();
  });

  it("n'apparaît pas sur la page de l'assistant", async () => {
    mockFetch(() => ({ body: [] }));
    renderAt('/assistant');
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: "Ouvrir l'assistant" })).not.toBeInTheDocument());
  });
});
