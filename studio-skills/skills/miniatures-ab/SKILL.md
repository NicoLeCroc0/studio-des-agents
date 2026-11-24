---
name: miniatures-ab
description: Méthode du studio pour les miniatures YouTube et les couvertures TikTok/Reels qui donnent envie de cliquer, et pour les tester (A/B) - 3 variantes par angle, règles de lisibilité, dimensions, vérification en petit, plan de test et lecture des résultats. À utiliser pour toute miniature, couverture ou test de titre.
---

# Miniatures et tests A/B

## Ce qui fait cliquer
- **Une idée, lisible en une demi-seconde** : 3 à 5 mots maximum, très gros, et qui **complètent** le titre (ne le répètent pas).
- **Un point d'accroche** : un visage expressif (yeux visibles), un objet fort, ou un contraste avant/après.
- **Contrastes francs** : texte clair contour sombre (ou l'inverse), 2 ou 3 couleurs au plus (celles de la charte).
- **Rien d'important en bas à droite** sur YouTube (la durée s'affiche là).

## Les trois angles (une variante par angle)
| Angle | Exemple | Pour quel sujet |
|---|---|---|
| Émotion | visage surpris + « JE N'Y CROYAIS PAS » | storytime, réaction |
| Curiosité | objet flouté ou flèche + « ÇA ? » | astuce, révélation |
| Résultat | avant / après, chiffre géant « 10 000 € » | tuto, transformation |

## Dimensions
- YouTube : **1280×720**, JPG ou PNG, moins de 2 Mo.
- Couverture TikTok / Reels / Shorts : **1080×1920**, l'essentiel dans le carré central (la grille du profil Instagram coupe en 1080×1350 ou en carré).

## Fabriquer et vérifier
Construis en HTML/SVG ou avec Pillow (voir studio:banner-design), exporte en PNG, puis **vérifie en petit**, comme sur un téléphone :
```bash
python3 -c "from PIL import Image; im=Image.open('visuels/mini-a.png'); im.resize((320, round(320*im.height/im.width))).save('visuels/mini-a-petit.png'); print(im.size)"
```
Regarde la version petite (Read sur l'image) : si le texte ne se lit pas, il est trop long ou trop fin.
Une planche des variantes côte à côte aide à choisir :
```bash
ffmpeg -y -i visuels/mini-a.png -i visuels/mini-b.png -i visuels/mini-c.png -filter_complex "[0][1][2]hstack=inputs=3,scale=1500:-1" visuels/planche-miniatures.png
```

## Tester (A/B)
- **YouTube** : la fonction « Tester et comparer » (jusqu'à 3 miniatures, YouTube choisit selon la durée de visionnage). Laisser tourner jusqu'à ce que YouTube annonce un gagnant (souvent quelques jours à 2 semaines).
- **TikTok / Reels** : pas de test intégré fiable ; on teste **d'une vidéo à l'autre** (même format, une seule chose qui change : la couverture, ou l'accroche, ou le titre).
- **Une seule différence à la fois** si possible, sinon on ne sait pas ce qui a marché.
- Le chiffre à regarder : taux de clic **et** durée de visionnage (un titre trompeur clique bien mais fait fuir).

## Ce qu'on rend
`miniatures.md` : les variantes (fichiers), le titre associé à chacune, celle conseillée et pourquoi, et le plan de test (quoi, où, combien de temps, quand conclure).
