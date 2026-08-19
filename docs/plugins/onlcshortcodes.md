# onlcshortcodes — les codes courts des gabarits

Les gabarits d'Online Création acceptent des **codes courts** : des raccourcis écrits entre
crochets que le serveur remplace par du vrai contenu au moment d'afficher la page.

```
[MenuSite type="ul" classparent="nav navbar-nav" classchild="class-menuitem" classactivechild="active"]
```

Écrit tel quel dans l'éditeur, ce texte ne dit rien à personne, et une faute de frappe le casse
sans prévenir. Le plugin l'affiche donc comme un **bloc** : un dessin, un nom, une phrase
d'explication et un résumé des réglages. Un double clic ouvre un formulaire aux intitulés
français ; à l'enregistrement, le code repart **à l'identique**.

## Ce que voit le rédacteur

| Code | Bloc affiché | Ce que la page reçoit |
|---|---|---|
| `[MenuSite …]` | **Menu** — Liste des pages de votre site | la liste `<ul>` des pages |
| `[Contact email="…"]` | **Formulaire de contact** | un formulaire relié à cette adresse |
| `[Meta description="…" keywords="…"]` | **Description pour les moteurs de recherche** | rien de visible : les balises `<meta>` |
| `[SocialButtons …]` | **Boutons de partage** | les boutons des réseaux cochés |
| `[PaypalButton …]` | **Bouton de paiement PayPal** | le formulaire de paiement |
| `[LogoSite;220;90]` | **Logo du site** | le logo, borné à 220 × 90 pixels |
| `[TitreLogoSite]` | **Titre du site avec son logo** | le nom du site posé sur le logo |
| `[add-to-calendar-button …]` | **Ajouter à mon calendrier** | le bouton d'ajout à l'agenda |

Un code que le plugin ne connaît pas devient lui aussi un bloc, neutre, portant la mention
« Code non reconnu ». Il est réécrit tel quel : rien n'est perdu.

## Boutons et commandes

| Bouton | Commande | Effet |
|---|---|---|
| `onlcshortcodes` | `OnlcShortcodeLibrary` | ouvre la bibliothèque des codes |
| — | `OnlcInsertShortcode` | ouvre le formulaire d'un code désigné par son nom |
| `onlcshortcodeedit` | `OnlcEditShortcode` | modifie le bloc sélectionné |
| `onlcshortcodeduplicate` | `OnlcDuplicateShortcode` | duplique le bloc |
| `onlcshortcoderemove` | `OnlcRemoveShortcode` | supprime le bloc |

Une barre contextuelle apparaît au clic sur un bloc, avec ces trois dernières actions. Les blocs
étant des éléments de niveau bloc, `onlcblocks` les déplace comme n'importe quel autre.

## Options

| Option | Type | Défaut | Rôle |
|---|---|---|---|
| `onlc_shortcodes_custom` | `ShortcodeDefinition[]` | `[]` | codes propres au projet |
| `onlc_shortcodes_exclude` | `string[]` | `[]` | codes intégrés à ne pas proposer |
| `onlc_shortcodes_show_unknown` | `boolean` | `true` | transforme aussi les codes inconnus |
| `onlc_shortcodes_inject_styles` | `boolean` | `true` | charge la feuille du plugin dans l'éditeur |

Mettez `onlc_shortcodes_show_unknown` à `false` si vos pages contiennent des crochets à d'autres
fins : seuls les codes déclarés seront alors transformés.

## Ajouter un code

```js
hugerte.init({
  plugins: 'onlcshortcodes',
  onlc_shortcodes_custom: [
    {
      name: 'Avis',
      label: 'Avis clients',
      description: 'Les derniers avis publiés sur votre fiche',
      category: 'Contenu',
      icon: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" ' +
        'stroke-width="1.7"><path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8z"/></svg>',
      fields: [
        { name: 'nombre', label: 'Nombre d’avis affichés', type: 'number', half: true },
        { name: 'note', label: 'Note minimale', type: 'number', half: true,
          help: 'De 1 à 5. Les avis en dessous ne sont pas affichés.' }
      ],
      defaults: { nombre: '3', note: '4' },
      summary: (values) => `${values.nombre} avis, note ≥ ${values.note}`
    }
  ]
});
```

Produit `[Avis nombre="3" note="4"]`.

### Champs disponibles

`text`, `textarea`, `email`, `url`, `number`, `date` (AAAA-MM-JJ), `time` (HH:MM),
`timezone` (liste des fuseaux IANA, `Europe/Paris`), `select` (avec `items`).

Chaque champ accepte `help` — une phrase affichée sous le champ — et `half` pour placer deux
champs côte à côte.

### Formes particulières

* `fixed` — attributs toujours écrits, jamais proposés :
  `fixed: { type: 'ul' }` produit `type="ul"` sans que le rédacteur ait à s'en occuper.
* `flags` — drapeaux sans valeur, cochés dans le formulaire :
  `[SocialButtons Facebook Twitter]`.
* `positional` — paramètres séparés par des points-virgules : `[LogoSite;220;90]`.
* `paired` — le code encadre du contenu : `[Slideshow …]…[/Slideshow]`.

## Comment le texte devient un bloc

À l'ouverture, le plugin balaie la chaîne html **en sautant l'intérieur des balises** — un
attribut peut contenir des crochets sans être un code court — et remplace chaque code par sa
carte. Le texte d'origine voyage avec elle, encodé dans `data-onlc-shortcode-raw`.

À l'enregistrement, chaque carte redevient ce texte, caractère pour caractère. Un code que le
plugin ne sait pas relire ressort donc intact.

Le conteneur est un `<span>` mis en `display: flex` : il se comporte comme un bloc pour l'espace
de travail tout en restant valide à l'intérieur d'un paragraphe.

## Précautions

Les valeurs saisies sont nettoyées avant d'être écrites : les crochets sont retirés (ils
refermeraient le code au milieu d'un attribut) et les guillemets deviennent `&quot;`, comme le
font déjà les gabarits. L'ordre des attributs suit celui de la définition, de sorte que les
gabarits qui lisent ces codes avec des expressions régulières strictes continuent de les
reconnaître.
