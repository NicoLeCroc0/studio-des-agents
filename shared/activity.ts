// Les métiers du bureau, et la traduction en français de ce que fait vraiment chaque agent :
// chaque outil de Claude Code devient une action (une icône, une animation, une bulle).
import type { ActKind, MissionStats, OfficeEvent, Role } from './protocol.ts';

export interface RoleInfo {
  /** le nom du métier, tel qu'il s'affiche dans le bureau */
  label: string;
  icon: string;
  color: string;
  /** l'agent Claude Code (subagent_type) qui fait ce métier */
  type: string;
  what: string;
}

export const ROLES: Record<Role, RoleInfo> = {
  chef: { label: 'Le cerveau (Max)', icon: '🧠', color: '#FF8A3D', type: '', what: 'Max, le chef de projet : il reçoit ta demande, fait le plan, envoie le travail sur les bonnes îles et assemble le rendu.' },
  recherche: { label: 'Île de la Veille', icon: '🔎', color: '#4FB3FF', type: 'chercheur', what: 'Le chercheur (sujets, faits, sources) et le chasseur de tendances (ce qui marche en ce moment sur TikTok, Reels et Shorts).' },
  redaction: { label: 'Île des Scripts', icon: '✍️', color: '#A98BFF', type: 'scenariste', what: 'Le scénariste (scripts, accroches, découpage plan par plan) et le rédacteur (légendes, textes, articles).' },
  tournage: { label: 'Île du Tournage', icon: '🎥', color: '#FF9F43', type: 'realisateur', what: 'Le réalisateur (liste des plans, cadrage, lumière, décor) et le régisseur (plan de tournage minute par minute, matériel, check-list).' },
  voix: { label: 'Île de la Voix', icon: '🎙️', color: '#E77CFF', type: 'directeurvoix', what: 'Le directeur de voix (texte prêt à enregistrer, rythme, intonations) et le traducteur (sous-titres et versions en anglais, espagnol…).' },
  montage: { label: 'Île du Montage', icon: '🎬', color: '#3DDC97', type: 'monteur', what: 'Le monteur (découpe, rythme, sous-titres, formats 9:16) et le motion designer (effets visuels qui claquent, titres animés, transitions).' },
  son: { label: 'Île du Son', icon: '🎧', color: '#FF5FA2', type: 'ingeson', what: 'L’ingé son (musique, voix, mixage, volume) et le bruiteur (SFX : whoosh, pop, impacts, placés sur les coupes).' },
  design: { label: 'Île du Graphisme', icon: '🎨', color: '#FFC93D', type: 'designer', what: 'Le designer (miniatures, visuels, titres, chartes) et le retoucheur photo (lumière, couleurs, détourage).' },
  miniatures: { label: 'Île des Miniatures', icon: '🖼️', color: '#FFE45C', type: 'miniaturiste', what: 'Le miniaturiste (plusieurs variantes de chaque miniature et titre) et le testeur A/B (quoi tester, dans quel ordre, et comment lire les résultats).' },
  social: { label: 'Île des Réseaux', icon: '📱', color: '#36D1C4', type: 'socialmedia', what: 'Le social media manager (publication, calendrier, hashtags, SEO) et le community manager (réponses aux commentaires, messages, ton).' },
  stats: { label: 'Île des Stats', icon: '📊', color: '#5CE1E6', type: 'analyste', what: 'L’analyste (les statistiques de tes vidéos TikTok, YouTube, Instagram) et le stratège de croissance (ce qui marche, ce qu’il faut refaire, tes objectifs).' },
  code: { label: 'Île du Code', icon: '💻', color: '#7C9CFF', type: 'developpeur', what: 'Le développeur (sites, scripts, petites applis) et l’automatiseur (traitements par lots, rangement, conversions).' },
  qualite: { label: 'Contrôle qualité', icon: '✅', color: '#FF7A5C', type: 'verificateur', what: 'Le vérificateur : il contrôle chaque livrable avant qu’il te soit rendu (formats, durées, fautes, respect de ta demande).' },
  renfort: { label: 'Renfort', icon: '🤖', color: '#9AA3B5', type: '', what: 'Un coup de main sur une tâche à part.' },
};

const WEB = ['WebSearch', 'WebFetch'];
const FILES = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];

/** Les outils Claude Code de chaque île (le chef a tous ceux de la séance). */
export const ROLE_TOOLS: Record<Role, string[]> = {
  chef: ['Agent', 'TodoWrite', 'Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Bash'],
  recherche: ['Skill', ...WEB, 'Read', 'Write', 'Glob', 'Grep'],
  redaction: ['Skill', ...FILES, ...WEB],
  tournage: ['Skill', ...FILES, ...WEB],
  voix: ['Skill', ...FILES, 'Bash', 'WebFetch'],
  montage: ['Skill', ...FILES, 'Bash', 'WebFetch'],
  son: ['Skill', ...FILES, 'Bash', ...WEB],
  design: ['Skill', ...FILES, 'Bash', 'WebFetch'],
  miniatures: ['Skill', ...FILES, 'Bash', 'WebFetch'],
  social: ['Skill', ...FILES, ...WEB],
  stats: ['Skill', ...FILES, 'Bash', ...WEB],
  code: ['Skill', ...FILES, 'Bash', 'WebFetch'],
  qualite: ['Skill', ...FILES, 'Bash'],
  renfort: [],
};

/**
 * Les agents Claude Code (subagent_type) et l'île où ils s'installent.
 * Chaque île accueille deux métiers (le contrôle qualité est sur l'île cerveau, avec Max).
 */
export const TYPE_ROLE: Record<string, Role> = {
  chercheur: 'recherche', tendances: 'recherche',
  scenariste: 'redaction', redacteur: 'redaction',
  monteur: 'montage', motion: 'montage',
  ingeson: 'son', bruiteur: 'son',
  designer: 'design', retoucheur: 'design',
  socialmedia: 'social', community: 'social',
  realisateur: 'tournage', regisseur: 'tournage',
  directeurvoix: 'voix', traducteur: 'voix',
  miniaturiste: 'miniatures', testeur: 'miniatures',
  analyste: 'stats', croissance: 'stats',
  developpeur: 'code', automatiseur: 'code',
  verificateur: 'qualite',
};

/** Ce qu'affichent les métiers (le nom de l'agent Claude Code → son métier). */
export const TYPE_LABEL: Record<string, string> = {
  chercheur: '🔎 Recherche', tendances: '📈 Tendances',
  scenariste: '🎞️ Scénario', redacteur: '✍️ Rédaction',
  monteur: '🎬 Montage vidéo', motion: '✨ Motion design & effets',
  ingeson: '🎧 Son & musique', bruiteur: '💥 Bruitages (SFX)',
  designer: '🎨 Graphisme', retoucheur: '📸 Retouche photo',
  socialmedia: '📱 Social media', community: '💬 Community manager',
  realisateur: '🎥 Réalisation', regisseur: '📋 Régie de tournage',
  directeurvoix: '🎙️ Direction de voix', traducteur: '🌍 Traduction & sous-titres',
  miniaturiste: '🖼️ Miniatures', testeur: '🧪 Tests A/B',
  analyste: '📊 Statistiques', croissance: '🚀 Croissance',
  developpeur: '💻 Code', automatiseur: '⚙️ Automatisations',
  verificateur: '✅ Contrôle qualité',
};

/** Les anciens coins du bureau (missions enregistrées avant les îles) → leur île. */
const LEGACY: Record<string, Role> = { analyse: 'stats' };

/** Le bon métier d'un agent, même pour une mission enregistrée avant les îles. */
export function fixRole(role: string, type?: string): Role {
  if (type && TYPE_ROLE[type]) return TYPE_ROLE[type];
  if (role in ROLES) return role as Role;
  return LEGACY[role] ?? 'renfort';
}

/** La fiche d'un métier, sans jamais planter sur un nom inconnu. */
export const roleInfo = (role: string): RoleInfo => ROLES[fixRole(role)];

/** Ce que veut dire chaque outil, en français (pour la fiche des métiers). */
export const TOOL_INFO: Record<string, string> = {
  Agent: 'appelle un membre de l’équipe', TodoWrite: 'écrit et coche le plan', Read: 'lit un fichier', Write: 'crée un fichier',
  Edit: 'retouche un fichier', Glob: 'cherche des fichiers', Grep: 'cherche dans les fichiers', WebSearch: 'cherche sur internet',
  WebFetch: 'lit une page web', Bash: 'lance une commande (ffmpeg, Python…)', Skill: 'applique une méthode du studio (un skill)',
};

/** Le métier d'un agent, d'après le type d'agent que le chef a appelé. */
export function roleOfType(type: string): Role {
  return TYPE_ROLE[type] ?? 'renfort';
}

/** Les prénoms des robots, par métier (jamais deux fois le même dans une mission). */
export const NAMES: Record<Role, string[]> = {
  chef: ['Max'],
  recherche: ['Iris', 'Hugo', 'Léa', 'Malo', 'Zoé', 'Noé', 'Inès', 'Tom', 'Jade', 'Sacha', 'Lou', 'Nils'],
  redaction: ['Colette', 'Victor', 'Simone', 'Jules', 'George', 'Marguerite', 'Agnès', 'Boris'],
  montage: ['Méliès', 'Varda', 'Truffaut', 'Godard', 'Alice', 'Lumière', 'Chaplin', 'Kubrick'],
  son: ['Daft', 'Nina', 'Ravel', 'Edith', 'Django', 'Björk', 'Satie', 'Lili'],
  design: ['Frida', 'Coco', 'Henri', 'Sonia', 'Saul', 'Paula', 'Nadar', 'Vivian'],
  social: ['Kylie', 'Enzo', 'Mila', 'Tara', 'Yanis', 'Lina', 'Rayan', 'Emma'],
  tournage: ['Spike', 'Sofia', 'Akira', 'Jacques', 'Céline', 'Wes', 'Greta', 'Luc'],
  voix: ['Barbara', 'Gabin', 'Arletty', 'Yves', 'Juliette', 'Serge', 'Dalida', 'Léo'],
  miniatures: ['Andy', 'Keith', 'Yayoi', 'Banksy', 'Niki', 'Roy', 'Joan', 'Pablo'],
  stats: ['Marie', 'Blaise', 'Émilie', 'Gauss', 'Ada', 'Hypatie', 'Euler', 'Sophie'],
  code: ['Linus', 'Grace', 'Alan', 'Margaret', 'Tim', 'Hedy', 'Ken', 'Radia'],
  qualite: ['Vera', 'Oscar', 'Clara', 'Félix'],
  renfort: ['Bob', 'Lulu', 'Gaston', 'Nina', 'Momo', 'Kiki'],
};

const base = (p: unknown) => (typeof p === 'string' ? p.split(/[\\/]/).filter(Boolean).pop() ?? p : '');
export const cut = (s: unknown, n = 60) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
export const host = (u: unknown) => {
  try { return new URL(String(u)).hostname.replace(/^www\./, ''); } catch { return cut(u, 40); }
};

const MCP_NAMES: Record<string, string> = {
  gmail: 'Gmail', google_drive: 'Google Drive', notion: 'Notion', google_calendar: 'Google Agenda', calendar: 'Google Agenda',
  slack: 'Slack', github: 'GitHub', stripe: 'Stripe', hubspot: 'HubSpot', airtable: 'Airtable',
};

/** Le nom lisible d'un connecteur MCP : mcp__claude_ai_Gmail__search_threads → Gmail */
export function mcpName(tool: string): { server: string; action: string } {
  const parts = tool.split('__');
  const raw = (parts[1] ?? '').replace(/^claude_ai_/, '').replace(/^plugin_[^_]+_/, '');
  const server = MCP_NAMES[raw.toLowerCase()] ?? raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { server, action: (parts[2] ?? '').replace(/[_-]+/g, ' ') };
}

/** L'action, sa phrase (courte, pour la bulle) et le détail complet (pour le panneau). */
export function describeAct(tool: string, input: Record<string, unknown> | undefined): { kind: ActKind; label: string; detail: string } {
  const i = input ?? {};
  switch (tool) {
    case 'WebSearch': return { kind: 'search', label: `Je cherche « ${cut(i.query, 44)} »`, detail: String(i.query ?? '') };
    case 'WebFetch': return { kind: 'web', label: `Je lis ${host(i.url)}`, detail: String(i.url ?? '') };
    case 'Read': return { kind: 'read', label: `Je lis ${cut(base(i.file_path), 36)}`, detail: String(i.file_path ?? '') };
    case 'Glob': return { kind: 'read', label: 'Je fouille le dossier', detail: String(i.pattern ?? '') };
    case 'Grep': return { kind: 'read', label: `Je cherche « ${cut(i.pattern, 30)} »`, detail: `${i.pattern ?? ''}${i.path ? ' dans ' + i.path : ''}` };
    case 'LS': return { kind: 'read', label: 'Je regarde le dossier', detail: String(i.path ?? '') };
    case 'Write': return { kind: 'write', label: `J’écris ${cut(base(i.file_path), 36)}`, detail: String(i.file_path ?? '') };
    case 'Edit':
    case 'MultiEdit': return { kind: 'edit', label: `Je retouche ${cut(base(i.file_path), 34)}`, detail: String(i.file_path ?? '') };
    case 'NotebookEdit': return { kind: 'edit', label: `Je retouche ${cut(base(i.notebook_path), 34)}`, detail: String(i.notebook_path ?? '') };
    case 'Bash': {
      const c = String(i.command ?? '').replace(/\s+/g, ' ').trim();
      return { kind: 'bash', label: `Je lance ${c.length <= 34 ? `« ${c} »` : cut(i.description || c, 40)}`, detail: String(i.command ?? '') };
    }
    case 'TodoWrite': return { kind: 'plan', label: 'Je mets le plan à jour', detail: '' };
    case 'Skill': return { kind: 'skill', label: `J’applique la méthode ${cut(i.skill ?? i.name, 24)}`, detail: String(i.args ?? '') };
    case 'ToolSearch': return { kind: 'other', label: 'Je cherche le bon outil', detail: String(i.query ?? '') };
  }
  if (tool.startsWith('mcp__')) {
    const { server, action } = mcpName(tool);
    return { kind: 'mcp', label: `Je passe par ${server}`, detail: action };
  }
  return { kind: 'other', label: `J’utilise ${tool}`, detail: '' };
}

export const emptyStats = (): MissionStats => ({ agents: 0, searches: 0, pages: 0, reads: 0, writes: 0, commands: 0 });

/** Les compteurs de la mission (recherches, pages lues…), mis à jour événement par événement. */
export function countStats(s: MissionStats, ev: OfficeEvent) {
  if (ev.k === 'hire') s.agents++;
  if (ev.k !== 'act') return;
  if (ev.kind === 'search') s.searches++;
  else if (ev.kind === 'web') s.pages++;
  else if (ev.kind === 'read') s.reads++;
  else if (ev.kind === 'write' || ev.kind === 'edit') s.writes++;
  else if (ev.kind === 'bash') s.commands++;
}

/** Remplace le chemin du dossier de la mission par « . » partout où il apparaît en entier. */
export function relToFolder(text: string, folder: string): string {
  if (!folder) return text;
  const esc = folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(esc + '(?=$|[/"\'\\s])', 'g'), '.').replace(/(^|[\s"'])\.\//g, '$1');
}

/** La commande telle qu'elle sera lancée, juste rendue lisible (le dossier de la mission devient « . »). Rien n'est caché. */
export function readableCommand(cmd: unknown, folder: string): string {
  return relToFolder(String(cmd ?? ''), folder).trim().replace(/^cd\s+(?:"\."|'\.'|\.)\s*&&\s*/, '');
}

const FULL_MAX = 72;

/**
 * La demande de permission : la phrase de la bulle, le détail complet, et `full`
 * (vrai seulement si la bulle montre toute l'action : on peut alors répondre directement dans la bulle).
 */
export function permissionText(tool: string, input: Record<string, unknown> | undefined, folder: string): { label: string; detail: string; full: boolean } {
  const i = input ?? {};
  if (tool === 'Bash') {
    const c = readableCommand(i.command, folder);
    const full = c.length > 0 && c.length <= FULL_MAX && !c.includes('\n');
    return { label: `Je peux lancer « ${full ? c : cut(c, 48)} » ?`, detail: c, full };
  }
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const raw = String(i.file_path ?? i.notebook_path ?? '');
    const rel = relToFolder(raw, folder);
    const inside = !!folder && raw.startsWith(folder + '/') && !rel.includes('..');
    return { label: `Je peux ${tool === 'Write' ? 'écrire' : 'modifier'} ${inside ? rel : raw} ?`, detail: raw, full: inside && rel.length <= FULL_MAX };
  }
  if (tool === 'WebFetch') return { label: `Je peux lire ${host(i.url)} ?`, detail: String(i.url ?? ''), full: false };
  const detail = relToFolder(JSON.stringify(i, null, 2), folder);
  const clipped = detail.length > 1500 ? detail.slice(0, 1499) + '…' : detail;
  if (tool.startsWith('mcp__')) {
    const { server, action } = mcpName(tool);
    return { label: `Je peux passer par ${server} (${action}) ?`, detail: clipped, full: false };
  }
  return { label: `Je peux utiliser ${tool} ?`, detail: clipped, full: false };
}
