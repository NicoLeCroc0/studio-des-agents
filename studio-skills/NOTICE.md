# Les skills du studio : origine et licences

| Skill | Origine | Licence |
|---|---|---|
| `montage-video`, `sous-titres`, `retouche-photo`, `veille-tendances`, `script-viral`, `motion-effets`, `sound-design`, `sfx-bruitages`, `social-media`, `community-management`, `controle-qualite`, `stats-croissance`, `miniatures-ab`, `voix-doublage`, `tournage` | écrits pour le Studio des agents | MIT (comme le reste du dépôt) |
| `canvas-design`, `theme-factory`, `frontend-design`, `slack-gif-creator` | Anthropic (dépôt anthropics/skills) | Apache 2.0, texte complet dans le `LICENSE.txt` de chaque skill |
| `banner-design` | claudekit | MIT (déclarée dans l'en-tête du SKILL.md) |

Les polices fournies avec `canvas-design` gardent chacune leur licence (fichiers `*-OFL.txt` à côté des polices).

Ces skills sont chargés comme un plugin Claude Code (`--plugin-dir studio-skills`) : dans le studio, on les appelle
`studio:montage-video`, `studio:retouche-photo`, etc.
