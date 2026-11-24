// L'accès à distance : depuis ton téléphone ou un autre ordinateur, le studio demande un mot de passe.
// Sur l'ordinateur du studio lui-même (http://localhost), rien ne change : pas de mot de passe.
//
// Le mot de passe n'est jamais gardé en clair : seulement son empreinte (scrypt, avec un sel).
// Une fois connecté, ton navigateur garde un jeton (cookie HttpOnly, 90 jours) ; le studio ne garde
// que l'empreinte de ce jeton. Changer le mot de passe déconnecte tous les appareils.
//
//   npm run mot-de-passe          choisir (ou changer) le mot de passe
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type http from 'node:http';
import os from 'node:os';
import path from 'node:path';

interface Store { salt: string; hash: string; sessions: { id: string; at: number }[] }

const COOKIE = 'studio_session';
const MAX_AGE_S = 90 * 24 * 3600;
const MAX_SESSIONS = 20;

export function studioDir() {
  return process.env.BUREAU_DIR ?? path.join(os.homedir(), 'Documents', 'Studio des agents');
}

const file = () => path.join(studioDir(), '.bureau', 'acces.json');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

function load(): Store | null {
  try {
    const s = JSON.parse(readFileSync(file(), 'utf8')) as Store;
    return s.salt && s.hash ? { ...s, sessions: Array.isArray(s.sessions) ? s.sessions : [] } : null;
  } catch { return null; }
}

function save(s: Store) {
  mkdirSync(path.dirname(file()), { recursive: true });
  writeFileSync(file(), JSON.stringify(s, null, 2), { mode: 0o600 });
}

export function setPassword(pw: string) {
  const salt = randomBytes(16).toString('hex');
  save({ salt, hash: scryptSync(pw, salt, 64).toString('hex'), sessions: [] });
}

export const hasPassword = () => load() !== null;

function checkPassword(pw: string): boolean {
  const s = load();
  if (!s) return false;
  const a = scryptSync(pw, s.salt, 64);
  const b = Buffer.from(s.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieOf(req: http.IncomingMessage): string {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return '';
}

/** Vrai si ce navigateur s'est déjà connecté avec le mot de passe. */
export function isLoggedIn(req: http.IncomingMessage): boolean {
  const token = cookieOf(req);
  if (!token) return false;
  const s = load();
  if (!s) return false;
  const id = sha(token);
  const now = Date.now();
  return s.sessions.some((x) => x.id === id && now - x.at < MAX_AGE_S * 1000);
}

const isHttps = (req: http.IncomingMessage) =>
  req.headers['x-forwarded-proto'] === 'https' || /\.ts\.net(:\d+)?$/i.test(req.headers.host ?? '');

function newSession(req: http.IncomingMessage, res: http.ServerResponse) {
  const s = load()!;
  const token = randomBytes(32).toString('base64url');
  s.sessions = [...s.sessions, { id: sha(token), at: Date.now() }].slice(-MAX_SESSIONS);
  save(s);
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_S}${isHttps(req) ? '; Secure' : ''}`);
}

// Trop d'essais ratés : on fait patienter (par adresse, sur un quart d'heure).
const tries = new Map<string, { n: number; since: number }>();
function tooMany(ip: string) {
  const t = tries.get(ip);
  if (!t || Date.now() - t.since > 15 * 60_000) return false;
  return t.n >= 8;
}
function failed(ip: string) {
  const t = tries.get(ip);
  if (!t || Date.now() - t.since > 15 * 60_000) tries.set(ip, { n: 1, since: Date.now() });
  else t.n++;
}

const clientIp = (req: http.IncomingMessage) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();

/** POST /connexion : vérifie le mot de passe et ouvre une session. */
export async function login(req: http.IncomingMessage, res: http.ServerResponse) {
  const ip = clientIp(req);
  if (tooMany(ip)) { page(res, 429, 'Trop d’essais. Réessaie dans un quart d’heure.'); return; }
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 4000) break; }
  const pw = new URLSearchParams(body).get('mdp') ?? '';
  // un petit temps d'attente, pour ralentir ceux qui essaient au hasard
  await new Promise((r) => setTimeout(r, 400));
  if (!pw || !checkPassword(pw)) { failed(ip); page(res, 401, 'Mot de passe incorrect.'); return; }
  tries.delete(ip);
  newSession(req, res);
  res.writeHead(303, { Location: '/' }).end();
}

/** GET /deconnexion : oublie ce navigateur. */
export function logout(req: http.IncomingMessage, res: http.ServerResponse) {
  const s = load();
  const token = cookieOf(req);
  if (s && token) { s.sessions = s.sessions.filter((x) => x.id !== sha(token)); save(s); }
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  res.writeHead(303, { Location: '/' }).end();
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** La page de connexion (ou un message), sans aucun script. */
export function page(res: http.ServerResponse, status: number, message = '', noPassword = false) {
  const form = noPassword
    ? `<p>L’accès à distance n’est pas encore ouvert. Sur l’ordinateur du studio, lance&nbsp;:</p><pre>npm run mot-de-passe</pre><p>puis relance le studio.</p>`
    : `<form method="post" action="/connexion">
        <label for="mdp">Mot de passe du studio</label>
        <input id="mdp" name="mdp" type="password" autocomplete="current-password" autofocus required>
        <button type="submit">Entrer</button>
      </form>`;
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Le Studio des agents</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0b16;color:#f2eff8;font:16px/1.5 system-ui,-apple-system,sans-serif}
  main{width:min(360px,90vw);padding:28px;border-radius:18px;background:#17142a;box-shadow:0 10px 40px #0008}
  h1{font-size:20px;margin:0 0 4px} p{color:#b9b3cc} .err{color:#ff8a8a}
  label{display:block;margin:18px 0 6px;font-size:14px;color:#b9b3cc}
  input{box-sizing:border-box;width:100%;padding:12px 14px;border-radius:10px;border:1px solid #3a3550;background:#0d0b16;color:#fff;font-size:16px}
  button{margin-top:14px;width:100%;padding:12px;border:0;border-radius:10px;background:#ff8a3d;color:#1a1020;font-weight:700;font-size:16px}
  pre{background:#0d0b16;padding:10px;border-radius:8px}
</style></head><body><main>
<h1>🧠 Le Studio des agents</h1><p>Ton archipel d’agents, rien que pour toi.</p>
${message ? `<p class="err">${esc(message)}</p>` : ''}${form}
</main></body></html>`);
}

// ── npm run mot-de-passe ──
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('acces.ts')) {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // on n'affiche pas ce que tu tapes
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  let hidden = false;
  out._writeToOutput = (s: string) => { if (!hidden || s.includes('\n')) out.output.write(hidden ? '\n' : s); else out.output.write('•'); };
  const ask = (q: string) => new Promise<string>((r) => { hidden = false; process.stdout.write(q); hidden = true; rl.question('', (a) => r(a)); });
  console.log('');
  console.log('  🔐  Le mot de passe du Studio des agents');
  console.log(`  ${existsSync(file()) ? 'Un mot de passe existe déjà : le nouveau le remplace (tes appareils devront se reconnecter).' : 'Il protège le studio quand tu l’ouvres depuis ton téléphone ou un autre ordinateur.'}`);
  console.log('  12 caractères au moins. Une phrase facile à retenir, c’est parfait.');
  console.log('');
  const a = await ask('  Mot de passe : ');
  const b = await ask('  Encore une fois : ');
  rl.close();
  if (a !== b) { console.error('\n  ✗ Les deux ne sont pas pareils. Recommence.'); process.exit(1); }
  if (a.length < 12) { console.error('\n  ✗ Trop court : 12 caractères au moins.'); process.exit(1); }
  setPassword(a);
  console.log('\n  ✓ C’est enregistré. Relance le studio pour que ce soit pris en compte.\n');
}
