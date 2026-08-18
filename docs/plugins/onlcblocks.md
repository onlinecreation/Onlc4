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
  content_css: [ 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css' ]
});
```

## Interface

| Élément | Rôle |
| --- | --- |
| Poignée ⠿ | Glisser-déposer du bloc ; un trait bleu indique la position d'insertion |
| ↑ / ↓ | Déplacer le bloc avant ou après son voisin (accessible au clavier) |
| ⧉ | Dupliquer le bloc |
| ✕ | Supprimer le bloc |
| ⤒ | Sélectionner le bloc parent (colonne, ligne, section) |
| ＋ | Ajouter un bloc avant, après, au début ou à la fin de la page |

La barre d'outils et les zones d'ajout sont dessinées dans la zone d'édition mais portent
`data-mce-bogus="all"` : elles ne sont jamais enregistrées dans le contenu.

## Options

| Option | Défaut | Description |
| --- | --- | --- |
| `onlc_blocks_enabled` | `true` | Active l'interface au démarrage (`OnlcBlocksToggle` la bascule) |
| `onlc_blocks_containers` | `.row,.container,.container-fluid,section,article,aside,main,header,footer,[class*="col-"],.col` | Éléments considérés comme des conteneurs de blocs |
| `onlc_blocks_exclude` | `li,td,th,thead,tbody,tfoot,tr,figcaption,caption,option,legend` | Éléments qui ne reçoivent jamais d'outils |
| `onlc_blocks_row_class` | `row` | Classe d'une ligne de grille |
| `onlc_blocks_column_class_prefix` | `col-md-` | Préfixe des classes de colonne |
| `onlc_blocks_grid_columns` | `12` | Nombre de colonnes de la grille |
| `onlc_blocks_layouts` | 8 dispositions | Dispositions proposées (`{ text, columns: number[] }`) |
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
  { text: '2 colonnes', columns: [ 6, 6 ] },
  { text: 'Barre latérale', columns: [ 9, 3 ] }
]
```

Une ligne insérée produit :

```html
<div class="row">
  <div class="col-md-6"><p>…</p></div>
  <div class="col-md-6"><p>…</p></div>
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
