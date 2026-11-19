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
  chef: { label: 'Chef de projet', icon: '⭐', color: '#FF8A3D', type: '', what: 'Il reçoit ta demande, fait le plan, répartit le travail et assemble le rendu.' },
  recherche: { label: 'Inspiration', icon: '🔎', color: '#4FB3FF', type: 'inspiration', what: 'Cherche les tendances, les références visuelles, les musiques et images libres de droits.' },
  code: { label: 'Montage vidéo', icon: '🎬', color: '#3DDC97', type: 'monteur', what: 'Monte les vidéos : découpe, assemblage, sous-titres, musique, formats Shorts, Reels et TikTok.' },
  design: { label: 'Design', icon: '🎨', color: '#FF6FA8', type: 'designer', what: 'Logos, bannières, visuels pour les réseaux, miniatures, chartes graphiques.' },
  redaction: { label: 'Scénario', icon: '✍️', color: '#A98BFF', type: 'scenariste', what: 'Scripts vidéo, accroches, découpages, légendes et textes des visuels.' },
  analyse: { label: 'Retouche photo', icon: '📸', color: '#FFC93D', type: 'retoucheur', what: 'Retouche les photos : recadrage, lumière, couleurs, détourage, traitement par lots.' },
  renfort: { label: 'Renfort', icon: '🤖', color: '#9AA3B5', type: '', what: 'Un coup de main sur une tâche à part.' },
};

/** Les outils Claude Code de chaque métier (le chef a tous ceux de la séance). */
export const ROLE_TOOLS: Record<Role, string[]> = {
  chef: ['Agent', 'TodoWrite', 'Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Bash'],
  recherche: ['WebSearch', 'WebFetch', 'Read', 'Write', 'Glob', 'Grep'],
  code: ['Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebFetch'],
  design: ['Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebFetch'],
  redaction: ['Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
  analyse: ['Skill', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  renfort: [],
};

/** Ce que veut dire chaque outil, en français (pour la fiche des métiers). */
export const TOOL_INFO: Record<string, string> = {
  Agent: 'appelle un membre de l’équipe', TodoWrite: 'écrit et coche le plan', Read: 'lit un fichier', Write: 'crée un fichier',
  Edit: 'retouche un fichier', Glob: 'cherche des fichiers', Grep: 'cherche dans les fichiers', WebSearch: 'cherche sur internet',
  WebFetch: 'lit une page web', Bash: 'lance une commande (ffmpeg, Python…)', Skill: 'applique une méthode du studio (un skill)',
};

/** Le métier d'un agent, d'après le type d'agent que le chef a appelé. */
export function roleOfType(type: string): Role {
  for (const [role, info] of Object.entries(ROLES) as [Role, RoleInfo][]) if (info.type && info.type === type) return role;
  return 'renfort';
}

/** Les prénoms des robots, par métier (jamais deux fois le même dans une mission). */
export const NAMES: Record<Role, string[]> = {
  chef: ['Max'],
  recherche: ['Iris', 'Hugo', 'Léa', 'Malo', 'Zoé', 'Noé', 'Inès', 'Tom', 'Jade', 'Sacha', 'Lou', 'Nils'],
  code: ['Agnès', 'Lumière', 'Méliès', 'Truffaut', 'Varda', 'Godard'],
  design: ['Frida', 'Coco', 'Henri', 'Sonia', 'Saul', 'Paula'],
  redaction: ['Colette', 'Victor', 'Simone', 'Jules', 'George'],
  analyse: ['Nadar', 'Doisneau', 'Cartier', 'Brassaï', 'Vivian', 'Robert'],
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
