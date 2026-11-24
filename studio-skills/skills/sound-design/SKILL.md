---
name: sound-design
description: Recettes ffmpeg du studio pour le son d'une vidéo - mesurer le volume, nettoyer la voix, la rendre claire, ajouter une musique libre de droits qui baisse quand on parle (ducking), mixer et normaliser à -14 LUFS pour TikTok, Reels, Shorts et YouTube. À utiliser pour toute tâche de son, de musique, de voix ou de mixage.
---

# Le son du studio

Règles :
- La **voix passe toujours en premier** : on doit tout comprendre, même sur un téléphone.
- Les réseaux visent environ **-14 LUFS** intégrés, avec des pics à **-1 dBTP** au plus.
- Musique : seulement libre de droits ou fournie par le patron, licence notée dans le rapport.
- On ne touche jamais l'original : on écrit `son/` ou `videos/<nom>-mix.mp4` dans le dossier de la mission.

## 1. Mesurer (avant et après)
```bash
ffmpeg -hide_banner -i in.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | tail -n 14
```
Note `input_i` (volume moyen), `input_tp` (pic), `input_lra` : ils vont dans le rapport.

## 2. Nettoyer et éclaircir la voix
```bash
ffmpeg -i in.mp4 -vn -af "highpass=f=80,lowpass=f=14000,afftdn=nf=-25,equalizer=f=3000:t=q:w=1.2:g=3,acompressor=threshold=-18dB:ratio=3:attack=10:release=150:makeup=3" -ar 48000 voix-propre.wav
```
- `highpass` enlève les grondements, `afftdn` le souffle (monter `nf` vers -20 si le bruit reste), l'égaliseur à 3 kHz rend la voix plus claire, le compresseur égalise les phrases.
- Trop de bruit de fond (rue, vent) : essaie `afftdn=nf=-20:tn=1`, et dis dans le rapport que le résultat a ses limites.

## 3. Musique sous la voix, qui baisse quand on parle (ducking)
```bash
ffmpeg -i video.mp4 -stream_loop -1 -i musique.mp3 -filter_complex "[0:a]asplit=2[voix][cle];[1:a]volume=0.35[mus];[mus][cle]sidechaincompress=threshold=0.04:ratio=10:attack=15:release=350[musb];[voix][musb]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1:LRA=11[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart video-mix.mp4
```
- `volume=0.35` règle le niveau de base de la musique ; le compresseur la baisse encore quand la voix parle.
- Fondu de la musique à la fin : ajoute `afade=t=out:st=DUREE_MOINS_2:d=2` après `volume`.

## 4. Normaliser seulement (sans musique)
```bash
ffmpeg -i in.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k -movflags +faststart out.mp4
```
Pour un résultat plus précis : deux passes (mesurer, puis repasser avec `measured_I`, `measured_TP`, `measured_LRA`, `measured_thresh`, `offset` et `linear=true`).

## 5. Trouver une musique libre de droits
- **Pixabay Music** (licence Pixabay : usage libre, même commercial, sans attribution obligatoire).
- **Bibliothèque audio YouTube** (dans YouTube Studio : certaines pistes demandent une attribution, à vérifier piste par piste).
- **Free Music Archive**, **ccMixter** : licence Creative Commons, à vérifier (CC BY demande de citer l'auteur ; NC interdit l'usage commercial).
- Les sons « tendance » de TikTok et Instagram ne se téléchargent pas : on conseille au patron de les ajouter **dans l'appli** au moment de publier.
Dans le rapport : titre, auteur, lien, licence exacte, attribution à copier si besoin.

## 6. Voix off (si demandée)
Le studio n'a pas de voix de synthèse intégrée : propose au patron d'enregistrer le texte au téléphone (pièce calme, téléphone à 20 cm), puis applique la recette 2.

## 7. Vérifier
- Remesurer (recette 1) : `input_i` entre -15 et -13, `input_tp` sous -1.
- Écouter le début, un passage avec musique et la fin (extrais 10 s si besoin : `-ss 0 -t 10`).
- Dans le rapport : volumes avant/après, réglages utilisés (pour les refaire à l'identique), licence de la musique.
