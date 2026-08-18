# `onlcicons` — emojis et icônes

Dictionnaire d'emojis Unicode et d'icônes Material Design, avec moteur de recherche, catégories
et auto-complétion à la frappe.

Les formats des dictionnaires sont décrits dans
[Dictionnaires emojis et icônes](../api/onlc-icons-api.md).

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcicons',
  toolbar: 'onlcemoji onlcmaterialicons'
});
```

| Bouton | Rôle |
| --- | --- |
| `onlcemoji` | Ouvre la fenêtre sur l'onglet des emojis |
| `onlcmaterialicons` | Ouvre la fenêtre sur l'onglet des icônes |
| `onlcicons` | Ouvre la fenêtre (emojis + icônes) |

Auto-complétion : `:` suivi de deux lettres propose des emojis, `::` propose des icônes.

## Options

Voir [la documentation des dictionnaires](../api/onlc-icons-api.md#configuration) pour la liste
complète (`onlc_icons_emoji_database_url`, `onlc_icons_material_url`, `onlc_icons_output`,
`onlc_icons_stylesheet_url`, `onlc_icons_emoji_trigger`, `onlc_icons_icon_trigger`, …).

## Commandes

| Commande | Effet |
| --- | --- |
| `OnlcIcons` | Ouvre le dictionnaire |
| `OnlcEmojis` | Ouvre le dictionnaire sur les emojis |
| `OnlcMaterialIcons` | Ouvre le dictionnaire sur les icônes |
| `OnlcInsertIcon` | Insère une icône par son nom (`value` : `'home'`) |

## API du plugin

```js
const icons = editor.plugins.onlcicons;
icons.openDialog('icons');                 // 'emojis' (défaut) ou 'icons'
icons.getEmojis().then((list) => console.log(list.length));
icons.getIcons();                          // icônes déjà chargées
icons.insertIcon('home');
icons.insertEmoji('🔥');
```
