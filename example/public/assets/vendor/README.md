# Fichiers tiers

| Fichier | Origine | Licence |
| --- | --- | --- |
| `bootstrap-grid.min.css` | [Bootstrap 5.3.3](https://getbootstrap.com/), `dist/css/bootstrap-grid.min.css` | MIT — © 2011-2024 The Bootstrap Authors |

Seule la grille est incluse (conteneurs, lignes, colonnes, utilitaires d'affichage) : c'est ce
dont le plugin `onlcblocks` a besoin pour afficher les lignes et les colonnes telles qu'elles
apparaîtront sur le site. Elle est servie localement pour que la démonstration fonctionne hors
ligne ; en production, chargez la feuille de style réelle de votre site.

| `fontawesome.css` + `webfonts/fa-solid-900.woff2` | [FontAwesome Free 6.7.2](https://fontawesome.com/) — `fontawesome.min.css` et `solid.min.css` fusionnés | Icônes : CC BY 4.0 · Police : SIL OFL 1.1 · Code : MIT |

Seul le style « solid » est embarqué, c'est celui qu'utilise la démonstration
(`onlc_icons_class_prefix: 'fa-solid fa-'`). En production, chargez FontAwesome depuis votre
CDN habituel et pointez `onlc_icons_stylesheet_url` vers cette URL.
