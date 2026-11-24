// Le plan de l'archipel : une grille de 28 × 19 cases de 16 pixels, vue de dessus (en 3/4, comme dans
// les jeux en pixel art). Chaque spécialité a son île, avec ses bureaux et ses chaises ; au centre,
// l'île cerveau de Max (le tableau du plan, son bureau et le contrôle qualité). Des ponts lumineux,
// comme des neurones, relient les îles entre elles et au cerveau. En bas, le port : c'est par son
// ponton qu'arrive l'équipe, et c'est là qu'on se pose (café, jukebox, canapé du chat).
import type { Role } from '../../shared/protocol.ts';

export const T = 16;
export const COLS = 28;
export const ROWS = 19;
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

/** Une île : sa terre (en cases), et son nom. */
export interface Island { id: string; role: Role | 'port'; label: string; x: number; y: number; w: number; h: number }

export const ISLANDS: Island[] = [
  { id: 'veille', role: 'recherche', label: 'VEILLE', x: 1, y: 1, w: 7, h: 5 },
  { id: 'scripts', role: 'redaction', label: 'SCRIPTS', x: 10, y: 1, w: 8, h: 5 },
  { id: 'son', role: 'son', label: 'SON · SFX', x: 20, y: 1, w: 7, h: 5 },
  { id: 'montage', role: 'montage', label: 'MONTAGE · VFX', x: 1, y: 7, w: 7, h: 5 },
  { id: 'cerveau', role: 'chef', label: 'LE CERVEAU', x: 10, y: 7, w: 8, h: 5 },
  { id: 'graphisme', role: 'design', label: 'GRAPHISME', x: 20, y: 7, w: 7, h: 5 },
  { id: 'code', role: 'code', label: 'CODE · DATA', x: 1, y: 13, w: 7, h: 5 },
  { id: 'port', role: 'port', label: 'LE PORT', x: 10, y: 13, w: 8, h: 5 },
  { id: 'reseaux', role: 'social', label: 'RÉSEAUX', x: 20, y: 13, w: 7, h: 5 },
];

/**
 * Les ponts (les « neurones ») : des cases de passage au-dessus de l'eau.
 * a et b : les îles reliées (pour les faire briller quand l'une d'elles travaille).
 */
export interface Bridge { a: string; b: string; tiles: [number, number][]; dir: 'h' | 'v' }

export const BRIDGES: Bridge[] = [
  { a: 'veille', b: 'scripts', tiles: [[8, 3], [9, 3]], dir: 'h' },
  { a: 'scripts', b: 'son', tiles: [[18, 3], [19, 3]], dir: 'h' },
  { a: 'scripts', b: 'cerveau', tiles: [[17, 6]], dir: 'v' },
  { a: 'veille', b: 'montage', tiles: [[7, 6]], dir: 'v' },
  { a: 'son', b: 'graphisme', tiles: [[20, 6]], dir: 'v' },
  { a: 'montage', b: 'cerveau', tiles: [[8, 9], [9, 9]], dir: 'h' },
  { a: 'cerveau', b: 'graphisme', tiles: [[18, 9], [19, 9]], dir: 'h' },
  { a: 'cerveau', b: 'port', tiles: [[13, 12], [14, 12]], dir: 'v' },
  { a: 'montage', b: 'code', tiles: [[7, 12]], dir: 'v' },
  { a: 'graphisme', b: 'reseaux', tiles: [[20, 12]], dir: 'v' },
  { a: 'code', b: 'port', tiles: [[8, 14], [9, 14]], dir: 'h' },
  { a: 'port', b: 'reseaux', tiles: [[18, 14], [19, 14]], dir: 'h' },
  // le ponton du port : c'est par là qu'arrive l'équipe
  { a: 'port', b: 'mer', tiles: [[13, 18], [14, 18]], dir: 'v' },
];

export interface Zone { role: Role; label: string; x: number; y: number; w: number; h: number; /** l'écriteau (en pixels) */ sx: number; sy: number }

/** Les métiers et leur écriteau (posé sur l'eau, au-dessus de leur île). */
export const ZONES: Zone[] = ISLANDS.filter((i) => i.role !== 'port' && i.role !== 'chef').map((i) => ({
  role: i.role as Role, label: i.label, x: i.x, y: i.y, w: i.w, h: i.h,
  sx: i.x * T + 2, sy: i.y * T - 12,
}));
// l'île cerveau : Max, et le contrôle qualité (leurs écriteaux sous l'île, de part et d'autre du pont)
ZONES.push({ role: 'chef', label: 'CERVEAU', x: 10, y: 7, w: 8, h: 5, sx: 10 * T + 1, sy: 12 * T + 3 });
ZONES.push({ role: 'qualite', label: 'QUALITÉ', x: 15, y: 10, w: 3, h: 2, sx: 15 * T + 2, sy: 12 * T + 3 });

export const islandOf = (role: Role) => ISLANDS.find((i) => i.role === role)?.id ?? (role === 'qualite' ? 'cerveau' : 'port');

const furn: Furn[] = [];
const seats: Seat[] = [];

function desk(role: Role, tx: number, ty: number) {
  const id = `desk-${role}-${tx}-${ty}`;
  furn.push({ id, kind: 'desk', tx, ty, w: 2, h: 1, role, seed: tx * 31 + ty });
  furn.push({ id: `chair-${id}`, kind: 'chair', tx, ty: ty - 1, w: 0, h: 0, role });
  seats.push({ id: `seat-${id}`, role, tile: [tx, ty - 1], x: (tx + 1) * T, y: ty * T - 1, deskId: id });
}

// Six bureaux par île (deux rangées de trois). Une colonne reste libre pour passer et rejoindre les ponts.
for (const isl of ISLANDS) {
  if (isl.role === 'port' || isl.role === 'chef') continue;
  const left = isl.x === 1 ? 1 : isl.x === 10 ? 11 : 21;
  for (const dy of [2, 4]) for (const k of [0, 2, 4]) desk(isl.role, left + k, isl.y + dy);
}

// L'île cerveau : Max face à toi, le tableau du plan derrière lui, et le contrôle qualité à côté
furn.push({ id: 'chefDesk', kind: 'chefDesk', tx: 12, ty: 9, w: 4, h: 1, role: 'chef' });
furn.push({ id: 'chefChair', kind: 'chefChair', tx: 13, ty: 8, w: 0, h: 0, role: 'chef' });
export const CHEF_SEAT: Seat = { id: 'seat-chef', role: 'chef', tile: [13, 8], x: 14 * T, y: 9 * T - 1, deskId: 'chefDesk' };
desk('qualite', 10, 11);
desk('qualite', 16, 11);

// Le port : le salon de l'équipe
furn.push({ id: 'jukebox', kind: 'jukebox', tx: 10, ty: 13, w: 2, h: 1 });
furn.push({ id: 'coffee', kind: 'coffee', tx: 15, ty: 13, w: 3, h: 1 });
furn.push({ id: 'cooler', kind: 'cooler', tx: 12, ty: 15, w: 1, h: 1 });
furn.push({ id: 'printer', kind: 'printer', tx: 16, ty: 15, w: 1, h: 1 });
furn.push({ id: 'rack', kind: 'rack', tx: 17, ty: 15, w: 1, h: 1 });
furn.push({ id: 'sofa', kind: 'sofa', tx: 10, ty: 17, w: 3, h: 1 });
furn.push({ id: 'tableLow', kind: 'tableLow', tx: 10, ty: 16, w: 2, h: 0 });
furn.push({ id: 'lamp', kind: 'lamp', tx: 10, ty: 15, w: 1, h: 1 });
furn.push({ id: 'shelf', kind: 'shelf', tx: 15, ty: 17, w: 2, h: 1 });
furn.push({ id: 'lamp-r', kind: 'lamp', tx: 17, ty: 17, w: 1, h: 1 });
furn.push({ id: 'bin', kind: 'bin', tx: 17, ty: 16, w: 0, h: 0 });

export const FURNITURE = furn;
export const SEATS = seats;

const px = (t: [number, number]) => ({ x: t[0] * T + 8, y: t[1] * T + 13 });

/** Les points de passage importants. Les pieds d'un robot debout sur une case : (x*16+8, y*16+13). */
export const SPOTS = {
  door: [13, 17] as [number, number],
  doorOut: { x: 14 * T, y: H + 6 },
  /** là où Max t'accueille, et où il te présente le rendu */
  reception: [13, 15] as [number, number],
  receptionPx: { x: 14 * T, y: 15 * T + 13 },
  /** devant le tableau du plan */
  board: [12, 8] as [number, number],
  boardPx: px([12, 8]),
  /** devant le bureau du chef : on y rend son rapport */
  deliver: [[12, 10], [13, 10], [14, 10], [15, 10], [12, 11], [15, 11]] as [number, number][],
  /** pour ceux qui n'ont pas de bureau libre : sur le port et au bord des îles */
  overflow: [[12, 14], [15, 14], [13, 16], [14, 16], [7, 1], [10, 1], [17, 1], [20, 1], [7, 7], [20, 7], [7, 13], [20, 13], [10, 7], [14, 14]] as [number, number][],
};

/** Le tableau du plan : un grand écran posé à l'arrière de l'île cerveau (en pixels). */
export const BOARD = { x: 11 * T, y: 7 * T - 10, w: 96, h: 35 };
/** Pas de fenêtres sur l'archipel : c'est la mer (et le ciel qui s'y reflète) qui dit l'heure. */
export const WINDOWS: { x: number; y: number; w: number; h: number }[] = [];
/** Le néon VibesMoney, qui flotte entre les îles (en haut à gauche du cerveau). */
export const NEON = { x: 8 * T + 3, y: 6 * T + 4 };
export const CLOCK = { x: 18 * T + 9, y: 6 * T + 5 };
export const POSTER = { x: 8 * T + 11, y: 12 * T + 1, w: 10, h: 14 };
export const DOOR = { x: 13 * T, y: 18 * T, w: 32, h: 16 };

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
  beamY: 18 * T + 10,
  /** le centre de l'archipel */
  center: { x: 14 * T, y: 9 * T + 8 },
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
  for (let x = 11; x <= 16; x++) g[7][x] = false;
  for (const f of FURNITURE) {
    for (let y = f.ty; y < f.ty + f.h; y++) for (let x = f.tx; x < f.tx + f.w; x++) if (g[y]?.[x] !== undefined) g[y][x] = false;
  }
  return g;
}

export const tileFeet = (t: [number, number]) => ({ x: t[0] * T + 8, y: t[1] * T + 13 });
