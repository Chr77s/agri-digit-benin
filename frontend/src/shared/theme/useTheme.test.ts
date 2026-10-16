import { act, renderHook } from '@testing-library/react';

describe('useTheme', () => {
  it('reprend le choix enregistré, synchronise les composants et n\'enregistre que le choix explicite', async () => {
    localStorage.setItem('agri-theme', 'dark');
    vi.resetModules();
    const { useTheme } = await import('./useTheme');
    const a = renderHook(() => useTheme());
    const b = renderHook(() => useTheme());
    expect(a.result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    act(() => a.result.current.toggle());
    expect(b.result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('agri-theme')).toBe('light');
  });

  it('sans choix enregistré, suit le système sans rien enregistrer', async () => {
    localStorage.clear();
    window.matchMedia = ((q: string) => ({ matches: q.includes('dark') })) as unknown as typeof window.matchMedia;
    vi.resetModules();
    const { useTheme } = await import('./useTheme');
    expect(renderHook(() => useTheme()).result.current.theme).toBe('dark');
    expect(localStorage.getItem('agri-theme')).toBeNull();
  });
});
