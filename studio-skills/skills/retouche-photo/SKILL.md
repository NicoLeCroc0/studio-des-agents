---
name: retouche-photo
description: Recettes de retouche photo du studio avec Python et Pillow - redresser, recadrer aux formats des réseaux, corriger lumière, contraste, couleurs et netteté, détourer sur fond uni, ajouter un filigrane, convertir et redimensionner par lots, faire une planche avant/après. À utiliser pour toute retouche ou préparation d'images.
---

# Retouche photo avec Python et Pillow

Règles du studio :
- Les originaux (dossier Médias) ne sont **jamais** modifiés : on écrit dans le dossier de la mission (`photos/`).
- Naturel d'abord : de petites corrections, jamais de couleurs criardes ni de peau en plastique.
- Vérifie que Pillow est là : `python -c "import PIL; print(PIL.__version__)"`. Sinon : `python -m pip install --user pillow`
  (sous Windows, `python` ; ailleurs, souvent `python3`).
- Écris un petit script `retouche.py` dans le dossier de la mission, lance-le, puis **regarde le résultat** avec l'outil Read
  (il affiche les images) avant de le rendre.

## Le script de base

```python
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

SRC = Path(r"CHEMIN/DU/DOSSIER/Médias")   # donné par Max
OUT = Path("photos"); OUT.mkdir(exist_ok=True)
EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff"}

def ouvrir(p):
    im = Image.open(p)
    im = ImageOps.exif_transpose(im)          # remet la photo dans le bon sens
    return im.convert("RGB") if im.mode not in ("RGB", "RGBA") else im

def retouche(im, lumiere=1.05, contraste=1.08, couleurs=1.06, nettete=1.15):
    im = ImageOps.autocontrast(im.convert("RGB"), cutoff=0.5)   # étire l'histogramme en douceur
    im = ImageEnhance.Brightness(im).enhance(lumiere)
    im = ImageEnhance.Contrast(im).enhance(contraste)
    im = ImageEnhance.Color(im).enhance(couleurs)
    return ImageEnhance.Sharpness(im).enhance(nettete)

def format_reseau(im, w, h):
    return ImageOps.fit(im, (w, h), method=Image.LANCZOS, centering=(0.5, 0.45))  # recadre et redimensionne

for p in sorted(SRC.iterdir()):
    if p.suffix.lower() not in EXT: continue
    im = retouche(ouvrir(p))
    im.save(OUT / f"{p.stem}-retouche.jpg", quality=92, optimize=True, progressive=True)
    print("ok", p.name, im.size)
```

Adapte les réglages photo par photo : une photo sombre demande `lumiere=1.15`, une photo déjà vive `couleurs=1.0`.
Le HEIC (iPhone) demande `pip install pillow-heif` puis `from pillow_heif import register_heif_opener; register_heif_opener()`.

## Formats des réseaux (`format_reseau`)

| Usage | Taille |
|---|---|
| Instagram carré / portrait | 1080×1080 / 1080×1350 |
| Story, Reel, TikTok | 1080×1920 |
| LinkedIn, Facebook (lien) | 1200×627 |
| Miniature YouTube | 1280×720 |
| Bannière LinkedIn | 1584×396 |
| Couverture YouTube | 2560×1440 |

`centering=(0.5, 0.45)` garde un peu plus le haut (les visages) ; ajuste si le sujet est ailleurs.

## Recettes

**Redresser un horizon penché de 2°** : `im.rotate(-2, resample=Image.BICUBIC, expand=False)` puis recadre un peu les bords.

**Réchauffer / refroidir** :
```python
r, g, b = im.split()
r = r.point(lambda v: min(255, int(v * 1.04)));  b = b.point(lambda v: int(v * 0.96))   # plus chaud
im = Image.merge("RGB", (r, g, b))
```

**Noir et blanc contrasté** : `ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(1.25)`

**Adoucir le bruit (photo de nuit)** : `im.filter(ImageFilter.MedianFilter(3))`, puis un peu de `Sharpness`.

**Vignettage léger** : multiplie l'image par un masque radial (dégradé `Image.radial_gradient("L")` inversé, flou, à 20 %).

**Filigrane / logo en bas à droite** :
```python
logo = Image.open(SRC / "logo.png").convert("RGBA")
logo.thumbnail((im.width // 6, im.height // 6))
base = im.convert("RGBA"); m = im.width // 40
base.alpha_composite(logo, (base.width - logo.width - m, base.height - logo.height - m))
im = base.convert("RGB")
```

**Détourer sur fond uni** (fond blanc ou très uni) : passe le fond en transparent par seuil de couleur, puis
adoucis le bord (`ImageFilter.GaussianBlur(1)` sur le masque) et enregistre en **PNG**. Pour un vrai détourage sur
fond complexe, regarde si `rembg` est installé (`python -c "import rembg"`) ; sinon dis-le dans le rapport
(`pip install rembg`) au lieu de rendre un détourage raté.

**Convertir et alléger un lot pour le web** : `im.thumbnail((2000, 2000))`, puis `save(..., "WEBP", quality=85)`.

**Planche avant / après** (pour montrer le travail) :
```python
def avant_apres(a, b, h=600):
    a = a.copy(); b = b.copy(); a.thumbnail((10_000, h)); b.thumbnail((10_000, h))
    out = Image.new("RGB", (a.width + b.width + 20, h), "white")
    out.paste(a, (0, 0)); out.paste(b, (a.width + 20, 0)); return out
```

## Rendre le travail

Dans le rapport, pour chaque photo : le nom du fichier rendu, sa taille en pixels, et ce que tu as fait
(« lumière +10 %, recadrage 4:5, filigrane »). Joins une planche avant/après des 2 ou 3 plus belles.
