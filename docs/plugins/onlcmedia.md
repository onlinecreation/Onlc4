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

1. **Médiathèque** (`onlcmedialibrary`), dessinée sur le modèle du Finder de macOS — trois zones
   que l'on retrouve dans tous les gestionnaires de fichiers, et que l'on reconnaît donc sans
   explication :

   - une **barre latérale** portant l'**arborescence** des dossiers : chacun se déplie par son
     chevron, son contenu n'est demandé à l'api qu'à ce moment-là, et la branche du dossier
     ouvert se déplie toute seule. Une liste à plat ne disait pas où l'on se trouvait — deux
     dossiers nommés « photos » y étaient indiscernables ;
   - une **grille de vignettes** au centre : un clic sélectionne, un double clic ouvre le dossier
     ou choisit le fichier, exactement comme sur un bureau ;
   - un **panneau d'informations** à droite, qui décrit le fichier sélectionné — dimensions,
     poids, date — et regroupe les actions qui le concernent : *Retoucher*, *Renommer*,
     *Copier vers*, *Déplacer vers*, *Supprimer*.

   Au-dessus, une barre d'outils : *Dossier parent*, *Nouveau dossier*, *Téléverser…*,
   *Dessiner une image…*, *Supprimer ce dossier*, et une recherche dans le dossier courant. Un
   fil d'Ariane cliquable rappelle le chemin. Les fichiers se déposent directement sur la
   grille. Tous les boutons font au moins 50 × 50 pixels.

   En bas à droite, une **jauge de quota** : le nombre de fichiers utilisés sur le nombre
   autorisé. Chaque version d'un fichier y compte pour un fichier.
2. **Propriétés de l'image** (`onlcimage`) : cinq onglets.
   - *Image* : aperçu, bouton **Choisir ou téléverser un média…** (l'action principale),
     bouton *Retoucher cette image…*, puis, en second choix, un champ pour coller l'adresse
     d'une image en ligne ; texte alternatif et titre.
   - *Apparence* : classe prédéfinie, largeur, CSS personnalisé.
   - *Texte par-dessus* : texte, position (9 ancrages), taille, police, fond, marges.
   - *Style du texte* : couleur, dégradé (départ, arrivée, angle) et ombre portée.
   - *Lien* : lien prédéfini via API, URL personnalisée ou ancre, cible et `rel`
     (voir [API des liens](../api/onlc-link-api.md)).

   Le bouton image reste utilisable quand le curseur se trouve dans le texte posé sur l'image :
   c'est bien cette image-là qui s'ouvre, et non une nouvelle.

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
| `onlc_media_upload_mime_types` | `['image/', 'application/pdf']` | Types acceptés à l'envoi ; une entrée finissant par `/` vaut pour toute une famille, une entrée commençant par `.` pour une extension. Liste vide : tout est accepté |
| `onlc_media_quota` | `true` | Interroge `/quota` et affiche la jauge |
| `onlc_media_versions` | `true` | Interroge `/versions` et affiche l'historique d'un fichier |

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
              style="background-color: rgba(0,0,0,.4); padding: 12px;
                     background-image: linear-gradient(45deg, #ffffff, #ffd479);
                     -webkit-background-clip: text; background-clip: text;
                     -webkit-text-fill-color: transparent; color: transparent;
                     text-shadow: 0px 2px 6px rgba(0,0,0,.35);">
    Nos séjours
  </figcaption>
</figure>
```

Sans texte en surimpression ni lien, seule la balise `<img>` est écrite.

Le dégradé utilise la technique du fond découpé sur le texte : quand une couleur de départ
**et** une couleur d'arrivée sont renseignées, elles remplacent la couleur simple. Les mêmes
réglages sont proposés par le bloc de texte de [`onlcwidgets`](onlcwidgets.md).

### L'effet parallaxe

La classe *Parallaxe* demande un rendu particulier. Un `<img>` en `position: fixed` est capturé
par le premier ancêtre qui crée un bloc conteneur — une transformation, un filtre, un
`clip-path` — et se cale alors dans un coin du cadre au lieu de rester immobile. L'effet est donc
porté par le **fond de la figure**, en `background-attachment: fixed`, dont l'adresse est écrite
en style au moment de l'enregistrement :

```html
<figure class="onlc-image onlc-image--parallax" style="background-image: url(/media/photos/montagne.jpg)">
  <img src="/media/photos/montagne.jpg" alt="Sommet au lever du jour" style="width: 100%; height: auto">
</figure>
```

L'`<img>` est conservé mais masqué visuellement : son texte alternatif reste disponible pour les
lecteurs d'écran et les moteurs de recherche. Sur mobile, où `background-attachment: fixed` n'est
pas honoré, le fond défile normalement — ce qui reste un rendu correct.

Cette adresse est recalculée à chaque écriture : elle n'apparaît pas dans le champ *CSS
personnalisé*, qui ne contient que ce que le rédacteur y a mis.

## Les versions

Retoucher une image n'écrase pas l'originale : l'api enregistre une **version de plus**, et le
fichier garde son nom et son adresse — les pages qui l'affichent déjà ne cassent pas. Le panneau
d'informations liste alors l'historique, de la plus récente à la plus ancienne, avec un bouton
*Restaurer* sur chacune.

Revenir en arrière est lui aussi réversible : l'état courant est archivé au passage.

L'éditeur d'images rend un binaire **et des métadonnées** — titre, dossier, format, dimensions,
et surtout `replaces`, qui désigne ce que la retouche remplace. C'est le chemin du fichier quand
l'appelant le connaît, son adresse publique sinon ; une adresse que l'api ne reconnaît pas donne
un nouveau fichier plutôt que d'écraser quoi que ce soit.

Trois points d'entrée s'ajoutent au contrat, décrits dans
[l'API média](../api/onlc-media-api.md) : `GET /versions`, `POST /version/restore` et
`GET /quota`.

## Les quotas

Deux plafonds, servis par l'api et **relus à chaque fois qu'ils servent** — au chargement d'un
dossier, avant un envoi, après une suppression. Ils varient d'un compte à l'autre et peuvent
changer pendant la session : les garder en mémoire reviendrait à travailler sur une valeur
périmée.

| Plafond | Effet |
|---|---|
| `maxFiles` | nombre de fichiers, **versions comprises** |
| `maxFileSize` | poids maximal d'un fichier |

L'envoi est refusé avant d'être tenté, avec un message qui nomme le fichier en cause et dit ce
qui bloque.

## Supprimer

Une boîte « Êtes-vous sûr ? » ne protège de rien : on répond oui sans lire, par réflexe.
Supprimer un fichier ou un dossier demande donc de **maintenir** le bouton « Tout détruire »
pendant six secondes, un décompte à l'appui ; relâcher annule. Le bouton qui a le focus à
l'ouverture est « Ne pas supprimer » — la touche Entrée ne détruit rien.

## Commandes

| Commande | Effet |
| --- | --- |
| `OnlcImage` | Ouvre les propriétés de l'image sélectionnée, ou en insère une nouvelle |
| `OnlcMediaExplorer` | Ouvre la bibliothèque (`value` : chemin du dossier) |
| `OnlcEditImageInPixel` | Ouvre l'image sélectionnée dans Pixel |
| `OnlcInsertImage` | Insère une image à partir d'un objet `ImageData` |
| `OnlcPickMedia` | Ouvre la bibliothèque pour un autre plugin et rend le ou les fichiers choisis au rappel `onSelect` |
