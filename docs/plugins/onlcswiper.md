# `onlcswiper` — diaporamas Swiper

Ce plugin ne crée pas de diaporamas : il en **reconnaît** dans du html écrit à la main, retrouve
la configuration javascript qui les anime, et ouvre un formulaire pour l'un et pour l'autre.

C'est ce qui le distingue d'un bloc prédéfini, dont l'éditeur possède le html du début à la fin.
La raison est simple : les pages qu'on veut rendre modifiables **existent déjà**. Une page
d'accueil réelle porte trois diaporamas, écrits par un intégrateur, avec des classes qui lui sont
propres et une configuration groupée avec dix autres choses dans un `$(document).ready`. Un outil
qui ne saurait éditer que ses propres diaporamas ne servirait à rien sur cette page.

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcswiper onlcblocks onlcwidgets'
});
```

Il n'y a **pas** de bouton « insérer un diaporama » dans la barre d'outils. Swiper doit être
chargé par le gabarit du site : poser le html d'un diaporama dans une page qui n'a pas la
bibliothèque donnerait une colonne d'images empilées, sans que rien ne l'explique.

## Comment on y accède

Le diaporama **est un bloc**. Il se déplace, se duplique et se supprime d'une pièce, et sa barre
porte le bouton qui ouvre ses réglages. Ses vues, elles, n'en sont pas : on ne peut pas en tirer
une hors de sa piste, ce qui casserait le diaporama sans rien annoncer. C'est ce que le plugin
déclare à [`onlcblocks`](onlcblocks.md) — voir « Les blocs insécables ».

Quand la barre se pose **plus haut** que le diaporama — une section qui n'en porte qu'un — le
bouton suit, avec les mêmes règles que les autres propriétés : le bloc lui-même, sinon celui que
la sélection désigne, sinon l'unique. Une section qui en contient plusieurs sans qu'aucun ne soit
sélectionné ne propose rien : mieux vaut pas de bouton qu'un bouton dont on ignore ce qu'il
ouvrira.

Un **double clic** sur le diaporama ouvre aussi le formulaire — sauf sur une image, où c'est
celui de l'image qui s'ouvre : on modifie l'image quand on vise l'image, le diaporama quand on
vise autour.

Sans `onlcblocks`, une bulle contextuelle prend le relais.

## Comment un diaporama est reconnu

Ni la classe `swiper` ni un préfixe ne suffisent. Dans une page réelle on trouve :

```html
<div class="swiper mySwiper">…</div>
<div class="swiper images-show">…</div>
<div class="swiper-reviews overflow-hidden position-relative">…</div>
```

Le troisième ne porte pas `swiper` du tout. Le seul signe constant est la **piste** —
`.swiper-wrapper` — que la bibliothèque exige : le conteneur est son parent.

## Comment les réglages sont retrouvés

Les réglages sont dans un `new Swiper('<sélecteur>', { … })`, quelque part dans un script de la
page. Le plugin relève tous ces appels, puis demande à chaque conteneur s'il correspond au
sélecteur. Un diaporama peut donc être configuré depuis n'importe quel script, dans n'importe
quel ordre.

Un appel dont le premier argument n'est pas une chaîne littérale — une variable, un nœud retrouvé
auparavant — est ignoré : on ne saurait pas à quel conteneur le rattacher.

### Le script n'est jamais exécuté

C'est le point de fond. Le contenu ne s'exécute pas dans l'éditeur — c'est la règle qui fait
qu'un bloc collé ne peut rien atteindre. Ni `eval` ni `new Function` ne sont employés.

`JSON.parse` ne convient pas davantage : les clés sont nues, les guillemets simples, il y a des
virgules finales, des commentaires, et parfois des fonctions. Le plugin **lit** donc lui-même le
littéral, caractère par caractère (`core/JsObject.ts`).

Ce qu'il ne comprend pas, il le **recopie** :

```js
new Swiper('.mySwiper', {
  spaceBetween: 30,
  delay: 2 * 60 * 1000,                      // recopié tel quel, pas remplacé par 120000
  on: { slideChange: function () { … } }     // recopié tel quel
});
```

## Ce qui est réécrit, et ce qui ne l'est pas

À l'enregistrement, seul l'**intervalle exact** du littéral est remplacé, à l'endroit où la
lecture l'a délimité :

```js
$(document).ready(function () {
    swiper = new Swiper(".mySwiper", {   ← début
        spaceBetween: 30
    });                                   ← fin
    swiper3 = new Swiper('.swiper-reviews', { … });   // pas touché
});
function showEmailAddress() { … }                     // pas touché
```

L'indentation reprend celle de la ligne de l'appel. Les options que le formulaire ne connaît pas
ressortent intactes ; celles remises à leur valeur par défaut sont retirées, pour ne pas alourdir
la configuration de lignes qui ne disent rien.

Les **sélecteurs des commandes** sont conservés quand ils existaient : une page réelle nomme
souvent ses flèches `.swiper-reviews-button-next`, et les remplacer par les classes standard
casserait le diaporama.

**Une seule chose se perd** : les commentaires écrits *dans* l'objet de configuration. Un
commentaire n'est pas une donnée ; le réattacher à la bonne ligne demanderait de mémoriser des
positions qui ne veulent plus rien dire une fois l'objet modifié. En pratique il s'agit presque
toujours d'une option mise de côté, que le formulaire propose désormais d'activer d'une case à
cocher.

## Le formulaire

| Onglet | Ce qu'on y règle |
|---|---|
| **Images** | Les vues : ajouter, retirer, réordonner, choisir l'image dans la médiathèque |
| **Défilement** | Avance automatique et son délai, boucle, glisser au doigt, molette, clavier |
| **Affichage** | Vues par écran, espacement, centrage, sens, effet, flèches, points, barre |
| **Écrans** | Les paliers qui adaptent tout cela à la largeur disponible |

Les trois derniers onglets ne servent que si les réglages ont été retrouvés. Sans appel
`new Swiper(...)`, le formulaire le dit — et propose d'en poser un, à la fin de la page, avec les
commandes que le html contient déjà.

### Les images se choisissent, elles ne s'écrivent pas

Il n'y a **pas de champ d'adresse** dans l'onglet Images : une vignette cliquable et un bouton
ouvrent la médiathèque. Personne n'écrit de mémoire `…/178069794252.webp`, et une adresse
recopiée de travers donne une vue vide sans que rien ne le dise.

Le champ d'adresse ne reparaît que si l'explorateur de médias — [`onlcmedia`](onlcmedia.md) —
n'est pas chargé : mieux vaut un champ austère que pas de moyen du tout d'indiquer une image.

Le **texte de remplacement**, lui, se saisit toujours : ce n'est pas une adresse, c'est ce que
lit un lecteur d'écran et ce qu'indexent les moteurs.

### Deux sortes de vues

Une vue est dite **d'images** quand elle ne contient que des images, et **libre** dans tous les
autres cas — un titre, un paragraphe, un bouton.

Les vues libres apparaissent dans la liste, avec un extrait de leur texte : on peut les déplacer
et les supprimer, ce sont des vues comme les autres. Mais leur contenu n'est **jamais réécrit** :
il se modifie directement dans la page. Un formulaire qui ramènerait toute vue à « une image et
un texte de remplacement » effacerait sans prévenir le titre et le bouton d'un diaporama
d'accueil.

### Les paliers d'écran

Swiper accepte deux façons de désigner un palier, et les pages réelles emploient les deux :

* une **largeur en pixels** — `768` veut dire « à partir de 768 pixels de large » ;
* un **rapport** — `@1.5` veut dire « à partir d'une fenêtre une fois et demie plus large que
  haute », ce qui suit mieux les téléphones tenus à plat.

Le formulaire propose les deux, avec leur signification écrite en toutes lettres, et trie les
paliers du plus étroit au plus large — l'ordre dans lequel ils se déclenchent.

## Ce que montre la zone d'écriture

Swiper ne s'y exécute pas — c'est la règle qui protège le back-office. Sans habillage, les vues
s'empileraient verticalement : un diaporama de huit photos occuperait huit écrans, et le reste de
la page deviendrait inatteignable.

Le diaporama se présente donc comme les blocs galerie et carte : un **bandeau** qui le nomme et
dit ce qu'il contient — « Diaporama · 4 vues · réglages retrouvés » —, un cadre où les vues
défilent horizontalement, et la phrase qui dit comment le régler. On voit les vues dans leur
ordre, on peut faire défiler pour les compter.

Ce n'est pas un aperçu fidèle et cela ne prétend pas l'être — l'aperçu visiteur, lui, exécute la
vraie bibliothèque, à condition que le gabarit la charge.

Les commandes de Swiper — flèches, points, barre — sont montrées estompées : les cacher ferait
croire qu'elles n'existent pas, alors que le formulaire propose justement de les activer.

### Comment le décor est posé

Le bandeau et la mention sont des nœuds **fantômes** — `data-mce-bogus="all"` — posés par
`core/Card`. Le html d'un diaporama appartient au rédacteur, pas à l'éditeur : ses classes, ses
vues libres, ses commandes de navigation ont été écrites à la main, et rien ici ne saurait les
reconstruire. Le cœur retire les nœuds fantômes à l'enregistrement, et la page ressort au
caractère près.

Le cadre est dessiné sur le bandeau et sur la piste, jamais sur le conteneur, qui appartient lui
aussi au rédacteur et ne doit recevoir ni classe ni style de notre fait.

> **Une différence assumée avec une galerie.** Le diaporama n'est **pas figé** : ses vues gardent
> leur texte modifiable au clavier. Une page réelle y met des avis clients, et le formulaire ne
> sait que déplacer une vue libre, pas en réécrire le contenu. Les enfermer derrière lui rendrait
> ce texte inaccessible. L'aperçu est une présentation, pas une serrure.

## Options

| Option | Défaut | Rôle |
|---|---|---|
| `onlc_swiper_inject_styles` | `true` | Habiller les diaporamas dans la zone d'écriture |
| `onlc_swiper_edit_height` | `220px` | Hauteur des vues **dans l'éditeur seulement** |

`onlc_swiper_edit_height` n'a rien à voir avec la hauteur sur le site, où c'est le contenu ou la
feuille du design qui décide.

## Commandes et API

```js
editor.execCommand('OnlcSwiper');   // ouvre le formulaire du diaporama où est le curseur

const swipers = editor.plugins.onlcswiper;
swipers.list();                     // les diaporamas de la page
swipers.slidesOf(diaporama);        // ses vues
swipers.settingsOf(diaporama);      // ses réglages, en termes du formulaire
swipers.edit(nœud);                 // ouvre le formulaire du diaporama qui contient ce nœud
```

`list()` rend pour chaque diaporama son conteneur, sa piste, l'appel qui le configure
(`Optional`) et le jeton de script qui le porte. C'est ce qui permet à un back-office de
signaler, par exemple, les diaporamas dont la configuration a disparu.
