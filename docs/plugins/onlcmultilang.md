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

## Les quatre gestes

| Geste | Ce qu'il fait |
| --- | --- |
| **Marquer dans une langue** | entoure la sélection — ou le paragraphe courant si rien n'est sélectionné |
| **Langue de la section…** | ouvre le formulaire : langue, écriture, et le bouton pour retirer le marquage |
| **Compléter les langues manquantes** | pose à côté de la section une copie pour chaque langue déclarée qui manque |
| **Afficher comme un visiteur** | ne laisse à l'écran que les sections d'une langue |

« Compléter » est le geste qui sert tous les jours : on écrit le passage en français, et il faut
la même chose en anglais et en néerlandais. Les copies partent avec le texte français dedans —
un point de départ à traduire, plutôt qu'un cadre vide à remplir de mémoire. Relancer la
commande ne crée pas de doublon.

L'affichage par langue est **entièrement en css** : une classe posée sur le corps du document,
et des règles qui masquent les sections des autres langues. Rien n'est déplacé, rien n'est
retiré ; un enregistrement fait pendant un aperçu ne peut donc pas amputer la page.

## Options

| Option | Défaut | Description |
| --- | --- | --- |
| `onlc_multilang_languages` | `[ 'fr', 'en', 'nl' ]` | Langues autorisées |
| `onlc_multilang_default_syntax` | `'multilang'` | Écriture des sections créées ici : `'multilang'` ou `'lg'` |
| `onlc_multilang_preview_language` | `''` | Langue affichée à l'ouverture ; vide : toutes |
| `onlc_multilang_inject_styles` | `true` | Charge `css/onlcmultilang.css` dans la zone d'édition |

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
| `OnlcMarkLanguage` | Marque la sélection (`value` : code sur deux lettres) |
| `OnlcUnmarkLanguage` | Retire le marquage, sans toucher au contenu |
| `OnlcEditLanguageSection` | Ouvre le formulaire de la section |
| `OnlcCompleteLanguages` | Ajoute les traductions manquantes à côté de la section |
| `OnlcViewLanguage` | N'affiche qu'une langue (`value` vide : toutes) |

Deux valeurs interrogeables : `OnlcCurrentLanguage` (langue de la section où se trouve le
curseur) et `OnlcViewedLanguage` (langue actuellement affichée seule).

## API du plugin

```js
const langues = hugerte.activeEditor.plugins.onlcmultilang;

langues.listLanguages();          // [ { code: 'fr', label: 'Français' }, … ]
langues.usedLanguages();          // [ 'fr', 'en' ] — ce que la page emploie vraiment
langues.mark('nl');               // marque la sélection
langues.unmark();
langues.view('en');               // n'affiche que l'anglais ; '' les rend toutes
langues.viewed();                 // 'en'
langues.resolve('en');            // le contenu réduit à une langue
langues.resolveHtml(page, 'en');  // la même réduction, sur une page entière
```

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
