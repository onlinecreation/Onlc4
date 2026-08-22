# `onlcmultilang` — pages polyglottes

Une page d'Online Création peut s'adresser à plusieurs langues à la fois. Le moteur du site
connaît deux façons de dire « ceci n'est que pour les visiteurs qui lisent le français » :

```html
[LG="fr"]Bonjour[/LG][LG="en"]Hello[/LG][LG="nl"]Hallo[/LG]

<multilang lang="fr"><h2>Nos horaires</h2><p>Du mardi au samedi.</p></multilang>
```

Les deux font exactement la même chose, et **les deux acceptent aussi bien trois mots qu'une
suite de blocs entiers** : ce n'est pas ce qu'elles encadrent qui les distingue, c'est seulement
la façon dont elles s'écrivent.

Écrites telles quelles dans un éditeur, elles sont illisibles : on ne voit ni où commence une
langue, ni ce qu'elle recouvre, et une frappe malheureuse au milieu d'un marqueur suffit à
publier la page en double, dans toutes les langues à la fois.

Le plugin les remplace donc, **le temps de l'écriture**, par des sections encadrées et nommées,
dont le contenu reste modifiable comme le reste du texte. À l'enregistrement, chacune redevient
exactement les marqueurs d'où elle vient — même écriture, même langue, au caractère près.

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcmultilang',
  toolbar: 'onlcmultilang',
  onlc_multilang_languages: [ 'fr', 'en', 'nl' ]
});
```

Le bouton ouvre un menu unique — marquer, compléter, retirer, afficher une langue. Une section
survolée ou sélectionnée affiche en plus une barre contextuelle : régler sa langue, compléter
les traductions, retirer le marquage.

## Ce que voit le rédacteur

Une section porte une **pastille** au nom de sa langue — « Français », pas « fr » — et un cadre
en pointillés. La pastille n'est pas un élément du document : c'est un `::before` de la feuille
de styles, nourri par un attribut. Elle ne peut donc être ni sélectionnée, ni effacée, ni
enregistrée par accident.

L'attribut `lang` est posé pour de bon sur chaque section : le correcteur orthographique du
navigateur vérifie « Bonjour » avec le dictionnaire français et « Hello » avec l'anglais, dans
la même page.

## Où l'on règle la langue

Deux endroits, et un seul geste dans chacun.

**Dans la barre d'outils du bloc**, celle qui apparaît au survol — là où l'on déplace, duplique
et supprime déjà. Un bouton en plus, un globe : il ouvre la liste des langues du site, et affiche
le code de celle qui est posée (`FR`, `NL`) dès qu'il y en a une. C'est le chemin habituel, et
c'est le seul qui marche à coup sûr sur un bloc de média — un bandeau, une carte, un séparateur —
qu'un clic ne parvient pas toujours à sélectionner. Il ne s'affiche pas sur les parties intérieures
d'un bloc prédéfini, où seul le marquage en ligne a un sens (voir plus bas).

**Dans le menu « Langues »** de la barre d'outils principale, pour tout le reste :

| Geste | Ce qu'il fait |
| --- | --- |
| **Définir la langue de la sélection** | quand du texte est sélectionné : marquage en ligne |
| **Définir la langue de ce bloc** | sinon : un bloc englobant autour du bloc courant |
| **Compléter les langues manquantes** | pose à côté de la section une copie pour chaque langue déclarée qui manque |
| **Afficher comme un visiteur** | ne laisse à l'écran que les sections d'une langue |

L'intitulé du premier change tout seul selon ce que le geste va faire : la règle se lit avant
d'avoir cliqué, plutôt que de s'apprendre après coup. La liste des langues commence toujours par
**« Aucune — visible par tous »**, qui retire le marquage : c'est le même geste, dans l'autre
sens, et non une commande séparée à aller chercher ailleurs.

« Compléter » est le geste qui sert tous les jours : on écrit le passage en français, et il faut
la même chose en anglais et en néerlandais. Les copies partent avec le texte français dedans —
un point de départ à traduire, plutôt qu'un cadre vide à remplir de mémoire. Relancer la
commande ne crée pas de doublon.

## Ce que le marquage englobe

Une seule règle :

* **du texte sélectionné à l'intérieur d'un seul bloc** reçoit un marquage **en ligne**, qui ne
  coupe pas le paragraphe ;
* **tout le reste** reçoit un **bloc englobant** : un bloc entier, plusieurs blocs d'affilée, une
  carte de média, ou simplement le paragraphe où se trouve le curseur.

Une sélection qui contient un élément non modifiable — la carte d'un élément de site, un bloc de
média — n'est pas « du texte » : elle reçoit donc un bloc englobant. L'entourer en ligne coupait
le marquage en deux morceaux, un avant la carte et un après.

L'englobage **déplace des nœuds** ; il ne réécrit pas de markup. Une colonne Bootstrap marquée
dans une langue garde son `col-sm-6`, et c'est son contenu qui est entouré — un `div` entre une
ligne et ses colonnes casserait la grille.

L'affichage par langue est **entièrement en css** : une classe posée sur le corps du document,
et des règles qui masquent les sections des autres langues. Rien n'est déplacé, rien n'est
retiré ; un enregistrement fait pendant un aperçu ne peut donc pas amputer la page.

### À l'intérieur d'un bloc prédéfini

Un bloc prédéfini — un bandeau, une visionneuse de pdf, une galerie — a une structure qui
appartient au plugin qui la dessine : ses classes, son placement, ses parties décoratives. Un
`div` de section glissé entre ces parties la disloque, et la prochaine relecture du bloc la
reconstruit sans lui.

À l'intérieur, seul le marquage **en ligne** est donc possible : on sélectionne du texte, on lui
donne une langue. Le globe disparaît de la barre de ces blocs — un bouton qui ne ferait rien vaut
moins que pas de bouton — et le menu « Langues » y propose, à la place du geste habituel,
« Sélectionnez du texte pour lui donner une langue ».

Le bloc **entier**, lui, se marque normalement : la section se pose autour de lui et ne touche à
rien de ce qu'il contient. C'est le moyen de réserver un bandeau à une langue. Depuis l'intérieur
du bloc, le bouton **⤒ Sélectionner le bloc parent** amène la barre sur le bloc lui-même, globe
compris.

La liste des éléments concernés se règle par `onlc_multilang_inline_only` ; une valeur vide lève
la restriction.

### Les sections comme conteneurs

Une section de bloc contient des blocs : elle figure donc dans `onlc_multilang_containers` et dans
`onlc_blocks_containers`. C'est ce qui permet de déplacer les blocs qu'elle contient et d'y en
déposer d'autres. Sans cela, une section entière comptait pour un seul bloc et son contenu était
inatteignable.

Donner une langue à un bloc **déjà dans une section** change la langue de la section, il n'en crée
pas une seconde à l'intérieur : les deux écritures du site ne s'imbriquent pas, et une section dans
une autre tairait tout ce qu'elle contient.

## Options

| Option | Défaut | Description |
| --- | --- | --- |
| `onlc_multilang_languages` | `[ 'fr', 'en', 'nl' ]` | Langues autorisées |
| `onlc_multilang_default_syntax` | `'multilang'` | Écriture des sections créées ici : `'multilang'` ou `'lg'` |
| `onlc_multilang_preview_language` | `''` | Langue affichée à l'ouverture ; vide : toutes |
| `onlc_multilang_inject_styles` | `true` | Charge `css/onlcmultilang.css` dans la zone d'édition |
| `onlc_multilang_containers` | comme `onlc_blocks_containers` | Éléments qui contiennent des blocs sans en être un : jusqu'où remonte un marquage |
| `onlc_multilang_inline_only` | `'[data-onlc-widget]'` | Éléments à l'intérieur desquels seul le marquage en ligne est possible ; vide : aucune restriction |

Une langue se déclare par son code sur deux lettres, ou par un objet quand on veut choisir
l'intitulé :

```js
onlc_multilang_languages: [
  'fr',
  { code: 'en', label: 'Anglais' },
  { code: 'nl', label: 'Néerlandais' }
]
```

Sans intitulé, le nom usuel de la langue est employé, **écrit dans cette langue** : `Français`,
`English`, `Nederlands`. C'est la convention de tous les sélecteurs de langue, et c'est ce qui
permet de reconnaître « Nederlands » sans l'avoir appris. Une langue absente de la table des
noms usuels reçoit son code en capitales.

## Les deux écritures, et laquelle choisir

|  | `<multilang lang="fr">…</multilang>` | `[LG="fr"]…[/LG]` |
| --- | --- | --- |
| Texte simple | oui | oui |
| Blocs entiers | oui | oui |
| Contenu avec un code court | **oui** | non |
| Longueur | 40 caractères | 14 caractères |

**Ce choix n'est jamais demandé au rédacteur.** Les deux écritures font la même chose sur la page
publiée ; les distinguer est une affaire de gabarit, pas de rédaction, et la faire trancher par
quelqu'un qui écrit du texte ne lui apprendrait qu'une chose — que le sujet est compliqué. Chaque
section garde donc l'écriture d'où elle vient, les nouvelles suivent
`onlc_multilang_default_syntax`, et le reste est automatique.

La différence tient à une seule chose. Le motif du site pour `[LG]` s'arrête au premier crochet
ouvrant :

```php
preg_match_all("/\[LG=\"?'?([A-Za-z][A-Za-z])\"?'?\]([^\[]*)\[\/LG\]/ims", …);
```

Un `[LG]` ne peut donc pas contenir d'élément de site. C'est pourquoi une section qui en contient
un est **enregistrée en `<multilang>` quoi qu'il arrive** : garder `[LG]` publierait les
marqueurs en toutes lettres au milieu de la page. Chaque section garde sinon l'écriture d'où
elle vient — un fichier écrit en crochets ressort en crochets.

## Fidélité au moteur du site

Les motifs de lecture reproduisent **au caractère près** ceux de `page.inc.v3.php`. C'est
délibéré, et cela va jusqu'à refuser des écritures qui sembleraient raisonnables :

| Écriture | Reconnue ? | Pourquoi |
| --- | --- | --- |
| `[LG="fr"]`, `[LG='fr']`, `[LG=fr]` | oui | les trois formes du motif du site |
| `[LG = "fr"]` | **non** | le site n'accepte aucun espace |
| `<multilang lang="fr">` | oui | |
| `<multilang  lang="fr">`, `<multilang lang='fr'>` | **non** | le site attend une espace et des guillemets doubles |
| `[LG="fra"]`, `lang="fra"` | **non** | le code fait exactement deux lettres |

Être plus tolérant serait un piège : l'éditeur montrerait une section bien reconnue là où le
site publierait les marqueurs. Une écriture non reconnue reste donc du texte ordinaire — dans
l'éditeur comme sur le site.

Deux autres cas sont conservés tels quels plutôt que convertis :

- **les sections imbriquées** — le motif du site ne sait pas les lire ; seule la plus extérieure
  est reconnue. L'éditeur n'en crée jamais — marquer une section déjà marquée change sa langue
  plutôt que d'en imbriquer une seconde — mais un glisser-déposer le peut : une section dans une
  autre s'affiche alors en rouge, avec un ⚠ sur sa pastille. Elle n'est pas corrigée en silence,
  c'est du contenu ;
- **les marqueurs qui ne se referment pas au même niveau** — un `[LG]` dans un paragraphe et son
  `[/LG]` dans le suivant. Une telle section ne peut pas devenir un élément sans déplacer du
  contenu ; elle reste en toutes lettres. C'est illisible, mais le contenu ressort intact et la
  page publiée se comporte comme avant.

Une langue rencontrée dans un fichier sans figurer dans la configuration — un site passé de
quatre langues à trois garde ses anciennes sections — n'est **jamais supprimée**. Elle est
signalée par une pastille orange, et reste modifiable : sans quoi la seule façon de la corriger
serait de l'effacer.

## Ce que le plugin ne transforme pas

Un marqueur n'est une section que s'il est du **texte de contenu**. Deux endroits où il reste ce
qu'il est, et traverse l'éditeur intact :

* **le corps d'un `script` ou d'un `style`.** Un `[LG=fr]…[/LG]` écrit dans du javascript, ou
  dans la valeur d'une fiche de microdonnées, est une donnée que le moteur du site résoudra à la
  publication. L'y transformer poserait des guillemets au milieu du code ou du json — c'est ce
  qui rendait illisible la fiche de microdonnées d'une page réelle, et faisait perdre son
  contenu à l'enregistrement ;
* **l'intérieur d'une balise.** Une page réelle porte
  `class="screen6 [LG=fr]label-fr[/LG][LG=en]label-en[/LG]"` : le moteur y choisit la classe
  selon la langue, comme il choisirait un morceau de texte. Y poser un élément revenait à écrire
  un `span` au milieu d'une balise ouvrante, qui n'en était plus une.

La nuance qui compte : l'exclusion porte sur ce qui est **strictement à l'intérieur** d'une
balise. Une balise `<multilang lang="fr">` *est* un marqueur, et sa position de départ est celle
du chevron ; l'exclure ferait disparaître cette écriture-là.

## Ce qui traverse l'éditeur

À l'ouverture :

```html
<span class="onlc-lang" lang="fr" data-onlc-lang="fr"
      data-onlc-lang-syntax="lg" data-onlc-lang-label="Français">Bonjour</span>
```

Un `span` quand la section n'encadre que du texte, un `div` dès qu'elle contient des blocs : un
`span` autour d'un `<h2>` serait défait par le nettoyeur de l'éditeur, et la section perdue avec
lui.

À l'enregistrement, l'élément entier disparaît, remplacé par ses deux marqueurs. Rien de ce qui
précède ne se retrouve dans la page publiée.

## Commandes

| Commande | Effet |
| --- | --- |
| `OnlcMarkLanguage` | Pose une langue là où l'on est (`value` : code sur deux lettres) |
| `OnlcUnmarkLanguage` | Retire le marquage, sans toucher au contenu |
| `OnlcCompleteLanguages` | Ajoute les traductions manquantes à côté de la section |
| `OnlcViewLanguage` | N'affiche qu'une langue (`value` vide : toutes) |
| `OnlcWorkInLanguage` | Ouvre le mode d'écriture dans une langue (`value` vide : referme) |

Trois valeurs interrogeables : `OnlcCurrentLanguage` (langue de la section où se trouve le
curseur), `OnlcViewedLanguage` (langue actuellement affichée seule) et `OnlcWorkLanguage` (langue
dans laquelle on écrit).

## API du plugin

```js
const langues = hugerte.activeEditor.plugins.onlcmultilang;

langues.listLanguages();          // [ { code: 'fr', label: 'Français' }, … ]
langues.usedLanguages();          // [ 'fr', 'en' ] — ce que la page emploie vraiment
langues.mark('nl');               // marque la sélection
langues.unmark();
langues.markElement(bloc, 'nl');  // sur un élément désigné, sans passer par la sélection
langues.unmarkElement(bloc);
langues.codeOfElement(bloc);      // 'nl', ou '' si le bloc n'est marqué dans aucune langue
langues.allowsBlockAt(bloc);      // false à l'intérieur d'un bloc prédéfini : là, seul l'en ligne
langues.view('en');               // n'affiche que l'anglais ; '' les rend toutes
langues.viewed();                 // 'en'
langues.work('fr');               // écrit en français : les autres masquées, les ajouts marqués
langues.working();                // 'fr', ou '' quand le mode est fermé
langues.resolve('en');            // le contenu réduit à une langue
langues.resolveHtml(page, 'en');  // la même réduction, sur une page entière
```

## Travailler dans une seule langue

Une page polyglotte montre tout à la fois — le français, l'anglais et le néerlandais empilés — et
c'est la bonne façon de la **relire**. Ce n'est pas la bonne façon de l'**écrire** : on rédige
dans une langue, et les deux autres versions doublent la hauteur de la page et brouillent la mise
en forme.

Le mode s'ouvre par « Langues › Travailler dans une seule langue ». Il n'est **jamais** actif au
départ, et se referme par « Écrire dans toutes les langues ».

Deux choses s'y produisent :

1. **ce qui appartient à une autre langue est masqué.** Le masquage est entièrement en css : une
   classe sur le corps du document, des règles qui cachent les autres sections. Rien n'est
   déplacé ni retiré — refermer le mode n'a donc rien à reconstruire, et une fausse manœuvre ne
   peut pas faire disparaître un paragraphe ;
2. **tout bloc ajouté prend cette langue.** Sans cela, écrire un paragraphe en mode « français »
   donnerait un paragraphe sans langue, publié dans les trois — l'inverse de ce qu'on venait de
   demander.

Un bandeau collant nomme la langue en haut de la zone d'écriture. Sans lui, on cherche un
paragraphe qu'on croit perdu alors qu'il est simplement dans une autre langue. Son intitulé vient
d'un attribut du corps du document, qui ne fait pas partie du contenu et ne peut donc pas se
retrouver dans la page publiée.

### Ce qui est marqué, et ce qui ne l'est pas

Seuls les **blocs entiers ajoutés au document** le sont : le texte tapé dans un paragraphe
anglais reste anglais, et c'est bien ainsi. Rien n'est marqué non plus à l'intérieur d'une
section, qui a déjà la sienne.

« Nouveau » se reconnaît par comparaison : les éléments présents à l'ouverture du mode sont
retenus, et ce qui apparaît ensuite, dont le parent était déjà connu, est un ajout. C'est le seul
moyen fiable — l'éditeur ne dit pas quels nœuds une insertion a produits, et les chemins d'ajout
sont multiples : la barre des blocs, un collage, une touche Entrée, un bloc prédéfini.

L'englobage porte sur **l'élément ajouté et lui seul**. Le premier jet passait par le marquage
ordinaire, qui cherche d'abord la portée — le bloc dont le parent est un conteneur — parce qu'il
répond à un clic visant un paragraphe et voulant le bloc. Sur une page sans grille, cette
recherche remontait jusqu'à l'enrobage, et c'est la **page entière** qui se retrouvait dans une
section de langue.

### La différence avec l'aperçu visiteur

L'aperçu **montre**, ce mode **écrit**. Ils sont présentés à part, et nommés autrement, pour
qu'on ne croie pas relire alors qu'on est en train de marquer tout ce qu'on ajoute.

## Aperçu comme un visiteur

Quand `onlcwidgets` est chargé, son aperçu visiteur montre **une seule langue** et dit laquelle :
une bande de boutons apparaît à droite des largeurs d'écran, avec les langues que la page emploie
réellement. Proposer une langue qui ne change rien à l'écran ne renseignerait personne.

La réduction est faite sur la page **assemblée**, gabarit compris, exactement dans l'ordre du
moteur du site — un gabarit d'Online Création place volontiers ses propres `[LG]` dans son
en-tête, et ils comptent autant que ceux du contenu.

## Sécurité

Les marqueurs sortent **sans échappement** : c'est la seule façon d'écrire `<multilang>` dans la
page enregistrée. Le code de langue est donc revalidé juste avant d'être écrit — deux lettres,
rien d'autre — parce qu'il vient d'un attribut, c'est-à-dire d'une chaîne qu'un contenu collé
pourrait avoir choisie. Une section dont le code ne tient pas en deux lettres perd son marquage
et **garde tout son contenu**.

Voir [la note de sécurité](../securite.md) pour l'ensemble du dispositif.
