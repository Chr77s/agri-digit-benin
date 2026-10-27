import { useEffect, useState } from 'react';

/** Seuil de la mise en page à deux colonnes (carte | panneau), le même que dans satellite.css. */
const WIDE = '(min-width: 1024px)';
/** Hauteur réservée en bas de la carte au volet de la fiche, sur téléphone : la parcelle doit rester au-dessus. */
export const SHEET_PX = 280;

export const isWide = () => typeof window !== 'undefined' && !!window.matchMedia?.(WIDE).matches;

/** Large écran : la fiche de la parcelle se range dans le panneau de droite et ne recouvre plus la carte. */
export function useWide() {
  const [wide, setWide] = useState(isWide);
  useEffect(() => {
    const m = window.matchMedia?.(WIDE);
    if (!m) return undefined;
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}
