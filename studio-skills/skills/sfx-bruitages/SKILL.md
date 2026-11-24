---
name: sfx-bruitages
description: Recettes du studio pour les effets sonores (SFX) - fabriquer avec ffmpeg un whoosh, un pop, un impact, un clic, un riser, un ding ou un boom, trouver des sons libres de droits (CC0), et les placer au bon moment sur une vidéo sans couvrir la voix. À utiliser pour tout bruitage, transition sonore ou habillage audio.
---

# Bruitages (SFX)

Règles :
- Un SFX souligne une action à l'écran : une **coupe** (whoosh), un **texte qui apparaît** (pop), une **révélation** (impact, ding), une **montée** avant un moment fort (riser).
- Il reste **sous la voix** : en général 8 à 14 dB plus bas.
- Les sons fabriqués ici sont à toi (aucune licence). Les sons trouvés en ligne : CC0 de préférence, licence notée.
- Rangement : `sfx/` dans le dossier de la mission, en WAV 48 kHz stéréo.

## 1. Fabriquer les sons de base (ffmpeg seul)
```bash
mkdir -p sfx
# whoosh (transition) : un souffle filtré qui monte puis s'éteint
ffmpeg -y -f lavfi -i "anoisesrc=d=0.6:c=pink:a=0.7" -af "highpass=f=400,lowpass=f=4000,afade=t=in:d=0.25,afade=t=out:st=0.3:d=0.3" -ar 48000 -ac 2 sfx/whoosh.wav
# pop (texte qui apparaît)
ffmpeg -y -f lavfi -i "aevalsrc='0.8*sin(2*PI*(500+3500*exp(-40*t))*t)*exp(-28*t)':d=0.15" -ar 48000 -ac 2 sfx/pop.wav
# impact (révélation, chiffre choc)
ffmpeg -y -f lavfi -i "aevalsrc='0.9*sin(2*PI*55*t)*exp(-6*t)+0.35*(random(0)*2-1)*exp(-30*t)':d=0.8" -af "lowpass=f=6000" -ar 48000 -ac 2 sfx/impact.wav
# clic (souris, bouton, liste)
ffmpeg -y -f lavfi -i "aevalsrc='(random(0)*2-1)*exp(-400*t)':d=0.04" -af "highpass=f=1500" -ar 48000 -ac 2 sfx/clic.wav
# riser (montée de 2 s avant un moment fort)
ffmpeg -y -f lavfi -i "aevalsrc='0.5*sin(2*PI*(200*t+300*t*t))*t/2':d=2" -af "afade=t=out:st=1.9:d=0.1" -ar 48000 -ac 2 sfx/riser.wav
# ding (bonne réponse, conseil)
ffmpeg -y -f lavfi -i "aevalsrc='0.6*sin(2*PI*1320*t)*exp(-5*t)+0.3*sin(2*PI*2640*t)*exp(-7*t)':d=1" -ar 48000 -ac 2 sfx/ding.wav
# boom grave (intro, logo)
ffmpeg -y -f lavfi -i "aevalsrc='sin(2*PI*(80*exp(-3*t))*t)*exp(-2.5*t)':d=1.5" -ar 48000 -ac 2 sfx/boom.wav
```
Variantes : change la durée (`d=`), la hauteur (les fréquences) ou ajoute `,volume=0.7`. Écoute-les toujours avant de les placer (au moins vérifie leur durée et leur volume avec ffprobe et `volumedetect`).

## 2. Trouver des sons libres de droits
- **freesound.org** : filtre la licence sur « Creative Commons 0 » (CC0 = libre sans attribution). CC BY demande de citer l'auteur.
- **Pixabay** (effets sonores, licence Pixabay : libre, même commercial).
- **Mixkit** (licence Mixkit, gratuite, à vérifier par son).
Dans `sfx.md` : nom, lien, auteur, licence exacte pour chaque son téléchargé.

## 3. La feuille de placement (sfx.md)
Calée sur les coupes du montage (détecte-les si besoin, voir studio:montage-video) ou sur le script :

| Temps | Son | Volume | Pourquoi |
|---|---|---|---|
| 0:00.00 | boom.wav | -6 dB | intro |
| 0:02.40 | whoosh.wav | -10 dB | coupe vers le plan 2 |
| 0:03.10 | pop.wav | -12 dB | texte « 3 ERREURS » |

Un whoosh se place ~0,15 s **avant** la coupe, pour qu'il « porte » la transition.

## 4. Mixer les SFX dans la vidéo
Chaque son est décalé avec `adelay` (en millisecondes, une valeur par canal), puis tout est mélangé à la piste de la vidéo :
```bash
ffmpeg -i video.mp4 -i sfx/whoosh.wav -i sfx/pop.wav -filter_complex "[1:a]adelay=2250|2250,volume=0.35[s1];[2:a]adelay=3100|3100,volume=0.25[s2];[0:a][s1][s2]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.89[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart video-sfx.mp4
```
Ensuite, l'ingé son normalise le tout à -14 LUFS (studio:sound-design). Si la vidéo n'a pas d'audio, remplace `[0:a]` par une piste muette : `-f lavfi -t DUREE -i anullsrc=r=48000:cl=stereo`.

## 5. Vérifier
- La vidéo garde sa durée (`ffprobe`).
- Aucun SFX ne couvre une phrase importante (compare les temps de `sfx.md` avec le script).
- Le rapport liste les sons créés, ceux téléchargés (avec licence) et la feuille de placement.
