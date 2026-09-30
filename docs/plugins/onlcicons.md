# onlcicons — emojis et icônes

Deux dictionnaires dans une même fenêtre : les **emojis Unicode**, dessinés par OpenMoji, et les
**icônes** de deux polices embarquées — Material Design et Font Awesome Free. Les deux se
cherchent au mot-clé et s'insèrent d'un clic.

## Les emojis deviennent des dessins

Un emoji tapé au clavier ne s'affiche pas de la même façon partout : gris et anguleux sous
Windows, rond et coloré sous Apple, encore autrement sous Android. Le visiteur ne voit donc
jamais ce que le rédacteur a vu.

Le plugin remplace chaque emoji par son dessin OpenMoji, servi en svg :

```html
<img class="onlc-emoji" src="…/openmoji/1F600.svg" alt="😀" data-onlc-emoji="1F600" loading="lazy">
```

Le texte alternatif porte l'emoji d'origine : un copier-coller depuis la page publiée redonne le
caractère, et les lecteurs d'écran l'annoncent normalement.

La transformation a lieu à la frappe, au collage et au chargement du contenu. Elle ne touche
jamais au texte à l'intérieur d'un `<code>`, d'un `<pre>`, d'un jeton de script ou d'une partie
non modifiable d'un bloc.

Les 4 495 dessins sont **embarqués dans le plugin** (`main/openmoji/`, environ 14 Mo). Rien n'est
chargé depuis un service extérieur ; le site publié doit servir les mêmes fichiers, à l'adresse
donnée par `onlc_icons_openmoji_url` — ou par `onlc_cdn_url`, qui la déplace sans qu'on ait à la
nommer.

> **Attribution obligatoire.** OpenMoji est publié sous licence CC BY-SA 4.0 : toute page qui
> affiche ces dessins doit créditer OpenMoji. Voir
> `modules/hugerte/src/plugins/onlcicons/main/LICENCES.md`.

## Les icônes

Deux familles, embarquées elles aussi — police et catalogue :

| Famille | Catalogue | Markup produit |
|---|---|---|
| Material Design | 220 icônes courantes | `<span class="material-icons onlc-icon" role="img" aria-label="maison">home</span>` |
| Font Awesome Free 6.7.2 | 1 895 icônes, catégories comprises | `<i class="fa-solid fa-house onlc-icon" role="img" aria-label="house"></i>` |

Chaque entrée retient sa famille : le markup est toujours celui que la police attend, quel que
soit le mélange affiché dans la liste. L'icône prend la taille et la couleur du texte qui
l'entoure.

Les polices sont chargées **après** l'initialisation de l'éditeur, dans le document de
l'interface et dans celui du contenu. Une feuille lente ne retarde donc jamais l'ouverture — et
comme elle est servie par le plugin, elle n'est jamais absente.

## Boutons et commandes

| Bouton | Commande | Effet |
|---|---|---|
| `onlcicons` | `OnlcIcons` | ouvre la fenêtre sur l'onglet Emojis |
| `onlcemoji` | `OnlcEmojis` | idem |
| `onlcmaterialicons` | `OnlcMaterialIcons` | ouvre la fenêtre sur l'onglet Icônes |
| — | `OnlcInsertIcon` | insère une icône désignée par son nom |

Deux compléments automatiques dans le texte : `:sourire` propose des emojis, `::maison` des
icônes.

Les trois boutons ont leur **entrée de menu**, et « Emojis et icônes… » est rangée dans
« Insertion » sans que le projet ait à configurer quoi que ce soit — voir
[`onlcblocks`](onlcblocks.md#chaque-commande-a-son-entrée-de-menu). Une barre d'outils courte ne
fait donc plus disparaître la fonction.

## Changer une icône déjà posée

Un **double clic** sur un emoji ou une icône rouvre le sélectionneur, et le choix suivant
**remplace** l'icône au lieu d'en poser une seconde à côté : l'élément est sélectionné avant
l'ouverture.

Cela vaut aussi pour les icônes qu'aucun de ces boutons n'a insérées — `<i class="fa-solid
fa-star">`, `<span class="material-icons">` — écrites à la main bien avant l'éditeur. Les
reconnaître, c'est permettre de les changer sans passer par le code source.

Un emoji est un `img`, et le plugin des médias l'ignore désormais : ses « propriétés d'image »
n'ont aucun sens sur un dessin du catalogue, dont l'adresse n'est pas celle d'un fichier du site.
C'est l'attribut `data-onlc-emoji` qui les distingue.

## Options

| Option | Type | Défaut | Rôle |
|---|---|---|---|
| `onlc_icons_families` | `string[]` | `['material', 'fontawesome']` | familles proposées ; retirez-en une pour ne charger ni sa feuille ni son catalogue |
| `onlc_icons_rewrite_emoji` | `boolean` | `true` | transforme les emojis tapés en dessins OpenMoji |
| `onlc_icons_openmoji_url` | `string` | `<base>/plugins/onlcicons/openmoji` | dossier des dessins |
| `onlc_icons_openmoji_index_url` | `string` | `<base>/plugins/onlcicons/js/openmoji.js` | liste des dessins disponibles |
| `onlc_icons_emoji_database_url` | `string` | `<base>/plugins/onlcicons/js/emojis.js` | base des emojis (partagée avec `emoticons`) |
| `onlc_icons_emoji_append` | `object` | `{}` | emojis ajoutés par le projet |
| `onlc_icons_material_url` | `string` | `''` | catalogue d'icônes servi par une api ([doc](../api/onlc-icons-api.md)) |
| `onlc_icons_material_append` | `object[]` | `[]` | icônes ajoutées en dur |
| `onlc_icons_stylesheet_url` | `string` | `''` | feuille supplémentaire, pour une police maison |
| `onlc_icons_class` | `string` | `material-icons` | classe des ligatures Material |
| `onlc_icons_class_prefix` | `string` | `fa-solid fa-` | préfixe des icônes sans famille déclarée |
| `onlc_icons_emoji_trigger` | `string` | `:` | déclencheur du complément emoji |
| `onlc_icons_icon_trigger` | `string` | `::` | déclencheur du complément icône |
| `onlc_icons_results_limit` | `number` | `300` | nombre de résultats affichés |

`<base>` est le dossier d'où l'éditeur a été chargé, ou l'adresse donnée par `onlc_cdn_url` —
voir « Servir les ressources depuis un CDN » ci-dessous. Les trois options ci-dessus restent
prioritaires : les régler à la main l'emporte sur `onlc_cdn_url`.

## Servir les ressources depuis un CDN

Ce plugin est le plus lourd du lot : 14 Mo de dessins, 400 Ko de polices d'icônes, 200 Ko de
dictionnaires. Un projet qui pose l'éditeur sur son propre serveur mais préfère faire porter ces
fichiers par un CDN indique où il a déposé le paquet :

```js
hugerte.init({ onlc_cdn_url: 'https://cdn.exemple.fr/onlc4/1.0.12' });
```

Les polices, les dessins, les dictionnaires et les feuilles partent alors de là ; l'éditeur, son
thème et ses langues restent servis par le dossier d'où il a été chargé. Voir
[cdn.md](../cdn.md) pour ce que le CDN doit renvoyer comme en-têtes — sans
`Access-Control-Allow-Origin`, les polices d'icônes sont refusées.

> **L'adresse des dessins part dans les pages.** Chaque emoji est enregistré comme
> `<img src="<onlc_icons_openmoji_url>/1F600.svg">`. Changer d'adresse plus tard ne réécrit pas
> les pages déjà enregistrées : gardez la même, ou faites servir l'ancienne en parallèle. C'est
> l'argument pour un dossier versionné (`/onlc4/1.0.12/`) qu'on ne remplace jamais.

## N'utiliser qu'une seule famille

```js
hugerte.init({
  plugins: 'onlcicons',
  onlc_icons_families: [ 'fontawesome' ]
});
```

Le catalogue Material et sa police ne sont alors ni listés ni chargés.

## Ajouter ses propres icônes

```js
hugerte.init({
  plugins: 'onlcicons',
  onlc_icons_stylesheet_url: '/assets/mes-icones.css',
  onlc_icons_material_append: [
    { name: 'logo-maison', family: 'custom', category: 'Marque', keywords: 'logo marque' }
  ],
  onlc_icons_class_prefix: 'mi mi-'
});
```

Une entrée sans famille déclarée est écrite `<i class="mi mi-logo-maison">`.

## Interface

Les vignettes font 64 × 64 pixels — au-delà du minimum de 50 recommandé pour un usage au doigt —
et la grille occupe toute la hauteur du dialogue, au lieu des 208 pixels imposés par le thème.
Une phrase en tête de chaque onglet explique ce qui va se passer au clic.

## Ce que voit le lecteur d'écran

Une icône est annoncée par son intitulé (`role="img"` et `aria-label`), un emoji par le caractère
qu'il remplace. Aucun des deux n'est un élément décoratif silencieux.
