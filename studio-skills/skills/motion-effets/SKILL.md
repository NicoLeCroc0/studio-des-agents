---
name: motion-effets
description: Recettes ffmpeg et Pillow du studio pour des vidéos impactantes - zoom punch, secousse, flash, glitch, ralenti et accélération, transitions rapides, textes qui apparaissent mot par mot, flèches et emojis en calque, barre de progression, intro et outro. À utiliser pour tout effet visuel ou motion design sur une vidéo.
---

# Motion design et effets qui claquent

Règles :
- Un effet sert le message : on le place sur un **mot fort**, une **coupe** ou une **révélation**. Jamais en continu.
- On part toujours d'une vidéo déjà montée (dans `videos/`) et on écrit une **nouvelle** version (`videos/<nom>-fx.mp4`).
- Analyse d'abord la source (`ffprobe`) : résolution, images par seconde (`FPS` ci-dessous), durée.
- Export du studio : `-c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart`.

## 1. Zoom punch (un coup de zoom sur un mot fort)
Zoom de 15 % entre 3,2 s et 3,8 s, vidéo verticale 1080×1920 à 30 i/s :
```bash
ffmpeg -i in.mp4 -vf "zoompan=z='if(between(in_time,3.2,3.8),1.15,1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30" -c:a copy out.mp4
```
Plusieurs moments : `if(between(in_time,3.2,3.8)+between(in_time,9,9.5),1.15,1)`.
Zoom progressif (lent, sur toute la durée) : `z='1+0.0008*in'`.

## 2. Secousse (impact, révélation)
```bash
ffmpeg -i in.mp4 -vf "crop=iw-24:ih-24:x='12+if(between(t,5,5.35),10*sin(t*95),0)':y='12+if(between(t,5,5.35),10*cos(t*83),0)',scale=1080:1920" -c:a copy out.mp4
```

## 3. Flash blanc (sur une coupe)
```bash
ffmpeg -i in.mp4 -vf "eq=brightness=0.55:enable='between(t,4,4.07)'" -c:a copy out.mp4
```

## 4. Glitch (décalage des couleurs, 0,2 s)
```bash
ffmpeg -i in.mp4 -vf "rgbashift=rh=10:bh=-10:enable='between(t,2,2.2)'" -c:a copy out.mp4
```

## 5. Ralenti et accélération (speed ramp)
Découpe en morceaux, change la vitesse du morceau du milieu, puis recolle :
```bash
ffmpeg -i in.mp4 -filter_complex "[0:v]trim=0:4,setpts=PTS-STARTPTS[a];[0:v]trim=4:6,setpts=2*(PTS-STARTPTS)[b];[0:v]trim=6,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0[v]" -map "[v]" -an ralenti.mp4
```
(Le son se traite à part : `atempo=0.5` sur le même morceau, ou une musique par-dessus.)

## 6. Transitions rapides entre deux plans
```bash
ffmpeg -i a.mp4 -i b.mp4 -filter_complex "[0:v][1:v]xfade=transition=slideleft:duration=0.25:offset=DUREE_A_MOINS_0.25[v];[0:a][1:a]acrossfade=d=0.25[a]" -map "[v]" -map "[a]" out.mp4
```
Transitions utiles : `slideleft`, `slideup`, `zoomin`, `fadewhite`, `circleopen`, `pixelize`. Les deux vidéos doivent avoir la même taille et le même nombre d'images par seconde.

## 7. Texte qui apparaît (mot par mot, gros et lisible)
Simple, avec `drawtext` (une ligne par mot, chacune visible sur son créneau) :
```bash
ffmpeg -i in.mp4 -vf "drawtext=fontfile='Police.ttf':text='TU':fontsize=110:fontcolor=white:borderw=8:bordercolor=black:x=(w-text_w)/2:y=h*0.62:enable='between(t,0.2,0.6)',drawtext=fontfile='Police.ttf':text='FAIS ÇA ?':fontsize=110:fontcolor=yellow:borderw=8:bordercolor=black:x=(w-text_w)/2:y=h*0.62:enable='between(t,0.6,1.6)'" -c:a copy out.mp4
```
Pour un texte qui « rebondit » : fabrique le mot en PNG transparent avec Pillow (police de la charte, contour noir), puis
```bash
ffmpeg -i in.mp4 -i mot.png -filter_complex "[1:v]scale=w='iw*min(1,0.6+(t-1)*4)':h=-1:eval=frame[m];[0:v][m]overlay=x=(W-w)/2:y=H*0.6:enable='between(t,1,2)'" -c:a copy out.mp4
```

## 8. Flèches, emojis, cercles (calques PNG)
Fabrique le calque avec Pillow (fond transparent, 1080×1920 ou plus petit), puis :
```bash
ffmpeg -i in.mp4 -i fleche.png -filter_complex "overlay=x=600:y=900:enable='between(t,7,9)'" -c:a copy out.mp4
```
Les emojis : utilise une police emoji si elle est installée, sinon dessine une forme simple (flèche, cercle, croix) : c'est plus net.

## 9. Barre de progression (en bas de l'écran)
```bash
ffmpeg -i in.mp4 -filter_complex "color=c=0xFFD400:s=1080x14[bar];[0:v][bar]overlay=x='-W+W*t/DUREE':y=H-14:shortest=1" -c:a copy out.mp4
```
(Remplace `DUREE` par la durée en secondes, lue avec ffprobe.)

## 10. Vérifier avant de rendre
- `ffprobe` : même durée que la source, même taille, audio présent.
- Une planche des moments clés :
```bash
ffmpeg -i out.mp4 -vf "fps=1/2,scale=270:-1,tile=4x3" -frames:v 1 planche-fx.jpg
```
- Dans le rapport : la liste des effets avec leur temps (« 0:03 zoom punch sur ERREUR »).
