# Intégration de l'éditeur d'images Pixel

Le plugin `onlcmedia` ouvre l'éditeur d'images [Pixel](https://pixel.onlinecreation.me) dans une
boîte de dialogue (`windowManager.openUrl`) pour retoucher une image existante ou en créer une.
L'éditeur est basé sur une ancienne version de
[Pixie](https://support.vebto.com/hc/articles/10/13/50/getting-started).

## Configuration

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcmedia',

  // Adresse de l'éditeur
  onlc_media_image_editor_url: 'https://pixel.onlinecreation.me',

  // Origine acceptée pour les messages retournés ('' = origine de l'éditeur d'images)
  onlc_media_image_editor_origin: ''
});
```

## Ouverture

L'URL est appelée avec les paramètres suivants :

| Paramètre | Description |
| --- | --- |
| `image` | URL absolue de l'image à ouvrir. Absent lors d'une création. |
| `name` | Nom du fichier d'origine. |
| `origin` | Origine de la page qui a ouvert l'éditeur, pour le `postMessage` retour. |
| `integration` | Toujours `onlc`, permet à Pixel d'adapter son interface. |

Immédiatement après l'ouverture, HugeRTE envoie également le message suivant dans l'iframe :

```json
{ "mceAction": "onlc:open", "url": "https://…/photo.jpg", "name": "photo.jpg" }
```

Une intégration peut donc lire les paramètres d'URL **ou** attendre ce message.

## Retour vers l'éditeur

Pixel communique avec HugeRTE via `window.parent.postMessage`.

### Enregistrer l'image

```js
window.parent.postMessage({
  mceAction: 'onlc:save',      // 'save' est également accepté
  name: 'photo.jpg',           // optionnel, le nom d'origine est utilisé par défaut
  mime: 'image/jpeg',          // optionnel, 'image/png' par défaut
  data: 'data:image/jpeg;base64,…'  // 'image' et 'dataUrl' sont acceptés comme synonymes
}, '*');
```

À la réception, HugeRTE bloque la boîte de dialogue, envoie le fichier à l'API média
(`POST /save`, voir [API média](onlc-media-api.md#post-save)) puis met à jour l'image dans le
contenu et ferme la fenêtre. En cas d'échec de l'enregistrement, une alerte est affichée et la
fenêtre reste ouverte pour ne pas perdre le travail en cours.

### Fermer sans enregistrer

```js
window.parent.postMessage({ mceAction: 'onlc:close' }, '*'); // 'close' est également accepté
```

## Sécurité

- L'image renvoyée doit être une *data URL* : aucun fichier n'est lu depuis le disque du serveur
  de Pixel.
- Le stockage effectif est réalisé par votre API média, qui reste responsable des contrôles
  (type MIME autorisé, taille, quota, droits de l'utilisateur).
- Renseignez `onlc_media_image_editor_origin` si l'éditeur est hébergé sur un autre domaine que
  celui indiqué dans `onlc_media_image_editor_url`.
