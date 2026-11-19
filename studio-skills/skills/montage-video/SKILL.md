---
name: montage-video
description: Recettes ffmpeg du studio pour monter une vidéo - analyser une source, découper, assembler, recadrer en 9:16 (Shorts, Reels, TikTok), ajouter une musique, des fondus, un logo, accélérer, compresser, extraire l'audio, faire un GIF ou une planche de vignettes. À utiliser pour toute tâche de montage ou d'export vidéo.
---

# Montage vidéo avec ffmpeg

Règles du studio :
- Les originaux (dossier Médias) ne sont **jamais** modifiés : on écrit toujours dans le dossier de la mission (`videos/`).
- On met les chemins entre guillemets (il y a souvent des espaces et des accents).
- Sous Windows, la commande se lance pareil (`ffmpeg`, `ffprobe`). Si `ffmpeg` est introuvable, on le signale avec la commande d'installation :
  Windows `winget install Gyan.FFmpeg`, macOS `brew install ffmpeg`, Linux `sudo apt install ffmpeg`.

## 1. Toujours commencer par analyser

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate -of compact "source.mp4"
```

Note la durée, la résolution, les images par seconde et la présence d'audio : tout le reste en dépend.
Pour trouver les moments forts sans tout regarder : détection des changements de plan.

```bash
ffmpeg -hide_banner -i "source.mp4" -vf "select='gt(scene,0.35)',showinfo" -an -f null - 2>&1 | grep -o "pts_time:[0-9.]*"
```

(Sous Windows sans `grep`, lis la sortie et repère les `pts_time`.)

## 2. Le format d'export du studio (se lit partout)

À ajouter à chaque export final :

```
-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart
```

## 3. Recettes

**Découper un extrait (précis à l'image)** : `-ss` après `-i`.
```bash
ffmpeg -i "source.mp4" -ss 00:01:12.5 -to 00:01:41 -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -movflags +faststart "videos/extrait.mp4"
```

**Recadrer en vertical 9:16 (1080×1920), centré** :
```bash
ffmpeg -i "in.mp4" -vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy "videos/vertical.mp4"
```
Si le sujet n'est pas au centre, décale le recadrage : `crop=ih*9/16:ih:X:0` (X = position du bord gauche en pixels).

**Vertical avec fond flou (garder toute l'image)** :
```bash
ffmpeg -i "in.mp4" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:2[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy "videos/vertical-flou.mp4"
```

**Assembler plusieurs clips** (même résolution et mêmes fps : sinon, ré-encode chaque clip avec le même `scale` et `fps` d'abord) :
```bash
# liste.txt contient une ligne par clip :  file 'clip1.mp4'
ffmpeg -f concat -safe 0 -i liste.txt -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -movflags +faststart "videos/assemblage.mp4"
```

**Fondu au début et à la fin (image et son)** — vidéo de D secondes :
```bash
ffmpeg -i "in.mp4" -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=D-0.5:d=0.5" -af "afade=t=in:st=0:d=0.5,afade=t=out:st=D-0.5:d=0.5" ... "videos/fondu.mp4"
```
(Remplace `D-0.5` par la valeur calculée.)

**Transition fondu enchaîné entre deux clips** (clip A de 10 s, transition de 1 s) :
```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=9[v];[0:a][1:a]acrossfade=d=1[a]" -map "[v]" -map "[a]" ... "videos/enchaine.mp4"
```

**Ajouter une musique de fond sous la voix** (musique à 15 %, coupée à la fin de la vidéo) :
```bash
ffmpeg -i "video.mp4" -stream_loop -1 -i "musique.mp3" -filter_complex "[1:a]volume=0.15[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -shortest "videos/avec-musique.mp4"
```
Vidéo sans son d'origine : `-map 0:v -map 1:a -shortest`.

**Logo / filigrane en haut à droite** (logo PNG à 12 % de la largeur) :
```bash
ffmpeg -i "video.mp4" -i "logo.png" -filter_complex "[1:v][0:v]scale2ref=w=main_w*0.12:h=ow/mdar[logo][base];[base][logo]overlay=W-w-40:40" -c:a copy ... "videos/avec-logo.mp4"
```

**Accélérer ×1,5** : `-filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" -map "[v]" -map "[a]"`

**Normaliser le son (voix claire, volume réseaux sociaux)** : `-af loudnorm=I=-14:TP=-1.5:LRA=11`

**Compresser pour l'envoi** (≈ moitié du poids) : `-c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k`

**Extraire l'audio** : `ffmpeg -i "in.mp4" -vn -c:a libmp3lame -q:a 2 "audio.mp3"`

**Une image de la vidéo (miniature)** : `ffmpeg -ss 00:00:05 -i "in.mp4" -frames:v 1 -q:v 2 "visuels/image.jpg"`

**GIF léger et net** :
```bash
ffmpeg -ss 3 -t 4 -i "in.mp4" -vf "fps=12,scale=600:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" "visuels/anim.gif"
```

**Planche de vignettes pour montrer le résultat** (12 images) :
```bash
ffmpeg -i "videos/final.mp4" -vf "fps=12/DUREE,scale=320:-1,tile=4x3" -frames:v 1 "videos/planche.jpg"
```

## 4. Vérifier avant de rendre

```bash
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of compact "videos/final.mp4"
```
Durée, dimensions et codecs attendus ? Le son est là ? Alors seulement, rends le fichier, avec ces caractéristiques dans ton rapport.

## Formats des réseaux

| Réseau | Format | Taille | Durée conseillée |
|---|---|---|---|
| YouTube Shorts, Reels, TikTok | 9:16 | 1080×1920 | 15 à 60 s |
| YouTube | 16:9 | 1920×1080 | libre |
| Instagram (fil) | 4:5 | 1080×1350 | 15 à 60 s |
| LinkedIn | 1:1 ou 16:9 | 1080×1080 / 1920×1080 | 30 à 90 s |

Pour les sous-titres et les textes à l'écran : skill `studio:sous-titres`.
