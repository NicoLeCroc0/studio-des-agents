---
name: voix-doublage
description: Méthode du studio pour la voix et le doublage - transformer un script en texte annoté prêt à enregistrer (pauses, mots appuyés, ton), conseils d'enregistrement au téléphone, vérification d'une prise avec ffmpeg (durée, débit, silences, volume), et traduction de sous-titres et de textes pour d'autres langues. À utiliser pour toute voix off, prise de voix ou traduction.
---

# Voix et doublage

## Le texte prêt à enregistrer (voix-<titre>.md)
- Une phrase par ligne. `/` = petite pause, `//` = grande pause.
- Les **MOTS À APPUYER** en majuscules (un ou deux par phrase, pas plus).
- Le ton entre crochets au début d'un passage : `[énergique]`, `[confidence]`, `[sourire]`, `[sérieux]`.
- La durée visée et le débit : environ **2,5 mots par seconde** pour une vidéo courte dynamique (3 si c'est très rythmé).
```
[énergique] Tu fais CETTE erreur / tous les matins. //
[confidence] Et elle te coûte / DEUX heures par semaine.
```

## Enregistrer au téléphone (conseils à donner au patron)
- Pièce calme, avec des rideaux ou des vêtements autour (moins d'écho). Pas de cuisine ni de salle de bain.
- Téléphone à 15–20 cm de la bouche, un peu sur le côté (moins de souffle sur les « p »).
- Mode avion. Une prise par paragraphe ; si on se trompe, on marque une pause et on reprend la phrase entière.
- Déposer le fichier dans « Médias » (bouton 📤 depuis le téléphone).

## Vérifier une prise (ffmpeg)
```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 "Médias/voix.m4a"
ffmpeg -hide_banner -i "Médias/voix.m4a" -af silencedetect=n=-40dB:d=0.6 -f null - 2>&1 | grep -E "silence_(start|end)"
ffmpeg -hide_banner -i "Médias/voix.m4a" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume"
```
- Débit = nombre de mots du texte ÷ durée parlée. Trop lent (< 2 mots/s) ou trop rapide (> 3,5) : on le dit.
- Silences de plus de 0,6 s : à couper au montage (donner leurs temps au monteur).
- `max_volume` à 0 dB : la prise sature (à refaire). `mean_volume` sous -30 dB : trop faible (l'ingé son pourra remonter, mais avec du souffle).
Le nettoyage et le mixage, c'est l'ingé son (studio:sound-design).

## Traduire (sous-titres, titres, légendes)
- On traduit **le sens et le ton**, pas mot à mot. L'accroche reste une accroche ; les jeux de mots sont remplacés par un équivalent qui marche dans la langue.
- Sous-titres : mêmes temps que l'original (on ne touche qu'au texte), 42 caractères au plus par ligne, 2 lignes au plus. Fichier `sous-titres-en.srt`, `-es.srt`…
- Les chiffres, les unités et les dates au format du pays (1,5 → 1.5 en anglais ; 10 000 € → €10,000).
- Titre, légende et hashtags **du pays** (les hashtags se cherchent dans la langue, pas se traduisent).
- On signale ce qui ne se traduit pas bien (référence culturelle, jeu de mots) et ce qu'on a choisi à la place.
