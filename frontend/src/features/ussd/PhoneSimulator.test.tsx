import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { PhoneSimulator } from './PhoneSimulator';

describe('Téléphone simple (simulateur)', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('joue un parcours USSD par le chemin saisi, puis une commande SMS', async () => {
    const paths: string[] = [];
    const f = mockFetch(() => undefined);
    // la passerelle USSD répond en texte brut
    f.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = String(input);
      if (u.includes('/ussd/gateway')) {
        const text = JSON.parse(String(init?.body)).text as string;
        paths.push(text);
        const body = text === '' ? 'CON AGRI-DIGIT BENIN\n1 Meteo\n2 Prix' : text === '2' ? 'CON PRIX\n1 Mais' : 'END PRIX MAIS (F/kg)\nBanikoara 190';
        return new Response(body, { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      const body = u.includes('/sms/inbound') ? { to: '0197000001', reply: 'PRIX MAIS (F/kg)\nBanikoara 190' } : [];
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const user = userEvent.setup();
    renderApp(<PhoneSimulator />);
    await user.click(screen.getByRole('button', { name: 'Appeler *000#' }));
    expect(await screen.findByText(/AGRI-DIGIT BENIN/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Votre réponse'), '2');
    await user.click(screen.getByRole('button', { name: 'Répondre' }));
    await user.type(await screen.findByLabelText('Votre réponse'), '1');
    await user.click(screen.getByRole('button', { name: 'Répondre' }));
    expect(await screen.findByText(/Banikoara 190/)).toBeInTheDocument();
    expect(paths).toEqual(['', '2', '2*1']);
    expect(screen.queryByLabelText('Votre réponse')).not.toBeInTheDocument(); // écran final « END »

    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findAllByText(/Banikoara 190/)).toHaveLength(2);
  });

  it('annonce les passerelles fermées hors mode démonstration', async () => {
    mockFetch((u) => (u.includes('/ussd/gateway') ? { status: 404, body: {} } : u.includes('/auth/') ? undefined : { body: [] }));
    const user = userEvent.setup();
    renderApp(<PhoneSimulator />);
    await user.click(screen.getByRole('button', { name: 'Appeler *000#' }));
    expect(await screen.findByText(/passerelles USSD et SMS sont fermées/)).toBeInTheDocument();
  });
});
