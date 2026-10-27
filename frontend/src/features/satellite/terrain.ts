/** Relief : tuiles d'altitude Terrarium (données ouvertes hébergées sur AWS), lues par MapLibre. */
export const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/** Faux sans WebGL : le bouton « Relief 3D » n'est alors pas proposé. */
export function hasWebGL(): boolean {
  if (typeof WebGLRenderingContext === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
