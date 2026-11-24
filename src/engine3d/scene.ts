// L'archipel en 3D, rendu réaliste : des îles qui flottent au-dessus d'une mer de nuages, avec un relief
// organique, des falaises en couches, des racines qui pendent, de l'herbe qui ondule au vent, des arbres,
// des champignons qui s'allument la nuit, des cascades qui tombent dans le vide, des ponts de corde dont
// les cordes brillent comme des neurones, et au centre le cerveau de Max qui pulse.
// Ciel atmosphérique, soleil et ombres douces, reflets de l'environnement, brume et un léger bloom.
//
// Le monde (world.ts) ne change pas : les robots marchent toujours sur la grille de l'archipel
// (layout.ts, une case = une unité 3D). Cette scène ne fait que le dessiner autrement.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROLES } from '../../shared/activity.ts';
import type { ActKind, Role } from '../../shared/protocol.ts';
import type { Camera as Cam2D } from '../engine/camera.ts';
import { BOARD, BRIDGES, COLS, FURNITURE, ISLANDS, islandOf, ROWS, T, type Island } from '../engine/layout.ts';
import type { TimeOfDay } from '../engine/room.ts';
import type { Actor, World } from '../engine/world.ts';

// ── Les repères : une case de la grille = une unité ; le centre de l'archipel est l'origine ──
const tX = (tx: number) => tx - COLS / 2;
const tZ = (ty: number) => ty - ROWS / 2;

// ── Le bruit (pour le relief, les roches, les couleurs) ──
function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
function fbm(x: number, y: number, z: number, oct = 4) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}
function rng(seed: number) {
  let s = Math.floor(Math.abs(seed) * 1000) >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

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

/** Le creux d'un pont de corde (au milieu), selon sa longueur. */
const sagOf = (len: number) => Math.min(0.55, len * 0.045);

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
    const oa = a ? OFFSET.get(a.id)! : ZERO, oc = c ? OFFSET.get(c.id)! : oa;
    out.lerpVectors(oa, oc, k);
    if (b.b !== 'mer') out.y -= sagOf(oa.distanceTo(oc) + (hi - lo)) * Math.sin(Math.PI * k);
    return out;
  }
  const near = islandAtTile(tx, ty, 2);
  return out.copy(near ? OFFSET.get(near.id)! : ZERO);
}

/** Un point de la grille (en cases, origine au coin) → sa place dans l'espace 3D. */
function placeTile(gx: number, gz: number, y = 0, out = new THREE.Vector3()) {
  offsetAt(gx, gz, out);
  return out.set(out.x + tX(gx), out.y + y, out.z + tZ(gz));
}

const SCREEN: Record<ActKind, string> = {
  search: '#7fd6ff', web: '#7fffc4', read: '#cfe3ff', write: '#fff0d4', edit: '#fff0d4', bash: '#8affb0',
  plan: '#ffd27a', skill: '#ffe08a', mcp: '#c9b4ff', other: '#dfe6ff',
};

interface Mood { elevation: number; azimuth: number; turbidity: number; rayleigh: number; fog: string; fogD: number; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; env: number; exposure: number; bloom: number; clouds: string; cloudO: number; stars: number; glow: number }
const MOODS: Record<TimeOfDay, Mood> = {
  day: { elevation: 42, azimuth: 150, turbidity: 3.5, rayleigh: 1.2, fog: '#8fb8e0', fogD: 0.0024, sun: '#fff3df', sunI: 3.4, hemiSky: '#bfe0ff', hemiGround: '#6a5a40', hemiI: 0.9, env: 1.0, exposure: 0.78, bloom: 0.18, clouds: '#ffffff', cloudO: 0.95, stars: 0, glow: 0.25 },
  evening: { elevation: 4, azimuth: 200, turbidity: 8, rayleigh: 2.6, fog: '#c48a86', fogD: 0.0035, sun: '#ffb27a', sunI: 2.8, hemiSky: '#ffc6a8', hemiGround: '#4a3040', hemiI: 0.8, env: 0.8, exposure: 0.7, bloom: 0.45, clouds: '#ffd2bc', cloudO: 0.9, stars: 0.25, glow: 1 },
  night: { elevation: -6, azimuth: 200, turbidity: 2, rayleigh: 0.4, fog: '#101a44', fogD: 0.004, sun: '#a8bcff', sunI: 1.8, hemiSky: '#5060b8', hemiGround: '#141428', hemiI: 1.1, env: 0.5, exposure: 1.0, bloom: 0.7, clouds: '#5a6a9e', cloudO: 0.55, stars: 1, glow: 2.2 },
};

/** Une texture dessinée au canevas. */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Ajoute une couleur à chaque sommet (pour fusionner des pièces de couleurs différentes). */
function paint(geo: THREE.BufferGeometry, color: string | THREE.Color, jitter = 0, seed = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  const c = new THREE.Color(color);
  const r = rng(seed);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = 1 + (r() - 0.5) * jitter;
    arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

/**
 * Une île flottante : un plateau presque plat (on y marche), qui s'arrondit au bord et plonge en une
 * grande roche en couches, pointe vers le bas. a, b : les demi-largeurs ; depth : la hauteur de la roche.
 */
function islandGeometry(a: number, b: number, depth: number, seed: number, grass: THREE.Color, opts: { flatTop?: boolean } = {}) {
  const SEG = 84, TOP = 16, BOT = 26;
  const N = 5;
  const R = (th: number) => Math.pow(Math.pow(Math.abs(Math.cos(th) / a), N) + Math.pow(Math.abs(Math.sin(th) / b), N), -1 / N);
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const c = new THREE.Color();
  const dirt = new THREE.Color('#5e4430'), rockA = new THREE.Color('#6f6a66'), rockB = new THREE.Color('#4a4650'), rockC = new THREE.Color('#8a7a68');
  const rows = TOP + BOT + 1;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= SEG; j++) {
      const th = (j / SEG) * Math.PI * 2;
      const ct = Math.cos(th), st = Math.sin(th);
      const edgeN = fbm(ct * 1.5 + seed, st * 1.5, seed * 0.3, 3);
      const Rt = R(th) * (1 + edgeN * 0.06);
      let x: number, y: number, z: number;
      if (i <= TOP) {
        const rho = i / TOP;
        x = ct * Rt * rho; z = st * Rt * rho;
        const lip = rho > 0.86 ? Math.pow((rho - 0.86) / 0.14, 2) * 0.35 : 0;
        y = (opts.flatTop ? 0 : fbm(x * 0.7, seed, z * 0.7, 3) * 0.035) - lip;
        const n = fbm(x * 0.9 + seed, 3.1, z * 0.9, 4);
        c.copy(grass).multiplyScalar(0.82 + n * 0.35);
        if (rho > 0.9) c.lerp(dirt, (rho - 0.9) / 0.1 * 0.8);
        if (n < -0.25 && !opts.flatTop) c.lerp(dirt, 0.35);
      } else {
        const v = (i - TOP) / BOT;
        const bulge = 1 + 0.25 * fbm(ct * 2.2, v * 3 + seed, st * 2.2, 4);
        const shrink = Math.pow(1 - v, 1.25) * (1 + Math.sin(v * Math.PI) * 0.08);
        x = ct * Rt * shrink * bulge; z = st * Rt * shrink * bulge;
        y = -0.35 - v * depth + fbm(ct * 3, v * 2, st * 3 + seed, 3) * 0.35 * v;
        // les couches de roche (strates), plus sombres vers la pointe
        const band = Math.sin(y * 3.2 + fbm(ct * 2, y * 0.6, st * 2 + seed, 3) * 2.2);
        c.copy(band > 0.2 ? rockA : band < -0.4 ? rockB : rockC).multiplyScalar(0.95 - v * 0.45 + fbm(x * 2, y * 2, z * 2, 2) * 0.12);
        if (v < 0.12) c.lerp(dirt, 1 - v / 0.12);
      }
      pos.push(x, y, z);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < SEG; j++) {
      const p = i * (SEG + 1) + j, q = p + SEG + 1;
      idx.push(p, p + 1, q, p + 1, q + 1, q);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, R };
}

/** Un arbre : un tronc un peu tordu et un feuillage en grappes de boules bosselées. */
function treeGeometry(seed: number) {
  const r = rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.07, 0.16, 1.6, 7, 6);
  const p = trunk.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.8; p.setX(i, p.getX(i) + Math.sin(y * 2 + seed) * 0.08 * y); }
  trunk.translate(0, 0.8, 0);
  trunk.computeVertexNormals();
  parts.push(paint(trunk, '#5a3e2b', 0.25, seed));
  const greens = ['#2f6b34', '#3f8040', '#285a2e', '#4a8a3c'];
  for (let i = 0; i < 6; i++) {
    const blob = new THREE.IcosahedronGeometry(0.42 + r() * 0.3, 2);
    const q = blob.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < q.count; k++) {
      const x = q.getX(k), y = q.getY(k), z = q.getZ(k);
      const s = 1 + fbm(x * 3 + seed, y * 3, z * 3 + i, 3) * 0.35;
      q.setXYZ(k, x * s, y * s * 0.85, z * s);
    }
    blob.translate((r() - 0.5) * 0.8, 1.55 + r() * 0.6, (r() - 0.5) * 0.8);
    blob.computeVertexNormals();
    parts.push(paint(blob, greens[i % greens.length], 0.3, seed + i));
  }
  return mergeGeometries(parts)!;
}

/** Un nuage : plusieurs bouffées douces, en texture. */
function cloudTexture() {
  return canvasTex(256, 256, (g) => {
    const r = rng(42);
    for (let i = 0; i < 26; i++) {
      const x = 50 + r() * 156, y = 80 + r() * 100, rad = 26 + r() * 52;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const shade = Math.round(235 - (y - 80) / 100 * 30);
      grd.addColorStop(0, `rgba(${shade + 15},${shade + 15},${Math.min(255, shade + 20)},0.5)`);
      grd.addColorStop(0.6, `rgba(${shade},${shade},${Math.min(255, shade + 8)},0.16)`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
    }
  });
}

interface Bot { group: THREE.Group; mats: THREE.Material[]; eyes: THREE.MeshBasicMaterial; armL: THREE.Object3D; armR: THREE.Object3D }

export class Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 3000);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private low: boolean;
  private hemi = new THREE.HemisphereLight('#cfe8ff', '#3a5a46', 0.5);
  private sun = new THREE.DirectionalLight('#fff1d6', 3);
  private sky = new Sky();
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private stars: THREE.Points;
  private spores: THREE.Points;
  private clouds: THREE.Sprite[] = [];
  private cloudMat: THREE.SpriteMaterial;
  private falls: THREE.Texture[] = [];
  private grassMat!: THREE.MeshStandardMaterial;
  private grassTime = { value: 0 };
  private glowMats: THREE.MeshStandardMaterial[] = [];
  private brain!: THREE.Mesh;
  private brainMat!: THREE.MeshStandardMaterial;
  private brainY = 0;
  private screens!: THREE.InstancedMesh;
  private deskIds: string[] = [];
  private pulses: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; bridge: (typeof BRIDGES)[number]; curve: THREE.Curve<THREE.Vector3>; phase: number }[] = [];
  private bots = new Map<string, Bot>();
  private cat!: THREE.Group;
  private boardTex!: THREE.CanvasTexture;
  private boardKey = '';
  private far: THREE.Object3D[] = [];
  private mood: TimeOfDay | null = null;
  private time = 0;
  /** l'angle de vue, que tu changes en faisant glisser */
  azimuth = 0;
  pitch = 0.5;
  private touchedAt = -99;
  private color = new THREE.Color();

  constructor(canvas: HTMLCanvasElement, opts: { bloom: boolean }) {
    this.low = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.low ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = !this.low;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);

    this.scene.fog = new THREE.FogExp2('#a9c9e4', 0.004);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.sun.castShadow = !this.low;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -36; sc.right = 36; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;

    // le ciel atmosphérique
    this.sky.scale.setScalar(2000);
    this.scene.add(this.sky);

    // les étoiles (le soir et la nuit)
    {
      const r = rng(5);
      const pos: number[] = [];
      for (let i = 0; i < 1400; i++) {
        const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.97);
        pos.push(Math.cos(th) * Math.sin(ph) * 900, Math.cos(ph) * 900, Math.sin(th) * Math.sin(ph) * 900);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      this.scene.add(this.stars);
    }

    // la mer de nuages, en bouffées (en dessous, et quelques-unes autour)
    this.cloudMat = new THREE.SpriteMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, fog: true });
    {
      const r = rng(17);
      const n = this.low ? 110 : 200;
      for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(this.cloudMat);
        const around = i > n * 0.82;
        const ang = r() * Math.PI * 2, dist = around ? 45 + r() * 60 : r() * 95;
        s.position.set(Math.cos(ang) * dist, around ? -4 + r() * 10 : -13 - r() * 9, Math.sin(ang) * dist * 0.8);
        const k = (around ? 10 : 16) + r() * 18;
        s.scale.set(k * 1.6, k, 1);
        s.userData.drift = 0.15 + r() * 0.35;
        this.clouds.push(s);
        this.scene.add(s);
      }
    }

    this.buildIslands();
    this.buildBridges();
    this.buildFurniture();
    this.buildBrain();
    this.buildFarIslands();
    this.buildCat();

    // les spores lumineuses qui montent doucement (on les voit surtout la nuit)
    {
      const r = rng(13);
      const pos: number[] = [];
      for (let i = 0; i < 360; i++) pos.push((r() - 0.5) * 70, -8 + r() * 18, (r() - 0.5) * 54);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const dot = canvasTex(32, 32, (c) => {
        const grd = c.createRadialGradient(16, 16, 0, 16, 16, 16);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.35, 'rgba(255,255,255,0.4)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = grd;
        c.fillRect(0, 0, 32, 32);
      });
      this.spores = new THREE.Points(g, new THREE.PointsMaterial({ map: dot, color: '#9ffcff', size: 0.18, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.scene.add(this.spores);
    }

    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.low ? 0 : 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, 0.9);
    this.bloom.enabled = opts.bloom;
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  private add<O extends THREE.Object3D>(o: O, cast = true, receive = true): O {
    o.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });
    this.scene.add(o);
    return o;
  }

  // ── Les îles ──
  private grassColor(isl: Island) {
    if (isl.role === 'chef') return new THREE.Color('#5f8a58');
    if (isl.role === 'port') return new THREE.Color('#7a5a40');
    return new THREE.Color('#4f8a3a').lerp(new THREE.Color(ROLES[isl.role as Role].color), 0.12);
  }

  private buildIslands() {
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
    // l'herbe : des brins fins qui ondulent au vent
    const blade = new THREE.PlaneGeometry(0.05, 0.32, 1, 4);
    blade.translate(0, 0.16, 0);
    {
      const p = blade.attributes.position as THREE.BufferAttribute;
      const cols: number[] = [];
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) / 0.32;
        p.setX(i, p.getX(i) * (1 - y * 0.85) + y * y * 0.04);
        const c = new THREE.Color('#2e5a24').lerp(new THREE.Color('#9acb6a'), y);
        cols.push(c.r, c.g, c.b);
      }
      blade.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    }
    this.grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 });
    this.grassMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.grassTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float bend = position.y / 0.32;
        float sway = sin(uTime * 1.8 + ip.x * 0.7 + ip.z * 0.5) * 0.07 + sin(uTime * 3.1 + ip.x * 2.1) * 0.02;
        transformed.x += sway * bend * bend;
        transformed.z += sway * 0.6 * bend * bend;`);
    };
    const blades: THREE.Matrix4[] = [], bladeCols: THREE.Color[] = [];
    // les champignons qui s'allument la nuit
    const capGeo = new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const stemGeo = new THREE.CylinderGeometry(0.018, 0.025, 0.12, 6);
    stemGeo.translate(0, 0.06, 0);
    capGeo.translate(0, 0.11, 0);
    const capMat = new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: '#3ff8ff', emissiveIntensity: 0.3, roughness: 0.5 });
    const capMat2 = new THREE.MeshStandardMaterial({ color: '#ffd0f0', emissive: '#ff4fd8', emissiveIntensity: 0.3, roughness: 0.5 });
    this.glowMats.push(capMat, capMat2);
    const shrooms: [THREE.Matrix4, number][] = [];
    // les racines qui pendent sous les îles
    const rootMat = new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 1 });
    const glowRootMat = new THREE.MeshStandardMaterial({ color: '#2a4a40', emissive: '#2fffd0', emissiveIntensity: 0.2, roughness: 0.8 });
    this.glowMats.push(glowRootMat);
    const rootGeos: THREE.BufferGeometry[] = [], glowRootGeos: THREE.BufferGeometry[] = [];
    const treeGeos: THREE.BufferGeometry[] = [];
    const yAxis = new THREE.Vector3(0, 1, 0);

    for (const isl of ISLANDS) {
      const r = rng(isl.x * 31 + isl.y * 17);
      const off = OFFSET.get(isl.id)!;
      const cx = tX(isl.x + isl.w / 2) + off.x, cz = tZ(isl.y + isl.h / 2) + off.z, oy = off.y;
      const big = isl.role === 'chef';
      const a = isl.w / 2 + 0.75, b = isl.h / 2 + 0.75;
      const depth = big ? 9 : 4.5 + r() * 3;
      const { geo, R } = islandGeometry(a, b, depth, isl.x * 0.37 + isl.y * 0.11, this.grassColor(isl), { flatTop: isl.role === 'port' });
      const land = new THREE.Mesh(geo, terrainMat);
      land.position.set(cx, oy, cz);
      this.add(land);

      // l'herbe
      if (isl.role !== 'port') {
        const n = this.low ? 160 : big ? 1300 : 520;
        for (let i = 0; i < n; i++) {
          const th = r() * Math.PI * 2, rho = Math.sqrt(r()) * 0.93;
          const x = Math.cos(th) * R(th) * rho, z = Math.sin(th) * R(th) * rho;
          const s = 0.6 + r() * 0.9;
          blades.push(new THREE.Matrix4().compose(new THREE.Vector3(cx + x, oy - 0.01, cz + z), new THREE.Quaternion().setFromAxisAngle(yAxis, r() * Math.PI), new THREE.Vector3(s, s * (0.7 + r() * 0.6), s)));
          bladeCols.push(this.grassColor(isl).multiplyScalar(1.6 + r() * 0.5));
        }
      }
      // les champignons, au bord
      for (let i = 0; i < (this.low ? 6 : 18); i++) {
        const th = r() * Math.PI * 2, rho = 0.86 + r() * 0.07;
        const s = 0.6 + r() * 1.1;
        shrooms.push([new THREE.Matrix4().compose(new THREE.Vector3(cx + Math.cos(th) * R(th) * rho, oy - 0.05, cz + Math.sin(th) * R(th) * rho), new THREE.Quaternion(), new THREE.Vector3(s, s, s)), r() < 0.6 ? 0 : 1]);
      }
      // les racines qui pendent
      for (let i = 0; i < (big ? 22 : 12); i++) {
        const th = r() * Math.PI * 2;
        const rr = R(th) * (0.55 + r() * 0.4);
        const start = new THREE.Vector3(cx + Math.cos(th) * rr, oy - 0.5 - r() * 1.2, cz + Math.sin(th) * rr);
        const len = 1.5 + r() * (big ? 6 : 3.5);
        const pts = [start];
        for (let k = 1; k <= 4; k++) pts.push(start.clone().add(new THREE.Vector3((r() - 0.5) * 0.5 * k, -len * k / 4, (r() - 0.5) * 0.5 * k)));
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.045 * (1 + r()), 5);
        (r() < 0.3 ? glowRootGeos : rootGeos).push(tube);
      }
      // des arbres à l'arrière de l'île (ils ne cachent pas l'équipe)
      if (isl.role !== 'chef' && isl.role !== 'port') {
        for (const fx of [-0.3, 0.32]) {
          const tree = treeGeometry(isl.x * 13 + isl.y * 7 + fx * 10);
          const s = 0.9 + r() * 0.5;
          tree.scale(s, s, s);
          tree.rotateY(r() * Math.PI * 2);
          tree.translate(cx + fx * isl.w, oy - 0.02, cz - isl.h / 2 - 0.35);
          treeGeos.push(tree);
        }
      }
    }
    const grass = new THREE.InstancedMesh(blade, this.grassMat, Math.max(1, blades.length));
    blades.forEach((mm, i) => { grass.setMatrixAt(i, mm); grass.setColorAt(i, bladeCols[i]); });
    grass.count = blades.length;
    grass.receiveShadow = true;
    this.scene.add(grass);
    for (const [k, mat] of [[0, capMat], [1, capMat2]] as const) {
      const list = shrooms.filter((s) => s[1] === k);
      const caps = new THREE.InstancedMesh(capGeo, mat, Math.max(1, list.length));
      const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.8 }), Math.max(1, list.length));
      list.forEach(([mm], i) => { caps.setMatrixAt(i, mm); stems.setMatrixAt(i, mm); });
      caps.count = stems.count = list.length;
      this.scene.add(caps, stems);
    }
    if (rootGeos.length) this.add(new THREE.Mesh(mergeGeometries(rootGeos)!, rootMat), true, false);
    if (glowRootGeos.length) this.add(new THREE.Mesh(mergeGeometries(glowRootGeos)!, glowRootMat), false, false);
    if (treeGeos.length) this.add(new THREE.Mesh(mergeGeometries(treeGeos)!, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));

    // les cascades : elles tombent des îles du bord, dans le vide
    const fallTex = () => {
      const t = canvasTex(64, 512, (g) => {
        const r = rng(3);
        const grd = g.createLinearGradient(0, 0, 64, 0);
        grd.addColorStop(0, 'rgba(220,240,255,0)');
        grd.addColorStop(0.5, 'rgba(220,240,255,0.55)');
        grd.addColorStop(1, 'rgba(220,240,255,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 64, 512);
        for (let i = 0; i < 140; i++) {
          g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.5})`;
          g.fillRect(6 + Math.floor(r() * 52), Math.floor(r() * 512), 1 + Math.floor(r() * 2), 20 + Math.floor(r() * 80));
        }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    };
    const fade = canvasTex(4, 256, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, '#fff');
      grd.addColorStop(0.7, '#888');
      grd.addColorStop(1, '#000');
      g.fillStyle = grd;
      g.fillRect(0, 0, 4, 256);
    });
    for (const [id, side] of [['veille', 'w'], ['voix', 'e'], ['reseaux', 'w'], ['graphisme', 'e'], ['son', 'e'], ['stats', 'w']] as const) {
      const isl = ISLANDS.find((i) => i.id === id)!;
      const tex = fallTex();
      tex.repeat.set(1, 1.5);
      this.falls.push(tex);
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 16), new THREE.MeshBasicMaterial({ map: tex, alphaMap: fade, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      const off = OFFSET.get(isl.id)!;
      const x = (side === 'w' ? tX(isl.x) - 0.85 : tX(isl.x + isl.w) + 0.85) + off.x;
      fall.position.set(x, -8.2 + off.y, tZ(isl.y + isl.h / 2) + off.z);
      fall.rotation.y = Math.PI / 2;
      this.scene.add(fall);
      const mist = new THREE.Sprite(this.cloudMat);
      mist.position.set(x, -15 + off.y, fall.position.z);
      mist.scale.set(5, 3, 1);
      this.scene.add(mist);
    }
  }

  // ── Les ponts de corde ──
  private buildBridges() {
    const plankMat = new THREE.MeshStandardMaterial({ color: '#7a5a3e', roughness: 0.85 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#6a7a8a', emissive: '#5fe8ff', emissiveIntensity: 0.4, roughness: 0.5 });
    this.glowMats.push(ropeMat);
    const postMat = new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.9 });
    const plankGeo = new RoundedBoxGeometry(0.2, 0.05, 1.0, 1, 0.015);
    const plankMs: THREE.Matrix4[] = [];
    const ropes: THREE.BufferGeometry[] = [], posts: THREE.BufferGeometry[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (const b of BRIDGES) {
      const xs = b.tiles.map((t) => t[0]), ys = b.tiles.map((t) => t[1]);
      const pier = b.b === 'mer';
      const h = b.dir === 'h';
      const midX = (Math.min(...xs) + Math.max(...xs) + 1) / 2, midZ = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
      const g0 = h ? [Math.min(...xs) - 0.7, midZ] : [midX, Math.min(...ys) - 0.7];
      const g1 = h ? [Math.max(...xs) + 1.7, midZ] : [midX, Math.max(...ys) + 1.7];
      const from = placeTile(g0[0], g0[1], 0);
      const to = pier ? placeTile(g0[0], g0[1], 0).add(new THREE.Vector3(0, -0.15, 4.5)) : placeTile(g1[0], g1[1], 0);
      const len = from.distanceTo(to);
      const sag = pier ? 0 : sagOf(len);
      const deckAt = (k: number) => new THREE.Vector3().lerpVectors(from, to, k).add(new THREE.Vector3(0, -sag * Math.sin(Math.PI * k) - 0.02, 0));
      const dir = to.clone().sub(from).normalize();
      const side = new THREE.Vector3().crossVectors(dir, up).normalize();
      const width = pier ? 2.2 : 1;
      const n = Math.ceil(len / 0.26);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const p = deckAt(k);
        const tan = deckAt(Math.min(1, k + 0.01)).sub(deckAt(Math.max(0, k - 0.01))).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), tan);
        const wob = new THREE.Quaternion().setFromAxisAngle(tan, Math.sin(i * 12.9) * 0.04);
        plankMs.push(new THREE.Matrix4().compose(p, wob.multiply(quat), new THREE.Vector3(1, 1, width)));
      }
      // les poteaux aux deux bouts, et les deux cordes (elles brillent : ce sont les neurones)
      for (const end of [0, 1]) {
        if (pier && end === 1) continue;
        for (const sg of [-1, 1]) {
          const p = deckAt(end).addScaledVector(side, sg * width * 0.5);
          const post = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 6);
          post.translate(p.x, p.y + 0.45, p.z);
          posts.push(post);
        }
      }
      if (pier) continue;
      for (const sg of [-1, 1]) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 16; i++) {
          const k = i / 16;
          pts.push(deckAt(k).addScaledVector(side, sg * 0.5).add(new THREE.Vector3(0, 0.85 + sag * 0.25 * Math.sin(Math.PI * k), 0)));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        ropes.push(new THREE.TubeGeometry(curve, 24, 0.028, 5));
        // les suspentes entre la corde et le tablier
        for (let i = 1; i < 8; i++) {
          const k = i / 8;
          const top = curve.getPoint(k), bot = deckAt(k).addScaledVector(side, sg * 0.5);
          ropes.push(new THREE.TubeGeometry(new THREE.LineCurve3(top, bot), 1, 0.01, 3));
        }
        if (sg === 1) {
          const mat = new THREE.MeshBasicMaterial({ color: '#c8f4ff' });
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat);
          this.scene.add(mesh);
          this.pulses.push({ mesh, mat, bridge: b, curve, phase: Math.random() });
        }
      }
    }
    const planks = new THREE.InstancedMesh(plankGeo, plankMat, plankMs.length);
    plankMs.forEach((mm, i) => planks.setMatrixAt(i, mm));
    planks.castShadow = planks.receiveShadow = true;
    this.scene.add(planks);
    this.add(new THREE.Mesh(mergeGeometries(ropes)!, ropeMat), true, false);
    this.add(new THREE.Mesh(mergeGeometries(posts)!, postMat));
  }

  // ── Le mobilier ──
  /** Un objet arrondi posé sur l'île, au point (gx, gz) de la grille. */
  private box(w: number, h: number, d: number, color: string, gx: number, y: number, gz: number, opts: { emissive?: string; metal?: number; rough?: number } = {}) {
    const mat = opts.emissive
      ? new THREE.MeshStandardMaterial({ color: '#222', emissive: opts.emissive, emissiveIntensity: 1.4 })
      : new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.6, metalness: opts.metal ?? 0 });
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.05, w / 4, h / 4, d / 4)), mat);
    placeTile(gx, gz, y + h / 2, mesh.position);
    return this.add(mesh);
  }

  private buildFurniture() {
    const desks = FURNITURE.filter((f) => f.kind === 'desk');
    this.deskIds = desks.map((f) => f.id);
    // un bureau : un plateau en bois sur quatre pieds fins, un écran sur pied, un clavier ; et une chaise
    const deskParts = [paint(new RoundedBoxGeometry(1.7, 0.05, 0.72, 2, 0.02).translate(0, 0.73, 0), '#8a5c3c', 0.08)];
    for (const [x, z] of [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]]) deskParts.push(paint(new THREE.BoxGeometry(0.045, 0.72, 0.045).translate(x, 0.36, z), '#2b2a30'));
    deskParts.push(paint(new THREE.BoxGeometry(0.05, 0.22, 0.05).translate(0, 0.86, 0.12), '#202024'));
    deskParts.push(paint(new THREE.BoxGeometry(0.22, 0.015, 0.14).translate(0, 0.76, 0.12), '#202024'));
    deskParts.push(paint(new RoundedBoxGeometry(0.66, 0.4, 0.035, 2, 0.012).translate(0, 1.12, 0.14), '#1a1a1e'));
    deskParts.push(paint(new THREE.BoxGeometry(0.42, 0.015, 0.14).translate(-0.05, 0.76, -0.18), '#d8d8dc'));
    const deskGeo = mergeGeometries(deskParts)!;
    const chairGeo = mergeGeometries([
      paint(new RoundedBoxGeometry(0.46, 0.08, 0.44, 2, 0.03).translate(0, 0.46, 0), '#2d2f38'),
      paint(new RoundedBoxGeometry(0.44, 0.5, 0.07, 2, 0.03).translate(0, 0.78, -0.22), '#2d2f38'),
      paint(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 6).translate(0, 0.23, 0), '#555555'),
      paint(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 10).translate(0, 0.03, 0), '#333333'),
    ])!;
    const deskMesh = new THREE.InstancedMesh(deskGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 }), desks.length);
    const chairMesh = new THREE.InstancedMesh(chairGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), desks.length);
    this.screens = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 0.34), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), desks.length);
    const m = new THREE.Matrix4();
    const pt = new THREE.Vector3();
    const flip = new THREE.Matrix4().makeRotationY(Math.PI);
    desks.forEach((f, i) => {
      placeTile(f.tx + 1, f.ty + 0.5, 0, pt);
      // le bureau est tourné vers l'agent (assis côté fond, face à toi)
      m.makeTranslation(pt.x, pt.y, pt.z).multiply(flip);
      deskMesh.setMatrixAt(i, m);
      m.makeTranslation(pt.x, pt.y + 1.12, pt.z - 0.165).multiply(flip);
      this.screens.setMatrixAt(i, m);
      this.screens.setColorAt(i, this.color.set('#3a4a6a'));
      placeTile(f.tx + 1, f.ty - 0.25, 0, pt);
      m.makeTranslation(pt.x, pt.y, pt.z);
      chairMesh.setMatrixAt(i, m);
    });
    for (const im of [deskMesh, chairMesh]) { im.castShadow = im.receiveShadow = true; this.scene.add(im); }
    this.scene.add(this.screens);

    for (const f of FURNITURE) {
      const x = f.tx + Math.max(f.w, 1) / 2, z = f.ty + 0.5;
      switch (f.kind) {
        case 'chefDesk':
          this.box(f.w - 0.3, 0.08, 0.95, '#2b2730', x, 0.72, z, { rough: 0.3, metal: 0.4 });
          this.box(f.w - 0.5, 0.7, 0.08, '#1d1b22', x, 0, z + 0.4, { rough: 0.4 });
          this.box(f.w - 0.5, 0.04, 0.04, '', x, 0.62, z + 0.46, { emissive: '#ff8a3d' });
          break;
        case 'jukebox': this.box(1.3, 1.35, 0.7, '#4a2050', x, 0, z, { rough: 0.3, metal: 0.3 }); this.box(1.0, 0.45, 0.04, '', x, 0.65, z + 0.36, { emissive: '#ff5fa2' }); break;
        case 'coffee': this.box(2.5, 0.95, 0.7, '#d9d4cc', x, 0, z, { rough: 0.4 }); this.box(0.5, 0.55, 0.35, '#3a3a3e', x + 0.7, 0.95, z, { metal: 0.7, rough: 0.3 }); break;
        case 'cooler': this.box(0.45, 1.1, 0.45, '#e8eef5', x, 0, z, { rough: 0.3 }); break;
        case 'printer': this.box(0.75, 0.45, 0.6, '#cfd2da', x, 0, z, { rough: 0.4 }); break;
        case 'rack': this.box(0.75, 1.7, 0.7, '#1b1a22', x, 0, z, { metal: 0.6, rough: 0.35 }); this.box(0.5, 0.05, 0.03, '', x, 1.0, z + 0.36, { emissive: '#3ddc97' }); break;
        case 'sofa': this.box(2.6, 0.45, 0.85, '#b85a35', x, 0, z, { rough: 0.9 }); this.box(2.6, 0.55, 0.22, '#a04c2c', x, 0.4, z - 0.32, { rough: 0.9 }); break;
        case 'shelf': this.box(1.7, 1.6, 0.4, '#6a4a30', x, 0, z, { rough: 0.7 }); break;
        case 'lamp': this.box(0.06, 1.7, 0.06, '#2b2a30', x, 0, z, { metal: 0.8, rough: 0.3 }); this.box(0.32, 0.22, 0.32, '', x, 1.6, z, { emissive: '#ffcf8a' }); break;
        case 'plantBig': case 'plantTall': {
          const tree = new THREE.Mesh(treeGeometry(f.tx * 7 + f.ty), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
          tree.scale.setScalar(0.55);
          placeTile(x, z, 0, tree.position);
          this.add(tree);
          break;
        }
      }
    }
    // le tableau du plan : un grand écran dans un cadre, à l'arrière du cerveau
    this.boardTex = canvasTex(768, 288, () => {});
    const bgx = (BOARD.x + BOARD.w / 2) / T, bgz = 7.25;
    this.box(BOARD.w / T + 0.3, 2.6, 0.12, '#1b1a20', bgx, 0.35, bgz - 0.1, { metal: 0.5, rough: 0.35 });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w / T, 2.3), new THREE.MeshBasicMaterial({ map: this.boardTex, toneMapped: false }));
    placeTile(bgx, bgz, 1.65, board.position);
    this.scene.add(board);
  }

  /** Le cerveau lumineux, qui flotte au-dessus du centre et pulse. */
  private buildBrain() {
    const geo = new THREE.IcosahedronGeometry(2.0, 6);
    const p = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = v.clone().normalize();
      const folds = Math.abs(fbm(n.x * 3.2, n.y * 3.2, n.z * 3.2, 3));
      const split = Math.exp(-Math.abs(n.x) * 16) * 0.16;
      v.multiplyScalar(1 + 0.12 - folds * 0.2 - split);
      p.setXYZ(i, v.x * 1.25, v.y * 0.95, v.z * 1.1);
    }
    geo.computeVertexNormals();
    this.brainMat = new THREE.MeshStandardMaterial({ color: '#e7a3c2', emissive: '#ff4fa8', emissiveIntensity: 0.4, roughness: 0.38, metalness: 0.05 });
    this.brain = new THREE.Mesh(geo, this.brainMat);
    placeTile((BOARD.x + BOARD.w / 2) / T, 11.5, 8.5, this.brain.position);
    this.brainY = this.brain.position.y;
    this.add(this.brain, true, false);
    // un halo doux autour
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,120,200,0.3)');
      grd.addColorStop(1, 'rgba(255,120,200,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(11, 11, 1);
    this.brain.add(halo);
    // les racines de lumière qui relient le cerveau à son île
    const rootMat = new THREE.MeshStandardMaterial({ color: '#ffb0dc', emissive: '#ff6fc8', emissiveIntensity: 0.8 });
    this.glowMats.push(rootMat);
    const r = rng(77);
    const roots: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const a = this.brain.position.clone().add(new THREE.Vector3((r() - 0.5) * 2, -1.5, (r() - 0.5) * 1.5));
      const c = placeTile((BOARD.x + BOARD.w / 2) / T + (r() - 0.5) * 13, 8.5 + r() * 8.5, 0.05);
      const mid = a.clone().add(c).multiplyScalar(0.5).add(new THREE.Vector3((r() - 0.5) * 2, 1.4, 0));
      roots.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, c), 24, 0.03, 5));
    }
    this.add(new THREE.Mesh(mergeGeometries(roots)!, rootMat), false, false);
  }

  /** Au loin, d'autres îles flottent dans la brume. */
  private buildFarIslands() {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const r = rng(21);
    const n = this.low ? 8 : 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.3;
      const dist = 70 + r() * 70;
      const s = 2 + r() * 5;
      const { geo } = islandGeometry(s, s * (0.7 + r() * 0.5), s * (1.8 + r()), 50 + i, new THREE.Color('#4f8a3a'));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(a) * dist, -6 + r() * 22, Math.sin(a) * dist * 0.85);
      mesh.userData.bob = r() * 6;
      this.far.push(mesh);
      this.scene.add(mesh);
      if (!this.low && r() < 0.7) {
        const tree = new THREE.Mesh(treeGeometry(200 + i), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
        tree.scale.setScalar(s * 0.5);
        mesh.add(tree);
      }
    }
  }

  private buildCat() {
    const g = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: '#2a2830', roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.25, 4, 8), fur);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.16;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), fur);
    head.position.set(0.24, 0.27, 0);
    const earGeo = new THREE.ConeGeometry(0.035, 0.07, 4);
    const e1 = new THREE.Mesh(earGeo, fur); e1.position.set(0.24, 0.37, 0.05);
    const e2 = new THREE.Mesh(earGeo, fur); e2.position.set(0.24, 0.37, -0.05);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.1), new THREE.MeshBasicMaterial({ color: '#ffb03d' }));
    eyes.position.set(0.33, 0.28, 0);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.2, 0.16, 0), new THREE.Vector3(-0.35, 0.2, 0), new THREE.Vector3(-0.32, 0.42, 0)), 8, 0.025, 5), fur);
    g.add(body, head, e1, e2, eyes, tail);
    this.cat = this.add(g, true, false);
  }

  /** Un robot de l'équipe : arrondi, en métal peint, avec une visière vitrée et des bras qui bougent. */
  private makeBot(a: Actor): Bot {
    const g = new THREE.Group();
    const col = ROLES[a.role]?.color ?? '#9aa3b5';
    const chef = a.role === 'chef';
    const shell = new THREE.MeshPhysicalMaterial({ color: chef ? '#2e2c34' : '#eceef2', roughness: 0.28, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.15 });
    const paintMat = new THREE.MeshStandardMaterial({ color: chef ? '#ff8a3d' : col, roughness: 0.35, metalness: 0.45 });
    const joint = new THREE.MeshStandardMaterial({ color: '#3a3b42', roughness: 0.4, metalness: 0.8 });
    const visorMat = new THREE.MeshPhysicalMaterial({ color: '#06070c', roughness: 0.05, metalness: 0.3, clearcoat: 1 });
    const eyes = new THREE.MeshBasicMaterial({ color: chef ? '#ff8a3d' : col, toneMapped: false });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.18, 6, 14), paintMat);
    torso.position.y = 0.56;
    const belly = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 0.05, 2, 0.02), shell);
    belly.position.set(0, 0.56, 0.16);
    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.18, 4, 8), joint);
    legL.position.set(-0.08, 0.17, 0);
    const legR = legL.clone(); legR.position.x = 0.08;
    const mkArm = (x: number) => {
      const pivot = new THREE.Object3D();
      pivot.position.set(x, 0.7, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 4, 8), joint);
      arm.position.y = -0.16;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), shell);
      hand.position.y = -0.33;
      pivot.add(arm, hand);
      return pivot;
    };
    const armL = mkArm(-0.24), armR = mkArm(0.24);
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.34, 0.38, 4, 0.1), shell);
    head.position.y = 0.98;
    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.17, 0.04, 3, 0.015), visorMat);
    visor.position.set(0, 0.98, 0.18);
    const eyeGeo = new THREE.CapsuleGeometry(0.022, 0.03, 3, 6);
    const e1 = new THREE.Mesh(eyeGeo, eyes); e1.position.set(-0.08, 0.98, 0.205);
    const e2 = new THREE.Mesh(eyeGeo, eyes); e2.position.set(0.08, 0.98, 0.205);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), joint); ant.position.y = 1.22;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eyes); tip.position.y = 1.31;
    g.add(torso, belly, legL, legR, armL, armR, head, visor, e1, e2, ant, tip);
    g.scale.setScalar(chef ? 1.25 : 1.1);
    this.add(g, true, false);
    return { group: g, mats: [shell, paintMat, joint, visorMat, eyes], eyes, armL, armR };
  }

  // ── Chaque image ──
  setMood(tod: TimeOfDay) {
    if (this.mood === tod) return;
    this.mood = tod;
    const m = MOODS[tod];
    const u = this.sky.material.uniforms;
    u.turbidity.value = m.turbidity;
    u.rayleigh.value = m.rayleigh;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;
    const phi = THREE.MathUtils.degToRad(90 - m.elevation), theta = THREE.MathUtils.degToRad(m.azimuth);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(sunDir);
    // la lumière vient du soleil (ou de la lune, la nuit)
    const light = tod === 'night' ? new THREE.Vector3(-0.4, 0.8, 0.3).normalize() : sunDir.clone().setY(Math.max(0.15, sunDir.y)).normalize();
    this.sun.position.copy(light).multiplyScalar(80);
    this.sun.target.position.set(0, 0, 0);
    this.sun.color.set(m.sun);
    this.sun.intensity = m.sunI;
    this.hemi.color.set(m.hemiSky);
    this.hemi.groundColor.set(m.hemiGround);
    this.hemi.intensity = m.hemiI;
    (this.scene.fog as THREE.FogExp2).color.set(m.fog);
    (this.scene.fog as THREE.FogExp2).density = m.fogD;
    this.renderer.toneMappingExposure = m.exposure;
    this.bloom.strength = m.bloom;
    this.cloudMat.color.set(m.clouds);
    this.cloudMat.opacity = m.cloudO;
    (this.stars.material as THREE.PointsMaterial).opacity = m.stars;
    (this.spores.material as THREE.PointsMaterial).opacity = 0.15 + m.glow * 0.3;
    for (const g of this.glowMats) {
      if (g.userData.base === undefined) g.userData.base = g.emissiveIntensity;
      g.emissiveIntensity = g.userData.base * m.glow;
    }
    // les reflets : l'environnement est le ciel lui-même
    const skyScene = new THREE.Scene();
    const sky2 = new Sky();
    sky2.scale.setScalar(1000);
    const u2 = sky2.material.uniforms;
    for (const k of Object.keys(u)) {
      const val = u[k].value;
      u2[k].value = val && typeof val === 'object' && 'clone' in val ? (val as THREE.Vector3).clone() : val;
    }
    skyScene.add(sky2);
    this.envRT?.dispose();
    this.envRT = this.pmrem.fromScene(skyScene, 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = m.env;
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
    this.pitch = Math.max(0.2, Math.min(1.3, this.pitch + dy * 0.004));
    this.touchedAt = this.time;
  }

  /** Le point du sol (en pixels de la grille du monde) sous un point de l'écran : pour les clics et les infobulles. */
  pick(nx: number, ny: number): { x: number; y: number } | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx * 2 - 1, -(ny * 2 - 1)), this.camera);
    const hit = new THREE.Vector3();
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
    const base = 70 * Math.max(1, 1.45 / aspect);
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
    this.grassTime.value = t;
    for (const f of this.falls) f.offset.y -= dt * 0.7;
    for (const c of this.clouds) { c.position.x += dt * c.userData.drift; if (c.position.x > 110) c.position.x = -110; }
    const sp = this.spores.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) {
      let y = sp.getY(i) + dt * (0.2 + (i % 7) * 0.04);
      if (y > 10) y = -8;
      sp.setY(i, y);
    }
    sp.needsUpdate = true;
    for (const o of this.far) { o.position.y += Math.sin(t * 0.3 + o.userData.bob) * dt * 0.12; o.rotation.y += dt * 0.01; }

    // qui travaille où
    const busy = new Map<string, string>();
    for (const a of world.actors.values()) if (a.seated && a.role !== 'chef' && world.time - a.actAt < 9) busy.set(islandOf(a.role), ROLES[a.role].color);

    // le cerveau pulse, plus fort quand l'équipe travaille
    const beat = (Math.sin(t * (busy.size ? 3.2 : 1.2)) + 1) / 2;
    const glow = MOODS[tod].glow;
    this.brainMat.emissiveIntensity = (0.12 + beat * (busy.size ? 0.6 : 0.2)) * Math.min(1.2, Math.max(0.6, glow * 0.6));
    this.brain.rotation.y = Math.sin(t * 0.2) * 0.25;
    this.brain.position.y = this.brainY + Math.sin(t * 0.8) * 0.15;

    // les influx qui courent sur les cordes des ponts
    for (const p of this.pulses) {
      const col = busy.get(p.bridge.a) ?? busy.get(p.bridge.b);
      const k = (t * (col ? 0.7 : 0.2) + p.phase) % 1;
      p.curve.getPoint(k, p.mesh.position);
      p.mat.color.set(col ?? '#c8f4ff');
      p.mesh.visible = !!col || glow > 0.5;
      p.mesh.scale.setScalar(col ? 1.6 : 1);
    }

    // les écrans des bureaux : la couleur de ce que fait l'agent assis
    const atDesk = new Map<string, Actor>();
    for (const a of world.actors.values()) if (a.seated && a.seat) atDesk.set(a.seat.deskId, a);
    this.deskIds.forEach((id, i) => {
      const a = atDesk.get(id);
      const on = a && world.time - a.actAt < 9;
      this.screens.setColorAt(i, this.color.set(on && a!.act ? SCREEN[a!.act] : a ? '#6f86b8' : '#1c2436'));
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
      const gx = a.x / T, gz = seated ? a.seat!.y / T - 0.25 : a.y / T - 0.3;
      placeTile(gx, gz, 0, g.position);
      let y = g.position.y + (seated ? 0.12 : 0);
      if (a.moving) y += Math.abs(Math.sin(t * 11 + gx)) * 0.04;
      if (a.cheerUntil > world.time) y += Math.abs(Math.sin(t * 10)) * 0.15;
      if (world.musicOn && world.time < world.bobUntil && !a.moving) y += 0.02;
      g.position.y = y;
      g.rotation.y = seated ? 0 : a.dir === 'down' ? 0 : a.dir === 'up' ? Math.PI : a.dir === 'left' ? -Math.PI / 2 : Math.PI / 2;
      // les bras : ils balancent en marchant, tapent au clavier, se lèvent pour fêter ou demander
      const typing = seated && world.time - a.actAt < 9;
      let al = 0, ar = 0;
      if (a.moving) { al = Math.sin(t * 9) * 0.6; ar = -al; }
      else if (a.cheerUntil > world.time || a.asks > 0) { al = -2.6; ar = a.asks > 0 ? 0 : -2.6; }
      else if (typing) { al = -1.1 + Math.sin(t * 18) * 0.1; ar = -1.1 + Math.sin(t * 18 + 1.7) * 0.1; }
      else if (seated) { al = ar = -0.9; }
      bot.armL.rotation.x += (al - bot.armL.rotation.x) * Math.min(1, dt * 10);
      bot.armR.rotation.x += (ar - bot.armR.rotation.x) * Math.min(1, dt * 10);
      const fade = a.alpha < 0.99;
      for (const m of bot.mats) { m.transparent = fade; m.opacity = a.alpha; }
      bot.eyes.color.set(a.eyes === 'blink' ? '#111' : a.role === 'chef' ? '#ff8a3d' : ROLES[a.role].color);
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
    const grd = g.createLinearGradient(0, 0, 0, c.height);
    grd.addColorStop(0, '#141826');
    grd.addColorStop(1, '#0b0d16');
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#ff9a4d';
    g.font = '600 36px system-ui, sans-serif';
    g.fillText('Le plan', 28, 52);
    g.font = '27px system-ui, sans-serif';
    world.plan.slice(0, 6).forEach((p, i) => {
      const y = 96 + i * 32;
      g.fillStyle = p.status === 'completed' ? '#3ddc97' : p.status === 'in_progress' ? '#ff9a4d' : '#5a6070';
      g.beginPath(); g.arc(38, y - 9, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = p.status === 'completed' ? '#7d8598' : '#e8ecf6';
      const text = p.text.length > 46 ? p.text.slice(0, 45) + '…' : p.text;
      g.fillText(text, 60, y);
    });
    if (!world.plan.length) { g.fillStyle = '#8a92a8'; g.fillText('Dis à Max ce que tu veux créer.', 28, 120); }
    this.boardTex.needsUpdate = true;
  }

  dispose() {
    this.envRT?.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
