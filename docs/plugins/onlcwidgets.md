# `onlcwidgets` — script, source HTML et blocs prédéfinis

Trois outils réunis dans un même plugin :

1. **Script JavaScript** (`onlcscript`) : insérer ou modifier un script, avec coloration
   syntaxique.
2. **Code source HTML** (`onlcsource`) : éditer le HTML de la page, avec coloration syntaxique
   et indentation.
3. **Blocs prédéfinis** (`onlcwidget`) : une bibliothèque de blocs prêts à l'emploi qui restent
   modifiables après insertion.

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcwidgets',
  toolbar: 'onlcwidget onlcscript onlcsource'
});
```

## 1. Script JavaScript

La boîte de dialogue propose le code (éditeur coloré, tabulation, numéros de ligne), un fichier
externe (`src`), le type MIME, l'emplacement souhaité dans la page et les indicateurs `async` et
`defer`.

Dans la zone d'édition, un script est représenté par un **jeton** non éditable montrant ses trois
premières lignes, suivies d'une ligne « … » s'il en reste : de quoi le reconnaître d'un coup
d'œil sans l'ouvrir. Rien n'est exécuté pendant l'édition. Un double clic ou la barre contextuelle
rouvre la boîte de dialogue.

Le widget HTML suit la même règle : l'éditeur montre son nom et les trois premières lignes de son
code, la page reçoit le code lui-même.

À l'enregistrement, la pastille redevient une vraie balise :

```html
<script type="text/javascript" defer data-onlc-position="body-end">
  console.log('bonjour');
</script>
```

`data-onlc-position` n'est écrit que si l'emplacement choisi n'est pas « à l'emplacement du
curseur » ; c'est à votre gabarit de page de déplacer le script vers le `<head>` ou la fin du
`<body>`.

### L'éditeur de code

Les deux couches — le texte coloré et la zone de saisie transparente posée par-dessus — doivent
se replier exactement de la même façon, faute de quoi le curseur et le texte se désynchronisent.
Deux décisions en découlent :

* **aucun défilement horizontal** : les lignes trop longues reviennent à la ligne, y compris au
  milieu d'un mot. Une url ou un code minifié d'un seul tenant reste entièrement lisible ;
* **un numéro par ligne logique**, dessiné dans la couche colorée elle-même. Une gouttière
  séparée se décalerait dès qu'une ligne se replie ; ici, le numéro appartient à la ligne.

## 2. Code source HTML

Ouvre le HTML complet du contenu dans l'éditeur coloré. À l'enregistrement, le contenu est
réinjecté dans une transaction d'annulation : `Ctrl+Z` revient à l'état précédent.

L'indentation appliquée à l'affichage est volontairement prudente : seules les frontières entre
éléments de type bloc sont mises en forme, le contenu de `pre`, `textarea`, `script` et `style`
n'est jamais modifié.

## 3. Blocs prédéfinis

La bibliothèque s'ouvre sur une recherche et un onglet par catégorie.

| Bloc | Catégorie | Champs principaux |
| --- | --- | --- |
| Bouton d'appel à l'action | Actions | texte, lien, cible, `rel`, style, taille, alignement, pleine largeur |
| Hero | Mise en avant | titre, sous-titre, image de fond, hauteur, voile, bouton, **style du texte** |
| Bloc de texte | Contenu | titre, texte, alignement, largeur maximale, **style du texte** |
| Texte déployable | Contenu | titre cliquable, texte déplié, déplié au chargement, présentation |
| Calendrier du mois | Contenu | titre, mois, premier jour de la semaine, couleur, rendez-vous |
| Séparateur | Contenu | hauteur, espace ou filet, couleur, largeur |
| Citation | Contenu | citation, auteur, source |
| Image | Médias | fichier, texte alternatif, légende, largeur, alignement, lien |
| Galerie d'images | Médias | liste ordonnée d'images avec intitulé, disposition, taille, espacement |
| Vidéo | Médias | adresse YouTube / Vimeo / Dailymotion ou autre, format, lecture auto, boucle, sourdine |
| Page intégrée (iframe) | Médias | adresse, titre, format ou hauteur fixe, défilement |
| Carte | Médias | lieu (recherche d'adresse), épingle, hauteur, déplaçable, zoom molette |
| Document PDF | Médias | fichier, titre, hauteur, nombre de pages, téléchargement |
| Agenda partagé | Médias | adresse de l'agenda, affichage, hauteur |
| Widget HTML | Avancé | code HTML fourni par un service tiers |

Trois dispositions pour la galerie : **mosaïque carrée**, **cascade** (rangées justifiées) et
**maçonnerie** (colonnes). Le rendu est confié à
[nanogallery2](https://nanogallery2.nanostudio.org/), et l'agrandissement au clic vient avec.

Le calendrier du mois est du **html statique** : la grille du mois demandé, les rendez-vous
inscrits jour par jour, sans aucun script. Il reste lisible même si le javascript est désactivé.

Lorsque les autres plugins ONLC sont chargés, la bibliothèque propose en plus des raccourcis
vers l'image de la bibliothèque média (`onlcmedia`), les emojis et icônes (`onlcicons`) et le
séparateur réglable (`onlcspacer`).

### Médias : inertes pendant l'écriture, complets à la publication

Une vidéo ou une carte vivante dans la zone d'édition pose trois problèmes à la fois : elle
capte les clics — on ne peut plus sélectionner ni déplacer le bloc —, elle se retrouve en bac à
sable et reste noire, et elle se superpose aux blocs voisins.

Les blocs média affichent donc une **vignette inerte** : un cadre, une image ou un damier de
tuiles, le nom du bloc et son adresse. Rien qu'un `div` et des `span`. Un clic sélectionne le
bloc, la barre contextuelle propose « Modifier le bloc ».

| Bloc | Ce que montre l'éditeur |
|---|---|
| Vidéo | la vignette du service, quand il en publie une (YouTube) |
| Page intégrée | un cadre avec l'adresse |
| Carte | un damier de tuiles OpenStreetMap, centré au pixel près sur le lieu choisi |
| Galerie | les premières images de la galerie |
| Document PDF | le nom du fichier |

Ces blocs sont marqués `canonical` : au moment de l'enregistrement, leur contenu est
**reconstruit à partir de leur configuration**. La page reçoit exactement le code prévu — sans
l'attribut `sandbox` que le cœur ajoute aux iframes, et sans trace de la vignette.

Le chemin inverse existe aussi : quand du html déjà publié est rechargé, chaque bloc est
redessiné à partir de sa configuration. L'éditeur n'affiche donc jamais le code destiné au
visiteur.

L'option `onlc_widgets_iframe_exclusions` reste disponible pour les intégrations d'un projet
qui, elles, doivent rester vivantes dans l'éditeur.

### Dépendances CDN et aperçu

Un bloc peut déclarer les feuilles de style et les scripts dont il a besoin. Ils sont écrits en
tête de son code HTML, de sorte qu'un bloc copié reste autonome :

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" …>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" … defer></script>
<div class="onlc-leaflet" style="height: 360px; width: 100%"></div>
<script>/* initialisation de la carte */</script>
```

Le navigateur ignore une feuille ou un script déjà chargés : plusieurs blocs du même type sur
une page ne se gênent pas.

Les dépendances peuvent dépendre de la configuration : `assets` accepte aussi une fonction. Le
bloc carte ne charge Leaflet que si la carte est déclarée déplaçable ; en plan simple, il
n'entraîne aucune dépendance.

Le javascript ne s'exécutant pas dans la zone d'édition, un bloc fournit son aperçu avec
`renderEditor`, comme décrit plus haut.

La cartographie est **OpenStreetMap**, et uniquement elle : aucune clé d'api à obtenir, et
l'adresse des visiteurs n'est envoyée à aucun service commercial. Le formulaire du bloc carte
cherche l'adresse avec Nominatim, montre le résultat sur un plan que l'on peut recentrer d'un
clic, et laisse les coordonnées modifiables à la main.

### Style du texte : couleur, dégradé et ombre

Le bloc de texte et le hero ont un onglet **Style du texte** avec une couleur simple, un
dégradé (couleur de départ, couleur d'arrivée, angle) et une ombre portée (décalages,
flou, couleur). Renseigner les deux couleurs du dégradé remplace la couleur simple :

```html
<div class="onlc-widget__inner"
     style="background-image: linear-gradient(45deg, #006ce7, #e0007a);
            -webkit-background-clip: text; background-clip: text;
            -webkit-text-fill-color: transparent; color: transparent;
            text-shadow: 0px 2px 6px rgba(0, 0, 0, 0.25)">…</div>
```

Ce sont exactement les réglages du texte posé sur une image dans
[`onlcmedia`](onlcmedia.md) : le code est partagé entre les deux plugins.

### Modifier un bloc

Un bloc inséré conserve sa configuration dans `data-onlc-widget-config` : le sélectionner puis
utiliser la barre contextuelle (ou double-cliquer) rouvre son formulaire. Les zones marquées
`data-onlc-slot` (titres, textes, citations) restent éditables directement dans la page : leur
contenu est conservé lors d'une modification tant que le champ correspondant n'est pas changé
dans le formulaire.

```html
<div class="onlc-widget onlc-widget--cta" data-onlc-widget="cta"
     data-onlc-widget-config="%7B%22label%22%3A%22En%20savoir%20plus%22%7D">
  <div class="onlc-widget__inner" style="text-align: center">
    <a class="onlc-btn btn btn-primary" href="/contact">En savoir plus</a>
  </div>
</div>
```

Les parties décoratives (iframes, voiles, aperçus) portent la classe `onlc-widget__static` :
elles sont rendues non éditables dans l'éditeur uniquement.

## Options

| Option | Défaut | Description |
| --- | --- | --- |
| `onlc_widgets_custom` | `[]` | Blocs supplémentaires (voir ci-dessous) |
| `onlc_widgets_exclude` | `[]` | Identifiants de blocs à masquer |
| `onlc_widgets_class_prefix` | `'onlc-widget'` | Classe et préfixe des blocs |
| `onlc_widgets_video_ratio` | `'56.25%'` | Format vidéo par défaut |
| `onlc_widgets_cdn_base` | `https://cdnjs.cloudflare.com/ajax/libs` | Adresse de base de Leaflet, nanogallery2, jQuery et pdf.js |
| `onlc_widgets_geocoder_url` | `https://nominatim.openstreetmap.org/search` | Service de recherche d'adresse du bloc carte |
| `onlc_widgets_iframe_exclusions` | hôtes des intégrations livrées | Hôtes dont les iframes ne sont pas mises en bac à sable dans l'éditeur |
| `onlc_widgets_inject_styles` | `true` | Charge `onlcwidgets.css` dans la zone d'édition |
| `onlc_script_default_type` | `'text/javascript'` | Type MIME proposé |
| `onlc_script_positions` | 3 emplacements | Emplacements proposés pour un script |
| `onlc_script_allow_src` | `true` | Autorise les scripts externes (`src`) |
| `onlc_code_tab_size` | `2` | Taille d'une tabulation dans les éditeurs de code |
| `onlc_code_line_numbers` | `true` | Affiche les numéros de ligne |
| `onlc_source_pretty_print` | `true` | Indente le HTML à l'ouverture du code source |

### Ajouter un bloc maison

```js
onlc_widgets_custom: [
  {
    id: 'horaires',
    label: 'Horaires',
    description: 'Tableau des horaires d’ouverture',
    category: 'Contenu',
    icon: 'insert-time',
    fields: [
      { name: 'titre', label: 'Titre', type: 'text' },
      { name: 'semaine', label: 'Semaine', type: 'text', half: true },
      { name: 'weekend', label: 'Week-end', type: 'text', half: true },
      { name: 'note', label: 'Note', type: 'textarea', tab: 'Détails' }
    ],
    defaults: { titre: 'Nos horaires', semaine: '9h – 18h', weekend: 'Fermé', note: '' },
    render: (c) =>
      `<h3>${c.titre}</h3><ul><li>Semaine : ${c.semaine}</li><li>Week-end : ${c.weekend}</li></ul>`
  }
]
```

Types de champ disponibles : `text`, `textarea`, `number`, `url`, `image`, `select`
(avec `items`), `checkbox`, `color` et `code` (avec `language` : `html`, `javascript` ou `css`).
`half: true` place deux champs côte à côte, `tab: 'Nom'` les répartit en onglets.

Champs facultatifs de la définition :

| Champ | Rôle |
| --- | --- |
| `description` | Phrase affichée sous le nom dans la bibliothèque : dites à quoi sert le bloc |
| `renderEditor` | Aperçu affiché dans l'éditeur, quand il doit différer de la page publiée |
| `canonical` | Reconstruit le bloc depuis sa configuration à l'enregistrement (intégrations) |
| `assets` | `{ css: [...], js: [...] }` chargés depuis un CDN, écrits en tête du bloc |

Un identifiant identique à un bloc intégré le remplace ; `render` reçoit la configuration
complétée par `defaults` et doit renvoyer du HTML **déjà échappé**.

## Commandes

| Commande | Effet |
| --- | --- |
| `OnlcScript` | Ouvre l'éditeur de script (sur celui sélectionné le cas échéant) |
| `OnlcRemoveScript` | Supprime le script sélectionné |
| `OnlcSourceCode` | Ouvre le code source HTML |
| `OnlcWidgetLibrary` | Ouvre la bibliothèque de blocs |
| `OnlcInsertWidget` | Insère un bloc (`value` : identifiant, ex. `'cta'`) |
| `OnlcEditWidget` | Modifie le bloc sélectionné |
| `OnlcRemoveWidget` | Supprime le bloc sélectionné |

## API du plugin

```js
const widgets = editor.plugins.onlcwidgets;
widgets.listWidgets();                        // définitions disponibles
widgets.insertWidget('cta', { label: 'Devis', url: '/devis' });
widgets.getSource();                          // HTML formaté
widgets.setSource('<p>Bonjour</p>');
```
