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

Dans la zone d'édition, un script est représenté par une **pastille** non éditable : rien n'est
exécuté pendant l'édition. Un double-clic ou la barre contextuelle rouvre la boîte de dialogue.

À l'enregistrement, la pastille redevient une vraie balise :

```html
<script type="text/javascript" defer data-onlc-position="body-end">
  console.log('bonjour');
</script>
```

`data-onlc-position` n'est écrit que si l'emplacement choisi n'est pas « à l'emplacement du
curseur » ; c'est à votre gabarit de page de déplacer le script vers le `<head>` ou la fin du
`<body>`.

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
| Image | Médias | fichier, texte alternatif, légende, largeur, alignement, lien |
| Vidéo | Médias | URL YouTube / Vimeo / Dailymotion ou autre, format, lecture auto, boucle, sourdine |
| Iframe | Médias | adresse, titre, format ou hauteur fixe, défilement |
| Widget HTML | Avancé | code HTML fourni par un service tiers |
| Carte | Médias | adresse ou coordonnées, zoom, hauteur (intégration OpenStreetMap, sans javascript) |
| Carte interactive (Leaflet) | Médias | latitude, longitude, zoom, épingle, hauteur, zoom à la molette |
| Calendrier | Médias | adresse du calendrier, affichage, hauteur |
| Séparateur | Contenu | hauteur, espace ou filet, couleur, largeur |
| Citation | Contenu | citation, auteur, source |

Lorsque les autres plugins ONLC sont chargés, la bibliothèque propose en plus des raccourcis
vers l'image de la bibliothèque média (`onlcmedia`), les emojis et icônes (`onlcicons`) et le
séparateur réglable (`onlcspacer`).

### Intégrations : ce qui est publié fait foi

Les blocs d'intégration — vidéo, iframe, carte, calendrier, carte Leaflet — sont marqués
`canonical` : leur contenu est **reconstruit à partir de leur configuration** au moment de
l'enregistrement. Deux raisons à cela :

- l'éditeur ajoute un attribut `sandbox` aux iframes (option `sandbox_iframes` du cœur), qui
  rendrait l'intégration inerte sur le site ;
- l'aperçu affiché pendant l'édition peut différer du rendu final (voir ci-dessous).

Pour que l'aperçu fonctionne aussi dans l'éditeur, le plugin ajoute les hôtes de ses propres
intégrations à `sandbox_iframes_exclusions`. Ajoutez-y les vôtres avec
`onlc_widgets_iframe_exclusions` :

```js
onlc_widgets_iframe_exclusions: [ 'openstreetmap.org', 'google.com', 'widget.monservice.tld' ]
```

Une adresse dont l'hôte n'est pas listé s'affiche quand même, mais son javascript est bloqué
**dans l'éditeur seulement** : la page publiée, elle, reçoit le code tel quel.

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

Le javascript ne s'exécutant pas dans la zone d'édition, un bloc peut fournir un aperçu
différent avec `renderEditor` : la carte Leaflet montre par exemple une image de la même zone,
et la carte interactive n'est produite que pour la page publiée.

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
| `onlc_widgets_map_provider` | `'osm'` | `osm` ou `google` |
| `onlc_widgets_google_maps_key` | `''` | Clé de l'API Google Maps Embed |
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
