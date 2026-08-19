# ONLC 4 — surcouche HugeRTE

Ce dépôt est un fork de [HugeRTE](https://github.com/hugerte/hugerte) enrichi des
fonctionnalités de l'éditeur ONLC 4. Tout est livré sous forme de **plugins** : le cœur de
HugeRTE n'est pas modifié, chaque fonctionnalité s'active dans l'option `plugins`.

## Plugins

| Plugin | Rôle | Documentation |
| --- | --- | --- |
| `onlcblocks` | Espace de travail en blocs déplaçables, compatible avec la grille Bootstrap | [doc](plugins/onlcblocks.md) |
| `onlcmedia` | Explorateur de fichiers, éditeur Pixel, propriétés d'image (classes, texte en surimpression, lien) | [doc](plugins/onlcmedia.md) |
| `onlcresponsiveimages` | Supprime `width`/`height` des images et les remplace par une largeur en % et une hauteur auto | [doc](plugins/onlcresponsiveimages.md) |
| `onlclink` | Liens : liste prédéfinie via API, URL personnalisée, ancre, cible, rel | [doc](plugins/onlclink.md) |
| `onlcspacer` | Séparateurs verticaux d'une hauteur personnalisée (30 px par défaut) | [doc](plugins/onlcspacer.md) |
| `onlcicons` | Emojis dessinés par OpenMoji et deux polices d'icônes embarquées, avec moteur de recherche | [doc](plugins/onlcicons.md) |
| `onlcwidgets` | Blocs prédéfinis et éléments du site (codes courts), script JavaScript, source HTML, aperçu visiteur | [doc](plugins/onlcwidgets.md) |

`onlcshared` n'est pas un plugin : c'est la bibliothèque interne (client HTTP, section « lien »,
styles de dialogue) incluse dans les plugins qui en ont besoin.

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
| Éditeur d'images (Pixie / Pixel) | `onlcmedia` | [onlc-pixel-editor.md](api/onlc-pixel-editor.md) |
| Dictionnaires emojis/icônes | `onlcicons` | [onlc-icons-api.md](api/onlc-icons-api.md) |
| Gabarit de l'aperçu visiteur | `onlcwidgets` | [onlc-preview-api.md](api/onlc-preview-api.md) |

## Exemple complet

Le dossier [`example/`](../example/README.md) contient une page de démonstration branchée sur
des API simulées (médias, liens, icônes, gabarit d'aperçu et éditeur d'images) :

```bash
yarn example-build   # icônes, habillages, tsc puis rollup (~3 à 5 min)
yarn example         # http://localhost:3000
```

## Démarrage rapide

```js
hugerte.init({
  selector: 'textarea',
  plugins: [
    'onlcblocks', 'onlcmedia', 'onlcresponsiveimages', 'onlclink',
    'onlcspacer', 'onlcicons', 'onlcwidgets'
  ].join(' '),
  toolbar: [
    'undo redo',
    'bold italic',
    'onlcblocksinsert onlcblocksrow',
    'onlcimage onlcmedialibrary',
    'onlclink onlcunlink',
    'onlcspacer onlcemoji onlcicons',
    'onlcwidget onlcscript onlcsource onlcpreview'
  ].join(' | '),

  onlc_media_api_url: 'https://exemple.tld/api/media',
  onlc_link_api_url: 'https://exemple.tld/api/links',
  onlc_media_image_editor_url: 'https://pixel.onlinecreation.me'
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

# Paquets de langue anglais et espagnol
node modules/hugerte/tools/openmoji/build-i18n.js
```

Les licences des ressources embarquées — OpenMoji (CC BY-SA 4.0), Font Awesome Free (SIL OFL 1.1
et MIT), Material Icons (Apache 2.0) — sont rappelées dans
`modules/hugerte/src/plugins/onlcicons/main/LICENCES.md`. **L'attribution d'OpenMoji est
obligatoire sur les pages qui affichent ses dessins.**

## Corrections apportées au cœur et au thème

Le fork corrige quelques défauts rencontrés en développant les plugins ; ils sont signalés ici
pour faciliter une remontée éventuelle en amont.

| Fichier | Correction |
| --- | --- |
| `themes/silver/ui/dialog/ImagePreview.ts` | `imagepreview` acceptait sa valeur uniquement sous forme validée. Dans un panneau à onglets, un onglet relit ses champs puis les réécrit tels quels : la boîte de dialogue plantait au hasard (`data.zoom is undefined`). |
| `themes/silver/ui/alien/DialogTabHeight.ts` | La hauteur des onglets était calculée d'après la fenêtre, sans tenir compte de la hauteur propre du dialogue : les boutons du bas se retrouvaient coupés. |
| `oxide/…/dialog.less` | `min-height: 0` sur le corps du dialogue : un contenu haut poussait le pied de page hors du cadre. La chaîne complète (`content-js` → `body` → `form`) est complétée par `onlcshared/ui/DialogStyles`, qui s'applique sans recompiler l'habillage. |
| `Gruntfile.js` (copie des icônes) | Le pack d'icônes s'enregistrait sur le global `tinymce`, inexistant dans HugeRTE : aucune icône ne se chargeait hors webpack. |

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
- **Langue** : les libellés sont en français par défaut ; l'anglais et l'espagnol se chargent en
  ajoutant un fichier (voir [i18n.md](i18n.md)).
