// L'archipel en 3D : des îles qui flottent au-dessus d'une mer de nuages, avec leurs roches suspendues,
// leurs lianes et leurs plantes lumineuses, des cascades qui tombent dans le vide, des ponts-neurones
// qui brillent, des spores qui dérivent, et au centre le grand cerveau de Max qui pulse.
//
// Le monde (world.ts) ne change pas : les robots marchent toujours sur la grille de l'archipel
// (layout.ts, une case = une unité 3D). Cette scène ne fait que le dessiner autrement.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ROLES } from '../../shared/activity.ts';
import type { ActKind, Role } from '../../shared/protocol.ts';
import type { Camera as Cam2D } from '../engine/camera.ts';
import { BOARD, BRIDGES, COLS, FURNITURE, ISLANDS, islandOf, ROWS, T, type Island } from '../engine/layout.ts';
import type { TimeOfDay } from '../engine/room.ts';
import type { Actor, World } from '../engine/world.ts';

// ── Les repères : une case de la grille = une unité ; le centre de l'archipel est l'origine ──
const tX = (tx: number) => tx - COLS / 2;
const tZ = (ty: number) => ty - ROWS / 2;

// ── L'écartement : en 3D, chaque île s'éloigne du centre et flotte à sa propre hauteur ──
const SPREAD = 0.62;
const HEIGHT: Record<string, number> = { cerveau: 0.9, port: -0.6, veille: 1.6, scripts: 0.6, tournage: 1.2, voix: 2.0, stats: -0.4, son: 0.2, code: -1.3, montage: -0.2, reseaux: 0.4, miniatures: -1.0, graphisme: 1.0 };
const OFFSET = new Map<string, THREE.Vector3>();
for (const i of ISLANDS) {
  const cx = tX(i.x + i.w / 2), cz = tZ(i.y + i.h / 2);
  OFFSET.set(i.id, new THREE.Vector3(cx * SPREAD, HEIGHT[i.id] ?? 0, cz * SPREAD * 1.1));
}
const ZERO = new THREE.Vector3();
const islandAtTile = (tx: number, ty: number, m = 0) => ISLANDS.find((i) => tx >= i.x - m && tx < i.x + i.w + m && ty >= i.y - m && ty < i.y + i.h + m);

/** Le décalage 3D d'un point de la grille (en cases) : celui de son île, ou un mélange le long d'un pont. */
function offsetAt(gx: number, gz: number, out = new THREE.Vector3()): THREE.Vector3 {
  const tx = Math.floor(gx), ty = Math.floor(gz);
  const isl = islandAtTile(tx, ty);
  if (isl) return out.copy(OFFSET.get(isl.id)!);
  for (const b of BRIDGES) {
    if (!b.tiles.some(([x, y]) => x === tx && y === ty)) continue;
    const xs = b.tiles.map((t) => t[0]), ys = b.tiles.map((t) => t[1]);
    const h = b.dir === 'h';
    const lo = h ? Math.min(...xs) : Math.min(...ys), hi = (h ? Math.max(...xs) : Math.max(...ys)) + 1;
    const k = Math.max(0, Math.min(1, ((h ? gx : gz) - lo) / (hi - lo)));
    const a = h ? islandAtTile(lo - 1, ty) : islandAtTile(tx, lo - 1);
    const c = h ? islandAtTile(hi, ty) : islandAtTile(tx, hi);
    const oa = a ? OFFSET.get(a.id)! : ZERO, oc = c ? OFFSET.get(c.id)! : (oa);
    return out.lerpVectors(oa, oc, k);
  }
  const near = islandAtTile(tx, ty, 2);
  return out.copy(near ? OFFSET.get(near.id)! : ZERO);
}

/** Un point de la grille (en cases, origine au coin) → sa place dans l'espace 3D. */
function placeTile(gx: number, gz: number, y = 0, out = new THREE.Vector3()) {
  offsetAt(gx, gz, out);
  return out.set(out.x + tX(gx), out.y + y, out.z + tZ(gz));
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const SCREEN: Record<ActKind, string> = {
  search: '#7fd6ff', web: '#7fffc4', read: '#cfe3ff', write: '#fff0d4', edit: '#fff0d4', bash: '#8affb0',
  plan: '#ffd27a', skill: '#ffe08a', mcp: '#c9b4ff', other: '#dfe6ff',
};

interface Mood { skyTop: string; skyMid: string; horizon: string; fog: string; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; bloom: number; clouds: string; stars: number }
const MOODS: Record<TimeOfDay, Mood> = {
  day: { skyTop: '#1f63b8', skyMid: '#5fa8e0', horizon: '#c4e2f0', fog: '#9ccbe6', sun: '#fff1d6', sunI: 2.2, hemiSky: '#cfe8ff', hemiGround: '#3a5a46', hemiI: 1.1, bloom: 0.45, clouds: '#ffffff', stars: 0 },
  evening: { skyTop: '#241c52', skyMid: '#7a3f7a', horizon: '#ff9a6a', fog: '#8a5a86', sun: '#ffab73', sunI: 1.4, hemiSky: '#ffc0a0', hemiGround: '#2a2040', hemiI: 0.8, bloom: 0.8, clouds: '#ffc6b0', stars: 0.4 },
  night: { skyTop: '#03040f', skyMid: '#0b1238', horizon: '#1c2a66', fog: '#0d1436', sun: '#9fb4ff', sunI: 1.1, hemiSky: '#5a6ad0', hemiGround: '#1a1030', hemiI: 1.0, bloom: 0.95, clouds: '#4a5aa8', stars: 1 },
};

/** Une texture dessinée au canevas (nuages, cascade, tableau du plan). */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Une roche suspendue : un cône pointe en bas, bosselé au hasard. */
function rockGeometry(seed: number, segments = 11) {
  const geo = new THREE.ConeGeometry(1, 1, segments, 5, false);
  geo.rotateX(Math.PI);
  geo.translate(0, -0.5, 0);
  const r = rng(seed);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > -0.02) continue;
    const k = 1 + (r() - 0.5) * 0.5;
    p.setXYZ(i, p.getX(i) * k, y + (r() - 0.5) * 0.08, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

interface Bot { group: THREE.Group; mats: THREE.Material[]; eyes: THREE.MeshBasicMaterial }

export class Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 900);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private hemi = new THREE.HemisphereLight('#cfe8ff', '#3a5a46', 1);
  private sun = new THREE.DirectionalLight('#fff1d6', 2);
  private skyMat: THREE.ShaderMaterial;
  private stars: THREE.Points;
  private spores: THREE.Points;
  private cloudSea: THREE.Mesh;
  private falls: THREE.Texture[] = [];
  private brain!: THREE.Mesh;
  private brainMat!: THREE.MeshStandardMaterial;
  private brainY = 0;
  private screens!: THREE.InstancedMesh;
  private deskIds: string[] = [];
  private pulses: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; bridge: (typeof BRIDGES)[number]; from: THREE.Vector3; to: THREE.Vector3; phase: number }[] = [];
  private bots = new Map<string, Bot>();
  private cat!: THREE.Group;
  private boardTex!: THREE.CanvasTexture;
  private boardMat!: THREE.MeshBasicMaterial;
  private boardKey = '';
  private mood: TimeOfDay | null = null;
  private time = 0;
  /** l'angle de vue, que tu changes en faisant glisser */
  azimuth = 0;
  pitch = 0.62;
  private touchedAt = -99;
  private color = new THREE.Color();

  constructor(canvas: HTMLCanvasElement, opts: { bloom: boolean }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.fog = new THREE.Fog('#bcd9e8', 130, 420);
    this.scene.add(this.hemi, this.sun);
    this.sun.position.set(-30, 40, 20);

    // le ciel : un dégradé sur une grande sphère
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.15 ? mix(mid, top, smoothstep(0.15, 0.8, h)) : mix(horizon, mid, smoothstep(-0.2, 0.15, h)); gl_FragColor = vec4(c, 1.0); }',
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), this.skyMat));

    // les étoiles (le soir et la nuit)
    {
      const r = rng(5);
      const pos: number[] = [];
      for (let i = 0; i < 900; i++) {
        const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.95);
        pos.push(Math.cos(th) * Math.sin(ph) * 420, Math.cos(ph) * 420, Math.sin(th) * Math.sin(ph) * 420);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      this.scene.add(this.stars);
    }

    // la mer de nuages, loin en dessous
    {
      const tex = canvasTex(256, 256, (g) => {
        const r = rng(9);
        g.fillStyle = 'rgba(0,0,0,0)';
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 90; i++) {
          const x = r() * 256, y = r() * 256, rad = 12 + r() * 40;
          const grd = g.createRadialGradient(x, y, 0, x, y, rad);
          grd.addColorStop(0, 'rgba(255,255,255,0.55)');
          grd.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = grd;
          for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { g.save(); g.translate(dx, dy); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
        }
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 6);
      this.cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6, depthWrite: false }));
      this.cloudSea.rotation.x = -Math.PI / 2;
      this.cloudSea.position.y = -16;
      this.scene.add(this.cloudSea);
      const under = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshBasicMaterial({ color: '#9fc4dd' }));
      under.rotation.x = -Math.PI / 2;
      under.position.y = -22;
      under.name = 'under';
      this.scene.add(under);
    }

    this.buildIslands();
    this.buildBridges();
    this.buildFurniture();
    this.buildBrain();
    this.buildFarRocks();
    this.buildCat();

    // les spores lumineuses qui montent doucement
    {
      const r = rng(13);
      const pos: number[] = [];
      for (let i = 0; i < 420; i++) pos.push((r() - 0.5) * 70, -10 + r() * 22, (r() - 0.5) * 54);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const dot = canvasTex(32, 32, (c) => {
        const grd = c.createRadialGradient(16, 16, 0, 16, 16, 16);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = grd;
        c.fillRect(0, 0, 32, 32);
      });
      this.spores = new THREE.Points(g, new THREE.PointsMaterial({ map: dot, color: '#7ff5ff', size: 0.32, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.scene.add(this.spores);
    }

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.82);
    this.bloom.enabled = opts.bloom;
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  // ── La construction ──
  private landMat(isl: Island) {
    const base = isl.role === 'chef' ? '#b0478a' : isl.role === 'port' ? '#8a6a4a' : new THREE.Color('#3f9a5a').lerp(new THREE.Color(ROLES[isl.role as Role].color), 0.3).getStyle();
    return new THREE.MeshStandardMaterial({ color: base, roughness: 0.9, flatShading: true, emissive: base, emissiveIntensity: 0.08 });
  }

  private buildIslands() {
    const rockMat = new THREE.MeshStandardMaterial({ color: '#5b5f7a', roughness: 1, flatShading: true });
    const dirtMat = new THREE.MeshStandardMaterial({ color: '#6b4a34', roughness: 1, flatShading: true });
    const vineGeo = new THREE.BoxGeometry(0.05, 1, 0.05);
    vineGeo.translate(0, -0.5, 0);
    const vines = new THREE.InstancedMesh(vineGeo, new THREE.MeshStandardMaterial({ color: '#1d4a3a', emissive: '#2fffd0', emissiveIntensity: 0.35 }), 260);
    const plantGeo = new THREE.IcosahedronGeometry(0.16, 0);
    const plants = new THREE.InstancedMesh(plantGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), 420);
    const trunkGeo = new THREE.CylinderGeometry(0.07, 0.12, 1.1, 6);
    trunkGeo.translate(0, 0.55, 0);
    const canopyGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, dirtMat, 60);
    const canopies = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ color: '#2f8a5a', flatShading: true, emissive: '#0a3a2a', emissiveIntensity: 0.4 }), 60);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const glow = ['#2fffd0', '#7f9cff', '#ff6fd0', '#ffe066', '#7fff9a'];
    let nv = 0, np = 0, nt = 0;
    for (const isl of ISLANDS) {
      const r = rng(isl.x * 31 + isl.y * 17);
      const m0 = 0.35;
      const w = isl.w + m0 * 2, d = isl.h + m0 * 2;
      const off = OFFSET.get(isl.id)!;
      const cx = tX(isl.x + isl.w / 2) + off.x, cz = tZ(isl.y + isl.h / 2) + off.z, oy = off.y;
      // la terre : un plateau aux coins arrondis
      const sh = new THREE.Shape();
      const rr = 0.8, x0 = -w / 2, y0 = -d / 2;
      sh.moveTo(x0 + rr, y0);
      sh.lineTo(x0 + w - rr, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
      sh.lineTo(x0 + w, y0 + d - rr); sh.quadraticCurveTo(x0 + w, y0 + d, x0 + w - rr, y0 + d);
      sh.lineTo(x0 + rr, y0 + d); sh.quadraticCurveTo(x0, y0 + d, x0, y0 + d - rr);
      sh.lineTo(x0, y0 + rr); sh.quadraticCurveTo(x0, y0, x0 + rr, y0);
      const top = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.12, bevelSegments: 1, curveSegments: 4 });
      top.rotateX(-Math.PI / 2);
      top.translate(cx, -0.45 + oy, cz);
      const land = new THREE.Mesh(top, [this.landMat(isl), dirtMat]);
      this.scene.add(land);
      // la roche suspendue en dessous
      const big = isl.role === 'chef';
      const rock = new THREE.Mesh(rockGeometry(isl.x * 7 + isl.y), rockMat);
      rock.scale.set(w * 0.62, big ? 9 : 4.5 + r() * 2.5, d * 0.62);
      rock.position.set(cx, -0.4 + oy, cz);
      this.scene.add(rock);
      // les lianes qui pendent, et les plantes lumineuses sur les bords
      const edge = (k: number): [number, number] => {
        const per = 2 * (w + d);
        let s = k * per;
        if (s < w) return [cx - w / 2 + s, cz - d / 2];
        s -= w; if (s < d) return [cx + w / 2, cz - d / 2 + s];
        s -= d; if (s < w) return [cx + w / 2 - s, cz + d / 2];
        s -= w; return [cx - w / 2, cz + d / 2 - s];
      };
      for (let i = 0; i < (big ? 34 : 18) && nv < 260; i++) {
        const [x, z] = edge(r());
        sc.set(1, 0.8 + r() * (big ? 4 : 2.6), 1);
        m.compose(new THREE.Vector3(x * 0.97 + cx * 0.03, -0.45 + oy, z * 0.97 + cz * 0.03), q.identity(), sc);
        vines.setMatrixAt(nv++, m);
      }
      for (let i = 0; i < (big ? 50 : 26) && np < 420; i++) {
        const [x, z] = edge(r());
        const s = 0.6 + r() * 0.9;
        sc.set(s, s * (1 + r()), s);
        m.compose(new THREE.Vector3(x, 0.08 + oy, z), q.identity(), sc);
        plants.setMatrixAt(np, m);
        plants.setColorAt(np++, this.color.set(glow[Math.floor(r() * glow.length)]));
      }
      if (isl.role !== 'chef' && isl.role !== 'port') {
        for (const [ex, ez] of [[-1, -1], [1, 1]] as const) {
          if (nt >= 60) break;
          const x = cx + ex * (w / 2 - 0.1), z = cz + ez * (d / 2 - 0.1);
          const s = 0.8 + r() * 0.5;
          m.compose(new THREE.Vector3(x, oy, z), q.identity(), sc.set(s, s, s));
          trunks.setMatrixAt(nt, m);
          m.compose(new THREE.Vector3(x, oy + 1.2 * s, z), q.identity(), sc.set(s, s * 0.8, s));
          canopies.setMatrixAt(nt, m);
          canopies.setColorAt(nt++, this.color.set(ROLES[isl.role as Role].color).lerp(new THREE.Color('#2f8a5a'), 0.6));
        }
      }
    }
    vines.count = nv; plants.count = np; trunks.count = nt; canopies.count = nt;
    this.scene.add(vines, plants, trunks, canopies);

    // les cascades : elles tombent des îles des coins, dans le vide
    const fallTex = () => {
      const t = canvasTex(64, 256, (g) => {
        const r = rng(3);
        g.fillStyle = 'rgba(200,240,255,0.25)';
        g.fillRect(0, 0, 64, 256);
        for (let i = 0; i < 70; i++) {
          g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`;
          g.fillRect(Math.floor(r() * 64), Math.floor(r() * 256), 1 + Math.floor(r() * 3), 10 + Math.floor(r() * 50));
        }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    };
    for (const [id, side] of [['veille', 'w'], ['voix', 'e'], ['reseaux', 'w'], ['graphisme', 'e'], ['son', 'e'], ['stats', 'w']] as const) {
      const isl = ISLANDS.find((i) => i.id === id)!;
      const tex = fallTex();
      tex.repeat.set(1, 2);
      this.falls.push(tex);
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 15), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      const off = OFFSET.get(isl.id)!;
      const x = (side === 'w' ? tX(isl.x) - 0.45 : tX(isl.x + isl.w) + 0.45) + off.x;
      fall.position.set(x, -7.7 + off.y, tZ(isl.y + isl.h / 2) + off.z);
      fall.rotation.y = Math.PI / 2;
      this.scene.add(fall);
    }
  }

  private buildBridges() {
    const deckMat = new THREE.MeshStandardMaterial({ color: '#2a2440', roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: 0.9 });
    const fiberMat = new THREE.MeshBasicMaterial({ color: '#7fe8ff' });
    const up = new THREE.Vector3(0, 1, 0);
    for (const b of BRIDGES) {
      const xs = b.tiles.map((t) => t[0]), ys = b.tiles.map((t) => t[1]);
      const pier = b.b === 'mer';
      const h = b.dir === 'h';
      const midX = (Math.min(...xs) + Math.max(...xs) + 1) / 2, midZ = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
      // les deux bouts, un peu enfoncés dans les îles
      const g0 = h ? [Math.min(...xs) - 0.6, midZ] : [midX, Math.min(...ys) - 0.6];
      const g1 = h ? [Math.max(...xs) + 1.6, midZ] : [midX, Math.max(...ys) + (pier ? 2.5 : 1.6)];
      const from = placeTile(g0[0], g0[1], 0.02);
      const to = pier ? placeTile(g0[0], g0[1], 0.02).add(new THREE.Vector3(0, -0.2, 3.5)) : placeTile(g1[0], g1[1], 0.02);
      const dir = to.clone().sub(from);
      const len = dir.length();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, pier ? 2 : 0.9), pier ? woodMat : deckMat);
      deck.position.copy(from).add(to).multiplyScalar(0.5).setY((from.y + to.y) / 2 - 0.05);
      deck.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
      this.scene.add(deck);
      if (pier) continue;
      // deux fibres lumineuses, légèrement arquées, comme des axones
      const side = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(0.45);
      for (const sgn of [-1, 1]) {
        const a = from.clone().addScaledVector(side, sgn).add(new THREE.Vector3(0, 0.25, 0));
        const c = to.clone().addScaledVector(side, sgn).add(new THREE.Vector3(0, 0.25, 0));
        const mid = a.clone().add(c).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.5, 0));
        this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, c), 16, 0.04, 5), fiberMat));
      }
      // l'influx qui court sur le pont
      const mat = new THREE.MeshBasicMaterial({ color: '#c8f4ff' });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat);
      this.scene.add(mesh);
      this.pulses.push({ mesh, mat, bridge: b, from, to, phase: Math.random() });
    }
  }

  /** Une boîte posée sur l'île, au point (gx, gz) de la grille. */
  private box(w: number, h: number, d: number, color: string, gx: number, y: number, gz: number, emissive?: string) {
    const mat = emissive ? new THREE.MeshBasicMaterial({ color: emissive }) : new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    placeTile(gx, gz, y + h / 2, mesh.position);
    this.scene.add(mesh);
    return mesh;
  }

  private buildFurniture() {
    const desks = FURNITURE.filter((f) => f.kind === 'desk');
    this.deskIds = desks.map((f) => f.id);
    const deskMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.75, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: '#9a6a44', roughness: 0.8, flatShading: true }), desks.length);
    this.screens = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.36, 0.05), new THREE.MeshBasicMaterial({ color: '#ffffff' }), desks.length);
    const m = new THREE.Matrix4();
    const pt = new THREE.Vector3();
    desks.forEach((f, i) => {
      placeTile(f.tx + 1, f.ty + 0.5, 0, pt);
      m.makeTranslation(pt.x, pt.y + 0.25, pt.z);
      deskMesh.setMatrixAt(i, m);
      m.makeTranslation(pt.x, pt.y + 0.68, pt.z + 0.05);
      this.screens.setMatrixAt(i, m);
      this.screens.setColorAt(i, this.color.set('#3a4a6a'));
    });
    this.scene.add(deskMesh, this.screens);
    for (const f of FURNITURE) {
      const x = f.tx + Math.max(f.w, 1) / 2, z = f.ty + 0.5;
      switch (f.kind) {
        case 'chefDesk':
          this.box(f.w - 0.2, 0.55, 0.8, '#2b2836', x, 0, z);
          this.box(f.w - 0.2, 0.06, 0.06, '', x, 0.5, z + 0.42, '#ff8a3d');
          break;
        case 'jukebox': this.box(1.4, 1.3, 0.7, '#5a2a6a', x, 0, z); this.box(1.1, 0.5, 0.05, '', x, 0.6, z + 0.36, '#ff5fa2'); break;
        case 'coffee': this.box(2.6, 0.9, 0.7, '#e9e5ef', x, 0, z); this.box(0.2, 0.2, 0.05, '', x + 0.8, 0.6, z + 0.36, '#ff8a3d'); break;
        case 'cooler': this.box(0.5, 1.1, 0.5, '#bfe3ff', x, 0, z); break;
        case 'printer': this.box(0.8, 0.5, 0.6, '#d8dae6', x, 0, z); break;
        case 'rack': this.box(0.8, 1.6, 0.7, '#1d1a28', x, 0, z); this.box(0.5, 0.06, 0.05, '', x, 0.9, z + 0.36, '#3ddc97'); break;
        case 'sofa': this.box(2.7, 0.55, 0.8, '#ff7a3d', x, 0, z); this.box(2.7, 0.5, 0.2, '#e25f28', x, 0.5, z - 0.3); break;
        case 'shelf': this.box(1.7, 1.5, 0.4, '#7a5434', x, 0, z); break;
        case 'lamp': this.box(0.08, 1.6, 0.08, '#3b3550', x, 0, z); this.box(0.35, 0.3, 0.35, '', x, 1.6, z, '#ffd28a'); break;
        case 'plantBig': case 'plantTall': {
          const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ color: '#2f9a6a', emissive: '#14ffb0', emissiveIntensity: 0.25, flatShading: true }));
          placeTile(x, z, 0.6, p.position);
          this.scene.add(p);
          break;
        }
      }
    }
    // le tableau du plan : un écran géant, à l'arrière du cerveau
    this.boardTex = canvasTex(512, 192, () => {});
    const bgx = (BOARD.x + BOARD.w / 2) / T, bgz = 7.2;
    this.boardMat = new THREE.MeshBasicMaterial({ map: this.boardTex });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w / T, 2.3), this.boardMat);
    placeTile(bgx, bgz, 1.55, board.position);
    this.scene.add(board);
    for (const dx of [-2.2, 2.2]) this.box(0.1, 0.5, 0.1, '#4a4560', bgx + dx, 0, bgz);
  }

  /** Le grand cerveau lumineux, qui flotte derrière le tableau du plan. */
  private buildBrain() {
    const geo = new THREE.IcosahedronGeometry(2.1, 5);
    const p = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = v.clone().normalize();
      const folds = Math.sin(n.x * 11 + Math.sin(n.y * 7) * 2) * Math.sin(n.y * 9 + n.z * 5) * Math.sin(n.z * 10 + n.x * 4);
      const split = Math.exp(-Math.abs(n.x) * 14) * 0.18;
      v.multiplyScalar(1 + folds * 0.07 - split);
      p.setXYZ(i, v.x * 1.25, v.y * 0.95, v.z * 1.1);
    }
    geo.computeVertexNormals();
    this.brainMat = new THREE.MeshStandardMaterial({ color: '#ff9ed0', emissive: '#ff4fb0', emissiveIntensity: 0.6, roughness: 0.4, transparent: true, opacity: 0.92 });
    this.brain = new THREE.Mesh(geo, this.brainMat);
    placeTile((BOARD.x + BOARD.w / 2) / T, 11.5, 8.5, this.brain.position);
    this.brainY = this.brain.position.y;
    this.scene.add(this.brain);
    // des racines de lumière qui relient le cerveau à son île
    const rootMat = new THREE.MeshBasicMaterial({ color: '#ff8fd8' });
    const r = rng(77);
    for (let i = 0; i < 9; i++) {
      const a = this.brain.position.clone().add(new THREE.Vector3((r() - 0.5) * 2, -1.5, (r() - 0.5) * 1.5));
      const c = placeTile((BOARD.x + BOARD.w / 2) / T + (r() - 0.5) * 13, 8.5 + r() * 8.5, 0.05);
      const mid = a.clone().add(c).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.2, 0));
      this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, c), 16, 0.04, 5), rootMat));
    }
  }

  /** Au loin, d'autres roches flottent dans la brume. */
  private buildFarRocks() {
    const mat = new THREE.MeshStandardMaterial({ color: '#4f5a72', flatShading: true, roughness: 1 });
    const grass = new THREE.MeshStandardMaterial({ color: '#3f8a5a', flatShading: true });
    const r = rng(21);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3;
      const dist = 62 + r() * 45;
      const s = 3 + r() * 7;
      const rock = new THREE.Mesh(rockGeometry(100 + i, 8), mat);
      rock.scale.set(s, s * (1.6 + r()), s);
      const y = -4 + r() * 16;
      rock.position.set(Math.cos(a) * dist, y, Math.sin(a) * dist);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.95, s, 0.6, 8), grass);
      cap.position.set(rock.position.x, y + 0.3, rock.position.z);
      rock.userData.bob = r() * 6;
      cap.userData.bob = rock.userData.bob;
      rock.name = cap.name = 'far';
      this.scene.add(rock, cap);
    }
  }

  private buildCat() {
    const g = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: '#2b2836', flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.2), fur);
    body.position.y = 0.16;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.18), fur);
    head.position.set(0.25, 0.3, 0);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.12), new THREE.MeshBasicMaterial({ color: '#ff8a3d' }));
    eyes.position.set(0.36, 0.32, 0);
    g.add(body, head, eyes);
    this.cat = g;
    this.scene.add(g);
  }

  private makeBot(a: Actor): Bot {
    const g = new THREE.Group();
    const col = ROLES[a.role]?.color ?? '#9aa3b5';
    const chef = a.role === 'chef';
    const bodyMat = new THREE.MeshStandardMaterial({ color: chef ? '#3b3846' : col, roughness: 0.5, flatShading: true });
    const headMat = new THREE.MeshStandardMaterial({ color: chef ? '#2b2836' : '#e9e7f2', roughness: 0.35, flatShading: true });
    const visorMat = new THREE.MeshStandardMaterial({ color: '#0a0a10', roughness: 0.2 });
    const eyes = new THREE.MeshBasicMaterial({ color: chef ? '#ff8a3d' : col });
    const tip = new THREE.MeshBasicMaterial({ color: chef ? '#ff8a3d' : col });
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), bodyMat);
    legs.position.y = 0.1;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.3), bodyMat);
    body.position.y = 0.38;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.4, 0.42), headMat);
    head.position.y = 0.78;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.02), visorMat);
    visor.position.set(0, 0.78, 0.215);
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    const e1 = new THREE.Mesh(eyeGeo, eyes); e1.position.set(-0.1, 0.78, 0.23);
    const e2 = new THREE.Mesh(eyeGeo, eyes); e2.position.set(0.1, 0.78, 0.23);
    const ant = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), headMat); ant.position.y = 1.05;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), tip); ball.position.y = 1.15;
    g.add(legs, body, head, visor, e1, e2, ant, ball);
    g.scale.setScalar(chef ? 1.5 : 1.3);
    this.scene.add(g);
    return { group: g, mats: [bodyMat, headMat, visorMat, eyes, tip], eyes };
  }

  // ── Chaque image ──
  setMood(tod: TimeOfDay) {
    if (this.mood === tod) return;
    this.mood = tod;
    const m = MOODS[tod];
    this.skyMat.uniforms.top.value.set(m.skyTop);
    this.skyMat.uniforms.mid.value.set(m.skyMid);
    this.skyMat.uniforms.horizon.value.set(m.horizon);
    (this.scene.fog as THREE.Fog).color.set(m.fog);
    this.sun.color.set(m.sun);
    this.sun.intensity = m.sunI;
    this.hemi.color.set(m.hemiSky);
    this.hemi.groundColor.set(m.hemiGround);
    this.hemi.intensity = m.hemiI;
    this.bloom.strength = m.bloom;
    (this.cloudSea.material as THREE.MeshBasicMaterial).color.set(m.clouds);
    const under = this.scene.getObjectByName('under') as THREE.Mesh;
    (under.material as THREE.MeshBasicMaterial).color.set(m.fog);
    (this.stars.material as THREE.PointsMaterial).opacity = m.stars;
    this.boardMat.color.set(tod === 'day' ? '#ffffff' : tod === 'evening' ? '#b8b4c4' : '#7a7890');
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(Math.max(64, w / 2), Math.max(64, h / 2));
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** Tu as fait glisser la vue : on tourne autour de l'archipel. */
  drag(dx: number, dy: number) {
    this.azimuth -= dx * 0.006;
    this.pitch = Math.max(0.35, Math.min(1.35, this.pitch + dy * 0.004));
    this.touchedAt = this.time;
  }

  /** Le point du sol (en pixels de la grille du monde) sous un point de l'écran : pour les clics et les infobulles. */
  pick(nx: number, ny: number): { x: number; y: number } | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx * 2 - 1, -(ny * 2 - 1)), this.camera);
    const hit = new THREE.Vector3();
    // un peu au-dessus du sol : on vise plutôt le corps des robots que leurs pieds
    // chaque île est à sa hauteur : on essaie chaque île, et on garde la plus proche de la caméra
    let best: { x: number; y: number; d: number } | null = null;
    for (const isl of ISLANDS) {
      const off = OFFSET.get(isl.id)!;
      if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(off.y + 0.5)), hit)) continue;
      const gx = hit.x - off.x + COLS / 2, gz = hit.z - off.z + ROWS / 2;
      if (gx < isl.x - 0.5 || gx > isl.x + isl.w + 0.5 || gz < isl.y - 0.5 || gz > isl.y + isl.h + 0.8) continue;
      const d = hit.distanceTo(this.camera.position);
      if (!best || d < best.d) best = { x: gx * T, y: gz * T + 8, d };
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  /** Où afficher la bulle d'un robot (en pixels de l'écran). */
  project(a: Actor, out: THREE.Vector3): boolean {
    const bot = this.bots.get(a.id);
    if (!bot) return false;
    out.copy(bot.group.position).setY(bot.group.position.y + 1.45 * bot.group.scale.y);
    out.project(this.camera);
    return out.z < 1;
  }

  render(world: World, cam2d: Cam2D, tod: TimeOfDay, dt: number, w: number, h: number) {
    this.time += dt;
    const t = this.time;
    this.setMood(tod);

    // la caméra suit le réalisateur du studio (plans larges, gros plans), vue de trois quarts
    const aspect = w / Math.max(1, h);
    const base = 68 * Math.max(1, 1.45 / aspect);
    const dist = base / cam2d.zoom;
    if (t - this.touchedAt > 12) this.azimuth += (Math.sin(t * 0.05) * 0.22 - this.azimuth) * Math.min(1, dt * 0.15);
    const target = placeTile(cam2d.x / T, cam2d.y / T + 1.5 / cam2d.zoom, 0);
    target.y *= 0.5;
    this.camera.position.set(
      target.x + Math.sin(this.azimuth) * Math.cos(this.pitch) * dist,
      target.y + Math.sin(this.pitch) * dist,
      target.z + Math.cos(this.azimuth) * Math.cos(this.pitch) * dist,
    );
    this.camera.lookAt(target);

    // le décor qui vit
    for (const f of this.falls) f.offset.y -= dt * 0.9;
    (this.cloudSea.material as THREE.MeshBasicMaterial).map!.offset.x += dt * 0.004;
    const sp = this.spores.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) {
      let y = sp.getY(i) + dt * (0.25 + (i % 7) * 0.05);
      if (y > 12) y = -10;
      sp.setY(i, y);
      sp.setX(i, sp.getX(i) + Math.sin(t * 0.5 + i) * dt * 0.1);
    }
    sp.needsUpdate = true;
    this.scene.traverse((o) => { if (o.name === 'far') o.position.y += Math.sin(t * 0.3 + o.userData.bob) * dt * 0.15; });

    // qui travaille où
    const busy = new Map<string, string>();
    for (const a of world.actors.values()) if (a.seated && a.role !== 'chef' && world.time - a.actAt < 9) busy.set(islandOf(a.role), ROLES[a.role].color);

    // le cerveau pulse, plus fort quand l'équipe travaille
    const beat = (Math.sin(t * (busy.size ? 3.2 : 1.2)) + 1) / 2;
    this.brainMat.emissiveIntensity = 0.35 + beat * (busy.size ? 0.9 : 0.35);
    this.brain.rotation.y = Math.sin(t * 0.2) * 0.25;
    this.brain.position.y = this.brainY + Math.sin(t * 0.8) * 0.15;

    // les influx sur les ponts
    for (const p of this.pulses) {
      const col = busy.get(p.bridge.a) ?? busy.get(p.bridge.b);
      const k = (t * (col ? 0.9 : 0.25) + p.phase) % 1;
      p.mesh.position.lerpVectors(p.from, p.to, k).setY(0.42 - Math.abs(k - 0.5) * 0.3);
      p.mat.color.set(col ?? '#c8f4ff');
      p.mesh.scale.setScalar(col ? 1.4 : 0.8);
    }

    // les écrans des bureaux : la couleur de ce que fait l'agent assis
    const atDesk = new Map<string, Actor>();
    for (const a of world.actors.values()) if (a.seated && a.seat) atDesk.set(a.seat.deskId, a);
    this.deskIds.forEach((id, i) => {
      const a = atDesk.get(id);
      const on = a && world.time - a.actAt < 9;
      this.screens.setColorAt(i, this.color.set(on && a!.act ? SCREEN[a!.act] : a ? '#7f9ad0' : '#2a3550'));
    });
    this.screens.instanceColor!.needsUpdate = true;

    // les robots
    for (const [id, bot] of this.bots) {
      if (!world.actors.has(id)) { this.scene.remove(bot.group); this.bots.delete(id); }
    }
    for (const a of world.actors.values()) {
      let bot = this.bots.get(a.id);
      if (!bot) { bot = this.makeBot(a); this.bots.set(a.id, bot); }
      const seated = a.seated && !!a.seat;
      const g = bot.group;
      const gx = a.x / T, gz = seated ? a.seat!.y / T - 0.15 : a.y / T - 0.3;
      placeTile(gx, gz, 0, g.position);
      const x = g.position.x;
      let y = g.position.y + (seated ? -0.06 : 0);
      if (a.moving) y += Math.abs(Math.sin(t * 12 + x)) * 0.06;
      if (a.cheerUntil > world.time) y += Math.abs(Math.sin(t * 10)) * 0.18;
      if (world.musicOn && world.time < world.bobUntil && !a.moving) y += 0.03;
      g.position.y = y;
      g.rotation.y = seated ? 0 : a.dir === 'down' ? 0 : a.dir === 'up' ? Math.PI : a.dir === 'left' ? -Math.PI / 2 : Math.PI / 2;
      const fade = a.alpha < 0.99;
      for (const m of bot.mats) { m.transparent = fade; m.opacity = a.alpha; }
      bot.eyes.color.set(a.eyes === 'blink' ? '#222' : a.role === 'chef' ? '#ff8a3d' : ROLES[a.role].color);
    }

    // le chat
    const c = world.cat;
    placeTile(c.x / T, c.y / T - 0.3, 0, this.cat.position);
    this.cat.rotation.y = c.right ? 0 : Math.PI;

    this.drawBoard(world);
    this.composer.render(dt);
  }

  /** Le plan de Max, écrit sur le tableau (redessiné seulement quand il change). */
  private drawBoard(world: World) {
    const key = JSON.stringify(world.plan.map((p) => [p.text, p.status])) + world.assignments.map((a) => a.status).join('');
    if (key === this.boardKey) return;
    this.boardKey = key;
    const c = this.boardTex.image as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f4f5f9';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#d0682a';
    g.font = 'bold 26px system-ui, sans-serif';
    g.fillText('LE PLAN', 16, 34);
    g.font = '19px system-ui, sans-serif';
    world.plan.slice(0, 6).forEach((p, i) => {
      const y = 62 + i * 22;
      g.fillStyle = p.status === 'completed' ? '#2fbf71' : p.status === 'in_progress' ? '#ff8a3d' : '#8a8ea2';
      g.fillRect(16, y - 13, 14, 14);
      g.fillStyle = p.status === 'completed' ? '#9a9db0' : '#2b2836';
      const text = p.text.length > 44 ? p.text.slice(0, 43) + '…' : p.text;
      g.fillText(text, 40, y);
    });
    if (!world.plan.length) { g.fillStyle = '#8a8ea2'; g.fillText('Dis à Max ce que tu veux créer.', 16, 80); }
    this.boardTex.needsUpdate = true;
  }

  dispose() {
    this.renderer.dispose();
  }
}
