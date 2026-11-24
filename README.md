# Le Studio des agents

**Un archipel d'agents IA pour tes vidéos YouTube, Shorts, Reels et TikTok : tu dis ce que tu veux, Max (le cerveau)
envoie le travail sur les bonnes îles, le contrôle qualité vérifie tout, et tu récupères le résultat.**

Le Studio des agents transforme Claude Code en archipel en pixel art. Au centre, le grand cerveau de Max, le chef de projet,
et son laboratoire du contrôle qualité. Autour, une couronne de douze îles reliées au cerveau par des ponts lumineux comme
des neurones : les Stats, la Veille, les Scripts, le Tournage, la Voix, le Son, le Montage, le Graphisme, les Miniatures,
les Réseaux, le Code, et le port où arrive l'équipe. Max peut lancer plusieurs agents en même temps (un chasseur de
tendances par réseau, un monteur par Short, l'ingé son et le motion designer en parallèle). Chaque robot est un vrai agent
Claude Code, qui travaille sur ton ordinateur, avec ton abonnement Claude, et qui applique les skills du studio.

---

## L'installer (sans savoir coder)

1. Il te faut [Claude Code](https://claude.com/claude-code), installé et connecté à ton compte Claude.
   Pas besoin de compte GitHub : le dépôt est public.
2. Ouvre Claude Code et colle cette phrase :

   ```
   Installe et lance le Studio des agents : https://github.com/NicoLeCroc0/studio-des-agents
   ```

3. Claude Code télécharge le studio, installe ce qui manque (Node.js, ffmpeg, Pillow) et le lance.
   Le studio s'ouvre dans ton navigateur, sur http://localhost:4850.

Les fois suivantes, dis simplement à Claude Code « Relance le Studio des agents ».

> **Pour Claude Code** (si on t'a donné ce lien) :
> 1. Vérifie les outils, et propose à la personne d'installer ceux qui manquent (avec son accord) :
>    - **Node.js 22.18 ou plus** (`node -v`). Windows : `winget install OpenJS.NodeJS.LTS` ; macOS : `brew install node` ; sinon https://nodejs.org.
>    - **ffmpeg** (`ffmpeg -version`). Windows : `winget install Gyan.FFmpeg` ; macOS : `brew install ffmpeg` ; Linux : `sudo apt install ffmpeg`.
>    - **Python 3 et Pillow** (`python -c "import PIL"`, ou `python3` hors Windows). Pillow : `python -m pip install --user pillow`.
>    - **Git** (`git --version`). Windows : `winget install Git.Git` ; macOS : `xcode-select --install`.
>    Après une installation par winget, ouvre un nouveau terminal (ou recharge le PATH) pour que la commande soit trouvée.
> 2. Clone le dépôt (public, aucune connexion GitHub nécessaire) dans le dossier de son choix (par défaut : son dossier personnel) :
>    `git clone https://github.com/NicoLeCroc0/studio-des-agents.git`. Sous Windows, si un chemin est trop long, ajoute
>    `-c core.longpaths=true`. Puis `cd studio-des-agents` et `npm install`
>    (sous Windows PowerShell, si les scripts sont bloqués, utilise `npm.cmd`).
>    Sans Git, tu peux aussi télécharger le ZIP : https://github.com/NicoLeCroc0/studio-des-agents/archive/refs/heads/main.zip
> 3. Lance `npm start` **dans un terminal qui reste ouvert** (ou en arrière-plan) : c'est un petit serveur qui doit rester allumé.
>    Il ouvre le navigateur tout seul sur http://localhost:4850.
> 4. Si le studio dit « Not logged in », Claude Code n'est pas connecté : fais lancer `claude` puis `/login` à la personne.
>    Si `claude` n'est pas dans le PATH (Claude Code fourni par l'application de bureau), donne son chemin dans la variable `CLAUDE_BIN`.
> 5. Dis à la personne que le studio est prêt, qu'il tourne tant que la commande tourne, qu'elle dépose ses fichiers avec le bouton
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

1. Dépose tes vidéos, photos, logo et musiques dans **« 📁 Mes médias »** (panneau de droite, carte « Ton studio »).
   Depuis ton téléphone : **☰ → « 📤 Envoyer des fichiers »**.
2. Remplis ta **charte** (bouton **« 🧠 Ma mémoire »**, fichier `charte.md`) : ton ton, tes formats, ton style de montage, ton son,
   tes couleurs. Max la lit avant chaque mission.
3. Écris à Max. Quelques idées :
   - « Prends ma vidéo et tire-en 3 Shorts verticaux avec sous-titres, zooms sur les mots forts et whoosh sur les coupes. »
   - « Trouve un sujet qui marche dans ma niche et prépare-moi un Short de A à Z : script, son, miniature, publication. »
   - « Fais la veille de ma niche sur TikTok, les Reels et les Shorts : top 10 d'idées avec des exemples. »
   - « Nettoie ma voix, ajoute une musique libre de droits qui baisse quand je parle, et mets tout à -14 LUFS. »
   - « Crée 3 miniatures YouTube pour ma vidéo sur… avec mes couleurs. »
   - « Prépare ma semaine de publication : 5 vidéos, légendes, hashtags et heures. »

Tout ce que l'équipe produit arrive dans `Documents/Studio des agents/Missions/` (et dans « Les rendus », dans le studio).
**Tes originaux ne sont jamais modifiés.**

## Retoucher, reprendre, ne jamais tout refaire

- **Retoucher** : quand Max a rendu le travail, réponds-lui simplement (« la musique est trop forte », « change l'accroche »).
  Il renvoie la retouche au bon métier, sur les fichiers existants, puis refait vérifier. Chaque fichier garde ses versions.
- **Reprendre une ancienne mission** : bouton **« Reprendre »** (dernières missions, ou 🗂️ Missions précédentes). Elle redevient
  la mission en cours, avec tout son historique, et tu peux redemander des retouches.
- **La mémoire** : dis « je valide » (ou « parfait », « garde-le ») et Max range la version finale dans
  `Documents/Studio des agents/Mémoire/` : `scripts/` (tes scripts validés), `recettes/` (les réglages de montage et de son, pas
  à pas), `visuels/` (tes modèles de miniatures). Quand tu dis « toujours… » ou « jamais… », il l'ajoute à ta `charte.md`.
  À chaque nouvelle mission, l'équipe repart de ce que tu as validé : pas besoin de tout réexpliquer.

## L'archipel et l'équipe

| Île | Agents | Ce qu'ils font | Leurs outils |
|---|---|---|---|
| 🧠 Le cerveau | Max | Lit ta demande, fait le plan, lance les îles en parallèle, assemble et livre | tous |
| 🧠 Le cerveau | ✅ Vérificateur | Contrôle chaque livrable avant qu'il te soit rendu : formats, durées, volume, fautes, respect de ta demande | ffprobe, Python |
| 🔎 Veille | Chercheur, chasseur de tendances | Sujets fiables et sourcés ; ce qui marche en ce moment sur TikTok, Reels et Shorts | internet |
| ✍️ Scripts | Scénariste, rédacteur | Accroches, scripts plan par plan, titres, légendes, descriptions | texte, internet |
| 🎥 Tournage | Réalisateur, régisseur | Liste des plans, cadrage, lumière, plans de coupe ; plan de tournage au téléphone, check-list | texte, internet |
| 🎙️ Voix | Directeur de voix, traducteur | Texte annoté prêt à enregistrer, vérification des prises ; sous-titres et versions en d'autres langues | ffmpeg, texte |
| 🎬 Montage | Monteur, motion designer | Découpe, rythme, sous-titres, 9:16 ; zooms punch, flashs, glitch, titres animés, transitions | ffmpeg, Python |
| 🎧 Son | Ingé son, bruiteur | Voix propre, musique libre de droits, mixage, -14 LUFS ; whoosh, pop, impacts, risers | ffmpeg, internet |
| 🎨 Graphisme | Designer, retoucheur | Miniatures, couvertures, visuels, chartes ; retouche photo | HTML/SVG → PNG, Pillow |
| 🖼️ Miniatures | Miniaturiste, testeur A/B | 3 variantes de miniature et de titre ; plan de test et lecture des résultats | HTML/SVG → PNG, Pillow |
| 📱 Réseaux | Social media manager, community manager | Fiches de publication, hashtags, calendrier ; réponses aux commentaires, FAQ | texte, internet |
| 📊 Stats | Analyste, stratège de croissance | Les chiffres de tes vidéos (exports YouTube, TikTok, Instagram) ; quoi refaire, arrêter, tester | Python, internet |
| 💻 Code | Développeur, automatiseur | Sites, scripts, petites applis ; traitements par lots, conversions, rangement | code, Python |

Le studio **prépare** tes publications ; c'est toujours **toi** qui publies.

## Les skills du studio

Ils sont dans le dossier [`studio-skills/`](studio-skills/) et se chargent tout seuls : tes collègues n'ont rien à installer.

- Écrits pour le studio (recettes ffmpeg et Pillow qui marchent sous Windows, macOS et Linux) : `veille-tendances`, `script-viral`,
  `montage-video`, `sous-titres`, `motion-effets`, `sound-design`, `sfx-bruitages`, `retouche-photo`, `social-media`,
  `community-management`, `controle-qualite`, `stats-croissance`, `miniatures-ab`, `voix-doublage`, `tournage`.
- `banner-design`, `canvas-design`, `theme-factory`, `frontend-design`, `slack-gif-creator` : skills partagés sous licence libre.

Origine et licences : [`studio-skills/NOTICE.md`](studio-skills/NOTICE.md). Pour ajouter un skill : un dossier `studio-skills/skills/<nom>/SKILL.md`,
puis cite-le dans les consignes du bon métier (`server/team.ts`).

## Toujours allumé (sans le relancer à chaque fois)

Le studio peut démarrer tout seul quand tu ouvres ta session, et redémarrer tout seul s'il s'arrête.
Dans le dossier du studio :

- **Mac** : `npm run service:mac` (pour l'arrêter : `npm run service:mac -- --stop`).
  Pour qu'il reste joignable écran éteint : Réglages Système → Batterie → Options → « Empêcher la suspension automatique
  lorsque l'écran est éteint » (sur secteur).
- **Windows** : `npm run service:windows` (pour l'arrêter : `npm run service:windows -- -Stop`).
  Pour qu'il reste joignable : Paramètres → Système → Alimentation → « Mettre en veille » sur « Jamais » (sur secteur).

Après une mise à jour (`git pull`), relance la même commande. Tu as un Mac **et** un PC ? Choisis-en un qui reste allumé :
c'est lui qui fait tourner le studio. Depuis l'autre ordinateur (et ton iPhone), tu y accèdes comme ci-dessous.

## Depuis ton téléphone ou un autre ordinateur (rien que toi)

Le studio n'est **jamais** ouvert sur internet. On passe par **Tailscale** (gratuit) : un réseau privé entre **tes** appareils,
plus un **mot de passe**.

1. **Le mot de passe** : sur l'ordinateur du studio, `npm run mot-de-passe` (12 caractères au moins), puis relance le studio
   (`npm run service:mac` ou `npm run service:windows`).
2. **Tailscale** : installe-le sur l'ordinateur du studio, sur l'autre ordinateur et sur ton iPhone
   ([tailscale.com/download](https://tailscale.com/download)), et connecte-les **avec le même compte**.
3. **L'adresse du studio** : sur l'ordinateur du studio, dans un terminal :
   ```bash
   tailscale serve --bg 4850
   ```
   (sur Mac, si `tailscale` est introuvable : `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 4850`).
   La commande affiche une adresse du type `https://mon-mac.ton-reseau.ts.net`. La première fois, Tailscale peut te demander
   d'activer « HTTPS » dans sa console : clique sur le lien qu'il donne.
4. **Sur l'iPhone** : ouvre cette adresse dans Safari, entre ton mot de passe, puis **Partager → « Sur l'écran d'accueil »** :
   le studio s'ouvre comme une appli. Le bouton **☰** donne accès à tes médias, tes missions (« Reprendre ») et tes rendus
   (« ▶ Voir », « ⬇ » pour télécharger).

Seuls tes appareils Tailscale voient cette adresse, et le studio demande en plus le mot de passe (le navigateur reste connecté
90 jours ; `/deconnexion` pour te déconnecter, et changer le mot de passe déconnecte tous les appareils).
Sur l'ordinateur du studio lui-même, `http://localhost:4850` marche toujours sans mot de passe.

## Ce qui se passe sur ton ordinateur

- **Tout reste chez toi.** Le studio n'écoute que sur ton ordinateur (127.0.0.1). L'accès à distance passe par Tailscale,
  et toute requête qui ne vient pas de l'ordinateur lui-même doit donner le mot de passe.
- **Max est une vraie séance Claude Code**, en mode restreint : l'équipe ne voit que le dossier de la mission, ton dossier
  Médias et ta Mémoire.
- **Les actions risquées te sont soumises** : pour une commande sensible, l'agent lève la main et tu réponds Oui ou Non.
- **Ça consomme ton abonnement Claude**, comme si tu demandais le travail à Claude Code toi-même. Le montage de plusieurs vidéos
  en parallèle (et le contrôle qualité) consomme plus qu'une simple question : commence par de petites missions.

## Merci

Le Studio des agents est adapté du [Bureau des agents](https://github.com/devlikemasta/bureau-des-agents) de
[VibesMoney](https://vibesmoney.com) (licence MIT) : le bureau en pixel art, la musique, la voix de Max et le moteur viennent de
là. La visite guidée (`T`) est celle du bureau d'origine. Licence MIT (voir [LICENSE](LICENSE)).
