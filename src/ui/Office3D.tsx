// Le studio en 3D : les îles flottantes, dessinées par three.js. Le monde (les robots, leurs trajets),
// les bulles, les clics et le réalisateur sont les mêmes qu'en pixel art : seul le dessin change.
// Fais glisser pour tourner autour de l'archipel, la molette (ou un double-clic) pour zoomer.
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { jukebox } from '../audio/music.ts';
import { camera, director, timeOfDay, world } from '../engine/instance.ts';
import { hitAt, type Hit } from '../engine/hits.ts';
import { Scene3D } from '../engine3d/scene.ts';
import { useOffice } from '../state/store.ts';
import { interact } from './interact.ts';
import { Bubbles, bubbleEls, LiveBadge, perf } from './Office.tsx';

export function Office3D() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = wrap.current!;
    let scene: Scene3D;
    try {
      scene = new Scene3D(canvas.current!, { bloom: true });
    } catch {
      // pas de WebGL sur cet appareil : on repasse en pixel art
      useOffice.setState({ view3d: false });
      return;
    }
    sceneRef.current = scene;
    let w = 1, h = 1;
    const fit = () => {
      const r = el.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      scene.resize(w, h);
      if (layer.current) layer.current.style.setProperty('--s', String(Math.min(2.2, Math.max(1.4, w / 520))));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    const v = new Vector3();
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;
      if (document.hidden) return;
      acc += dt;
      const cap = (window as unknown as { __CAPTURE?: { music?: () => { on: boolean; level: number; beat: boolean } } }).__CAPTURE;
      // la 3D vit en continu (cascades, spores) : 30 images par seconde au plus
      if (!cap && acc < 1 / 30) return;
      const st = useOffice.getState();
      director.enabled = st.filming && st.cameraAuto && !st.tour;
      director.tick();
      camera.update(acc);
      const m = cap?.music?.();
      world.setMusic(m ? m.on : jukebox.playing, m ? m.level : jukebox.sample(), m ? m.beat : jukebox.beat);
      const t0 = performance.now();
      world.update(acc);
      scene.render(world, camera, timeOfDay(st.tod), acc, w, h);
      acc = 0;
      // les bulles suivent les robots à l'écran
      for (const [id, b] of bubbleEls) {
        const a = world.actors.get(id);
        if (!a || !scene.project(a, v)) { b.style.opacity = '0'; continue; }
        const x = Math.round((v.x + 1) / 2 * w), y = Math.round((1 - v.y) / 2 * h);
        b.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        b.style.opacity = a.alpha.toFixed(2);
        b.dataset.lift = '0';
        const bub = b.firstElementChild as HTMLElement | null;
        let dx = 0;
        if (bub) { const half = bub.offsetWidth / 2; if (x - half < 4) dx = 4 - (x - half); else if (x + half > w - 4) dx = w - 4 - (x + half); }
        b.style.setProperty('--dx', `${Math.round(dx)}px`);
      }
      perf.frames++;
      perf.ms += performance.now() - t0;
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); scene.dispose(); sceneRef.current = null; };
  }, []);

  const hitUnder = (e: { clientX: number; clientY: number }): Hit | null => {
    const s = sceneRef.current;
    if (!s || !wrap.current) return null;
    const r = wrap.current.getBoundingClientRect();
    const p = s.pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    return p ? hitAt(world, p.x, p.y) : null;
  };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.bubble.ask')) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (d.moved || Math.hypot(dx, dy) > 5) {
        d.moved = true;
        sceneRef.current?.drag(dx, dy);
        d.x = e.clientX;
        d.y = e.clientY;
        if (tip.current) tip.current.style.opacity = '0';
        return;
      }
    }
    if (e.pointerType !== 'mouse') return;
    const h = hitUnder(e);
    const el = tip.current;
    if (!el || !wrap.current) return;
    if (!h || useOffice.getState().filming) { el.style.opacity = '0'; wrap.current.style.cursor = 'grab'; return; }
    const r = wrap.current.getBoundingClientRect();
    el.textContent = h.label;
    el.style.opacity = '1';
    el.style.transform = `translate(${Math.round(e.clientX - r.left + 14)}px, ${Math.round(e.clientY - r.top + 16)}px)`;
    wrap.current.style.cursor = 'pointer';
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || (e.target as HTMLElement).closest('.bubble.ask')) return;
    const h = hitUnder(e);
    if (h) interact(h);
  };
  const onWheel = (e: React.WheelEvent) => {
    const s = sceneRef.current;
    if (!s || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const p = s.pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    const z = Math.max(1, Math.min(3, camera.tzoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    if (z <= 1.01 || !p) camera.wide(6);
    else camera.shot(p.x, p.y, z, 8);
  };

  return (
    <div className="office office3d" ref={wrap} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
      onPointerLeave={() => { if (tip.current) tip.current.style.opacity = '0'; }} onWheel={onWheel} onDoubleClick={() => camera.wide(4)}>
      <canvas ref={canvas} className="office3d-canvas" />
      <div className="office3d-layer" ref={layer}><Bubbles /></div>
      <LiveBadge />
      <div className="office-tip" ref={tip} />
    </div>
  );
}
