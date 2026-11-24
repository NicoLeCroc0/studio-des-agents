// Le pont entre le bureau et Claude Code. Il sert le bureau (dossier dist/) et ouvre une connexion
// WebSocket sur /ws. Il n'écoute que sur ton ordinateur (127.0.0.1), et refuse toute page qui ne vient
// pas du bureau lui-même : un site web ne peut pas lancer ton équipe à ta place.
//
// L'accès à distance (téléphone, autre ordinateur) passe par Tailscale (« tailscale serve ») et un mot de
// passe (npm run mot-de-passe) : toute requête qui ne vient pas de http://localhost doit être connectée.
//
//   node server/index.ts            le bureau sur http://localhost:4848
//   node server/index.ts --open     … et l'ouvre dans le navigateur
//   node server/index.ts --dev      seulement le pont (le bureau est servi par Vite, port 5174)
import { execFile } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMsg, ServerMsg } from '../shared/protocol.ts';
import { hasPassword, isLoggedIn, login, logout, page } from './acces.ts';
import { Bureau } from './bureau.ts';
import { findClaude } from './claude.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = new Set(process.argv.slice(2));
const DEV = args.has('--dev');
// 4850 (et pas 4848) : le studio peut tourner à côté du Bureau des agents d'origine
const PORT = Number(process.env.PORT ?? 4850);
// STUDIO_HOST=0.0.0.0 : écouter sur tout le réseau (le wifi de la maison). Seulement avec un mot de passe.
const HOST = process.env.STUDIO_HOST || '127.0.0.1';
const LOOPBACK = HOST === '127.0.0.1' || HOST === 'localhost' || HOST === '::1';
if (!LOOPBACK && !hasPassword()) {
  console.error('  ✗ Pour ouvrir le studio sur le réseau, choisis d’abord un mot de passe : npm run mot-de-passe');
  process.exit(1);
}
const DEV_PORT = 5175;

const csp = (host: string) => [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "font-src 'self' data:", "media-src 'self' blob: data:", "worker-src 'self' blob:", "manifest-src 'self'",
  `connect-src 'self' ws://${host} wss://${host}`, "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'",
].join('; ');

/** Une requête faite sur l'ordinateur du studio lui-même (http://localhost) : pas besoin de mot de passe. */
function isLocal(req: http.IncomingMessage) {
  const addr = req.socket.remoteAddress ?? '';
  const loop = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
  const host = (req.headers.host ?? '').toLowerCase();
  // « tailscale serve » passe aussi par 127.0.0.1, mais avec son propre nom (…ts.net) : il doit se connecter
  return loop && !req.headers['x-forwarded-for'] && [`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`, ...(DEV ? [`localhost:${DEV_PORT}`, `127.0.0.1:${DEV_PORT}`] : [])].includes(host);
}


/** Même site que la page ? (protège l'envoi de fichiers et la connexion WebSocket) */
function sameSite(req: http.IncomingMessage) {
  const origin = req.headers.origin ?? '';
  const host = req.headers.host ?? '';
  return origin === `https://${host}` || origin === `http://${host}`;
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.jpeg': 'image/jpeg', '.mov': 'video/quicktime', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/plain; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

// L'aperçu des sites faits par l'équipe : servis à part, dans un bac à sable (origine opaque) :
// leurs scripts tournent, mais ils ne peuvent ni lire le bureau, ni se connecter au pont.
const PREVIEW_CSP = "sandbox allow-scripts allow-forms allow-popups allow-modals; frame-ancestors 'self'";

const claude = await findClaude();
// la version du bureau compilé : un onglet resté ouvert se recharge quand elle change
const BUILD = (() => { try { return String(Math.round(statSync(path.join(DIST, 'index.html')).mtimeMs)); } catch { return 'dev'; } })();
const clients = new Set<WebSocket>();

function broadcast(m: ServerMsg) {
  const s = JSON.stringify(m);
  for (const c of clients) if (c.readyState === c.OPEN) c.send(s);
}

const bureau = new Bureau(claude, broadcast, process.env.BUREAU_DIR);
await bureau.init();

// ── Le serveur web (le bureau compilé) ──
const server = http.createServer(async (req, res) => {
  const url0 = new URL(req.url ?? '/', 'http://x');
  // l'accès à distance : la page de connexion, tant que ce navigateur n'a pas donné le mot de passe
  if (!isLocal(req)) {
    if (!hasPassword()) { page(res, 403, '', true); return; }
    if (url0.pathname === '/connexion' && req.method === 'POST') { await login(req, res); return; }
    if (url0.pathname === '/deconnexion') { logout(req, res); return; }
    if (!isLoggedIn(req)) { page(res, 401); return; }
  }
  if (url0.pathname === '/envoi' && req.method === 'POST') { await upload(req, url0, res); return; }
  if (url0.pathname.startsWith('/apercu/')) { await preview(req, url0, res); return; }
  if (DEV) { res.writeHead(404).end(`Mode développement : le bureau est sur http://localhost:${DEV_PORT}`); return; }
  try {
    const url = url0;
    let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
    if (file !== DIST && !file.startsWith(DIST + path.sep)) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || file === DIST || file.endsWith(path.sep)) file = path.join(DIST, 'index.html');
    const body = await readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      // aucun script venu d'ailleurs : même un lien piégé dans un rapport ne peut rien exécuter
      ...(ext === '.html' ? { 'Content-Security-Policy': csp(req.headers.host ?? `localhost:${PORT}`) } : {}),
    });
    res.end(body);
  } catch {
    res.writeHead(500).end('Le bureau n’est pas compilé : lance « npm start ».');
  }
});

/**
 * /apercu/<mission>/<chemin> : un fichier de la mission, dans le bac à sable.
 * Les vidéos se lisent par morceaux (Range), comme l'exige l'iPhone. ?dl=1 : le télécharger.
 */
async function preview(req: http.IncomingMessage, url: URL, res: http.ServerResponse) {
  try {
    const parts = url.pathname.split('/').slice(2).map((p) => decodeURIComponent(p));
    const missionId = parts.shift() ?? '';
    let rel = parts.join('/');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const file = bureau.previewPath(missionId, rel);
    if (!file) { res.writeHead(404, { 'Content-Security-Policy': PREVIEW_CSP }).end('Introuvable dans le dossier de la mission.'); return; }
    const size = statSync(file).size;
    const headers: Record<string, string | number> = {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Security-Policy': PREVIEW_CSP,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Accept-Ranges': 'bytes',
    };
    if (url.searchParams.get('dl') === '1') headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`;
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
    if (range && size > 0) {
      let start = range[1] ? Number(range[1]) : size - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : size - 1;
      start = Math.max(0, start); end = Math.min(size - 1, end);
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, 'Content-Length': size });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500, { 'Content-Security-Policy': PREVIEW_CSP }).end();
  }
}

/** POST /envoi?nom=… : un fichier envoyé depuis le navigateur (le téléphone), rangé dans « Médias ». */
async function upload(req: http.IncomingMessage, url: URL, res: http.ServerResponse) {
  // seulement depuis la page du studio (un autre site ne peut pas envoyer ce header sans être bloqué)
  if (req.headers['x-studio'] !== '1' || (req.headers.origin && !sameSite(req))) { res.writeHead(403).end(); return; }
  const name = path.basename(String(url.searchParams.get('nom') ?? '')).replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').trim().replace(/^\.+/, '').slice(0, 120);
  if (!name) { res.writeHead(400).end('Nom de fichier manquant.'); return; }
  const ext = path.extname(name);
  let target = path.join(bureau.mediaDir, name);
  for (let n = 2; existsSync(target); n++) target = path.join(bureau.mediaDir, `${path.basename(name, ext)} (${n})${ext}`);
  const out = createWriteStream(target, { flags: 'wx' });
  req.pipe(out);
  out.on('finish', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ name: path.basename(target) }));
    broadcast({ t: 'toast', kind: 'info', text: `📥 ${path.basename(target)} est dans tes médias.` });
  });
  out.on('error', () => { res.writeHead(500).end('Impossible d’enregistrer le fichier.'); });
  req.on('aborted', () => out.destroy());
}

// ── La connexion avec le bureau ──
// Seul le bureau lui-même peut se connecter (et, en développement, la page servie par Vite).
const allowedOrigins = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, ...(DEV ? [`http://localhost:${DEV_PORT}`, `http://127.0.0.1:${DEV_PORT}`] : [])]);
const wss = new WebSocketServer({ noServer: true, maxPayload: 1_000_000 });

server.on('upgrade', (req, socket, head) => {
  const origin = req.headers.origin ?? '';
  const ok = isLocal(req) ? allowedOrigins.has(origin) : isLoggedIn(req) && sameSite(req);
  if (new URL(req.url ?? '/', 'http://x').pathname !== '/ws' || !ok) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  const send = (m: ServerMsg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(m));
  send({ ...bureau.hello(), build: BUILD } as ServerMsg);
  ws.on('message', async (data) => {
    let m: ClientMsg;
    try { m = JSON.parse(String(data)); } catch { return; }
    try {
      await handle(m, send);
    } catch (e) {
      send({ t: 'toast', kind: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  });
});

const str = (v: unknown, max = 20000) => (typeof v === 'string' ? v.slice(0, max) : '');

async function handle(m: ClientMsg, send: (m: ServerMsg) => void) {
  switch (m.t) {
    case 'start':
      await bureau.start(str(m.prompt));
      break;
    case 'say':
      bureau.say(str(m.text));
      break;
    case 'stop':
      bureau.stop();
      break;
    case 'answer':
      bureau.answer(str(m.requestId, 100), m.allow === true);
      break;
    case 'new':
      bureau.close();
      break;
    case 'open':
      bureau.open(str(m.missionId, 40), m.file ? str(m.file, 1000) : undefined);
      break;
    case 'open_root':
      bureau.openRoot(m.rules === true, m.media === true, m.memory === true);
      break;
    case 'read': {
      const file = str(m.file, 1000);
      const version = m.version ? str(m.version, 120) : undefined;
      const { text, truncated } = await bureau.readText(str(m.missionId, 40), file, version);
      send({ t: 'file_text', missionId: m.missionId, file, text, truncated, version });
      break;
    }
    case 'versions': {
      const file = str(m.file, 1000);
      send({ t: 'versions', missionId: m.missionId, file, list: await bureau.versions(str(m.missionId, 40), file) });
      break;
    }
    case 'team_history':
      send({ t: 'team_history', entries: await bureau.teamHistory() });
      break;
    case 'replay': {
      const { mission, log } = await bureau.replay(str(m.missionId, 40));
      send({ t: 'replay', mission, log });
      break;
    }
    case 'settings':
      bureau.setSettings(m.settings ?? {});
      break;
    case 'resume':
      await bureau.resume(str(m.missionId, 40));
      // tous les écrans ouverts (ordinateur, téléphone) passent sur la mission reprise
      broadcast({ ...bureau.hello(), build: BUILD } as ServerMsg);
      break;
  }
}

function listen(port: number) {
  server.once('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`  Le port ${port} est déjà pris : le bureau tourne peut-être déjà (http://localhost:${port}).`);
      process.exit(1);
    }
    throw e;
  });
  server.listen(port, HOST, () => {
    const url = `http://localhost:${port}`;
    console.log('');
    console.log('  🎬  Le Studio des agents');
    console.log(`  ➜  ${DEV ? `Pont prêt (le studio : http://localhost:${DEV_PORT})` : url}`);
    console.log(`  📁  Tes vidéos et photos à traiter : ${bureau.mediaDir}`);
    console.log(`  📁  Les missions : ${bureau.missionsDir}`);
    console.log(bureau.skillsDir ? `  ✓  Skills du studio : ${path.basename(bureau.skillsDir)}` : '  ✗  Skills du studio introuvables');
    console.log(claude ? `  ✓  Claude Code ${claude.version} (${claude.path})` : '  ✗  Claude Code introuvable : le bureau tournera en démo.');
    if (!LOOPBACK) console.log(`  🌐  Ouvert sur le réseau (${HOST}), protégé par ton mot de passe`);
    else if (hasPassword()) console.log('  🔐  Accès à distance prêt (Tailscale + mot de passe) : voir le README');
    console.log('  ⏹  Pour arrêter : Ctrl + C');
    console.log('');
    if (args.has('--open') && !DEV) {
      const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
      execFile(opener, [url], () => {});
    }
  });
}

listen(PORT);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    bureau.shutdown();
    setTimeout(() => process.exit(0), 300);
  });
}
