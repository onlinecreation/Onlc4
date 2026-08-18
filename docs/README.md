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
| `onlcicons` | Dictionnaire d'emojis Unicode et d'icônes Material Design, avec moteur de recherche | [doc](plugins/onlcicons.md) |
| `onlcwidgets` | Script JavaScript, source HTML et bibliothèque de blocs prédéfinis | [doc](plugins/onlcwidgets.md) |

`onlcshared` n'est pas un plugin : c'est la bibliothèque interne (client HTTP, section « lien »)
incluse dans les plugins qui en ont besoin.

## APIs à implémenter côté serveur

| API | Utilisée par | Documentation |
| --- | --- | --- |
| Médias (fichiers et dossiers) | `onlcmedia` | [onlc-media-api.md](api/onlc-media-api.md) |
| Liens prédéfinis | `onlclink`, `onlcmedia`, `onlcwidgets` | [onlc-link-api.md](api/onlc-link-api.md) |
| Éditeur d'images Pixel | `onlcmedia` | [onlc-pixel-editor.md](api/onlc-pixel-editor.md) |
| Dictionnaires emojis/icônes | `onlcicons` | [onlc-icons-api.md](api/onlc-icons-api.md) |

## Exemple complet

Le dossier [`example/`](../example/README.md) contient une page de démonstration branchée sur
des API simulées (médias, liens, icônes et éditeur Pixel) :

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
    'onlcwidget onlcscript onlcsource'
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

## Principes d'interface

- **Responsive** : toutes les boîtes de dialogue utilisent les grilles de HugeRTE et restent
  utilisables sur un écran de téléphone ; les barres d'outils contextuelles suivent l'élément
  sélectionné.
- **Simplicité** : une action = un bouton, les réglages avancés sont regroupés dans des onglets
  secondaires.
- **Langue** : les libellés sont en français, comme le reste de l'interface ONLC.
