# `onlcresponsiveimages` — images fluides

HugeRTE, comme TinyMCE, ajoute des attributs `width` et `height` aux images, ce qui casse les
adaptations responsive. Ce plugin les supprime et les remplace par une **largeur en pourcentage**
et une **hauteur automatique**.

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcresponsiveimages image',
  toolbar: 'image'
});
```

## Fonctionnement

1. **À la lecture du contenu** : un filtre de l'analyseur convertit `width="800" height="400"`
   en `style="width: 66.67%; height: auto"`, en prenant la largeur de la zone d'édition comme
   référence (ou `onlc_responsive_images_container_width`).
2. **Au redimensionnement** : le cœur écrit des attributs sur une image sans style ;
   l'événement `ObjectResized` est intercepté pour les retransformer immédiatement en
   pourcentage.
3. **À l'enregistrement** : un filtre du sérialiseur garantit qu'aucun `width`/`height`
   d'attribut ne subsiste dans le HTML produit.

## Options

| Option | Défaut | Description |
| --- | --- | --- |
| `onlc_responsive_images` | `true` | Active le plugin |
| `onlc_responsive_images_elements` | `'img'` | Éléments traités (liste séparée par des virgules) |
| `onlc_responsive_images_height_auto` | `true` | Écrit `height: auto` |
| `onlc_responsive_images_max_percent` | `100` | Largeur maximale en pourcentage |
| `onlc_responsive_images_precision` | `2` | Nombre de décimales du pourcentage |
| `onlc_responsive_images_container_width` | `'auto'` | Largeur de référence : `auto` (parent) ou un nombre de pixels |
| `onlc_responsive_images_convert_existing` | `true` | Convertit le contenu existant à l'ouverture |
| `onlc_responsive_images_lock_schema` | `false` | Rend `width`/`height` invalides dans le schéma (les attributs sont alors supprimés sans conversion) |

## Résultat

```html
<!-- avant -->
<img src="photo.jpg" width="800" height="400" alt="Exemple">

<!-- après -->
<img src="photo.jpg" alt="Exemple" style="width: 66.67%; height: auto;">
```

## Commande et API

```js
editor.execCommand('OnlcNormalizeResponsiveImages');

const responsive = editor.plugins.onlcresponsiveimages;
responsive.normalize();                  // tout le document
responsive.normalizeElement(imgElement); // une image
```
