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
| 🌐 | Langue du bloc — n'apparaît que si [`onlcmultilang`](onlcmultilang.md) est chargé, et jamais sur une partie intérieure d'un bloc prédéfini |
| ＋ | Ajouter un bloc avant ou après. Le bouton du haut n'apparaît que sur le premier bloc d'un conteneur : ailleurs, celui du bas du bloc précédent occupe déjà cet espace |
| *(à droite du filet)* | Les **propriétés** du bloc, déclarées par les plugins chargés — voir « Une seule barre » ci-dessous |

Chaque bouton fait **50 × 50 pixels**, comme les commandes des dialogues. Ils étaient dessinés
pour la souris — vingt-quatre pixels, deux d'écart : au doigt on les manquait, et on attrapait
celui d'à côté, dont « Supprimer ».

Quand le bloc survolé porte un **identifiant**, celui-ci s'affiche dans l'angle bas droit de son
contour : `#tarifs`. Un `id` ne se voit nulle part dans une page, et c'est pourtant lui que visent
les ancres du menu et les scripts du site ; le supprimer par inadvertance casse des liens sans
rien afficher. L'étiquette est écrite dans le contour, jamais dans le contenu : aucune mise en
page n'est décalée par son affichage.

Les zones « Ajouter un bloc au début » et « Ajouter un bloc à la fin » sont placées **dans le
flux du document**, avant le premier bloc et après le dernier : elles ne recouvrent jamais le
contenu. La barre d'outils, les boutons ＋ et ces zones portent `data-mce-bogus="all"` : rien
de tout cela n'est enregistré dans le contenu.

### Rien qui déborde

Deux précautions, prises parce qu'une barre de défilement horizontale apparaissait dans des pages
qui n'avaient rien à faire défiler :

* les zones d'ajout imposent leur propre `box-sizing` ; large de 100 % plus vingt-quatre pixels de
  retrait et deux de filet, une zone dépassait de vingt-six pixels dans tout document dont la
  feuille de style ne pose pas de règle globale `border-box` — c'est-à-dire la plupart ;
* les **gouttières négatives** des lignes de grille de premier niveau sont remises à zéro. Une
  ligne Bootstrap porte `margin: 0 -12px`, qu'un conteneur compense sur la page publiée ; dans la
  zone d'écriture il n'y en a pas. Seules les lignes posées directement dans le corps du document
  sont concernées : ailleurs, le retrait de la colonne ou du conteneur les compense déjà.

### La langue d'un bloc

Le bouton au globe ouvre, sous la barre, la liste des langues du site. Il affiche le code de
celle qui est posée — `FR`, `NL` — dès qu'il y en a une, et « Aucune — visible par tous » la
retire.

C'est le chemin le plus sûr pour marquer un bloc de média : un bandeau, une carte ou un
séparateur ne se laisse pas toujours sélectionner d'un clic, alors que la barre, elle, sait
toujours de quel bloc elle parle.

Le menu est dessiné **dans la couche de l'overlay**, pas dans l'interface du thème : un menu du
thème s'ouvrirait par-dessus l'iframe, à un autre endroit que le bouton qu'on vient de cliquer.

Le globe **disparaît à l'intérieur d'un bloc prédéfini** — le titre d'un bandeau, la légende
d'une visionneuse. La structure de ces blocs appartient au plugin qui la dessine, et une section
de langue glissée entre leurs parties la disloque : on y donne une langue à du texte sélectionné,
par le menu « Langues ». Le bloc entier, lui, se marque normalement ; **⤒** amène la barre sur
lui, globe compris.

Une **section de langue** compte comme un conteneur : ses blocs se déplacent et s'y déposent comme
partout ailleurs, et c'est bien le bloc visé qui reçoit la barre, pas la section.

`onlcblocks` ne dépend pas de `onlcmultilang` — le bouton n'apparaît que si le plugin est chargé
et déclare au moins une langue, et la barre reste identique sans lui.

## Une seule barre par bloc

Deux barres flottantes se disputaient l'espace au-dessus d'un bloc : celle qui le manipule et
celle qui ouvre ses réglages. La seconde s'ouvrant par-dessus la première, il fallait éloigner la
souris pour retrouver la poignée de déplacement, puis y revenir sans repasser sur le bloc.
Personne ne devine ce genre de chose.

Les plugins déclarent donc leurs boutons de propriétés dans un registre partagé,
`onlcshared/BlockActions`, que cette barre affiche à la suite de ses commandes :

| Bouton | Déclaré par | Sur quoi |
| --- | --- | --- |
| Identifiant et classes | `onlcblocks` | Tout bloc ordinaire |
| Disposition des colonnes | `onlcblocks` | Une ligne de grille |
| Modifier le bloc / l'élément | `onlcwidgets` | Un bloc prédéfini, un code court |
| Modifier le script | `onlcwidgets` | Un jeton de script |
| Modifier les microdonnées | `onlcseo` | La fiche de référencement |
| Hauteur du séparateur | `onlcspacer` | Un espace vertical |
| Modifier le diaporama | `onlcswiper` | Un diaporama Swiper |
| Propriétés de l'image | `onlcmedia` | L'image du bloc |

Aucun de ces plugins ne connaît `onlcblocks`, et `onlcblocks` ne sait pas ce que font leurs
boutons. Quand la barre des blocs **n'existe pas** — plugin absent ou désactivé — chacun rouvre sa
propre bulle contextuelle : c'est ce que `BlockActions.isHandledByToolbar` permet de savoir.

Un bouton ne s'affiche que s'il sait sur **quoi** il agira. Pour les éléments qui ne sont pas le
bloc lui-même — une image dans un paragraphe — `BlockActions.matchIn` cherche dans cet ordre :
l'élément sélectionné s'il est dans le bloc, puis le seul de son genre que le bloc contienne. Un
bloc qui en contient plusieurs sans qu'aucun ne soit sélectionné ne propose pas le bouton : mieux
vaut pas de bouton qu'un bouton dont on ne sait pas ce qu'il va ouvrir.

### Déclarer un bouton

```js
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';

BlockActions.declare(editor, {
  id: 'monprojet-encadre',
  label: 'Couleur de l’encadré',
  icon: '<svg …></svg>',   // svg en ligne : la barre vit dans la zone d'écriture
  order: 130,              // les propriétés commencent à 100
  match: (editor, bloc) => BlockActions.matchIn(editor, bloc, '.alert'),
  run: (editor, element) => ouvrirMonFormulaire(editor, element)
});
```

Une exception levée par un `match` fait disparaître **ce bouton-là**, et lui seul : un plugin qui
se trompe n'emporte pas la barre entière.

## Propriétés d'un bloc

Le premier bouton de la rangée ouvre l'identifiant et les classes du bloc — les deux poignées par
lesquelles une page réelle est tenue. Sans ce formulaire, il fallait passer par « Code source
html » et retrouver la bonne balise à la main, pour changer un mot.

* **Identifiant** : un mot sans espace, unique dans la page. Il sert d'ancre (`<a href="#tarifs">`)
  et de point d'accroche aux scripts du site. Un identifiant qui commence par un chiffre ou porte
  un accent est refusé, avec l'explication.
* **Classes CSS** : chaque classe posée devient une étiquette qu'on retire d'un clic. La saisie
  propose les classes de la **feuille de style du site** et celles des autres blocs de la page.

Deux familles de blocs en sont exclues, pour des raisons différentes :

* les **colonnes** d'une grille : leurs classes *sont* leur largeur, et les réécrire à la main
  disloquerait la ligne. On change une colonne en changeant la disposition de sa ligne ;
* les **blocs prédéfinis**, **codes courts**, **scripts** et **fiches de microdonnées** : ils ont
  leur propre formulaire, où leur identité est décrite en termes compréhensibles, et leur balise
  extérieure appartient au plugin qui les dessine.

## La feuille de style du site

```js
onlc_site_css: [ 'https://exemple.tld/design.a1b2c3.css' ],
onlc_site_css_proxy: '/api/site-css?url={url}'   // facultatif
```

Une page d'accueil réelle n'est pas modifiable si l'éditeur ne connaît pas la feuille qui
l'habille : le rédacteur voit une suite de paragraphes empilés, sans rapport avec ce que le
visiteur recevra. L'adresse déclarée sert trois fois — la zone d'écriture, l'aperçu visiteur, et
les suggestions de classes du formulaire ci-dessus.

Les feuilles sont posées sur `PreInit`, donc **après** `content_css` : c'est le design qui a le
dernier mot, ici comme sur le site.

Lire les **classes** d'une feuille servie par un autre domaine demande un relais côté serveur : le
navigateur affiche une telle feuille sans difficulté mais refuse d'en lire le texte. Voir
[l'API du relais](../api/onlc-site-css-api.md). Sans relais, la feuille habille quand même la
page ; seules les suggestions manquent, et le formulaire le dit.

Ces options sont déclarées par `onlcshared/Options` : n'importe quel plugin ONLC chargé les
enregistre, et la déclaration ne se fait qu'une fois.

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
| `onlc_blocks_containers` | `.row,.container,.container-fluid,section,article,aside,main,header,footer,[class*="col-"],.col,[data-onlc-lang]` | Éléments considérés comme des conteneurs de blocs |
| `onlc_blocks_exclude` | `li,td,th,thead,tbody,tfoot,tr,figcaption,caption,option,legend` | Éléments qui ne reçoivent jamais d'outils |
| `onlc_blocks_row_class` | `row` | Classe d'une ligne de grille |
| `onlc_blocks_breakpoint` | `sm` | Point de rupture des colonnes (`sm`, `md`, `lg`, `xl`, `xxl`, ou vide) |
| `onlc_blocks_column_class_prefix` | déduit du point de rupture | Préfixe des classes de colonne, à renseigner seulement pour un cadre non Bootstrap |
| `onlc_blocks_grid_css` | `''` | Feuille de style de la grille chargée dans la zone d'édition |
| `onlc_blocks_grid_columns` | `12` | Nombre de colonnes de la grille |
| `onlc_blocks_layouts` | 7 dispositions | Dispositions proposées (`{ text, columns: number[] }`) ; `text` sert de description accessible, la vignette est dessinée à partir de `columns` |
| `onlc_blocks_insert_items` | 11 blocs | Contenus proposés dans le panneau d'ajout |
| `onlc_blocks_inject_styles` | `true` | Charge `onlcblocks.css` dans la zone d'édition |
| `onlc_site_css` | `[]` | Feuilles de style du site — écriture, aperçu et suggestions de classes |
| `onlc_site_css_proxy` | `''` | Relais de lecture d'une feuille servie par un autre domaine |

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
| `OnlcBlockProperties` | Ouvre l'identifiant et les classes du bloc courant |
| `OnlcBlocksToggle` | Active ou désactive l'interface en blocs |

## API du plugin

```js
const blocks = editor.plugins.onlcblocks;
blocks.isEnabled();      // interface active ?
blocks.toggle();
blocks.listBlocks();     // blocs de premier niveau
blocks.insertRow([ 6, 6 ]);
blocks.blockAt(nœud);    // le bloc manipulable qui entoure ce nœud, ou null
```

`blockAt` sert aux autres plugins : c'est par elle qu'ils savent si la barre des blocs prend déjà
un élément en charge, et donc s'ils doivent ouvrir leur propre bulle.
