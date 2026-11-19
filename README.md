# Le Studio des agents

**Recherche, code, rédaction, analyse, et aussi montage vidéo, retouche photo et design : tu dis ce que tu veux, une équipe
d'agents IA se met au travail sous tes yeux.**

Le Studio des agents transforme Claude Code en petit bureau en pixel art. Max, le chef de projet, lit ta demande et appelle
les bons spécialistes : chercheurs internet, développeur, rédacteur, analyste (les métiers du Bureau des agents d'origine),
plus des monteurs vidéo, des retoucheurs photo, un designer et un scénariste. Il peut en lancer plusieurs en même temps (un
chercheur par concurrent, un monteur par Short, un retoucheur par lot de photos). Chaque robot est un vrai agent Claude Code,
qui travaille sur ton ordinateur, avec ton abonnement Claude, et qui applique les skills du studio.

---

## L'installer (sans savoir coder)

1. Il te faut [Claude Code](https://claude.com/claude-code), installé et connecté à ton compte Claude.
2. Il te faut l'accès à ce dépôt privé sur GitHub (demande une invitation à la personne qui l'a créé, et accepte-la).
3. Ouvre Claude Code et colle cette phrase :

   ```
   Installe et lance le Studio des agents : https://github.com/NicoLeCroc0/studio-des-agents
   ```

4. Claude Code télécharge le studio, installe ce qui manque (Node.js, ffmpeg, Pillow) et le lance.
   Le studio s'ouvre dans ton navigateur, sur http://localhost:4850.

Les fois suivantes, dis simplement à Claude Code « Relance le Studio des agents ».

> **Pour Claude Code** (si on t'a donné ce lien) :
> 1. Vérifie les outils, et propose à la personne d'installer ceux qui manquent (avec son accord) :
>    - **Node.js 22.18 ou plus** (`node -v`). Windows : `winget install OpenJS.NodeJS.LTS` ; macOS : `brew install node` ; sinon https://nodejs.org.
>    - **ffmpeg** (`ffmpeg -version`). Windows : `winget install Gyan.FFmpeg` ; macOS : `brew install ffmpeg` ; Linux : `sudo apt install ffmpeg`.
>    - **Python 3 et Pillow** (`python -c "import PIL"`, ou `python3` hors Windows). Pillow : `python -m pip install --user pillow`.
>    - **Git** (`git --version`). Windows : `winget install Git.Git` ; macOS : `xcode-select --install`.
>    Après une installation par winget, ouvre un nouveau terminal (ou recharge le PATH) pour que la commande soit trouvée.
> 2. Le dépôt est **privé** : la personne doit être connectée à GitHub. Si `git clone` échoue faute d'accès, installe GitHub CLI
>    (`winget install GitHub.cli` ou `brew install gh`) et laisse la personne lancer elle-même `gh auth login` (ne saisis jamais
>    son mot de passe), puis `gh repo clone NicoLeCroc0/studio-des-agents`.
> 3. Clone le dépôt dans le dossier de son choix (par défaut : son dossier personnel), puis `cd studio-des-agents` et `npm install`
>    (sous Windows PowerShell, si les scripts sont bloqués, utilise `npm.cmd`).
> 4. Lance `npm start` **dans un terminal qui reste ouvert** (ou en arrière-plan) : c'est un petit serveur qui doit rester allumé.
>    Il ouvre le navigateur tout seul sur http://localhost:4850.
> 5. Si le studio dit « Not logged in », Claude Code n'est pas connecté : fais lancer `claude` puis `/login` à la personne.
>    Si `claude` n'est pas dans le PATH (Claude Code fourni par l'application de bureau), donne son chemin dans la variable `CLAUDE_BIN`.
> 6. Dis à la personne que le studio est prêt, qu'il tourne tant que la commande tourne, qu'elle dépose ses fichiers avec le bouton
>    « 📁 Mes médias », et qu'elle peut écrire sa première mission à Max.

### À la main, si tu préfères

```bash
git clone https://github.com/NicoLeCroc0/studio-des-agents.git
cd studio-des-agents
npm install
npm start
```

Pour arrêter le studio : `Ctrl + C` dans le terminal.

## Ta première mission

1. Clique sur **« 📁 Mes médias »** (panneau de droite, carte « Ton studio ») et dépose-y tes vidéos, photos, logo, musiques.
2. Remplis **« Le règlement du studio »** : qui tu es, tes couleurs, tes polices, le ton de tes vidéos. Max le lit avant chaque mission.
3. Écris à Max. Quelques idées :
   - « Prends ma vidéo et tire-en 3 Shorts verticaux avec sous-titres. Un monteur par Short. »
   - « Retouche toutes mes photos et exporte-les en carré pour Instagram et en 1200×627 pour LinkedIn. »
   - « Crée 3 miniatures YouTube pour ma vidéo sur… avec mes couleurs. »
   - « Écris le script d'un Reel de 30 secondes sur… puis monte-le avec mes rushs. »
   - « Analyse mes 5 concurrents, un chercheur par concurrent, et fais-moi un tableau comparatif. »
   - « Fais ma veille de la semaine sur mon secteur, avec les sources. »

Tout ce que l'équipe produit arrive dans `Documents/Studio des agents/Missions/` (et dans « Les rendus », dans le studio).
**Tes originaux ne sont jamais modifiés.**

## L'équipe

| Métier | Ce qu'il fait | Ses outils |
|---|---|---|
| ⭐ Max, chef de projet | Lit ta demande, fait le plan, lance l'équipe en parallèle, vérifie et livre | tous |
| 🔎 Chercheur | Concurrents, prix, avis, actualités, tendances, sources ; inspiration, musiques et images libres de droits | internet |
| 💻 Développeur | Sites web, scripts, petites applis, automatisations | code, commandes |
| ✍️ Rédacteur | Posts, e-mails, articles, pages de vente, rapports | texte |
| 📊 Analyste | Chiffres, tableaux comparatifs, calculs, fichiers de données | Python |
| 🎬 Monteur vidéo | Découpe, assemblage, sous-titres, musique, fondus, 9:16, compression, GIF | ffmpeg, Python |
| 📸 Retoucheur photo | Recadrage, formats réseaux, lumière, couleurs, détourage, filigrane, lots | Python + Pillow |
| 🎨 Designer | Pages web, logos, bannières, miniatures, visuels réseaux, affiches, chartes | HTML/SVG → PNG |
| 🎞️ Scénariste | Scripts, accroches, découpage plan par plan, textes à l'écran, légendes | texte |

Dans le bureau, deux métiers proches partagent un coin : Code · Vidéo, Rédac · Scénar, Data · Photo.

## Les skills du studio

Ils sont dans le dossier [`studio-skills/`](studio-skills/) et se chargent tout seuls : tes collègues n'ont rien à installer.

- `montage-video`, `sous-titres`, `retouche-photo` : écrits pour le studio (recettes ffmpeg et Pillow qui marchent sous Windows, macOS et Linux).
- `banner-design`, `canvas-design`, `theme-factory`, `frontend-design`, `slack-gif-creator` : skills partagés sous licence libre.

Origine et licences : [`studio-skills/NOTICE.md`](studio-skills/NOTICE.md). Pour ajouter un skill : un dossier `studio-skills/skills/<nom>/SKILL.md`,
puis cite-le dans les consignes du bon métier (`server/team.ts`).

## Ce qui se passe sur ton ordinateur

- **Tout reste chez toi.** Le studio n'écoute que sur ton ordinateur (127.0.0.1).
- **Max est une vraie séance Claude Code**, en mode restreint : l'équipe ne voit que le dossier de la mission et ton dossier Médias.
- **Les actions risquées te sont soumises** : pour une commande sensible, l'agent lève la main et tu réponds Oui ou Non.
- **Ça consomme ton abonnement Claude**, comme si tu demandais le travail à Claude Code toi-même. Le montage de plusieurs vidéos
  en parallèle consomme plus qu'une simple question : commence par de petites missions.

## Merci

Le Studio des agents est adapté du [Bureau des agents](https://github.com/devlikemasta/bureau-des-agents) de
[VibesMoney](https://vibesmoney.com) (licence MIT) : le bureau en pixel art, la musique, la voix de Max et le moteur viennent de
là. La visite guidée (`T`) est celle du bureau d'origine. Licence MIT (voir [LICENSE](LICENSE)).
