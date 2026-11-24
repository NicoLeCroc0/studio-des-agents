# Le Studio des agents : notes pour Claude Code

Tu travailles sur le Studio des agents : un studio en pixel art (montage vidéo, retouche photo, design) où l'on regarde de vrais
sous-agents Claude Code travailler. C'est une adaptation du Bureau des agents de VibesMoney (MIT).
Lis ce fichier avant de modifier le code. Pour installer et lancer le studio, suis la section « Pour Claude Code » du README.

## Les commandes

- `npm start` : vérifie Node, Claude Code, ffmpeg et Pillow, construit le client, lance le serveur sur http://localhost:4850 et ouvre le navigateur.
- `npm run dev` : serveur + Vite avec rechargement à chaud sur http://localhost:5175.
- `npm run check` : les types (client et serveur). `npm run build` : la construction. Les deux doivent passer avant une pull request.
- `npm run mot-de-passe` : le mot de passe de l'accès à distance. `npm run service:mac` / `npm run service:windows` : le studio
  toujours allumé (launchd / tâche planifiée).
- Variables utiles : `PORT` (le port du serveur), `BUREAU_DIR` (le dossier du studio, par défaut `~/Documents/Studio des agents`),
  `CLAUDE_BIN` (le chemin de Claude Code s'il n'est pas dans le PATH).

## Ce qui est propre au studio

- **L'archipel** : 15 agents Claude Code (`server/team.ts`) répartis sur des îles. Une île = un `Role` (`shared/protocol.ts`) :
  `recherche` (Veille : `chercheur`, `tendances`), `redaction` (Scripts : `scenariste`, `redacteur`), `montage` (`monteur`, `motion`),
  `son` (`ingeson`, `bruiteur`), `design` (Graphisme : `designer`, `retoucheur`), `social` (Réseaux : `socialmedia`, `community`),
  `code` (`developpeur`, `analyste`) et `qualite` (`verificateur`, sur l'île cerveau avec Max, `chef`). `TYPE_ROLE` (`shared/activity.ts`)
  dit sur quelle île s'installe chaque agent, `TYPE_LABEL` donne le métier affiché. `fixRole()` range les agents des missions
  enregistrées avant les îles (ancien coin `analyse`).
- **Le plan de l'archipel** (`src/engine/layout.ts`) : `ISLANDS` (la terre), `BRIDGES` (les ponts-neurones, cases où l'on marche),
  six bureaux par île, et `PTS` (les points utiles : corbeille, imprimante, café…). Le dessin du décor est dans `room.ts`, les
  influx animés sur les ponts dans `render.ts` (`synapses`).
- **La mémoire** : `~/Documents/Studio des agents/Mémoire` (charte.md, scripts/, recettes/, visuels/) est passée avec `--add-dir` ;
  Max y range ce que le patron valide et la relit avant chaque mission.
- **L'accès à distance** (`server/acces.ts`) : une requête qui ne vient pas de `http://localhost:PORT` doit être connectée (mot de
  passe `npm run mot-de-passe`, cookie HttpOnly). Prévu pour `tailscale serve`. `POST /envoi` range un fichier dans Médias.
- **Les skills** : `studio-skills/` est un plugin Claude Code chargé avec `--plugin-dir` (il marche en `--restricted`). Les skills
  s'appellent `studio:<nom>`. L'outil `Skill` est dans les outils de la séance et de chaque métier.
- **Les médias** : `~/Documents/Studio des agents/Médias` est passé avec `--add-dir` : l'équipe le lit, et écrit dans le dossier de la mission.

Node 22.18 ou plus récent exécute directement le TypeScript du serveur (suppression des types) : dans `server/` et `shared/`, les imports
gardent l'extension `.ts`, et rien qui demande une vraie compilation (pas d'`enum`, pas de `namespace`, pas de paramètres-propriétés).

## Comment c'est fait

- **`server/`** : `index.ts` (HTTP, WebSocket, sécurité), `bureau.ts` (les missions, les fichiers, les versions, l'historique),
  `claude.ts` (lance `claude -p` en stream-json et traduit sa sortie en événements du bureau), `team.ts` (les métiers et les consignes).
- **`shared/protocol.ts`** : tous les messages entre le serveur et le navigateur, et les événements (`OfficeEvent`) : `start`, `hire`,
  `act`, `report`, `leave`, `file`, `ask`, `end`… **`shared/activity.ts`** : les métiers, leurs outils, les textes affichés.
- **`src/state/store.ts`** (zustand) range chaque événement, puis le transmet au moteur (`src/state/bus.ts` → `src/engine/world.ts`).
- **`src/engine/`** : le monde (`world.ts` : robots, déplacements A*, chat, mode soirée), le dessin (`render.ts`, `room.ts`,
  `furniture.ts`, `robots.ts` : tout le pixel art est dessiné en code, sur une image de 448 × 304), la caméra et son réalisateur
  (`camera.ts`), les clics (`hits.ts`).
- **`src/ui/`** : l'interface React. `Office.tsx` (le canevas, les bulles, la boucle d'animation), `Dialog.tsx` (Max et la boîte de
  saisie), `Rooms.tsx` (les fenêtres qu'on ouvre en cliquant), `interact.ts` (ce que fait chaque clic).
- **`src/audio/`** : bruitages ZzFX, jukebox (`public/music/`), voix de Max (`public/voice/`).
- **`public/demo/mission.json`** : une vraie mission enregistrée, rejouée quand le serveur n'est pas là (`scripts/make-demo.ts`).

## Tester sans dépenser l'abonnement

Une mission enregistrée se rejoue à l'identique (`H`, puis « Rejouer »), et sans serveur le bureau passe en démo. Dans la console du
navigateur, `window.__bureau` donne accès au store, au monde, à la caméra et à `playReplay(mission, log, vitesse)`.
Pour filmer le bureau image par image (un script de capture qui pilote l'horloge), `window.__CAPTURE` fait dessiner chaque image et
fournit le rythme de la musique (voir la boucle de `Office.tsx`).

## Les règles

- **Français, tutoiement, phrases courtes** dans tout ce que l'utilisateur lit. Le bureau est fait pour des débutants.
- **Jamais de chemin complet ni de nom d'utilisateur à l'écran** : `tidy()` (`src/ui/tidy.ts`) et `tilde()` (`src/ui/format.ts`).
- **Léger** : la boucle dessine au plus 24 images par seconde en mission, 8 au repos, rien quand l'onglet est caché ; environ une
  milliseconde par image. Pas de 3D, pas de bibliothèque lourde.
- **Sécurité** : le serveur n'écoute que sur 127.0.0.1 (sauf `STUDIO_HOST`, seulement avec un mot de passe) et vérifie l'origine des WebSocket ; à distance, tout passe par le mot de passe ; l'équipe tourne en `--restricted`, avec
  seulement les outils de son métier ; les sites créés s'affichent sous `/apercu/` dans un bac à sable (CSP `sandbox`).
- **zustand** : un sélecteur qui renvoie un nouveau tableau ou objet passe par `useShallow`, sinon React boucle.
- **Pas d'image externe** dans le bureau : un nouveau meuble se dessine en code dans `furniture.ts`, avec sa place dans `layout.ts`
  et, s'il est cliquable, une entrée dans `hits.ts` et `interact.ts`.
- **Musique et voix** : seulement des fichiers qu'on a le droit de partager, avec leur origine dans le README.
