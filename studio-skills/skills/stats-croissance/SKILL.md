---
name: stats-croissance
description: Méthode du studio pour lire les statistiques de vidéos (exports CSV ou Excel de YouTube Studio, TikTok, Instagram, ou chiffres donnés) et en tirer un plan de croissance - chiffres clés, classement des vidéos, points communs des meilleures, ce qu'il faut refaire, arrêter et tester, objectifs réalistes. À utiliser pour toute analyse de performances ou stratégie de croissance.
---

# Stats et croissance

## Règles
- On ne travaille que sur des **chiffres réels** (fichiers ou chiffres donnés par le patron). Pas de fichier : on dit comment l'exporter, on n'invente rien.
- On sépare toujours **ce qui est prouvé** (les chiffres) de **ce qui est une hypothèse** (l'interprétation).
- Peu de vidéos (moins de 10) : on le dit, les conclusions sont fragiles.

## Où trouver les chiffres (à expliquer au patron)
- **YouTube Studio** → Statistiques → Avancé → bouton de téléchargement (CSV) : vues, durée moyenne regardée, taux de clic des impressions, abonnés.
- **TikTok** (compte pro ou créateur) → Outils pour créateurs → Statistiques : vues, temps de visionnage moyen, vidéos regardées en entier, partages.
- **Instagram** (compte pro) → Tableau de bord professionnel → Statistiques : vues des Reels, comptes touchés, enregistrements, partages.
Il les dépose dans « Médias » (bouton 📤 sur le téléphone).

## Les chiffres qui comptent
| Chiffre | Ce qu'il dit |
|---|---|
| Rétention / % regardé en entier | l'accroche et le rythme tiennent-ils ? (le plus important en vidéo courte) |
| Taux de clic (YouTube) | la miniature et le titre donnent-ils envie ? |
| Partages, enregistrements | le contenu a-t-il de la valeur ? |
| Abonnés gagnés par vidéo | la vidéo fait-elle venir des gens qui restent ? |
| Vues | le résultat final (dépend de tout le reste) |

## L'analyse (Python)
```python
import pandas as pd  # si pandas manque : python3 -m pip install --user pandas openpyxl
df = pd.read_csv("Médias/export.csv")          # ou pd.read_excel(...)
print(df.columns.tolist()); print(df.head())     # d'abord comprendre les colonnes
top = df.sort_values("Vues", ascending=False)    # adapter le nom de colonne
```
Sans pandas, le module `csv` de Python suffit. Pour un graphique : matplotlib s'il est installé, sinon un tableau.

1. Les chiffres clés (total, moyenne, médiane : la médiane est plus juste quand une vidéo a explosé).
2. Le top 5 et le flop 5.
3. Les **points communs** du top : sujet, format, durée, accroche, jour et heure, présence d'un visage, son tendance.
4. L'évolution dans le temps (ça monte, ça stagne ?).

## Le plan de croissance (croissance.md)
- **3 choses à refaire** (prouvées par les chiffres), **3 à arrêter**, **3 à tester** (hypothèses, une à la fois).
- **Objectifs** de la semaine et du mois, réalistes : +10 à +30 % sur la médiane, pas « devenir viral ».
- **Rythme** de publication tenable, et les créneaux qui marchent le mieux pour ce compte.
- Les idées de vidéos qui en découlent (à envoyer aux îles Veille et Scripts).
