import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SatellitePoint, SatelliteZones } from '../../shared/api/types';
import { indexColor, type IndexKind } from './scale';
import { BENIN_BBOX, TERRARIUM, decodeTerrarium, tileRange } from './terrain';

const Z = 7;
const EXAG = 30; // le relief béninois est doux (658 m au plus) : on l'accentue pour qu'il se lise
const M_PER_PX = 156543.03 / 2 ** Z; // mètres par pixel de tuile, à l'équateur

interface Props {
  zones: SatelliteZones | undefined;
  series: Record<string, SatellitePoint[]>;
  kind: IndexKind;
  index: number;
  onClose: () => void;
  onError: () => void;
}

const loadTile = (x: number, y: number) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('tuile indisponible'));
  img.src = TERRARIUM.replace('{z}', String(Z)).replace('{x}', String(x)).replace('{y}', String(y));
});

const mercY = (lat: number) => (1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2;

/** Relief du Bénin en 3D, départements colorés par l'indice du passage choisi. Chargé à la demande : three.js reste hors du chargement initial. */
export default function Relief3D({ zones, series, kind, index, onClose, onError }: Props) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const paint = useRef<(() => void) | null>(null);
  const latest = useRef({ zones, series, kind, index });
  latest.current = { zones, series, kind, index };
  const fail = useRef(onError);
  fail.current = onError;

  useEffect(() => {
    let alive = true;
    let dispose: () => void = () => undefined;
    (async () => {
      try {
        const el = host.current;
        if (!el) return;
        const { x0, x1, y0, y1 } = tileRange(BENIN_BBOX, Z);
        const W = (x1 - x0 + 1) * 256, H = (y1 - y0 + 1) * 256;
        const dem = document.createElement('canvas');
        dem.width = W; dem.height = H;
        const dctx = dem.getContext('2d', { willReadFrequently: true });
        if (!dctx) throw new Error('canvas');
        const jobs: Promise<void>[] = [];
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push(loadTile(x, y).then((img) => { dctx.drawImage(img, (x - x0) * 256, (y - y0) * 256); }));
        await Promise.all(jobs);
        const px = dctx.getImageData(0, 0, W, H).data; // lève si les tuiles n'ont pas d'en-tête CORS
        if (!alive) return;
        const h = new Float32Array(W * H);
        for (let i = 0; i < W * H; i++) h[i] = decodeTerrarium(px[4 * i], px[4 * i + 1], px[4 * i + 2]);

        // ombrage : lumière du nord-ouest
        const shade = document.createElement('canvas');
        shade.width = W; shade.height = H;
        const sctx = shade.getContext('2d');
        if (!sctx) throw new Error('canvas');
        const sImg = sctx.createImageData(W, H);
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const d = h[(y - 1) * W + (x - 1)] - h[(y + 1) * W + (x + 1)];
          const g = Math.max(140, Math.min(255, 225 + d * 1.2));
          const o = 4 * (y * W + x);
          sImg.data[o] = sImg.data[o + 1] = sImg.data[o + 2] = g; sImg.data[o + 3] = 255;
        }
        sctx.putImageData(sImg, 0, 0);

        const tex = document.createElement('canvas');
        tex.width = W; tex.height = H;
        const ctx = tex.getContext('2d');
        if (!ctx) throw new Error('canvas');
        const toPx = ([lon, lat]: number[]) => [((lon + 180) / 360 * 2 ** Z - x0) * 256, (mercY(lat) * 2 ** Z - y0) * 256];
        const texture = new THREE.CanvasTexture(tex);
        texture.colorSpace = THREE.SRGBColorSpace;
        paint.current = () => {
          const { zones: zs, series: sr, kind: k, index: i } = latest.current;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#12391F';
          ctx.fillRect(0, 0, W, H);
          for (const f of zs?.features ?? []) {
            const pts = sr[f.properties.code];
            ctx.fillStyle = pts ? indexColor(k, pts[Math.min(i, pts.length - 1)]?.[k] ?? null) : '#1B3B30';
            ctx.strokeStyle = '#0A2415';
            ctx.lineWidth = 1.5;
            const g = f.geometry;
            const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
            for (const poly of polys) {
              ctx.beginPath();
              for (const ring of poly) ring.forEach((c, n) => { const [a, b] = toPx(c); if (n === 0) ctx.moveTo(a, b); else ctx.lineTo(a, b); });
              ctx.fill('evenodd');
              ctx.stroke();
            }
          }
          ctx.globalCompositeOperation = 'multiply';
          ctx.drawImage(shade, 0, 0);
          texture.needsUpdate = true;
        };
        paint.current();

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0A2415');
        const geo = new THREE.PlaneGeometry(W, H, W / 4, H / 4);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const ix = Math.min(W - 1, Math.max(0, Math.round(pos.getX(v) + W / 2)));
          const iy = Math.min(H - 1, Math.max(0, Math.round(pos.getZ(v) + H / 2)));
          pos.setY(v, (Math.max(0, h[iy * W + ix]) / M_PER_PX) * EXAG);
        }
        geo.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({ map: texture });
        scene.add(new THREE.Mesh(geo, mat));

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(renderer.domElement);
        const camera = new THREE.PerspectiveCamera(42, 1, 1, 6000);
        camera.position.set(0, H * 0.75, H * 0.85);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.maxPolarAngle = Math.PI / 2.05;
        controls.minDistance = 200; controls.maxDistance = 2200;
        controls.enableDamping = true;

        const resize = () => {
          const w = el.clientWidth, hh = el.clientHeight;
          renderer.setSize(w, hh);
          camera.aspect = w / Math.max(1, hh);
          camera.updateProjectionMatrix();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(el);
        let raf = 0;
        const tick = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
        tick();
        dispose = () => {
          cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
          geo.dispose(); mat.dispose(); texture.dispose(); renderer.dispose();
          renderer.domElement.remove();
        };
        if (!alive) dispose();
      } catch {
        if (alive) fail.current();
      }
    })();
    return () => { alive = false; paint.current = null; dispose(); };
  }, []);

  useEffect(() => { paint.current?.(); }, [zones, series, kind, index]);

  return (
    <div className="sat-relief-view" role="img" aria-label={t('satellite.relief')}>
      <div ref={host} className="sat-relief-host" />
      <button type="button" className="sat-relief-close" onClick={onClose}>{t('satellite.reliefClose')}</button>
    </div>
  );
}
