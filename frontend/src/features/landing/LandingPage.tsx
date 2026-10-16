import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import '@fontsource/young-serif/latin-400.css';
import './landing.css';
import relief from './relief.json';
import { actVisibility, buildWorld, clamp01, ReliefRenderer } from './scene';
import { FieldRenderer, stageAt, type FieldFrame } from './field';
import type { Field3D } from './field3d';
import { ACT_WINDOWS, FIELD_END, fieldAt, irisAt, parcelAt, RELIEF_END, reliefProgress, veilAt } from './journey';
import { useCalm } from './useCalm';
import { GallerySection, OfficialBadge, PortalsSection, SiteHeader, StatTiles } from './ui';
import { LandingFooter, WhoSection } from './LandingSections';
import { FaqSection, HowSection, TrustSection } from './MoreSections';

type Nav = Navigator & { deviceMemory?: number };
// la landing est toujours sombre : c'est la nuit puis l'aube sur le champ
const theme = 'dark' as const;

const STAGES = ['semis', 'croissance', 'floraison', 'recolte'] as const;
const AREA_HA = 2.4;
// espace insécable ordinaire : l'espace fine de fr-FR se lit mal en grand titre
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/ /g, ' ');

export function LandingPage() {
  const { t } = useTranslation();
  const { calm, toggle: toggleCalm } = useCalm();
  const worldRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<(HTMLElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const areaRef = useRef<HTMLElement>(null);
  const chipRefs = useRef<(HTMLLIElement | null)[]>([]);
  const fieldRailRef = useRef<HTMLUListElement>(null);
  const fieldChipRefs = useRef<(HTMLLIElement | null)[]>([]);
  const live = useRef({ calm });
  const redraw = useRef<() => void>(() => undefined);
  live.current = { calm };

  useEffect(() => {
    if (calm) { // on rend la main au CSS : tout est visible, sans animation
      for (const el of [...actRefs.current, veilRef.current, railRef.current, ctaRef.current, fieldRailRef.current]) el?.removeAttribute('style');
      areaRef.current && (areaRef.current.textContent = String(AREA_HA).replace('.', ','));
      chipRefs.current.forEach((c) => c?.setAttribute('data-on', '1'));
      fieldChipRefs.current.forEach((c) => c?.setAttribute('data-on', '1'));
    }
    redraw.current();
  }, [calm]);

  useEffect(() => {
    const canvas = worldRef.current, wrap = wrapRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !wrap || !ctx) return undefined;
    const lowMem = ((navigator as Nav).deviceMemory ?? 8) <= 4;
    const coarse = window.innerWidth < 700 || lowMem;
    const reliefR = new ReliefRenderer(ctx, buildWorld(coarse));
    const fieldR = new FieldRenderer(ctx);
    const t0 = performance.now() / 1000;
    let W = 0, H = 0, dpr = 1, raf = 0, sway = 0, gone = false;
    // champ réaliste en WebGL, chargé à part ; le champ 2D reste le repli (pas de WebGL, peu de mémoire, en attendant le chargement)
    let gl: Field3D | null = null;
    const glCanvas = glRef.current;
    if (glCanvas && ((navigator as Nav).deviceMemory ?? 8) > 2) {
      void import('./field3d').then(({ Field3D, webglAvailable }) => {
        if (gone || !webglAvailable()) return;
        try { gl = new Field3D(glCanvas, { lite: coarse }); } catch { return; }
        gl.resize(W, H, dpr);
        schedule();
      }).catch(() => undefined);
    }

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gl?.resize(W, H, dpr);
    };
    /** p : avancement dans la zone épinglée ; past : pixels défilés après elle. */
    const position = () => {
      const r = wrap.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      return { p: span > 0 ? clamp01(-r.top / span) : 0, past: Math.max(0, -r.top - span) };
    };
    const setVar = (el: HTMLElement | null, name: string, v: number) => el?.style.setProperty(name, v.toFixed(3));

    let lastArea = '';
    const applyActs = (p: number, past: number) => {
      const leaving = 1 - clamp01(past / (H * 0.25));
      ACT_WINDOWS.forEach((w, i) => {
        const el = actRefs.current[i];
        if (!el) return;
        const v = actVisibility(p, w) * leaving;
        el.style.opacity = v.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - v) * 28).toFixed(1)}px, 0)`;
      });
      if (ctaRef.current) ctaRef.current.style.visibility = actVisibility(p, ACT_WINDOWS[0]) > 0.05 ? 'visible' : 'hidden';
      const u = parcelAt(p);
      setVar(actRefs.current[2], '--u', u);
      const area = (u * AREA_HA).toFixed(1).replace('.', ',');
      if (area !== lastArea && areaRef.current) { areaRef.current.textContent = area; lastArea = area; }
      chipRefs.current.forEach((c, i) => c?.setAttribute('data-on', u >= 0.5 + i * 0.16 ? '1' : '0'));
      // rangée des stades du champ : le stade courant et les précédents sont allumés
      const stage = STAGES.indexOf(stageAt(fieldAt(p).grow));
      fieldChipRefs.current.forEach((c, i) => c?.setAttribute('data-on', p >= 0.5 && i <= stage ? '1' : '0'));
      if (fieldRailRef.current) fieldRailRef.current.style.opacity = (actVisibility(p, [0.5, 0.53, 1.01, 1.02]) * leaving).toFixed(3);
      if (railRef.current) railRef.current.style.transform = `scaleY(${clamp01(p).toFixed(3)})`;
      if (veilRef.current) veilRef.current.style.opacity = veilAt(past, H).toFixed(3);
    };

    const frame = () => {
      raf = 0;
      const { calm: c } = live.current;
      const th = theme;
      const landscape = W >= 860 && W > H * 0.9; // même seuil que le dégradé du texte dans landing.css
      // le plant mûr mesure `unit` ; sur téléphone la scène occupe le haut, le texte le bas
      const place = landscape ? { cx: W * 0.68, groundY: H * 0.7, unit: H * 0.58 } : { cx: W * 0.5, groundY: H * 0.58, unit: H * 0.3 };
      const now = performance.now() / 1000;
      const introT = now - t0;
      let p = 0.06, past = 0;
      // sans animation : le relief en haut de page, puis le champ mûr, sans défilement piloté
      if (c) p = window.scrollY < window.innerHeight * 0.6 ? 0.06 : 1;
      else ({ p, past } = position());

      const drawField = (f: FieldFrame) => (gl ? gl.draw(f) : fieldR.draw(f));
      let clip = 'none', glOn = false;
      if (p < RELIEF_END) {
        reliefR.draw({ W, H, p: reliefProgress(p), intro: c ? 99 : introT, theme: th });
        const iris = irisAt(p);
        if (iris > 0.001) {
          const { x, y } = reliefR.hlScreen;
          const R = iris * Math.hypot(W, H) * 1.05;
          const f = { W, H, theme: th, seed: 0, grow: 0, light: 0, time: 0, ...place, lite: coarse };
          if (gl) { gl.draw(f); glOn = true; clip = `circle(${R.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`; }
          else { ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip(); fieldR.draw(f); ctx.restore(); }
          ctx.strokeStyle = '#C6F432';
          ctx.globalAlpha = 1 - iris;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, R, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else {
        const f = past > 0 || c ? FIELD_END : fieldAt(p);
        drawField({ W, H, theme: th, ...f, time: c ? 0 : now, ...place, lite: coarse });
        glOn = !!gl;
      }
      if (glCanvas) { glCanvas.style.visibility = glOn ? 'visible' : 'hidden'; glCanvas.style.clipPath = clip; }
      if (c) { if (veilRef.current) veilRef.current.style.opacity = p >= 1 ? '0.88' : '0'; return; }
      applyActs(p, past);
      if (introT < 1.9) schedule(); // la montée des colonnes ne joue qu'une fois
      // vent léger sur le champ mûr : 12 images par seconde suffisent, et rien quand l'onglet est caché
      if (p >= 0.9 && !document.hidden) { window.clearTimeout(sway); sway = window.setTimeout(schedule, gl ? 33 : 83); }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(frame); };
    redraw.current = schedule;

    size();
    schedule();
    const onResize = () => { size(); schedule(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(sway);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', schedule);
      document.removeEventListener('visibilitychange', schedule);
      redraw.current = () => undefined;
      gone = true;
      gl?.dispose();
    };
  }, []);

  const alibori = relief.departments.find((d) => d.code === 'alibori')?.farms ?? 0;
  const act = (i: number) => (el: HTMLElement | null) => { actRefs.current[i] = el; };

  return (
    <div className={`landing${calm ? ' landing--calm' : ''}`} data-theme={theme} id="top">
      <a className="lp-skip" href="#qui">{t('landing.skip')}</a>
      <canvas className="lp-world" ref={worldRef} aria-hidden="true" />
      <canvas className="lp-world lp-world--gl" ref={glRef} aria-hidden="true" />
      <div className="lp-veil" ref={veilRef} aria-hidden="true" />
      <SiteHeader />

      <div className="lp-wrap" ref={wrapRef}>
        <div className="lp-stage">
          <div className="lp-scrim" aria-hidden="true" />

          <article className="act act-1" ref={act(0)}>
            <OfficialBadge />
            <h1 className="lp-h1">{t('landing.hero.title')}</h1>
            <p className="lp-lead">{t('landing.hero.lead')}</p>
            <div className="lp-cta" ref={ctaRef}>
              <Link className="lp-btn lp-btn--primary" to="/inscription">{t('landing.register')}</Link>
              <Link className="lp-btn lp-btn--ghost" to="/connexion">{t('landing.login')}</Link>
            </div>
            <StatTiles />
            <p className="lp-scroll" aria-hidden="true"><ChevronDown size={20} />{t('landing.hero.scroll')}</p>
          </article>

          <article className="act act-2" ref={act(1)}>
            <div className="act-text">
              <h2 className="lp-h2">{t('landing.act2.title', { total: fmt(relief.total) })}</h2>
              <p>{t('landing.act2.body', { alibori: fmt(alibori) })}</p>
              <p className="lp-note">{t('landing.act2.note')}</p>
            </div>
          </article>

          <article className="act act-3 act--split" ref={act(2)}>
            <div className="act-text">
              <h2 className="lp-h2">{t('landing.act3.title')}</h2>
              <p>{t('landing.act3.body')}</p>
            </div>
            <figure className="lp-parcel glass">
              <svg viewBox="0 0 200 140" role="img" aria-label={t('landing.act3.example')}>
                <path className="lp-parcel-fill" d="M30 100 48 38 112 22 168 52 176 108 96 124Z" />
                <path className="lp-parcel-line" pathLength={1} d="M30 100 48 38 112 22 168 52 176 108 96 124Z" />
                {[[30, 100], [48, 38], [112, 22], [168, 52], [176, 108], [96, 124]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={4.5} className="lp-parcel-dot" />)}
              </svg>
              <figcaption>
                <p className="lp-area"><span>{t('landing.act3.area')}</span> <strong ref={areaRef}>2,4</strong> ha</p>
                <p className="lp-note">{t('landing.act3.example')}</p>
                <ul className="lp-stages">
                  {STAGES.map((s, i) => <li key={s} data-on="1" ref={(el) => { chipRefs.current[i] = el; }}>{t(`landing.act3.stage.${s}`)}</li>)}
                </ul>
              </figcaption>
            </figure>
          </article>

          {STAGES.map((s, i) => (
            <article key={s} className="act act-field" ref={act(3 + i)}>
              <div className="act-text">
                <h2 className="lp-h2">{t(`landing.field.${s}.title`)}</h2>
                <p>{t(`landing.field.${s}.body`)}</p>
              </div>
            </article>
          ))}

          {/* sans animation, le parcours de la carte au champ tient en un paragraphe */}
          {calm && <p className="act act-calm">{t('landing.calm.summary')}</p>}

          <ul className="lp-stages lp-fieldrail" ref={fieldRailRef} aria-label={t('landing.field.rail')}>
            {STAGES.map((s, i) => <li key={s} data-on="0" ref={(el) => { fieldChipRefs.current[i] = el; }}>{t(`landing.act3.stage.${s}`)}</li>)}
          </ul>
          <div className="lp-rail" aria-hidden="true"><span ref={railRef} /></div>
        </div>
      </div>

      <div className="lp-after">
        {/* simplicité → objections → preuve en images → publics → questions → décision */}
        <HowSection />
        <TrustSection />
        <GallerySection />
        <WhoSection />
        <FaqSection />
        <PortalsSection />
        <LandingFooter calm={calm} onToggleCalm={toggleCalm} />
      </div>
    </div>
  );
}
