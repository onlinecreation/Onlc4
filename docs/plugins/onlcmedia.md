# `onlcmedia` — explorateur de fichiers et propriétés d'image

Remplace la boîte de dialogue « image » par un explorateur de fichiers connecté à votre API :
téléversement, navigation dans les dossiers, création et suppression de dossiers, copie et
déplacement de fichiers, ouverture dans l'éditeur d'images Pixel et création d'images.

Le contrat de l'API est décrit dans [API média](../api/onlc-media-api.md), l'intégration de
Pixel dans [Éditeur Pixel](../api/onlc-pixel-editor.md).

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcmedia onlcresponsiveimages',
  toolbar: 'onlcimage onlcmedialibrary',
  onlc_media_api_url: 'https://exemple.tld/api/media'
});
```

Associez toujours `onlcresponsiveimages` : les images produites n'ont ni `width` ni `height`,
mais une largeur en pourcentage et une hauteur automatique.

## Interface

1. **Bibliothèque** (`onlcmedialibrary`) : arborescence des dossiers à gauche, vignettes à
   droite, zone de dépôt pour téléverser, boutons *Nouveau dossier*, *Copier*, *Déplacer*,
   *Renommer*, *Supprimer*, *Retoucher* et *Créer une image*.
2. **Propriétés de l'image** (`onlcimage`) : trois onglets.
   - *Image* : fichier, texte alternatif, titre, largeur, classe prédéfinie et CSS personnalisé.
   - *Texte par-dessus* : texte, position (9 ancrages), taille, police, couleur, fond, marge et
     espacement intérieur.
   - *Lien* : lien prédéfini via API, URL personnalisée ou ancre, cible et `rel`
     (voir [API des liens](../api/onlc-link-api.md)).

## Options

| Option | Défaut | Description |
| --- | --- | --- |
| `onlc_media_api_url` | `''` | Racine de l'API média |
| `onlc_media_api_headers` | `{}` | En-têtes ajoutés à chaque requête |
| `onlc_media_api_credentials` | `'same-origin'` | Mode `credentials` de `fetch` |
| `onlc_media_handlers` | `{}` | Surcharge JavaScript des opérations (voir l'API média) |
| `onlc_media_root_path` | `'/'` | Dossier ouvert par défaut |
| `onlc_media_accept` | `'image/*'` | Types acceptés au téléversement |
| `onlc_media_image_editor_url` | `https://pixel.onlinecreation.me` | Adresse de l'éditeur Pixel |
| `onlc_media_image_editor_origin` | `''` | Origine attendue des messages de Pixel |
| `onlc_media_class_list` | Normale, Pleine largeur, Parallaxe, Ajustée à l'écran | Classes prédéfinies |
| `onlc_media_overlay_positions` | 9 positions | Ancrages du texte en surimpression |
| `onlc_media_font_list` | 4 polices | Polices proposées pour le texte en surimpression |
| `onlc_media_default_width` | `'100%'` | Largeur appliquée à une image insérée |
| `onlc_media_inject_styles` | `true` | Charge `onlcmedia.css` dans la zone d'édition |
| `onlc_media_replace_image_plugin` | `true` | Remplace les boutons `image` du cœur |
| `onlc_media_max_upload_size` | `0` | Taille maximale d'un fichier en octets (`0` = pas de limite) |

### Classes prédéfinies

```js
onlc_media_class_list: [
  { text: 'Normale', value: '' },
  { text: 'Pleine largeur', value: 'onlc-image--fullwidth' },
  { text: 'Parallaxe', value: 'onlc-image--parallax' },
  { text: 'Ajustée à la taille de l’écran', value: 'onlc-image--cover-screen' },
  { text: 'Encadrée (personnalisée)', value: 'ma-classe-maison' }
]
```

Le champ *CSS personnalisé* de l'onglet *Image* est appliqué en style en ligne sur la figure ;
il permet un réglage ponctuel sans créer de classe.

## Code produit

```html
<figure class="onlc-image onlc-image--fullwidth" style="border-radius: 8px">
  <a href="/services" target="_blank" rel="noopener">
    <img src="/media/photos/plage.jpg" alt="Plage" title="Vue sur la mer"
         style="width: 100%; height: auto;">
  </a>
  <figcaption class="onlc-image__overlay onlc-image__overlay--bottom-left"
              style="color: #fff; background-color: rgba(0,0,0,.4); padding: 12px;">
    Nos séjours
  </figcaption>
</figure>
```

Sans texte en surimpression ni lien, seule la balise `<img>` est écrite.

## Commandes

| Commande | Effet |
| --- | --- |
| `OnlcImage` | Ouvre les propriétés de l'image sélectionnée, ou en insère une nouvelle |
| `OnlcMediaExplorer` | Ouvre la bibliothèque (`value` : chemin du dossier) |
| `OnlcEditImageInPixel` | Ouvre l'image sélectionnée dans Pixel |
| `OnlcInsertImage` | Insère une image à partir d'un objet `ImageData` |
