# Dictionnaires d'emojis et d'icônes

Le plugin `onlcicons` fournit deux catalogues consultables avec un moteur de recherche : les
emojis Unicode et les icônes Material Design. Les deux peuvent être remplacés ou complétés.

## Configuration

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcicons',
  toolbar: 'onlcemoji onlcmaterialicons',

  // Base d'emojis (format du plugin emoticons de HugeRTE)
  onlc_icons_emoji_database_url: '/js/hugerte/plugins/onlcicons/js/emojis.js',
  onlc_icons_emoji_database_id: 'hugerte.plugins.emoticons',
  onlc_icons_emoji_append: {
    logo_onlc: { keywords: [ 'onlc', 'logo' ], char: '🅾️', category: 'user' }
  },

  // Catalogue d'icônes distant (facultatif : une sélection est incluse)
  onlc_icons_material_url: 'https://exemple.tld/api/material-icons.json',
  onlc_icons_material_append: [
    { name: 'rocket_launch', category: 'Action', keywords: [ 'fusée', 'lancement' ] }
  ],

  // Rendu et feuille de style des icônes
  onlc_icons_stylesheet_url: 'https://fonts.googleapis.com/icon?family=Material+Icons',
  onlc_icons_output: 'ligature',        // 'ligature' ou 'class'
  onlc_icons_class: 'material-icons',   // utilisé par 'ligature'
  onlc_icons_class_prefix: 'mdi mdi-',  // utilisé par 'class'

  // Déclencheurs d'auto-complétion et taille des résultats
  onlc_icons_emoji_trigger: ':',
  onlc_icons_icon_trigger: '::',
  onlc_icons_results_limit: 300
});
```

## Base d'emojis

Le fichier est chargé avec le mécanisme `Resource` de HugeRTE, comme celui du plugin
`emoticons`. Il doit appeler :

```js
hugerte.Resource.add('hugerte.plugins.emoticons', {
  grinning_face: { keywords: [ 'face', 'smile', 'happy' ], char: '😀', category: 'people' },
  fire: { keywords: [ 'flame', 'hot' ], char: '🔥', category: 'nature' }
});
```

| Champ | Type | Description |
| --- | --- | --- |
| `char` | `string` | Caractère Unicode inséré. **Obligatoire**. |
| `keywords` | `string[]` | Mots-clés utilisés par la recherche. |
| `category` | `string` | Catégorie affichée dans les onglets. |

La clé de l'objet est le nom de l'emoji ; il complète automatiquement les mots-clés.

## Catalogue d'icônes

### `GET {onlc_icons_material_url}`

```json
{
  "icons": [
    { "name": "home", "category": "Action", "keywords": [ "maison", "accueil" ] },
    { "name": "search", "category": "Action", "keywords": "recherche loupe" }
  ]
}
```

- Un tableau racine est accepté (`[ … ]`).
- Une entrée peut être une simple chaîne : `"home"`.
- `keywords` accepte un tableau ou une chaîne séparée par des espaces ou des virgules.
- `category` vaut `Personnalisées` lorsqu'elle n'est pas fournie.

Les icônes distantes s'ajoutent à la sélection intégrée au plugin ; en cas d'erreur de
chargement, seule la sélection intégrée est proposée et un avertissement est écrit dans la
console.

## Code inséré

| `onlc_icons_output` | Résultat |
| --- | --- |
| `ligature` (défaut) | `<span class="material-icons" role="img" aria-label="home">home</span>` |
| `class` | `<i class="mdi mdi-home" role="img" aria-label="home"></i>` |

Pour que les icônes soient visibles partout, la feuille de style indiquée par
`onlc_icons_stylesheet_url` est ajoutée au contenu de l'éditeur (`contentCSS`) **et** à
l'interface des boîtes de dialogue ; ajoutez la même feuille à vos pages publiées.
