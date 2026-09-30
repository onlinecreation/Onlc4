# `onlcwidgets` — blocs, éléments du site, script et source HTML

Tout ce qu'on pose dans une page sans l'écrire à la main :

1. **Blocs prédéfinis et éléments du site** (`onlcwidget`) : une bibliothèque unique de blocs
   prêts à l'emploi — bandeau, galerie, carte, calendrier — et des codes courts des gabarits
   Online Création (`[MenuSite]`, `[Contact]`…). Les uns comme les autres restent modifiables
   après insertion.
2. **Script JavaScript** (`onlcscript`) : insérer ou modifier un script, avec coloration
   syntaxique.
3. **Code source HTML** (`onlcsource`) : éditer le HTML de la page, avec coloration syntaxique
   et indentation.
4. **Aperçu visiteur** (`onlcpreview`) : la page entière, gabarit du site compris.

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcwidgets',
  toolbar: 'onlcwidget onlcscript onlcsource onlcpreview'
});
```

> **Les codes courts ont rejoint ce plugin.** `onlcshortcodes` était un plugin séparé ; il n'a
> plus de raison de l'être. Un bandeau Hero et un menu de site sont deux choses différentes pour
> le programme — l'un est du html, l'autre un code que le serveur remplace — mais la même pour le
> rédacteur : un élément qu'on choisit dans une liste et qu'on règle dans un formulaire. Le nom
> `onlcshortcodes` reste reconnu dans `plugins:` et signale simplement qu'il faut écrire
> `onlcwidgets`.

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

Le jeton **compte son retrait dans sa largeur**. Large de 100 % plus douze pixels de retrait de
chaque côté et un de filet, il dépassait sinon de vingt-six pixels dans tout document dont la
feuille de style ne pose pas de règle globale `border-box` — c'est-à-dire la plupart — et la zone
d'écriture montrait une barre de défilement horizontale dès que la fenêtre descendait sous le
millier de pixels. Le contenu de la page décide de son propre `box-sizing` ; les décorations de
l'éditeur décident du leur. Le jeton d'un code court suit la même règle.

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
| Texte déployable | Contenu | titre cliquable, texte déplié, déplié au chargement, présentation. Le chevron est **dessiné par la feuille du plugin**, pas emprunté au marqueur natif : celui-ci n'a pas la même forme d'un navigateur à l'autre, ne se style pas de la même façon, et disparaît au premier `summary { display: block }` du thème du site — le titre devenait alors un texte en gras sur lequel rien n'invitait à cliquer |
| Calendrier du mois | Contenu | titre, mois, premier jour de la semaine, couleur, rendez-vous |
| Séparateur | Contenu | hauteur, espace ou filet, couleur, largeur |
| Citation | Contenu | citation, auteur, source |
| Image | Médias | fichier, texte alternatif, légende, largeur, alignement, lien |
| Galerie d'images | Médias | liste ordonnée d'images avec intitulé, disposition, taille, espacement |
| Vidéo | Médias | adresse YouTube / Vimeo / Dailymotion ou autre, format, lecture auto, boucle, sourdine |
| Page intégrée (iframe) | Médias | adresse, titre, format ou hauteur fixe, défilement |
| Carte | Médias | lieu (recherche d'adresse), épingle, hauteur, déplaçable, zoom molette |
| Document PDF | Médias | fichier, titre, hauteur, nombre de pages, téléchargement. L'adresse du fichier est **rendue absolue à l'exécution**, contre la base de la page : pdf.js la résout contre `window.location`, jamais contre `<base>`, et refusait `/media/document.pdf` dès que la page n'avait pas d'adresse hiérarchique — dans un aperçu, elle n'en a pas |
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
| `onlc_script_ignored_types` | `[]` | Types de `script` laissés intacts : ce sont des données, pas du code, et un autre plugin les prend en charge — voir ci-dessous |
| `onlc_code_tab_size` | `2` | Taille d'une tabulation dans les éditeurs de code |
| `onlc_code_line_numbers` | `true` | Affiche les numéros de ligne |
| `onlc_source_pretty_print` | `true` | Indente le HTML à l'ouverture du code source |
| `onlc_shortcodes_custom` | `[]` | Codes courts propres au projet |
| `onlc_shortcodes_exclude` | `[]` | Codes intégrés à ne pas proposer |
| `onlc_shortcodes_show_unknown` | `true` | Transforme aussi les codes inconnus en blocs |
| `onlc_shortcodes_inject_styles` | `true` | Charge `onlcshortcodes.css` dans la zone d'édition |
| `onlc_preview_template_url` | `''` | Adresse de l'api rendant le gabarit du site |
| `onlc_preview_template` | `''` | Gabarit donné directement ; prioritaire sur l'adresse |
| `onlc_preview_values` | `{}` | Valeurs des codes courts dans l'aperçu |
| `onlc_preview_css` | `content_css` de l'éditeur | Feuilles du **site** dans l'aperçu ; celles des plugins s'y ajoutent toujours |
| `onlc_preview_sandbox` | `allow-scripts allow-same-origin allow-popups allow-forms allow-presentation` | Jetons du bac à sable du cadre d'aperçu |

### Les `script` qui ne sont pas du code

Un `script` de type `application/ld+json` ne contient que des données : personne ne l'exécute, et
en faire un jeton de code le rendrait illisible. `onlc_script_ignored_types` liste les types que
le plugin laisse traverser intacts.

Deux sources s'additionnent : cette option, par laquelle le **projet** ajoute les siennes, et le
registre partagé `onlcshared/ScriptTypes`, par lequel un **plugin** revendique les types qu'il
prend en charge — [`onlcseo`](onlcseo.md) y revendique `application/ld+json`. Le registre vivant
sur l'objet éditeur et n'étant lu qu'à l'arrivée du contenu, l'ordre de chargement des plugins
n'a aucun effet.

Un type qui n'est réclamé par personne reste un jeton de code : sans cela, le nettoyeur du cœur
le supprimerait purement et simplement.

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
| `OnlcShortcodeLibrary` | Ouvre la même bibliothèque (nom conservé) |
| `OnlcInsertShortcode` | Ouvre le formulaire d'un code désigné par son nom |
| `OnlcEditShortcode` | Modifie l'élément du site sélectionné |
| `OnlcDuplicateShortcode` | Duplique l'élément sélectionné |
| `OnlcRemoveShortcode` | Supprime l'élément sélectionné |
| `OnlcPreview` | Ouvre l'aperçu de la page entière |

## API du plugin

```js
const widgets = editor.plugins.onlcwidgets;
widgets.listWidgets();                        // définitions disponibles
widgets.insertWidget('cta', { label: 'Devis', url: '/devis' });
widgets.listShortcodes();                     // codes courts disponibles
widgets.insertShortcode('MenuSite');
widgets.getSource();                          // HTML formaté
widgets.setSource('<p>Bonjour</p>');
```

## Les éléments du site

Les gabarits d'Online Création acceptent des **codes courts** : des raccourcis entre crochets que
le serveur remplace par du vrai contenu au moment d'afficher la page.

```
[MenuSite type="ul" classparent="nav navbar-nav" classchild="class-menuitem" classactivechild="active"]
```

Écrit tel quel, ce texte ne dit rien à personne, et une faute de frappe le casse sans prévenir.
Le plugin l'affiche donc comme un **bloc** : un dessin, un nom, une phrase d'explication et un
résumé des réglages. Un double clic ouvre un formulaire aux intitulés français ; à
l'enregistrement, le code repart **à l'identique**.

| Code | Bloc affiché | Ce que la page reçoit |
|---|---|---|
| `[MenuSite …]` | **Menu** — Liste des pages de votre site | la liste `<ul>` des pages |
| `[Contact email="…"]` | **Formulaire de contact** | un formulaire relié à cette adresse |
| `[Meta description="…"]` | **Description pour les moteurs de recherche** | les balises `<meta>` |
| `[SocialButtons …]` | **Boutons de partage** | les boutons des réseaux cochés |
| `[PaypalButton …]` | **Bouton de paiement PayPal** | le formulaire de paiement |
| `[LogoSite;220;90]` | **Logo du site** | le logo, borné à 220 × 90 pixels |
| `[TitreLogoSite]` | **Titre du site avec son logo** | le nom du site posé sur le logo |
| `[add-to-calendar-button …]` | **Ajouter à mon calendrier** | le bouton d'ajout à l'agenda |

Un code que le plugin ne connaît pas devient lui aussi un bloc, neutre, portant la mention
« Code non reconnu ». Il est réécrit tel quel : rien n'est perdu.

### Ajouter un code court

```js
onlc_shortcodes_custom: [
  {
    name: 'Avis',
    label: 'Avis clients',
    description: 'Les derniers avis publiés sur votre fiche',
    category: 'Contenu',
    icon: '<svg viewBox="0 0 24 24" width="28" height="28">…</svg>',
    fields: [
      { name: 'nombre', label: 'Nombre d’avis affichés', type: 'number', half: true },
      { name: 'note', label: 'Note minimale', type: 'number', half: true,
        help: 'De 1 à 5. Les avis en dessous ne sont pas affichés.' }
    ],
    defaults: { nombre: '3', note: '4' },
    summary: (values) => `${values.nombre} avis, note ≥ ${values.note}`
  }
]
```

Produit `[Avis nombre="3" note="4"]`.

Types de champ : `text`, `textarea`, `email`, `url`, `number`, `date` (AAAA-MM-JJ), `time`
(HH:MM), `timezone` (fuseaux IANA) et `select` (avec `items`). Formes particulières : `fixed`
(attributs toujours écrits), `flags` (drapeaux sans valeur), `positional` (`[LogoSite;220;90]`)
et `paired` (`[Slideshow …]…[/Slideshow]`).

### Comment le texte devient un bloc

À l'ouverture, le plugin balaie la chaîne html **en sautant l'intérieur des balises** — un
attribut peut contenir des crochets sans être un code court — et remplace chaque code par sa
carte. Le texte d'origine voyage avec elle, encodé dans `data-onlc-shortcode-raw`.

À l'enregistrement, chaque carte redevient ce texte, caractère pour caractère, **après
vérification** qu'il s'agit bien d'un code court et de rien d'autre : un attribut forgé, arrivé
par un collage, ressort en texte visible et non en markup.

Un nom est **réservé** : `LG`. `[LG="fr"]…[/LG]` s'écrit exactement comme un code court apparié
et n'en est pas un — c'est un marqueur de langue, que [`onlcmultilang`](onlcmultilang.md)
transforme en section traduisible. Sans cette réserve, les deux plugins se disputeraient le même
texte, et le premier arrivé en ferait une carte « code non reconnu » : le passage repartirait
intact dans la page, mais il ne serait plus ni reconnaissable ni traduisible dans l'éditeur.

## L'aperçu visiteur

Le bouton `onlcpreview` montre la page **dans le site** : en-tête, menu, polices, pied de page.
Le gabarit vient d'une api, `[ContenuPage]` reçoit le contenu en cours d'écriture, et les autres
codes courts — du gabarit comme du contenu — sont remplacés par les valeurs de
`onlc_preview_values`.

Trois largeurs sont proposées : ordinateur, tablette (820 px) et téléphone (390 px).

Un quatrième bouton, **Plein écran**, donne à la fenêtre toute la place de l'écran. Une fenêtre
d'éditeur mesure quelques centaines de pixels de haut, et une page d'accueil s'y juge mal :
certaines techniques ne s'y voient même pas — une parallaxe faite d'un calque fixé se règle sur la
hauteur du cadre, et un cadre court la montre de travers. Le bouton dit comment en sortir une fois
pressé.

Les **feuilles de style nécessaires à la page publiée** sont ajoutées à la fin du `<head>`, après
celles du gabarit : d'abord celles que les plugins déclarent — l'allure d'un bandeau, la grille
d'un calendrier, la visionneuse d'un pdf, la taille d'un emoji, la parallaxe d'une image — puis
celles du site, `onlc_preview_css` ou à défaut `content_css`. Les feuilles d'écriture, elles, ne
sortent jamais de l'éditeur. Voir [l'api d'aperçu](../api/onlc-preview-api.md).

Une balise **`<base>`** est posée en tête de `<head>`. Le cadre reçoit son contenu par `srcdoc`,
dans une origine opaque : sans elle, une image en `/media/photo.jpg`, un pdf ou une police du
gabarit n'ont plus de point de départ et ne se chargent pas du tout.

L'aperçu s'affiche au plus tard **deux secondes et demie** après avoir été monté, même si la page
n'a pas fini de charger. L'événement `load` d'un cadre attend toutes ses ressources — chaque
feuille, chaque police, chaque image : une seule qui ne répond pas, et l'aperçu ne s'affichait
jamais. C'est ce qui arrive derrière un filtrage d'entreprise ou quand un cdn est injoignable.

Quand [`onlcmultilang`](onlcmultilang.md) est chargé et que la page emploie plusieurs langues,
une seconde bande apparaît à droite : la **langue du visiteur**. L'aperçu n'en montre qu'une à la
fois — c'est ce que verra un visiteur, et une page qui les empilerait ne montrerait aucune page
réelle. La réduction est faite sur la page **assemblée**, gabarit compris, exactement dans
l'ordre du moteur du site.

La page est servie par une adresse **`blob:`**, pas par `srcdoc` : un document logé dans un
attribut arrive tronqué au-delà d'une dizaine de milliers de caractères dès que le cadre est isolé,
sans le moindre message. Le bac à sable du cadre se règle par `onlc_preview_sandbox` ; il comprend
`allow-same-origin` par défaut, faute de quoi les polices d'icônes, les pdf et les intégrations
tierces ne fonctionnent pas. Le contrat complet, et les deux façons de retrouver l'isolement, sont
décrits dans [`docs/api/onlc-preview-api.md`](../api/onlc-preview-api.md).
