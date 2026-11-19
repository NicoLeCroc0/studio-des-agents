---
name: sous-titres
description: Ajouter des sous-titres lisibles et des textes à l'écran sur une vidéo avec ffmpeg - écrire un fichier .srt ou .ass, transcrire la parole avec Whisper s'il est installé, incruster les sous-titres façon réseaux sociaux, ajouter un titre au début. À utiliser dès qu'une vidéo doit porter du texte.
---

# Sous-titres et textes à l'écran

85 % des vidéos des réseaux sont regardées sans le son : les sous-titres ne sont pas une option.

## 1. Obtenir le texte

**Si la parole doit être transcrite** : regarde si Whisper est installé (`whisper --help` ou `python -c "import whisper"`).
- Oui : `whisper "audio.mp3" --language French --model small --output_format srt --output_dir videos`
  (extrais d'abord l'audio : `ffmpeg -i in.mp4 -vn -ac 1 -ar 16000 audio.wav`).
- Non : dis-le dans ton rapport (installation : `pip install -U openai-whisper`) et, en attendant, rends un fichier
  `.srt` à remplir ou travaille à partir du script fourni par le scénariste.

**Si le texte vient d'un script** : écris toi-même le `.srt` en calant les temps sur la vidéo.

Format SRT (UTF-8) :
```
1
00:00:00,000 --> 00:00:02,400
Tu fais encore tes montages à la main ?

2
00:00:02,400 --> 00:00:05,100
Regarde ça.
```

Règles de lisibilité : 2 lignes maximum, 32 caractères par ligne environ, au moins 1 seconde par sous-titre,
coupe aux respirations, jamais au milieu d'un groupe de mots.

## 2. Incruster les sous-titres

Style « réseaux sociaux » (gros, blanc, contour noir, au tiers bas) — en 1080×1920 :

```bash
ffmpeg -i "in.mp4" -vf "subtitles=sous-titres.srt:force_style='FontName=Arial,FontSize=14,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=90'" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a copy -movflags +faststart "videos/sous-titree.mp4"
```

Attention aux chemins dans le filtre `subtitles` : lance la commande **depuis le dossier** qui contient le `.srt`
et donne-lui un nom simple sans espace ni deux-points (sous Windows, `C:` casse le filtre). Les couleurs sont
au format `&HAABBGGRR` (bleu-vert-rouge) : jaune = `&H0000FFFF`.

Garde aussi le `.srt` à côté de la vidéo : YouTube et LinkedIn acceptent les sous-titres en fichier séparé.

## 3. Un titre ou un texte à l'écran

```bash
ffmpeg -i "in.mp4" -vf "drawtext=text='3 astuces de montage':fontfile='C\:/Windows/Fonts/arialbd.ttf':fontsize=80:fontcolor=white:borderw=6:bordercolor=black:x=(w-text_w)/2:y=h*0.18:enable='between(t,0,2.5)'" -c:a copy "videos/avec-titre.mp4"
```

- `enable='between(t,0,2.5)'` : le texte n'apparaît que pendant les 2,5 premières secondes.
- Police : sous Windows `C\:/Windows/Fonts/arialbd.ttf`, sous macOS `/System/Library/Fonts/Supplemental/Arial Bold.ttf`,
  sous Linux `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`. Vérifie qu'elle existe avant de lancer.
- Une apostrophe dans le texte casse la commande : écris le texte dans un fichier et utilise `textfile=titre.txt`.

## 4. Vérifier

Fais une capture à un moment où il y a du texte (`-ss 00:00:01 -frames:v 1 verif.jpg`) et regarde-la avec l'outil Read :
le texte est-il lisible, entier, sans débordement ? Corrige avant de rendre.
