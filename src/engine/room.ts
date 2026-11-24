// Le décor de l'archipel : la mer (sa couleur suit l'heure), les îles avec leur plage, l'île cerveau
// et ses circonvolutions roses, les ponts-neurones, le ponton du port, le tableau du plan, le néon
// VibesMoney, l'horloge et la bouée des objectifs.
// Tout ça ne bouge pas : c'est dessiné une fois, puis recopié à chaque image (les reflets et les
// influx nerveux qui courent sur les ponts sont dessinés à part, à chaque image, par render.ts).
import { ROLES } from '../../shared/activity.ts';
import { pixelText, textWidth } from './font.ts';
import { BOARD, BRIDGES, CLOCK, H, ISLANDS, NEON, POSTER, T, W, ZONES, type Island } from './layout.ts';
import { darken, g2d, hline, lighten, makeCanvas, mix, P, px, rect, rng, vline, type G } from './pixels.ts';

export type TimeOfDay = 'day' | 'evening' | 'night';

/** Les couleurs de la mer : le fond, les vagues, l'écume. */
export const SEA: Record<TimeOfDay, { deep: string; mid: string; wave: string; foam: string; shore: string }> = {
  day: { deep: '#1f5f9e', mid: '#2a74b8', wave: '#4f9be0', foam: '#bfe6ff', shore: '#57b8d8' },
  evening: { deep: '#2b2458', mid: '#3a2f6e', wave: '#6a4f9a', foam: '#ffb38a', shore: '#7a5aa0' },
  night: { deep: '#0a0d24', mid: '#10163a', wave: '#1d2a5c', foam: '#7f9cff', shore: '#203070' },
};

/** La couleur de la terre de chaque île (l'herbe, teintée de la couleur du métier). */
function landColors(isl: Island, tod: TimeOfDay) {
  const dim = tod === 'day' ? 0 : tod === 'evening' ? 0.18 : 0.38;
  if (isl.role === 'chef') return { top: darken('#c76a9c', dim), dark: darken('#9e4b7c', dim), light: darken('#f0a0c8', dim), side: darken('#6e3358', dim) };
  if (isl.role === 'port') return { top: darken('#b07a4e', dim), dark: darken('#8a5a36', dim), light: darken('#d09a68', dim), side: darken('#5a3a22', dim) };
  const role = ROLES[isl.role].color;
  const grass = mix('#4f9a54', role, 0.28);
  return { top: darken(grass, dim), dark: darken(mix(grass, '#1d3a22', 0.35), dim), light: darken(lighten(grass, 0.25), dim), side: darken('#6b4a30', dim) };
}

function sea(g: G, tod: TimeOfDay) {
  const c = SEA[tod];
  const r = rng(11);
  rect(g, 0, 0, W, H, c.deep);
  // de grandes nappes plus claires
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H), w = 20 + Math.floor(r() * 60);
    rect(g, x, y, w, 3, c.mid);
    rect(g, x + 4, y - 1, w - 8, 1, c.mid);
  }
  // les petites vagues
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    hline(g, x, y, 2 + Math.floor(r() * 4), c.wave);
  }
}

/** Une île : la falaise, la plage, puis l'herbe (ou le cerveau, ou les planches du port). */
function island(g: G, isl: Island, tod: TimeOfDay) {
  const c = SEA[tod];
  const lc = landColors(isl, tod);
  const x = isl.x * T, y = isl.y * T, w = isl.w * T, h = isl.h * T;
  const r = rng(isl.x * 13 + isl.y * 7);
  // le haut-fond clair autour de l'île
  rect(g, x - 6, y - 4, w + 12, h + 12, mix(c.mid, c.shore, 0.5));
  rect(g, x - 4, y - 6, w + 8, h + 16, mix(c.mid, c.shore, 0.5));
  // l'écume
  hline(g, x - 4, y - 5, w + 8, c.foam);
  hline(g, x - 4, y + h + 9, w + 8, c.foam);
  vline(g, x - 6, y - 3, h + 10, c.foam);
  vline(g, x + w + 5, y - 3, h + 10, c.foam);
  // la plage
  const sand = tod === 'night' ? '#8c7c5a' : tod === 'evening' ? '#c9a070' : '#e9cf8f';
  rect(g, x - 3, y - 3, w + 6, h + 8, sand);
  rect(g, x - 2, y - 4, w + 4, h + 10, sand);
  for (let i = 0; i < 30; i++) px(g, x - 3 + Math.floor(r() * (w + 6)), y + h + Math.floor(r() * 5), darken(sand, 0.15));
  // la falaise (l'épaisseur de l'île, vue en 3/4)
  rect(g, x, y + h, w, 4, lc.side);
  hline(g, x, y + h + 4, w, darken(lc.side, 0.3));
  // la terre, aux coins arrondis
  rect(g, x, y, w, h, lc.top);
  hline(g, x + 3, y, w - 6, lc.light);
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [2, 0], [0, 2]]) px(g, cx + dx * sx, cy + dy * sy, sand);
  }
  if (isl.role === 'chef') {
    // les circonvolutions du cerveau, en lignes roses sinueuses
    for (let row = 0; row < h; row += 7) {
      let yy = y + row + 3;
      for (let xx = x + 2; xx < x + w - 2; xx++) {
        yy += Math.sin((xx + row * 3) * 0.35) > 0.55 ? 1 : Math.sin((xx + row * 3) * 0.35) < -0.55 ? -1 : 0;
        yy = Math.max(y + row + 1, Math.min(y + row + 6, yy));
        px(g, xx, yy, lc.dark);
        if ((xx + row) % 9 === 0) px(g, xx, yy - 1, lc.light);
      }
    }
    // la scissure du milieu
    for (let yy = y + 2; yy < y + h - 2; yy++) px(g, x + w / 2 + (Math.sin(yy * 0.5) > 0 ? 0 : 1), yy, darken(lc.dark, 0.2));
  } else if (isl.role === 'port') {
    // des planches
    for (let yy = y; yy < y + h; yy += 5) {
      hline(g, x, yy + 4, w, lc.dark);
      let xx = x - Math.floor(r() * 12);
      while (xx < x + w) { xx += 14 + Math.floor(r() * 16); if (xx < x + w) vline(g, xx, yy, 4, lc.dark); }
    }
  } else {
    // des touffes d'herbe et quelques fleurs
    for (let i = 0; i < 40; i++) {
      const gx = x + Math.floor(r() * w), gy = y + Math.floor(r() * h);
      px(g, gx, gy, r() < 0.5 ? lc.dark : lc.light);
      if (r() < 0.12) px(g, gx, gy - 1, r() < 0.5 ? '#ffe07a' : '#ff9ec7');
    }
    // un sentier clair le long de la colonne de passage
    rect(g, isl.lane * T + 4, y + 1, 8, h - 2, mix(lc.top, sand, 0.45));
  }
}

/** Un palmier, planté sur la plage (décor seulement : on ne marche pas dessus). */
function palm(g: G, x: number, y: number, tod: TimeOfDay, flip: boolean) {
  const dim = tod === 'day' ? 0 : tod === 'evening' ? 0.2 : 0.45;
  const trunk = darken('#8a5a36', dim), leaf = darken('#3faa5a', dim), leaf2 = darken('#2a7a40', dim);
  for (let i = 0; i < 12; i++) px(g, x + (flip ? -1 : 1) * Math.floor(i / 4), y - i, i % 3 ? trunk : darken(trunk, 0.25));
  const tx = x + (flip ? -3 : 3), ty = y - 12;
  for (const [dx, dy] of [[-6, 1], [-5, 0], [-4, -1], [-3, -1], [-2, -2], [2, -2], [3, -1], [4, -1], [5, 0], [6, 1], [-1, -3], [0, -3], [1, -3]]) px(g, tx + dx, ty + dy, leaf);
  for (const [dx, dy] of [[-6, 2], [6, 2], [-4, 0], [4, 0], [0, -2]]) px(g, tx + dx, ty + dy, leaf2);
  px(g, tx, ty, darken('#6b4a30', dim));
}

/** Les ponts-neurones : un tablier sombre, bordé de deux fibres lumineuses. */
function bridges(g: G, tod: TimeOfDay) {
  const fiber = tod === 'day' ? '#7fd6ff' : '#9a7bff';
  const deck = tod === 'day' ? '#3b3550' : '#221d36';
  for (const b of BRIDGES) {
    const xs = b.tiles.map((t) => t[0]), ys = b.tiles.map((t) => t[1]);
    const x0 = Math.min(...xs) * T, y0 = Math.min(...ys) * T;
    const w = (Math.max(...xs) - Math.min(...xs) + 1) * T, h = (Math.max(...ys) - Math.min(...ys) + 1) * T;
    const pier = b.b === 'mer';
    // le tablier dépasse un peu sur les plages, pour bien s'accrocher aux îles
    const ex = b.dir === 'h' ? 4 : 0, ey = b.dir === 'v' ? 4 : 0;
    const bx = x0 - ex + (b.dir === 'v' ? 3 : 0), by = y0 - ey + (b.dir === 'h' ? 4 : 0);
    const bw = w + ex * 2 - (b.dir === 'v' ? 6 : 0), bh = h + ey * 2 - (b.dir === 'h' ? 6 : 0);
    rect(g, bx, by + 2, bw, bh, 'rgba(0,0,0,0.25)');
    rect(g, bx, by, bw, bh, pier ? '#8a5a36' : deck);
    if (pier) {
      for (let yy = by + 3; yy < by + bh; yy += 4) hline(g, bx, yy, bw, '#5a3a22');
      for (const xx of [bx, bx + bw - 2]) rect(g, xx, by + bh - 2, 2, 6, '#5a3a22');
      continue;
    }
    // les deux fibres, et des petits nœuds (les synapses)
    if (b.dir === 'h') {
      hline(g, bx, by, bw, fiber);
      hline(g, bx, by + bh - 1, bw, fiber);
      for (let xx = bx + 3; xx < bx + bw - 2; xx += 6) px(g, xx, by + Math.floor(bh / 2), mix(fiber, deck, 0.4));
    } else {
      vline(g, bx, by, bh, fiber);
      vline(g, bx + bw - 1, by, bh, fiber);
      for (let yy = by + 3; yy < by + bh - 2; yy += 6) px(g, bx + Math.floor(bw / 2), yy, mix(fiber, deck, 0.4));
    }
  }
}

/** Le tableau du plan : un grand écran blanc sur deux pieds, à l'arrière de l'île cerveau. */
function whiteboard(g: G) {
  const { x, y, w, h } = BOARD;
  // les pieds
  for (const lx of [x + 10, x + w - 12]) { rect(g, lx, y + h, 2, 14, '#4a4560'); vline(g, lx, y + h, 14, '#625c7c'); }
  rect(g, x - 2, y - 2, w + 4, h + 4, '#7a7e93');
  rect(g, x - 1, y - 1, w + 2, h + 2, '#c2c5d4');
  hline(g, x - 1, y - 1, w + 2, '#e6e8f0');
  rect(g, x, y, w, h, '#f4f5f9');
  for (let i = 0; i < 18; i++) px(g, x + w - 30 + i, y + 2 + Math.floor(i / 2), '#ffffff');
  rect(g, x + 4, y + h + 2, w - 8, 2, '#8a8ea2');
  hline(g, x + 4, y + h + 2, w - 8, '#b3b6c6');
  rect(g, x + 12, y + h + 1, 5, 1, '#e5484d');
  rect(g, x + 19, y + h + 1, 5, 1, '#3d8ad1');
  rect(g, x + 26, y + h + 1, 5, 1, '#2b2836');
  pixelText(g, 'LE PLAN', x + 4, y + 3, P.orangeDark);
  hline(g, x + 4, y + 9, textWidth('LE PLAN'), P.orange);
}

/** Les écriteaux, posés sur l'eau au-dessus de chaque île, avec le nombre d'agents au travail. */
export function signs(g: G, busy: (role: string) => number) {
  for (const z of ZONES) {
    const n = busy(z.role);
    const label = z.label + (n > 0 && z.role !== 'chef' ? ` ${n}` : '');
    const color = ROLES[z.role].color;
    const w = textWidth(label) + 6;
    const x = z.sx, y = z.sy;
    rect(g, x + 1, y, w - 2, 9, '#120f19');
    rect(g, x, y + 1, w, 7, '#120f19');
    hline(g, x + 1, y, w - 2, mix(color, '#120f19', 0.45));
    pixelText(g, label, x + 3, y + 2, lighten(color, 0.15));
  }
}

/** Le néon : la tête du robot VibesMoney, en tubes de couleur (orange par défaut), sur une bouée. */
export function neon(g: G, tube: string, core: string) {
  const { x, y } = NEON;
  vline(g, x + 12, y, 3, tube);
  rect(g, x + 11, y - 2, 3, 2, tube);
  rect(g, x + 1, y + 3, 23, 1, tube);
  rect(g, x + 1, y + 20, 23, 1, tube);
  rect(g, x + 1, y + 3, 1, 18, tube);
  rect(g, x + 23, y + 3, 1, 18, tube);
  hline(g, x + 2, y + 4, 21, core);
  rect(g, x + 5, y + 8, 15, 1, tube);
  rect(g, x + 5, y + 15, 15, 1, tube);
  rect(g, x + 5, y + 8, 1, 8, tube);
  rect(g, x + 19, y + 8, 1, 8, tube);
  rect(g, x + 8, y + 10, 3, 3, core);
  rect(g, x + 14, y + 10, 3, 3, core);
}

function buoy(g: G, x: number, y: number, w: number) {
  rect(g, x, y, w, 3, '#e5484d');
  hline(g, x, y, w, '#ff8a8a');
  rect(g, x + 2, y + 3, w - 4, 2, '#f2f0f7');
}

function clockFace(g: G) {
  const { x, y } = CLOCK;
  buoy(g, x - 1, y + 14, 16);
  rect(g, x + 3, y, 8, 14, '#2b2836');
  rect(g, x, y + 3, 14, 8, '#2b2836');
  rect(g, x + 1, y + 1, 12, 12, '#2b2836');
  rect(g, x + 2, y + 2, 10, 10, '#f2f0f7');
  rect(g, x + 4, y + 1, 6, 12, '#f2f0f7');
  rect(g, x + 1, y + 4, 12, 6, '#f2f0f7');
  px(g, x + 7, y + 2, '#2b2836');
  px(g, x + 7, y + 11, '#2b2836');
  px(g, x + 2, y + 7, '#2b2836');
  px(g, x + 11, y + 7, '#2b2836');
}

function poster(g: G) {
  const { x, y } = POSTER;
  buoy(g, x - 2, y + 13, 14);
  rect(g, x, y, 10, 14, '#c08a57');
  rect(g, x + 1, y + 1, 8, 12, '#16121f');
  const pts = [[2, 10], [3, 9], [4, 9], [5, 7], [6, 6], [7, 4], [8, 3]];
  for (const [px_, py_] of pts) px(g, x + px_, y + py_, P.orange);
  px(g, x + 8, y + 2, P.orangeLight);
}

/** Dessine tout l'archipel (sans les meubles) dans une image de la taille du studio. */
export function drawRoom(tod: TimeOfDay): HTMLCanvasElement {
  const c = makeCanvas(W, H);
  const g = g2d(c);
  sea(g, tod);
  for (const isl of ISLANDS) island(g, isl, tod);
  bridges(g, tod);
  // des palmiers sur le bord extérieur de la couronne
  for (const isl of ISLANDS) {
    if (isl.role === 'chef' || isl.role === 'port') continue;
    const left = isl.x * T < W / 2;
    if (isl.x !== 1 && (isl.x + isl.w) * T < W - T * 2) continue;
    palm(g, left ? isl.x * T - 2 : (isl.x + isl.w) * T + 1, (isl.y + isl.h) * T + 4, tod, left);
  }
  whiteboard(g);
  clockFace(g);
  poster(g);
  // la bouée du néon
  buoy(g, NEON.x - 1, NEON.y + 21, 27);
  return c;
}
