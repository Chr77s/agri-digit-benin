import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { TranslationsPage } from './TranslationsPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'm1', role: 'repr_mtdi' } }), AuthProvider: ({ children }: { children: unknown }) => children }));

describe('Validation des langues', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('ouvre sur les textes proposés à noter, pas sur les centaines de textes à traduire', async () => {
    const urls: string[] = [];
    mockFetch((u) => {
      if (u.includes('/translations?') || u.endsWith('/translations')) { urls.push(u); return { body: { results: [], next: null } }; }
      return { body: { results: [], next: null } };
    });
    renderApp(<TranslationsPage />);
    await waitFor(() => expect(urls.some((u) => u.includes('status=propose'))).toBe(true));
    await userEvent.setup().click(screen.getByRole('button', { name: /À traduire/ }));
    await waitFor(() => expect(urls.some((u) => u.includes('status=a_traduire'))).toBe(true));
  });
});
