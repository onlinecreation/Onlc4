# Exemple d'utilisation d'ONLC 4

Une page de démonstration complète, branchée sur des **API simulées** : médiathèque, liens
prédéfinis, catalogue d'icônes et éditeur d'images Pixel. Tout fonctionne hors ligne, sans
base de données ni dépendance npm supplémentaire.

## Démarrage

```bash
# 1. Dépendances du dépôt (une seule fois)
yarn install

# 2. Compilation de l'éditeur (une seule fois, ~3 à 5 min)
yarn example-build

# 3. Serveur de démonstration
yarn example
```

Puis ouvrez <http://localhost:3000/>.

`yarn example-build` enchaîne les quatre étapes nécessaires :

| Étape | Commande | Rôle |
| --- | --- | --- |
| 1 | `yarn oxide-icons-build` | Génère le jeu d'icônes de l'interface |
| 2 | `yarn oxide-build` | Génère les habillages (skins) |
| 3 | `yarn tsc` | **Compile le TypeScript vers `modules/hugerte/lib`** |
| 4 | `yarn hugerte-rollup` | Assemble `modules/hugerte/js/hugerte/**` |

> ⚠ L'étape 3 est indispensable : `yarn hugerte-rollup` lit les fichiers JavaScript produits
> par `tsc`. Sans elle, grunt s'arrête sur `rollup:core` avec
> `Warning: No entry point specified`.

Pour relancer uniquement le serveur ensuite : `yarn example` (ou `node example/server.js`).

| Option | Effet |
| --- | --- |
| `--port 8080` | Change le port (ou variable `PORT`) |
| `--latency 400` | Latence artificielle des API, en ms, pour voir les états de chargement |
| `--reset` | Réinitialise la médiathèque à partir de `example/seed` |

## Contenu du dossier

```
example/
├── server.js            serveur HTTP sans dépendance (Node 18+)
├── api/
│   ├── media-api.js     simulation de l'API média (fichiers, dossiers, upload, Pixel)
│   ├── links-api.js     simulation de l'API des liens prédéfinis
│   ├── icons-api.js     simulation du catalogue d'icônes Material Design
│   └── multipart.js     analyseur multipart/form-data minimal
├── public/
│   ├── index.html       page de démonstration
│   ├── assets/demo.js   configuration complète de l'éditeur, commentée
│   ├── assets/demo.css  habillage de la page
│   ├── assets/content.css  styles du contenu de l'éditeur
│   ├── assets/vendor/   grille Bootstrap et FontAwesome, servis localement
│   └── pixel/index.html simulation de l'éditeur d'images Pixel
├── seed/                médiathèque de départ (images SVG)
└── storage/             espace de travail (créé au démarrage, non versionné)
```

## Ce que la démonstration couvre

| Fonctionnalité | Où la voir |
| --- | --- |
| Blocs déplaçables | Survolez un paragraphe : poignée, monter/descendre, dupliquer, supprimer |
| Colonnes Bootstrap | Bouton `Ajouter des colonnes` : les dispositions sont des schémas. La ligne se déplace d'un bloc, les colonnes restent fixes |
| Médiathèque (upload, dossiers, copie, déplacement, renommage, suppression) | Bouton `Bibliothèque` |
| Retouche et création d'images | Bouton `Retoucher` de la bibliothèque → éditeur Pixel simulé |
| Images sans `width`/`height` | Redimensionnez une image puis cliquez sur `Enregistrer` |
| Liens prédéfinis, ancres, cible, rel | Bouton `Lien` — la liste vient de `/api/links` |
| Séparateurs verticaux | Bouton `Séparateur vertical` |
| Emojis et icônes | Boutons `Emojis` / `Icônes` : le catalogue FontAwesome vient de `/api/icons` (`onlc_icons_builtin: false`) |
| Dégradé et ombre du texte | Bloc « Un titre en dégradé » → onglet `Style du texte` ; mêmes réglages dans le texte posé sur une image |
| Script neutralisé | Le contenu contient `alert("hello")` : aucune alerte ne se déclenche, une pastille le représente |
| Blocs prédéfinis + bloc maison | Bouton `Blocs prédéfinis` (voir `onlc_widgets_custom` dans `demo.js`) |
| Script JavaScript coloré | Bouton `Script JavaScript` |
| Source HTML colorée | Bouton `Code source HTML` |

Le panneau **HTML enregistré** affiche exactement ce qui serait stocké en base : c'est là que
l'on vérifie qu'aucune image ne porte d'attribut `width`/`height`, que les scripts sont bien
restitués sous forme de balises `<script>` et que les blocs conservent leur configuration.

## API simulées

Les trois simulations suivent à la lettre les contrats documentés :

| Simulation | Contrat | Fichier |
| --- | --- | --- |
| `/api/media` | [API média](../docs/api/onlc-media-api.md) | `api/media-api.js` |
| `/api/links` | [API des liens](../docs/api/onlc-link-api.md) | `api/links-api.js` |
| `/api/icons` | [Dictionnaires d'icônes](../docs/api/onlc-icons-api.md) | `api/icons-api.js` |
| `/pixel/` | [Éditeur Pixel](../docs/api/onlc-pixel-editor.md) | `public/pixel/index.html` |

Elles sont volontairement écrites de façon linéaire et commentée : reprenez-les comme
spécification exécutable pour votre propre back-office. Les fichiers sont stockés dans
`example/storage`, servis sous `/media/…`.

Essais en ligne de commande :

```bash
curl "http://localhost:3000/api/media/list?path=/photos"
curl -X POST -H 'Content-Type: application/json' \
     -d '{"path":"/","name":"nouveau-dossier"}' \
     http://localhost:3000/api/media/folder
curl -F "path=/photos" -F "file=@mon-image.png" http://localhost:3000/api/media/upload
curl http://localhost:3000/api/links
```

## Fichiers tiers

`public/assets/vendor/` contient la grille Bootstrap et FontAwesome, servis localement pour que
la démonstration fonctionne sans accès réseau. Leurs origines et licences sont listées dans
[`public/assets/vendor/README.md`](public/assets/vendor/README.md).

## Passer en production

Dans `public/assets/demo.js`, quatre réglages changent :

```js
// 1. L'éditeur d'images réel
onlc_media_image_editor_url: 'https://pixel.onlinecreation.me',

// 2. Vos points d'entrée
onlc_media_api_url: 'https://exemple.tld/api/media',
onlc_link_api_url: 'https://exemple.tld/api/links',

// 3. Vos feuilles de style : la grille et les icônes de votre site
onlc_blocks_grid_css: 'https://exemple.tld/css/bootstrap-grid.min.css',
onlc_icons_stylesheet_url: 'https://cdn.exemple.tld/fontawesome/css/all.min.css',

// 4. Le point de rupture des colonnes, si votre maquette n'utilise pas `sm`
onlc_blocks_breakpoint: 'md',
```

Et remplacez `content_css` par la feuille de style réelle de votre site, pour que l'édition
ressemble au rendu final.
