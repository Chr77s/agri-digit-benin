/** Relief du Bénin : tuiles d'altitude Terrarium (données ouvertes hébergées sur AWS) et repères de tuilage XYZ. */
export const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
/** [ouest, sud, est, nord] en degrés. */
export const BENIN_BBOX: [number, number, number, number] = [0.7, 6.2, 3.9, 12.4];

/** Altitude en mètres d'un pixel Terrarium. */
export const decodeTerrarium = (r: number, g: number, b: number) => r * 256 + g + b / 256 - 32768;

const tileX = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

/** Tuiles XYZ couvrant la boîte : le nord a le plus petit y. */
export function tileRange([west, south, east, north]: [number, number, number, number], z: number) {
  return { x0: tileX(west, z), x1: tileX(east, z), y0: tileY(north, z), y1: tileY(south, z) };
}

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
