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

Quand le bloc survolé porte un **identifiant**, celui-ci s'affiche dans l'angle **haut droit** de
son contour : `#tarifs`. Un `id` ne se voit nulle part dans une page, et c'est pourtant lui que
visent les ancres du menu et les scripts du site ; le supprimer par inadvertance casse des liens
sans rien afficher. L'étiquette est écrite dans le contour, jamais dans le contenu : aucune mise
en page n'est décalée par son affichage.

Il répond ainsi au dessin du type, en haut à gauche : les deux repères se lisent sur la même
ligne. Il était en bas à droite, à l'opposé, et sur un bloc haut de six cents pixels on ne
voyait jamais les deux ensemble.

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
* les **décorations posées dans le document** — le jeton d'un script, celui d'un code court —
  imposent aussi leur `box-sizing`. Large de 100 % plus son retrait et son filet, un jeton
  dépassait de vingt-six pixels, et la barre de défilement réapparaissait dès que la fenêtre
  descendait sous le millier de pixels. Rien ne débordait au-dessus : c'est pourquoi la mesure
  précédente, faite sur une fenêtre large, n'avait rien trouvé ;
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

## Quel bloc l'éditeur désigne

Un même point de la page appartient à plusieurs éléments imbriqués. L'éditeur en choisit un, et
c'est celui-là qu'il entoure et qu'on manipule. Trois règles, dans cet ordre :

1. **Un bloc insécable l'emporte.** Un diaporama, un bloc prédéfini se manipulent d'une pièce :
   viser leur intérieur les désigne, eux. Voir « Les blocs insécables » ci-dessous.
2. **Le bloc parmi ses semblables.** En remontant depuis le point visé, le premier bloc qui a des
   **voisins de même rang** est retenu. C'est l'unité que le rédacteur reconnaît : celle qu'il
   peut monter, descendre ou dupliquer sans que la question « par rapport à quoi ? » se pose.
3. **Sinon, le bloc dont le parent est un conteneur** (`onlc_blocks_containers` : une ligne, une
   colonne, une section, une balise de structure), et à défaut le plus extérieur.

Un bloc **seul dans son parent** est traversé : il ne se distingue pas de ce parent, et offrir
« monter » et « descendre » là où il n'y a rien à dépasser n'aurait pas de sens. Le bouton **⤒**
remonte d'un cran quand on veut le bloc englobant.

> **Pourquoi la deuxième règle existe.** Une page écrite à la main n'a pas de grille : ses
> sections tiennent dans un `div` d'enrobage, et lui seul a le corps du document pour parent. Sans
> cette règle, toute la page se surlignait d'un seul bloc, et plus rien n'y était manipulable — ni
> les sections, ni les diaporamas qu'elles portent. Une page bâtie sur une grille, elle, se
> comporte exactement comme avant : ses blocs ont déjà un conteneur pour parent.

## Les blocs insécables

Certains objets se manipulent d'une pièce, et leur intérieur ne se manipule pas : un diaporama
Swiper, un bloc prédéfini. On les déplace, on les duplique, on les supprime entiers ; on ne tire
pas une vue hors de sa piste, ni un titre hors du bandeau qui l'a produit.

Le plugin qui possède l'objet le déclare, `onlcblocks` n'a pas à les connaître :

```ts
import * as BlockAtoms from 'hugerte/plugins/onlcshared/BlockAtoms';

BlockAtoms.declare(editor, {
  id: 'monplugin',
  match: (editor, element) => element.classList.contains('mon-objet')
});
```

`match` est une **fonction**, pas un sélecteur : ce qui définit un diaporama sur une page réelle
est d'avoir une piste `.swiper-wrapper` pour enfant direct, et deux diaporamas de la même page ne
portent pas la même classe. Un `match` qui lève une erreur vaut « non » et n'emporte que son
propre plugin.

Le registre vit sur l'objet éditeur, que tous les plugins partagent, et il est consulté au moment
où l'on cherche un bloc : **l'ordre de chargement des plugins n'a aucun effet**.

## Le type du bloc, d'un coup d'œil

Une page de travail montre une vingtaine de rectangles pointillés qui se ressemblent tous. Chaque
contour porte donc, dans son **angle haut gauche**, un dessin de seize pixels qui dit à quoi l'on
a affaire : paragraphe, titre, liste, tableau, ligne de grille, colonne, diaporama, bloc
prédéfini, script, code court, section de langue, fiche de microdonnées. L'infobulle le nomme.

Comme l'identifiant — qui lui fait face dans l'angle haut droit — il est dessiné **dans le
contour** et jamais dans le contenu : aucune mise en page n'est décalée par son affichage.

Le plugin qui possède un objet déclare le type qu'il lui reconnaît ; `onlcblocks` déclare ceux du
html ordinaire avec un rang plus élevé, pour qu'un plugin plus précis passe devant :

```ts
import * as BlockKinds from 'hugerte/plugins/onlcshared/BlockKinds';
import * as KindIcons from 'hugerte/plugins/onlcshared/ui/KindIcons';

BlockKinds.declare(editor, {
  id: 'monplugin',
  label: 'Mon objet',
  icon: KindIcons.widget,
  order: 20,
  match: (editor, element) => element.classList.contains('mon-objet')
});
```

Le premier `order` gagnant l'emporte, et un `match` qui lève une erreur vaut « non » sans priver
le reste de la page de son repère. Le registre vit sur l'objet éditeur, comme les autres : l'ordre
de chargement des plugins n'a aucun effet.

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

### Le double clic ouvre la configuration du bloc

Un **double clic** n'importe où dans la zone d'écriture ouvre la configuration de ce qu'on vient
de désigner : un lien ouvre la fenêtre du lien, une image celle de l'image, un code court son
formulaire, un diaporama sa liste de vues, un paragraphe ses propriétés. Le rédacteur n'a pas à
retrouver le bon bouton dans la barre — il ouvre ce qu'il regarde.

C'est le registre `BlockActions` lui-même qui répond, par `BlockActions.openFor` : aucun plugin
n'ajoute son propre écouteur, et un bouton déclaré comme ci-dessus devient **automatiquement**
double-cliquable.

Deux règles départagent les boutons quand plusieurs conviennent :

1. **La cible la plus profonde l'emporte.** Un double clic sur une image dans un paragraphe
   ouvre l'image, pas les propriétés du paragraphe.
2. **À profondeur égale, le plus petit `order` gagne.**

Un bouton dont la cible ne **contient** pas le nœud visé n'est jamais retenu : sans cette
condition, viser le titre d'une colonne ouvrirait l'image posée à côté.

Le double clic sait sur **quoi** on a cliqué ; la barre des blocs, elle, ne le sait pas — elle
apparaît au survol, et `BlockActions.matchIn` doit deviner sur quoi son bouton agira. `openFor`
dépose donc le nœud visé sur l'objet éditeur le temps de départager les boutons, et `matchIn` le
préfère à la sélection. Sans cela, un paragraphe portant trois icônes ne permettait d'en changer
aucune : « le seul élément de ce genre » n'existait pas, et la sélection, après un double clic sur
une icône dans un lien, désigne le lien.

Rien ne s'ouvre sur un contenu **non modifiable** — l'image d'une vue de diaporama, par exemple :
un bloc verrouillé ne répond que **dans son ensemble**, et aucun bouton visant son intérieur n'est
retenu. C'est la contrepartie de la précision ci-dessus : sans elle, viser l'image d'une vue
aurait ouvert le formulaire des images. Rien ne s'ouvre non plus quand l'éditeur
est **en lecture seule** : la barre des blocs s'y retire déjà, et le double clic ne doit pas
rouvrir par une autre porte des formulaires qui écrivent dans le document. Chaque plugin garde
par ailleurs son écouteur de secours pour le cas où `onlcblocks` n'est pas chargé, sous la garde
de `BlockActions.hasToolbar`.

### Chaque commande a son entrée de menu

Une barre d'outils est **courte**. Un projet en retire ce qui ne lui sert pas tous les jours, et
ce jour-là la fonction disparaît : le bouton des icônes a ainsi cessé d'exister pour tout un site,
parce qu'il avait été coupé d'une ligne de configuration.

Le thème ne montre en effet dans « Insertion » ou « Outils » que ce que l'option `menu` énumère,
et cette option est **remplacée**, jamais complétée : y ajouter une entrée obligeait à réécrire la
liste entière de ce menu, valeurs par défaut comprises. Personne ne le fait.

Un registre partagé, `onlcshared/ui/MenuEntries`, recompose donc l'option à partir de ce que le
projet a écrit — ou, à défaut, des listes du thème, dont il garde une copie qu'une épreuve compare
à l'original :

```ts
import * as MenuEntries from 'hugerte/plugins/onlcshared/ui/MenuEntries';

MenuEntries.declare(editor, 'insert', [ 'onlcimage', 'onlcmedialibrary' ]);
```

Voici où chaque plugin range les siennes :

| Menu | Entrées |
| --- | --- |
| Insertion | Ajouter un bloc, Ajouter des colonnes, Image, Explorateur de fichiers, Lien, Supprimer le lien, Séparateur vertical, Emojis et icônes, Blocs prédéfinis, Script JavaScript, Code source HTML, Blocs et éléments du site, Diaporama |
| Format | Langues |
| Outils | Outils de blocs, Aperçu comme un visiteur, Travailler dans une seule langue, Référencement |

Une entrée déjà présente dans la liste n'est pas ajoutée une seconde fois, et un menu que ni le
projet ni le thème ne connaissent n'est pas inventé. Le registre vit sur l'objet éditeur :
**l'ordre de chargement des plugins n'a aucun effet**.

Les boutons des **barres contextuelles** — « Modifier le script », « Hauteur du séparateur »,
« Disposition des colonnes » — n'ont pas d'entrée de menu : ils agissent sur l'objet qu'on vient
de désigner, et une commande de menu ne désigne rien. C'est le double clic qui les ouvre.

### Ce qui n'est pas modifiable ne se sélectionne pas

Un bloc marqué `contenteditable="false"` — un diaporama, un jeton de script, un bloc prédéfini —
ne se modifie pas au clavier, mais son contenu restait **sélectionnable** : on surlignait le
texte d'une vue, on croyait pouvoir le couper, et rien ne se passait. Pire, un glisser sur une
image en tirait une copie hors du bloc.

Le plugin pose donc une règle globale dans la feuille de la zone d'écriture :

```css
body [contenteditable="false"] { user-select: none; -webkit-user-select: none; }
body [contenteditable="false"] [contenteditable="true"] { user-select: text; -webkit-user-select: text; }
```

La seconde ligne compte autant que la première : un bloc verrouillé qui rouvre une **partie**
intérieure à l'écriture — le texte d'un bloc prédéfini, par exemple — la garde sélectionnable.

Le `contenteditable` lui-même est un état d'écriture, jamais du contenu : il est posé au moment
de décorer la page et retiré à l'enregistrement par le plugin qui l'a posé. Ce que l'on publie
ne le porte pas.

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
| `onlc_cdn_url` | `''` | Adresse de base des ressources statiques des plugins ONLC, sur un serveur tiers ([cdn.md](../cdn.md)) |

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
un élément en charge, et donc s'ils doivent ouvrir leur propre bulle. C'est aussi elle que
`BlockActions.openFor` interroge pour savoir quoi ouvrir sur un double clic.
