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
| 🌐 | Langue du bloc — n'apparaît que si [`onlcmultilang`](onlcmultilang.md) est chargé |
| ＋ | Ajouter un bloc avant ou après. Le bouton du haut n'apparaît que sur le premier bloc d'un conteneur : ailleurs, celui du bas du bloc précédent occupe déjà cet espace |

Chaque bouton fait **50 × 50 pixels**, comme les commandes des dialogues. Ils étaient dessinés
pour la souris — vingt-quatre pixels, deux d'écart : au doigt on les manquait, et on attrapait
celui d'à côté, dont « Supprimer ».

Les zones « Ajouter un bloc au début » et « Ajouter un bloc à la fin » sont placées **dans le
flux du document**, avant le premier bloc et après le dernier : elles ne recouvrent jamais le
contenu. La barre d'outils, les boutons ＋ et ces zones portent `data-mce-bogus="all"` : rien
de tout cela n'est enregistré dans le contenu.

### La langue d'un bloc

Le bouton au globe ouvre, sous la barre, la liste des langues du site. Il affiche le code de
celle qui est posée — `FR`, `NL` — dès qu'il y en a une, et « Aucune — visible par tous » la
retire.

C'est le chemin le plus sûr pour marquer un bloc de média : un bandeau, une carte ou un
séparateur ne se laisse pas toujours sélectionner d'un clic, alors que la barre, elle, sait
toujours de quel bloc elle parle.

Le menu est dessiné **dans la couche de l'overlay**, pas dans l'interface du thème : un menu du
thème s'ouvrirait par-dessus l'iframe, à un autre endroit que le bouton qu'on vient de cliquer.

`onlcblocks` ne dépend pas de `onlcmultilang` — le bouton n'apparaît que si le plugin est chargé
et déclare au moins une langue, et la barre reste identique sans lui.

## Lignes et colonnes

Une **ligne** (`.row`) est un bloc comme les autres : elle se déplace, se duplique et se
supprime d'un seul geste. Une **colonne** (`col-*`) est au contraire une structure fixe : elle
n'a ni poignée ni bouton de suppression, et se règle avec la barre contextuelle qui apparaît
dès que le curseur s'y trouve (rétrécir, élargir, ajouter une colonne, supprimer la colonne).
Les blocs *à l'intérieur* d'une colonne restent bien sûr déplaçables, y compris d'une colonne
à l'autre.

Dès que le curseur entre dans une colonne, une barre contextuelle apparaît avec trois actions :
**Disposition** (les sept schémas ci-dessous), **Dupliquer la ligne** et **Supprimer la ligne**.
Changer de disposition ajoute ou retire des colonnes pour correspondre au schéma choisi ; le
contenu des colonnes retirées est déplacé dans la dernière colonne conservée, rien n'est perdu.
Le nombre de colonnes est donc toujours celui d'une disposition connue : il n'est pas possible
d'en empiler à l'infini.

Le bouton « Ajouter des colonnes » de la barre d'outils ouvre le même choix pour créer une
nouvelle ligne :

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
| `OnlcColumnAdd` / `OnlcColumnRemove` | Ajoute ou retire une colonne (commandes disponibles, absentes de l'interface par défaut) |
| `OnlcColumnResize` | Élargit (`1`) ou rétrécit (`-1`) la colonne courante (idem) |
| `OnlcBlocksToggle` | Active ou désactive l'interface en blocs |

## API du plugin

```js
const blocks = editor.plugins.onlcblocks;
blocks.isEnabled();      // interface active ?
blocks.toggle();
blocks.listBlocks();     // blocs de premier niveau
blocks.insertRow([ 6, 6 ]);
```
