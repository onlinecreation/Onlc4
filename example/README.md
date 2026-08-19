# Exemple d'utilisation d'ONLC 4

Une page de démonstration complète, branchée sur des **API simulées** : médiathèque, liens
prédéfinis, catalogue d'icônes et éditeur d'images. Tout fonctionne hors ligne, sans
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
│   ├── media-api.js     simulation de l'API média (fichiers, dossiers, upload, versions, quotas)
│   ├── links-api.js     simulation de l'API des liens prédéfinis
│   ├── icons-api.js     simulation du catalogue d'icônes Material Design
│   ├── template-api.js  gabarit du site, pour l'aperçu visiteur
│   └── multipart.js     analyseur multipart/form-data minimal
├── public/
│   ├── index.html       page de démonstration
│   ├── assets/demo.js   configuration complète de l'éditeur, commentée
│   ├── assets/demo.css  habillage de la page
│   ├── assets/content.css  styles du contenu de l'éditeur
│   ├── assets/contenu.html  contenu de départ, **généré** (voir plus bas)
│   ├── assets/vendor/   grille Bootstrap, servie localement
│   └── pixie/           adaptateur vers Pixie, habillé Pixel•OnlineCreation
├── tools/
│   ├── build-content.js générateur du contenu de démonstration
│   └── install-pixie.js installe l'éditeur d'images Pixie (voir plus bas)
├── test/                tests des simulations d'API (yarn test-node)
├── seed/                médiathèque de départ (images SVG, un PDF)
└── storage/             espace de travail (créé au démarrage, non versionné)
```

## Le contenu de départ

`public/assets/contenu.html` n'est pas écrit à la main : il est produit par

```bash
node example/tools/build-content.js
```

C'est du **html publié** — exactement ce qu'un site enregistrerait en base. La page le charge
par `fetch()` puis le donne à l'éditeur : la démonstration met donc à l'épreuve le chemin qui
compte le plus, celui de la reprise d'une page existante, plutôt que le seul chemin de
l'insertion. Le générateur écrit lui-même les attributs de configuration en json des blocs
prédéfinis, ce qui évite de les encoder à la main.

## Ce que la démonstration couvre

| Fonctionnalité | Où la voir |
| --- | --- |
| Blocs déplaçables | Survolez un paragraphe : poignée, monter/descendre, dupliquer, supprimer |
| Colonnes Bootstrap | Bouton `Ajouter des colonnes` : les dispositions sont des schémas. La ligne se déplace d'un bloc, les colonnes restent fixes |
| Médiathèque (upload, dossiers, copie, déplacement, renommage, suppression) | Bouton `Bibliothèque` |
| Retouche et création d'images | Bouton `Retoucher` de la bibliothèque → Pixel•OnlineCreation |
| Images sans `width`/`height` | Redimensionnez une image puis cliquez sur `Enregistrer` |
| Liens prédéfinis, ancres, cible, rel | Bouton `Lien` — la liste vient de `/api/links` |
| Séparateurs verticaux | Bouton `Séparateur vertical` |
| Emojis et icônes | Boutons `Emojis` / `Icônes` : les deux polices sont embarquées dans le plugin, `/api/icons` n'ajoute qu'un catalogue maison |
| Dégradé et ombre du texte | Bloc « Un titre en dégradé » → onglet `Style du texte` ; mêmes réglages dans le texte posé sur une image |
| Script neutralisé | Le contenu contient `alert("hello")` : aucune alerte ne se déclenche, une pastille le représente |
| Blocs prédéfinis + bloc maison | Bouton `Blocs prédéfinis` (voir `onlc_widgets_custom` dans `demo.js`) |
| Script JavaScript coloré | Bouton `Script JavaScript` |
| Source HTML colorée | Bouton `Code source HTML` |
| Codes courts des gabarits | Bouton `Blocs prédéfinis`, onglets `Navigation`, `Formulaires`, `Identité`… : `[MenuSite]`, `[Contact]`, `[SocialButtons]`, `[PaypalButton]`, `[LogoSite]`, `[add-to-calendar-button]` |
| Aperçu comme un visiteur | Bouton `Aperçu` : la page dans le gabarit du site, en trois largeurs, tous les codes courts résolus |
| Versions d'un fichier | Retouchez une image dans la bibliothèque, puis rouvrez son panneau d'informations |
| Quotas | Jauge en bas de la médiathèque (60 fichiers dans la démonstration, versions comprises) |
| Suppression par maintien | Supprimez un bloc ou un fichier : il faut garder « Tout détruire » enfoncé six secondes |
| Vidéo, page intégrée, carte OpenStreetMap | Blocs prédéfinis, onglet `Médias` : dans l'éditeur ce sont des vignettes inertes, le vrai code part à l'enregistrement |
| Calendrier mensuel | Bloc `Calendrier` : grille du mois, semaines au choix, événements par jour |
| Texte déployable | Bloc `Texte déployable` (`<details>` / `<summary>`) |
| Galerie d'images | Bloc `Galerie` (nanogallery2) : mosaïque, cascade ou masonry |
| Document PDF | Bloc `Document PDF` (pdf.js), sur `seed/documents/presentation-onlc.pdf` |
| Emojis dessinés | Tapez un emoji au clavier : il devient un svg OpenMoji |
| Effet parallaxe | Propriétés d'une image → `Habillage` → `Parallaxe` |
| Interface en trois langues | Voir la section suivante |

Le panneau **HTML enregistré** affiche exactement ce qui serait stocké en base : c'est là que
l'on vérifie qu'aucune image ne porte d'attribut `width`/`height`, que les scripts sont bien
restitués sous forme de balises `<script>` et que les blocs conservent leur configuration.

### Changer la langue de l'interface

Les plugins ONLC parlent français sans configuration. Pour l'anglais ou l'espagnol, ajoutez le
paquet de langue **avant** `hugerte.init()` et déclarez `language` :

```html
<script src="/hugerte/langs/onlc/es.js"></script>
<script>hugerte.init({ language: 'es', /* … */ });</script>
```

Les paquets sont générés depuis `modules/hugerte/tools/i18n/translations.json` — voir
[`docs/i18n.md`](../docs/i18n.md).

## L'éditeur d'images

`public/pixie/` n'est pas une imitation d'éditeur : c'est l'**adaptateur** entre ONLC 4 et
[Pixie](https://pixie.vebto.com/), qui traduit le contrat postMessage décrit dans
[`docs/api/onlc-pixie-editor.md`](../docs/api/onlc-pixie-editor.md) vers l'api de Pixie.

Pixie y est habillé aux couleurs de **Pixel•OnlineCreation** — marque dans la barre, thème bleu,
interface en français — par `public/pixie/branding.js`, qui passe uniquement par les options de
configuration de Pixie : aucune feuille de style plaquée par-dessus, aucun sélecteur interne visé.

Pixie est un produit sous licence commerciale : ses fichiers ne sont pas versionnés ici.
Installez-les depuis l'archive que vous avez achetée :

```bash
node example/tools/install-pixie.js /chemin/vers/pixie.zip
```

Le script range le nécessaire (~2,5 Mo) dans `example/public/pixie/vendor/`, ignoré par git.
Ajoutez `--full` pour embarquer aussi les autocollants, les cadres et les images d'exemple
(~18 Mo). Sans installation, la page affiche la marche à suivre plutôt que de rester blanche.

Vous pouvez aussi pointer `onlc_media_image_editor_url` vers une instance déjà déployée, par
exemple `https://pixel.onlinecreation.me`.

## API simulées

Les simulations suivent à la lettre les contrats documentés :

| Simulation | Contrat | Fichier |
| --- | --- | --- |
| `/api/media` | [API média](../docs/api/onlc-media-api.md) | `api/media-api.js` |
| `/api/links` | [API des liens](../docs/api/onlc-link-api.md) | `api/links-api.js` |
| `/api/icons` | [Dictionnaires d'icônes](../docs/api/onlc-icons-api.md) | `api/icons-api.js` |
| `/api/template` | [Gabarit de l'aperçu](../docs/api/onlc-preview-api.md) | `api/template-api.js` |
| `/pixie/` | [Éditeur d'images](../docs/api/onlc-pixie-editor.md) | `public/pixie/index.html` |

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

## Tests

Les simulations d'api sont couvertes par une suite qui tourne en Node, sans navigateur :

```bash
yarn test-node        # ou : node example/test/run.js
```

Elle décrit le **contrat** attendu de n'importe quelle implémentation — versions, quotas, types
acceptés, sécurité des chemins — et pas seulement le comportement de cette simulation-ci. À lire
en complément de `docs/api/`.

Le banc d'essai est dans `example/test/harness.js` : une centaine de lignes, pour que l'exemple
reste sans dépendance npm. Les tests de l'éditeur lui-même sont ailleurs, voir
[`docs/tests.md`](../docs/tests.md).

## Fichiers tiers

`public/assets/vendor/` contient la grille Bootstrap, servie localement pour que la
démonstration fonctionne sans accès réseau. Les polices d'icônes, elles, sont embarquées dans
le plugin `onlcicons`. Leurs origines et licences sont listées dans
[`public/assets/vendor/README.md`](public/assets/vendor/README.md).

## Passer en production

Dans `public/assets/demo.js`, cinq réglages changent :

```js
// 1. L'éditeur d'images déployé
onlc_media_image_editor_url: 'https://pixel.onlinecreation.me',

// 2. Vos points d'entrée
onlc_media_api_url: 'https://exemple.tld/api/media',
onlc_link_api_url: 'https://exemple.tld/api/links',

// 3. Vos feuilles de style : la grille de votre site
onlc_blocks_grid_css: 'https://exemple.tld/css/bootstrap-grid.min.css',

// 4. Le point de rupture des colonnes, si votre maquette n'utilise pas `sm`
onlc_blocks_breakpoint: 'md',

// 5. Les bibliothèques des blocs carte, galerie et pdf, si vous les hébergez vous-même
onlc_widgets_cdn_base: 'https://exemple.tld/vendor',
```

Les polices d'icônes et les 4 495 dessins d'emojis sont embarqués dans le plugin `onlcicons` :
il n'y a rien à héberger pour eux, mais **le site publié doit servir les mêmes fichiers** pour
que les pages s'affichent comme dans l'éditeur. Les crédits obligatoires sont listés dans
`modules/hugerte/src/plugins/onlcicons/main/LICENCES.md`.

Et remplacez `content_css` par la feuille de style réelle de votre site, pour que l'édition
ressemble au rendu final.
