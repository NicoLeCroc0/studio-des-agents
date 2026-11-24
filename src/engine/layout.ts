// Le plan de l'archipel : une grille de 36 × 25 cases de 16 pixels, vue de dessus (en 3/4, comme dans
// les jeux en pixel art). Au centre, le grand cerveau de Max (le tableau du plan, son bureau et le
// laboratoire du contrôle qualité). Autour, une couronne de douze îles : une par spécialité, plus le port.
// Des ponts lumineux, comme des neurones, relient les îles entre elles et au cerveau. Le port, en bas :
// c'est par son ponton qu'arrive l'équipe, et c'est là qu'on se pose (café, jukebox, canapé du chat).
import type { Role } from '../../shared/protocol.ts';

export const T = 16;
export const COLS = 36;
export const ROWS = 25;
export const W = COLS * T;
export const H = ROWS * T;

export type FurnKind =
  | 'desk' | 'chefDesk' | 'chair' | 'chefChair' | 'plantBig' | 'plantTall' | 'plantSmall' | 'rack' | 'printer'
  | 'cooler' | 'coffee' | 'sofa' | 'tableLow' | 'shelf' | 'lamp' | 'easel' | 'bin' | 'jukebox';

export interface Furn {
  id: string;
  kind: FurnKind;
  /** case en haut à gauche de l'emprise au sol */
  tx: number;
  ty: number;
  /** emprise au sol, en cases (bloque le passage) */
  w: number;
  h: number;
  role?: Role;
  seed?: number;
}

export interface Seat {
  id: string;
  role: Role;
  /** la case où le robot s'arrête avant de s'asseoir */
  tile: [number, number];
  /** les pieds du robot une fois assis (en pixels) */
  x: number;
  y: number;
  deskId: string;
}

/**
 * Une île : sa terre (en cases), son nom, et sa colonne de passage (`lane`, toujours libre de bureaux :
 * c'est par elle que les ponts verticaux arrivent).
 */
export interface Island { id: string; role: Role | 'port'; label: string; x: number; y: number; w: number; h: number; lane: number }

// La couronne : 12 îles de 7 × 5 cases autour du grand cerveau (4 × 4 emplacements, le cerveau prend les 4 du milieu).
const CX = [1, 10, 19, 28];
const CY = [1, 7, 13, 19];
const ring = (id: string, role: Role | 'port', label: string, c: number, r: number, laneLeft = false): Island =>
  ({ id, role, label, x: CX[c], y: CY[r], w: 7, h: 5, lane: laneLeft ? CX[c] : CX[c] + 6 });

export const ISLANDS: Island[] = [
  ring('veille', 'recherche', 'VEILLE', 0, 0),
  ring('scripts', 'redaction', 'SCRIPTS', 1, 0, true),
  ring('tournage', 'tournage', 'TOURNAGE', 2, 0),
  ring('voix', 'voix', 'VOIX · DOUBLAGE', 3, 0),
  ring('stats', 'stats', 'STATS · CROISSANCE', 0, 1),
  ring('son', 'son', 'SON · SFX', 3, 1),
  ring('code', 'code', 'CODE', 0, 2),
  ring('montage', 'montage', 'MONTAGE · VFX', 3, 2),
  ring('reseaux', 'social', 'RÉSEAUX', 0, 3),
  ring('port', 'port', 'LE PORT', 1, 3, true),
  ring('miniatures', 'miniatures', 'MINIATURES · TESTS', 2, 3),
  ring('graphisme', 'design', 'GRAPHISME', 3, 3),
  // le cerveau : les quatre emplacements du milieu (et l'eau entre eux)
  { id: 'cerveau', role: 'chef', label: 'LE CERVEAU', x: 10, y: 7, w: 16, h: 11, lane: 10 },
];

/**
 * Les ponts (les « neurones ») : des cases de passage au-dessus de l'eau.
 * a et b : les îles reliées (pour les faire briller quand l'une d'elles travaille).
 */
export interface Bridge { a: string; b: string; tiles: [number, number][]; dir: 'h' | 'v' }

const h = (a: string, b: string, x: number, y: number): Bridge => ({ a, b, tiles: [[x, y], [x + 1, y]], dir: 'h' });
const v = (a: string, b: string, x: number, y: number): Bridge => ({ a, b, tiles: [[x, y]], dir: 'v' });

export const BRIDGES: Bridge[] = [
  // la couronne
  h('veille', 'scripts', 8, 1), h('scripts', 'tournage', 17, 1), h('tournage', 'voix', 26, 1),
  h('reseaux', 'port', 8, 19), h('port', 'miniatures', 17, 19), h('miniatures', 'graphisme', 26, 19),
  v('veille', 'stats', 7, 6), v('stats', 'code', 7, 12), v('code', 'reseaux', 7, 18),
  v('voix', 'son', 34, 6), v('son', 'montage', 34, 12), v('montage', 'graphisme', 34, 18),
  // les huit neurones qui partent du cerveau
  v('scripts', 'cerveau', 10, 6), v('tournage', 'cerveau', 25, 6),
  h('stats', 'cerveau', 8, 7), h('code', 'cerveau', 8, 13),
  h('cerveau', 'son', 26, 7), h('cerveau', 'montage', 26, 13),
  v('cerveau', 'port', 10, 18), v('cerveau', 'miniatures', 25, 18),
  // le ponton du port : c'est par là qu'arrive l'équipe
  { a: 'port', b: 'mer', tiles: [[13, 24], [14, 24]], dir: 'v' },
];

export interface Zone { role: Role; label: string; x: number; y: number; w: number; h: number; /** l'écriteau (en pixels) */ sx: number; sy: number }

/** Les métiers et leur écriteau (posé sur l'eau, au-dessus de leur île). */
export const ZONES: Zone[] = ISLANDS.filter((i) => i.role !== 'port' && i.role !== 'chef').map((i) => ({
  role: i.role as Role, label: i.label, x: i.x, y: i.y, w: i.w, h: i.h,
  sx: i.x * T + 2, sy: i.y * T - 12,
}));
// l'île cerveau : Max (écriteau au-dessus), et le laboratoire du contrôle qualité (dans le bas du cerveau)
ZONES.push({ role: 'chef', label: 'CERVEAU', x: 10, y: 7, w: 16, h: 11, sx: 11 * T + 4, sy: 6 * T + 3 });
ZONES.push({ role: 'qualite', label: 'LABO QUALITÉ', x: 13, y: 13, w: 10, h: 2, sx: 16 * T + 4, sy: 15 * T + 4 });

export const islandOf = (role: Role) => ISLANDS.find((i) => i.role === role)?.id ?? (role === 'qualite' ? 'cerveau' : 'port');

const furn: Furn[] = [];
const seats: Seat[] = [];

function desk(role: Role, tx: number, ty: number) {
  const id = `desk-${role}-${tx}-${ty}`;
  furn.push({ id, kind: 'desk', tx, ty, w: 2, h: 1, role, seed: tx * 31 + ty });
  furn.push({ id: `chair-${id}`, kind: 'chair', tx, ty: ty - 1, w: 0, h: 0, role });
  seats.push({ id: `seat-${id}`, role, tile: [tx, ty - 1], x: (tx + 1) * T, y: ty * T - 1, deskId: id });
}

// Six bureaux par île (deux rangées de trois). La colonne de passage reste libre pour rejoindre les ponts.
for (const isl of ISLANDS) {
  if (isl.role === 'port' || isl.role === 'chef') continue;
  const left = isl.lane === isl.x ? isl.x + 1 : isl.x;
  for (const dy of [2, 4]) for (const k of [0, 2, 4]) desk(isl.role, left + k, isl.y + dy);
}

// L'île cerveau : le tableau du plan, Max face à toi, et en dessous le laboratoire du contrôle qualité
furn.push({ id: 'chefDesk', kind: 'chefDesk', tx: 16, ty: 9, w: 4, h: 1, role: 'chef' });
furn.push({ id: 'chefChair', kind: 'chefChair', tx: 17, ty: 8, w: 0, h: 0, role: 'chef' });
export const CHEF_SEAT: Seat = { id: 'seat-chef', role: 'chef', tile: [17, 8], x: 18 * T, y: 9 * T - 1, deskId: 'chefDesk' };
for (const tx of [14, 16, 18, 20]) desk('qualite', tx, 14);
for (const [i, tx, ty, kind] of [[1, 11, 8, 'plantBig'], [2, 24, 8, 'plantTall'], [3, 11, 16, 'plantTall'], [4, 24, 16, 'plantBig']] as const) {
  furn.push({ id: `plant-cerveau-${i}`, kind, tx, ty, w: 1, h: 1, seed: i * 7 });
}

// Le port : le salon de l'équipe
furn.push({ id: 'jukebox', kind: 'jukebox', tx: 11, ty: 20, w: 2, h: 1 });
furn.push({ id: 'coffee', kind: 'coffee', tx: 14, ty: 20, w: 3, h: 1 });
furn.push({ id: 'cooler', kind: 'cooler', tx: 11, ty: 21, w: 1, h: 1 });
furn.push({ id: 'printer', kind: 'printer', tx: 15, ty: 21, w: 1, h: 1 });
furn.push({ id: 'rack', kind: 'rack', tx: 16, ty: 21, w: 1, h: 1 });
furn.push({ id: 'sofa', kind: 'sofa', tx: 10, ty: 23, w: 3, h: 1 });
furn.push({ id: 'tableLow', kind: 'tableLow', tx: 11, ty: 22, w: 2, h: 0 });
furn.push({ id: 'lamp', kind: 'lamp', tx: 10, ty: 22, w: 1, h: 1 });
furn.push({ id: 'shelf', kind: 'shelf', tx: 15, ty: 23, w: 2, h: 1 });
furn.push({ id: 'lamp-r', kind: 'lamp', tx: 16, ty: 22, w: 1, h: 1 });
furn.push({ id: 'bin', kind: 'bin', tx: 12, ty: 21, w: 0, h: 0 });

export const FURNITURE = furn;
export const SEATS = seats;

const px = (t: [number, number]) => ({ x: t[0] * T + 8, y: t[1] * T + 13 });

/** Les points de passage importants. Les pieds d'un robot debout sur une case : (x*16+8, y*16+13). */
export const SPOTS = {
  door: [13, 23] as [number, number],
  doorOut: { x: 14 * T, y: H + 6 },
  /** là où Max t'accueille, et où il te présente le rendu */
  reception: [13, 21] as [number, number],
  receptionPx: { x: 14 * T, y: 21 * T + 13 },
  /** devant le tableau du plan */
  board: [15, 8] as [number, number],
  boardPx: px([15, 8]),
  /** devant le bureau du chef : on y rend son rapport */
  deliver: [[16, 10], [17, 10], [18, 10], [19, 10], [16, 11], [19, 11]] as [number, number][],
  /** pour ceux qui n'ont pas de bureau libre : dans le cerveau, sur le port et au bord des îles */
  overflow: [[12, 11], [23, 11], [13, 16], [22, 16], [12, 19], [15, 19], [13, 22], [14, 22],
    [7, 1], [10, 1], [25, 1], [34, 1], [7, 7], [28, 7], [7, 13], [28, 13], [7, 19], [25, 19], [34, 19]] as [number, number][],
};

/** Le tableau du plan : un grand écran posé à l'arrière de l'île cerveau (en pixels). */
export const BOARD = { x: 15 * T, y: 7 * T - 10, w: 96, h: 35 };
/** Pas de fenêtres sur l'archipel : c'est la mer (et le ciel qui s'y reflète) qui dit l'heure. */
export const WINDOWS: { x: number; y: number; w: number; h: number }[] = [];
/** Le néon VibesMoney, qui flotte entre les îles du haut. */
export const NEON = { x: 17 * T + 3, y: 2 * T + 6 };
export const CLOCK = { x: 17 * T + 9, y: 20 * T + 6 };
export const POSTER = { x: 8 * T + 11, y: 3 * T, w: 10, h: 14 };
export const DOOR = { x: 13 * T, y: 24 * T, w: 32, h: 16 };

/** Les endroits où l'on fait quelque chose (en pixels), dérivés des meubles. */
const at = (id: string) => FURNITURE.find((f) => f.id === id)!;
export const PTS = {
  /** la corbeille des rapports, sur le bureau du chef */
  inbox: { x: at('chefDesk').tx * T + 52, y: at('chefDesk').ty * T - 2 },
  printer: { x: at('printer').tx * T + 8, y: at('printer').ty * T - 4 },
  steam: { x: at('coffee').tx * T + 11, y: (at('coffee').ty - 1) * T + 4 },
  notes: { x: at('jukebox').tx * T + 10, y: (at('jukebox').ty - 1) * T + 2 },
  cooler: { x: at('cooler').tx * T + 8, y: (at('cooler').ty - 1) * T + 4 },
  lampL: { x: at('lamp').tx * T + 8, y: at('lamp').ty * T - 12 },
  lampR: { x: at('lamp-r').tx * T + 8, y: at('lamp-r').ty * T - 12 },
  chefLamp: { x: at('chefDesk').tx * T + 12, y: at('chefDesk').ty * T - 6 },
  chefGlow: { x: CHEF_SEAT.x, y: at('chefDesk').ty * T + 14 },
  rack: { x: at('rack').tx * T + 4, y: at('rack').ty * T - 10 },
  /** l'endroit où l'équipe apparaît (le bout du ponton) */
  beamY: 24 * T + 10,
  /** le centre de l'archipel */
  center: { x: 18 * T, y: 12 * T + 8 },
};

/** La grille des cases où l'on peut marcher : la terre des îles et les ponts. */
export function walkGrid(): boolean[][] {
  const g: boolean[][] = [];
  for (let y = 0; y < ROWS; y++) {
    g.push([]);
    for (let x = 0; x < COLS; x++) g[y].push(ISLANDS.some((i) => x >= i.x && x < i.x + i.w && y >= i.y && y < i.y + i.h));
  }
  for (const b of BRIDGES) for (const [x, y] of b.tiles) g[y][x] = true;
  // le pied du tableau du plan
  for (let x = 15; x <= 20; x++) g[7][x] = false;
  for (const f of FURNITURE) {
    for (let y = f.ty; y < f.ty + f.h; y++) for (let x = f.tx; x < f.tx + f.w; x++) if (g[y]?.[x] !== undefined) g[y][x] = false;
  }
  return g;
}

export const tileFeet = (t: [number, number]) => ({ x: t[0] * T + 8, y: t[1] * T + 13 });
