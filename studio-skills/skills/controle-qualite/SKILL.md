---
name: controle-qualite
description: La check-list du contrôle qualité du studio - vérifier chaque livrable avant qu'il soit rendu (vidéo, son, image, script, texte, fiche de publication, code) avec des mesures (ffprobe, loudnorm, dimensions), comparer au cahier des charges et rendre un verdict VALIDÉ ou À CORRIGER avec les corrections et le métier qui doit les faire.
---

# Le contrôle qualité

Le vérificateur ne corrige rien lui-même : il **mesure**, **compare** et **dit exactement quoi corriger, et par qui**.

## 1. Relire la demande
Note le cahier des charges : formats, durées, nombre de fichiers, réseaux visés, ton, contraintes de la charte (dossier Mémoire, `charte.md`). Tout ce qui est rendu est comparé à cette liste.

## 2. Les vidéos
```bash
ffprobe -v error -show_entries format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels -of compact "videos/x.mp4"
```
- [ ] Le fichier s'ouvre, la durée est celle demandée (Shorts/Reels/TikTok : souvent moins de 60 s).
- [ ] Taille exacte : 1080×1920 pour du 9:16, 1920×1080 pour du 16:9. Codec h264, `yuv420p`, audio aac présent.
- [ ] Pas d'image noire au début ou à la fin :
```bash
ffmpeg -hide_banner -i "videos/x.mp4" -vf blackdetect=d=0.3:pix_th=0.1 -an -f null - 2>&1 | grep black_start
```
- [ ] Planche de vignettes pour vérifier le cadrage, les sous-titres (lisibles, dans la zone sûre, sans faute) et les effets :
```bash
ffmpeg -i "videos/x.mp4" -vf "fps=1/3,scale=270:-1,tile=4x4" -frames:v 1 controle-planche.jpg
```
Regarde cette planche (Read sur l'image) avant de conclure.

## 3. Le son
```bash
ffmpeg -hide_banner -i "videos/x.mp4" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | tail -n 14
ffmpeg -hide_banner -i "videos/x.mp4" -af silencedetect=n=-45dB:d=2 -f null - 2>&1 | grep silence_
```
- [ ] Volume intégré (`input_i`) entre -16 et -12 LUFS, pic (`input_tp`) sous -1.
- [ ] Pas de long silence imprévu. La musique ne couvre pas la voix (comparer avec la feuille du son).
- [ ] Licence de chaque musique et SFX téléchargé notée.

## 4. Les images (miniatures, couvertures, visuels)
```bash
python3 -c "from PIL import Image; import sys; [print(f, Image.open(f).size, Image.open(f).mode) for f in sys.argv[1:]]" visuels/*.png
```
- [ ] Dimensions exactes (miniature YouTube 1280×720, moins de 2 Mo). Texte lisible en petit (3 à 5 mots), contrastes forts, rien de coupé.

## 5. Les textes (scripts, légendes, fiches, réponses)
- [ ] Zéro faute d'orthographe ou d'accord. Phrases courtes. Ton conforme à la charte.
- [ ] Le script tient dans la durée (environ 2,5 mots par seconde à voix haute).
- [ ] Chaque chiffre a sa source. Aucune promesse fausse ou risquée.
- [ ] Les hashtags et la légende correspondent au bon réseau et à la bonne vidéo.

## 6. Le code (si la mission en contient)
- [ ] Ça se lance sans erreur (lancer le script ou ouvrir la page) ; pas de chemin complet ni de mot de passe écrit dedans.

## 7. Le verdict (controle-qualite.md)
```
# Contrôle qualité — <mission>
| Livrable | Verdict | Détail |
|---|---|---|
| videos/short-1.mp4 | ✅ | 1080×1920, 42 s, -14,1 LUFS |
| videos/short-2.mp4 | ❌ | sous-titre coupé à 0:12 → monteur : remonter les sous-titres de 120 px |
| visuels/miniature.png | ❌ | 1280×800 → designer : réexporter en 1280×720 |

Verdict : À CORRIGER (2 corrections)
```
Une correction = **quoi**, **où** (fichier et temps), **par qui** (monteur, motion, ingeson, bruiteur, designer, retoucheur, scenariste, redacteur, socialmedia, community, developpeur). Termine toujours par « Verdict : VALIDÉ » ou « Verdict : À CORRIGER ».
