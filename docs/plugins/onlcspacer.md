# `onlcspacer` — séparateurs verticaux

Ajoute des espaces blancs verticaux d'une hauteur personnalisée, 30 px par défaut.

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcspacer',
  toolbar: 'onlcspacer onlcspacerquick'
});
```

- `onlcspacer` ouvre la boîte de dialogue (hauteur + unité + tailles rapides) ;
- `onlcspacerquick` est un bouton scindé : un clic insère la hauteur par défaut, le menu propose
  les tailles prédéfinies.

Un séparateur sélectionné affiche une barre contextuelle : réduire, agrandir, régler, supprimer.
Dans l'éditeur il est hachuré pour rester visible ; sur le site publié, c'est un simple bloc
vide.

## Options

| Option | Défaut | Description |
| --- | --- | --- |
| `onlc_spacer_class` | `'onlc-spacer'` | Classe du séparateur |
| `onlc_spacer_default_height` | `'30px'` | Hauteur par défaut |
| `onlc_spacer_units` | `[ 'px', 'rem', 'vh', '%' ]` | Unités proposées |
| `onlc_spacer_presets` | `[ '10px', '20px', '30px', '50px', '80px', '120px' ]` | Tailles rapides |
| `onlc_spacer_step` | `10` | Pas des boutons réduire/agrandir |

## Code produit

```html
<div class="onlc-spacer" data-onlc-spacer="30px" style="height: 30px;" aria-hidden="true"></div>
```

## Commandes

| Commande | Effet |
| --- | --- |
| `OnlcInsertSpacer` | Insère un séparateur (`value` : hauteur CSS, ex. `'2rem'`) |
| `OnlcEditSpacer` | Ouvre la boîte de dialogue |
| `OnlcGrowSpacer` | Agrandit (`1`) ou réduit (`-1`) le séparateur sélectionné |
| `OnlcRemoveSpacer` | Supprime le séparateur sélectionné |
