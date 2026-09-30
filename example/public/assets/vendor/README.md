# Fichiers tiers

| Fichier | Origine | Licence |
| --- | --- | --- |
| `bootstrap-grid.min.css` | [Bootstrap 5.3.3](https://getbootstrap.com/), `dist/css/bootstrap-grid.min.css` | MIT — © 2011-2024 The Bootstrap Authors |

Seule la grille est incluse (conteneurs, lignes, colonnes, utilitaires d'affichage) : c'est ce
dont le plugin `onlcblocks` a besoin pour afficher les lignes et les colonnes telles qu'elles
apparaîtront sur le site. Elle est servie localement pour que la démonstration fonctionne hors
ligne ; en production, chargez la feuille de style réelle de votre site.

## Et FontAwesome ?

La démonstration ne l'embarque plus ici : le plugin `onlcicons` sert lui-même les polices
Font Awesome Free et Material Design, et les charge dans l'interface comme dans le document de
contenu. Rien n'est à héberger côté page. Les crédits obligatoires sont
listés dans `modules/hugerte/src/plugins/onlcicons/main/LICENCES.md`.
