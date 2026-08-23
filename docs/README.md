# ONLC 4 — surcouche HugeRTE

Ce dépôt est un fork de [HugeRTE](https://github.com/hugerte/hugerte) enrichi des
fonctionnalités de l'éditeur ONLC 4. Tout est livré sous forme de **plugins** : le cœur de
HugeRTE n'est pas modifié, chaque fonctionnalité s'active dans l'option `plugins`.

## Plugins

| Plugin | Rôle | Documentation |
| --- | --- | --- |
| `onlcblocks` | Espace de travail en blocs déplaçables, compatible avec la grille Bootstrap | [doc](plugins/onlcblocks.md) |
| `onlcmedia` | Explorateur de fichiers, éditeur d'images, propriétés d'image (classes, texte en surimpression, lien) | [doc](plugins/onlcmedia.md) |
| `onlcresponsiveimages` | Supprime `width`/`height` des images et les remplace par une largeur en % et une hauteur auto | [doc](plugins/onlcresponsiveimages.md) |
| `onlclink` | Liens : liste prédéfinie via API, URL personnalisée, ancre, cible, rel | [doc](plugins/onlclink.md) |
| `onlcspacer` | Séparateurs verticaux d'une hauteur personnalisée (30 px par défaut) | [doc](plugins/onlcspacer.md) |
| `onlcicons` | Emojis dessinés par OpenMoji et deux polices d'icônes embarquées, avec moteur de recherche | [doc](plugins/onlcicons.md) |
| `onlcwidgets` | Blocs prédéfinis et éléments du site (codes courts), script JavaScript, source HTML, aperçu visiteur | [doc](plugins/onlcwidgets.md) |
| `onlcmultilang` | Pages polyglottes : les passages `[LG]` et `<multilang>` deviennent des sections encadrées et nommées | [doc](plugins/onlcmultilang.md) |
| `onlcseo` | Description pour les moteurs et microdonnées schema.org, uniques par page et placées en tête | [doc](plugins/onlcseo.md) |
| `onlcswiper` | Diaporamas Swiper écrits à la main : détection du html et de sa configuration javascript, formulaire | [doc](plugins/onlcswiper.md) |

`onlcshared` n'est pas un plugin : c'est la bibliothèque interne (client HTTP, section « lien »,
styles de dialogue, registres partagés — feuilles de style de publication, boutons de propriétés
des blocs, types de blocs, blocs insécables, types de `script` revendiqués —, feuille de style du
site, marqueurs de langue lus comme valeur, balises et corps de `script` d'une chaîne html)
incluse dans les plugins qui en ont besoin.

Les **registres** vivent sur l'objet éditeur, que tous les plugins partagent, et sont consultés
au moment de s'en servir. Un plugin y déclare ce qu'il sait faire sans connaître les autres, et
**l'ordre de chargement des plugins n'a aucun effet**. Une option ne peut pas jouer ce rôle : un
plugin ne peut écrire l'option d'un autre que si celui-ci a déjà été chargé, et une déclaration
qui dépend de cet ordre échoue en silence.

## Repères

| Sujet | Documentation |
| --- | --- |
| Langues de l'interface (cœur, thème et plugins) | [i18n.md](i18n.md) |
| Sécurité, neutralisation des scripts et des intégrations | [securite.md](securite.md) |
| Tests : où ils vivent, comment les lancer, comment en ajouter | [tests.md](tests.md) |

> **`onlcshortcodes` n'existe plus comme plugin.** Les codes courts font partie de
> `onlcwidgets`, avec une seule bibliothèque pour les blocs et les éléments du site. Le nom
> reste reconnu dans `plugins:` et signale qu'il faut écrire `onlcwidgets`.

## APIs à implémenter côté serveur

| API | Utilisée par | Documentation |
| --- | --- | --- |
| Médias (fichiers et dossiers) | `onlcmedia` | [onlc-media-api.md](api/onlc-media-api.md) |
| Liens prédéfinis | `onlclink`, `onlcmedia`, `onlcwidgets` | [onlc-link-api.md](api/onlc-link-api.md) |
| Éditeur d'images (Pixie, alias Pixel•OnlineCreation) | `onlcmedia` | [onlc-pixie-editor.md](api/onlc-pixie-editor.md) |
| Dictionnaires emojis/icônes | `onlcicons` | [onlc-icons-api.md](api/onlc-icons-api.md) |
| Gabarit de l'aperçu visiteur | `onlcwidgets` | [onlc-preview-api.md](api/onlc-preview-api.md) |
| Relais de lecture des feuilles de style du site (facultatif) | `onlcblocks` | [onlc-site-css-api.md](api/onlc-site-css-api.md) |

## Exemple complet

Le dossier [`example/`](../example/README.md) contient **deux** pages de démonstration, branchées
sur les mêmes API simulées (médias, liens, icônes, gabarit d'aperçu, éditeur d'images et relais de
feuilles de style) :

```bash
yarn example-build   # icônes, habillages, tsc puis rollup (~3 à 5 min)
yarn example         # http://localhost:3000
```

| Page | Ce qu'elle montre |
| --- | --- |
| `/` | Ce que l'éditeur sait **poser** dans une page : blocs, médias, codes courts, calendrier, pdf, carte |
| `/lmparts.html` | Ce qu'il sait **reprendre** : la page d'accueil d'un site marchand, avec ses diaporamas Swiper, sa parallaxe, ses ancres et ses trois langues |

## Démarrage rapide

```js
hugerte.init({
  selector: 'textarea',
  plugins: [
    'onlcblocks', 'onlcmedia', 'onlcresponsiveimages', 'onlclink',
    'onlcspacer', 'onlcicons', 'onlcwidgets', 'onlcmultilang'
  ].join(' '),
  toolbar: [
    'undo redo',
    'bold italic',
    'onlcblocksinsert onlcblocksrow',
    'onlcimage onlcmedialibrary',
    'onlclink onlcunlink',
    'onlcspacer onlcemoji onlcicons',
    'onlcwidget onlcscript onlcsource onlcmultilang onlcpreview'
  ].join(' | '),

  onlc_media_api_url: 'https://exemple.tld/api/media',
  onlc_link_api_url: 'https://exemple.tld/api/links',
  onlc_media_image_editor_url: 'https://pixel.onlinecreation.me',
  onlc_multilang_languages: [ 'fr', 'en', 'nl' ]
});
```

## Construire le fork

```bash
yarn install
yarn dev              # serveur de démos webpack (compilation à la volée)
yarn eslint           # analyse statique (aucun avertissement toléré)

# Version distribuable (fichiers js/hugerte/**) :
yarn oxide-icons-build && yarn oxide-build   # icônes et habillages
yarn tsc                                     # TypeScript → modules/hugerte/lib
yarn hugerte-rollup                          # bundles → modules/hugerte/js/hugerte
```

`yarn tsc` doit précéder `yarn hugerte-rollup` : le rollup assemble les fichiers produits par
TypeScript. Le raccourci `yarn example-build` enchaîne ces trois commandes.

Les pages de démonstration de chaque plugin se trouvent dans
`modules/hugerte/src/plugins/<nom>/demo/html/demo.html`.

### Ressources régénérables

Trois jeux de données sont produits par des scripts, et versionnés tels quels :

```bash
# Dessins OpenMoji embarqués (4 495 svg + leur index)
node modules/hugerte/tools/openmoji/build-openmoji.js <dossier openmoji/color/svg>

# Catalogue Font Awesome Free (1 895 icônes, catégories comprises)
node modules/hugerte/tools/openmoji/build-fontawesome.js <dossier @fortawesome/fontawesome-free>

# Paquets de langue : d'abord ceux du cœur, puis les chaînes ONLC ajoutées aux mêmes fichiers
node modules/hugerte/tools/i18n/build-langs.js
node modules/hugerte/tools/openmoji/build-i18n.js

# Couverture des traductions, module par module
node modules/hugerte/tools/i18n/coverage.js
```

Les licences des ressources embarquées — OpenMoji (CC BY-SA 4.0), Font Awesome Free (SIL OFL 1.1
et MIT), Material Icons (Apache 2.0) — sont rappelées dans
`modules/hugerte/src/plugins/onlcicons/main/LICENCES.md`. **L'attribution d'OpenMoji est
obligatoire sur les pages qui affichent ses dessins.**

Une icône d'interface est par ailleurs écrite en dur dans le code, et non produite par ces
générateurs : le dessin de traduction du bouton `onlcmultilangwork`
(`plugins/onlcmultilang/main/ts/ui/Icons.ts`), fourni par le projet, qui en détient la licence.

## Corrections apportées au cœur et au thème

Le fork corrige quelques défauts rencontrés en développant les plugins ; ils sont signalés ici
pour faciliter une remontée éventuelle en amont.

| Fichier | Correction |
| --- | --- |
| `themes/silver/ui/dialog/ImagePreview.ts` | `imagepreview` acceptait sa valeur uniquement sous forme validée. Dans un panneau à onglets, un onglet relit ses champs puis les réécrit tels quels : la boîte de dialogue plantait au hasard (`data.zoom is undefined`). |
| `themes/silver/ui/alien/DialogTabHeight.ts` | La hauteur des onglets était calculée d'après la fenêtre, sans tenir compte de la hauteur propre du dialogue : les boutons du bas se retrouvaient coupés. |
| `oxide/…/dialog.less` | `min-height: 0` sur le corps du dialogue : un contenu haut poussait le pied de page hors du cadre. La chaîne complète (`content-js` → `body` → `form`) est complétée par `onlcshared/ui/DialogStyles`, qui s'applique sans recompiler l'habillage. |
| `Gruntfile.js` (copie des icônes) | Le pack d'icônes s'enregistrait sur le global `tinymce`, inexistant dans HugeRTE : aucune icône ne se chargeait hors webpack. |
| `core/init/Render.ts` | Le chargement du paquet de langue sautait le code `en` : TinyMCE n'en livre aucun, son interface étant écrite en anglais. Ici les plugins sont écrits en français, et c'est donc l'anglais qui a besoin d'être traduit. Le cas particulier est retiré, et `langs/en.js` est livré comme les autres. **Conséquence** : `language` valant `en` par défaut, une configuration qui ne la précise pas obtient une interface anglaise. |
| `themes/silver/ui/menus/menubar/Integration.ts` | Les listes par défaut des menus sont désormais **exportées**. L'option `menu` remplace la liste d'un menu et ne la complète jamais : un plugin qui veut y ranger une entrée doit connaître ces listes. Voir `onlcshared/ui/MenuEntries`, dont une épreuve compare sa copie à l'original. |

## Principes d'interface

- **Responsive** : toutes les boîtes de dialogue utilisent les grilles de HugeRTE et restent
  utilisables sur un écran de téléphone ; les barres d'outils contextuelles suivent l'élément
  sélectionné.
- **Simplicité** : une action = un bouton, les réglages avancés sont regroupés dans des onglets
  secondaires.
- **Lisibilité pour un nouvel arrivant** : les listes de blocs affichent un nom *et* une phrase
  qui explique à quoi le bloc sert, les dispositions de colonnes sont montrées par un schéma, et
  l'action principale d'une boîte de dialogue est un bouton libellé, pas une icône seule.
- **Confort tactile** : dans les dialogues, chaque cible cliquable fait au moins 50 × 50 pixels —
  boutons de validation, vignettes d'emojis et d'icônes, commandes des listes, actions de la
  médiathèque.
- **Aperçus inertes** : une vidéo, une carte ou une page intégrée s'affichent en vignette pendant
  l'écriture. On peut cliquer, sélectionner et déplacer le bloc sans jamais déclencher le média.
- **Langue** : quatre langues sont livrées — français, anglais, espagnol, néerlandais. Une seule
  option les choisit, `language:`, et le fichier chargé traduit aussi bien le cœur que les
  plugins. L'option vaut `en` par défaut : précisez `language: 'fr'` pour une interface française
  (voir [i18n.md](i18n.md)).
- **Une seule barre par bloc** : les réglages d'un bloc — modifier, identifiant et classes,
  hauteur, disposition des colonnes — sont dans **sa** barre de manipulation, à droite d'un filet,
  et non dans une seconde bulle ouverte par-dessus. Chaque plugin y déclare ses boutons par
  `onlcshared/BlockActions`, sans connaître `onlcblocks` ni savoir s'il est chargé ; quand la
  barre des blocs n'existe pas, chacun garde sa bulle contextuelle.
- **Le type d'un bloc, d'un coup d'œil** : chaque contour porte dans son angle haut gauche un
  dessin de seize pixels qui dit à quoi l'on a affaire — paragraphe, ligne de grille, diaporama,
  fiche de microdonnées. Chaque plugin déclare les types qu'il reconnaît par
  `onlcshared/BlockKinds` ; sans lui, vingt rectangles pointillés se ressemblent tous.
- **Les blocs insécables** : un diaporama, un bloc prédéfini se manipulent d'une pièce. On les
  déplace, on les duplique, on les supprime entiers ; leur intérieur n'est pas manipulable, faute
  de quoi on pourrait tirer une vue hors de sa piste et casser le diaporama sans rien annoncer. Le
  plugin qui possède l'objet le déclare par `onlcshared/BlockAtoms` — voir
  [onlcblocks](plugins/onlcblocks.md).
- **Ce qui n'est pas du texte de contenu ne se réécrit pas** : plusieurs plugins réécrivent la
  chaîne html brute avant l'analyse, faute de pouvoir faire autrement — un code court n'est pas un
  élément. Ces réécritures s'arrêtent aux portes d'un `script`, d'un `style` et de **l'intérieur
  d'une balise** (`onlcshared/text/RawElements`). Trois défauts sont venus de là, tous sur du
  contenu réel : un `[LG=fr]…[/LG]` dans une valeur json, qui rendait la fiche illisible ; le même
  dans un attribut `class`, qui disloquait la balise ; et un `[l]` du mouchard Google Tag Manager
  d'un gabarit, pris pour un code court et effacé.
- **Rien qui dépende de la page d'accueil** : les dialogues vivent dans le document du
  back-office, pas dans un cadre à part. Une règle css que cette page écrit sur un **nom
  d'élément** — `pre`, `textarea`, `summary`, `iframe` — atteint donc l'interface de l'éditeur.
  Chaque composant déclare lui-même ce dont il a besoin (hauteur, débordement, marqueur de liste)
  plutôt que de compter sur les valeurs par défaut du navigateur. Deux bugs sont venus de là : un
  `pre { max-height: 340px }` qui coupait l'éditeur de code à la dix-septième ligne, et un
  `summary { display: block }` qui effaçait le chevron du texte déployable.
