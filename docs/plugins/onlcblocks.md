# `onlcblocks` — espace de travail en blocs

Chaque élément qui se comporte comme un bloc (`display: block`, `flex`, `grid` ou `list-item`)
reçoit, au survol, une barre d'outils flottante permettant de le **déplacer**, le **dupliquer**
ou le **supprimer**. Des zones d'ajout apparaissent en début de page, entre deux blocs et en fin
de page. Les lignes et colonnes Bootstrap sont gérées nativement.

Inspiration : Gutenberg, Editor.js, GrapesJS, WPBakery.

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcblocks',
  toolbar: 'onlcblocksinsert onlcblocksrow onlcblocks',

  // La grille du site doit être chargée dans la zone d'édition, sinon les colonnes
  // s'empilent dans l'éditeur alors qu'elles seront côte à côte sur la page publiée.
  onlc_blocks_grid_css: '/assets/bootstrap-grid.min.css',
  onlc_blocks_breakpoint: 'sm'
});
```

`onlc_blocks_grid_css` ajoute la feuille indiquée au contenu de l'éditeur. Vous pouvez aussi
passer par `content_css` : les deux fonctionnent, l'option est là pour que la grille suive le
plugin même si `content_css` change.

## Interface

| Élément | Rôle |
| --- | --- |
| Poignée ⠿ | Glisser-déposer du bloc ; un trait bleu indique la position d'insertion |
| ↑ / ↓ | Déplacer le bloc avant ou après son voisin (accessible au clavier) |
| ⧉ | Dupliquer le bloc |
| ✕ | Supprimer le bloc |
| ⤒ | Sélectionner le bloc parent (colonne, ligne, section) |
| ＋ | Ajouter un bloc avant ou après. Le bouton du haut n'apparaît que sur le premier bloc d'un conteneur : ailleurs, celui du bas du bloc précédent occupe déjà cet espace |

Les zones « Ajouter un bloc au début » et « Ajouter un bloc à la fin » sont placées **dans le
flux du document**, avant le premier bloc et après le dernier : elles ne recouvrent jamais le
contenu. La barre d'outils, les boutons ＋ et ces zones portent `data-mce-bogus="all"` : rien
de tout cela n'est enregistré dans le contenu.

## Lignes et colonnes

Une **ligne** (`.row`) est un bloc comme les autres : elle se déplace, se duplique et se
supprime d'un seul geste. Une **colonne** (`col-*`) est au contraire une structure fixe : elle
n'a ni poignée ni bouton de suppression, et se règle avec la barre contextuelle qui apparaît
dès que le curseur s'y trouve (rétrécir, élargir, ajouter une colonne, supprimer la colonne).
Les blocs *à l'intérieur* d'une colonne restent bien sûr déplaçables, y compris d'une colonne
à l'autre.

Le bouton « Ajouter des colonnes » ouvre un choix de dispositions présentées sous forme de
schémas :

| Schéma | Colonnes (sur 12) |
| --- | --- |
| ⅓ + ⅔ | `4, 8` |
| ⅔ + ⅓ | `8, 4` |
| ½ + ½ | `6, 6` |
| ⅓ + ⅓ + ⅓ | `4, 4, 4` |
| ¼ + ¼ + ¼ + ¼ | `3, 3, 3, 3` |
| ½ + ¼ + ¼ | `6, 3, 3` |
| ¼ + ¼ + ½ | `3, 3, 6` |

Le point de rupture est `sm` par défaut : une ligne produit `col-sm-4`, `col-sm-8`… Changez
`onlc_blocks_breakpoint` pour `md`, `lg`, `xl`, `xxl`, ou une chaîne vide pour des colonnes
`col-4` sans point de rupture.

## Options

| Option | Défaut | Description |
| --- | --- | --- |
| `onlc_blocks_enabled` | `true` | Active l'interface au démarrage (`OnlcBlocksToggle` la bascule) |
| `onlc_blocks_containers` | `.row,.container,.container-fluid,section,article,aside,main,header,footer,[class*="col-"],.col` | Éléments considérés comme des conteneurs de blocs |
| `onlc_blocks_exclude` | `li,td,th,thead,tbody,tfoot,tr,figcaption,caption,option,legend` | Éléments qui ne reçoivent jamais d'outils |
| `onlc_blocks_row_class` | `row` | Classe d'une ligne de grille |
| `onlc_blocks_breakpoint` | `sm` | Point de rupture des colonnes (`sm`, `md`, `lg`, `xl`, `xxl`, ou vide) |
| `onlc_blocks_column_class_prefix` | déduit du point de rupture | Préfixe des classes de colonne, à renseigner seulement pour un cadre non Bootstrap |
| `onlc_blocks_grid_css` | `''` | Feuille de style de la grille chargée dans la zone d'édition |
| `onlc_blocks_grid_columns` | `12` | Nombre de colonnes de la grille |
| `onlc_blocks_layouts` | 7 dispositions | Dispositions proposées (`{ text, columns: number[] }`) ; `text` sert de description accessible, la vignette est dessinée à partir de `columns` |
| `onlc_blocks_insert_items` | 11 blocs | Contenus proposés dans le panneau d'ajout |
| `onlc_blocks_inject_styles` | `true` | Charge `onlcblocks.css` dans la zone d'édition |

### Ajouter un contenu au panneau d'insertion

```js
onlc_blocks_insert_items: [
  { text: 'Paragraphe', icon: 'paragraph', html: '<p>Nouveau paragraphe</p>', group: 'Texte' },
  { text: 'Bloc prédéfini', icon: 'template', command: 'OnlcWidgetLibrary', group: 'Blocs' },
  { text: 'Encadré', icon: 'notice', html: '<div class="alert alert-info">Message</div>', group: 'Mise en page' }
]
```

Un élément fournit soit `html` (inséré tel quel), soit `command` (+ `value` facultatif) : c'est
ainsi que les autres plugins ONLC (`onlcmedia`, `onlcspacer`, `onlcwidgets`) apparaissent dans
le panneau.

### Dispositions de colonnes

```js
onlc_blocks_layouts: [
  { text: '½ + ½', columns: [ 6, 6 ] },
  { text: '¾ + ¼ (barre latérale)', columns: [ 9, 3 ] }
]
```

Une ligne insérée produit :

```html
<div class="row">
  <div class="col-sm-6"><p>…</p></div>
  <div class="col-sm-6"><p>…</p></div>
</div>
```

## Commandes

| Commande | Effet |
| --- | --- |
| `OnlcBlockInsert` | Ouvre le panneau d'ajout (`value` : `start`, `end`, `before`, `after`) |
| `OnlcBlockMoveUp` / `OnlcBlockMoveDown` | Déplace le bloc actif |
| `OnlcBlockDuplicate` / `OnlcBlockRemove` | Duplique ou supprime le bloc actif |
| `OnlcBlockSelectParent` | Sélectionne le bloc parent |
| `OnlcInsertRow` | Insère une ligne de grille (`value` : largeurs, ex. `'8-4'`) |
| `OnlcColumnAdd` / `OnlcColumnRemove` | Ajoute ou retire une colonne dans la ligne courante |
| `OnlcColumnResize` | Élargit (`1`) ou rétrécit (`-1`) la colonne courante |
| `OnlcBlocksToggle` | Active ou désactive l'interface en blocs |

## API du plugin

```js
const blocks = editor.plugins.onlcblocks;
blocks.isEnabled();      // interface active ?
blocks.toggle();
blocks.listBlocks();     // blocs de premier niveau
blocks.insertRow([ 6, 6 ]);
```
