import { MutationObserver, onlineManager } from '@tanstack/react-query';
import { afterEach, expect, it } from 'vitest';
import { makeQueryClient } from './queryClient';

afterEach(() => onlineManager.setOnline(true));

it('une mutation s\'exécute hors ligne : la file locale peut alors garder la saisie', async () => {
  onlineManager.setOnline(false);
  const obs = new MutationObserver(makeQueryClient(), { mutationFn: async () => 'queued' });
  await expect(obs.mutate()).resolves.toBe('queued');
});
