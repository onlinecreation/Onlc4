# API média ONLC

L'explorateur de fichiers du plugin `onlcmedia` dialogue avec une API HTTP que vous hébergez.
Ce document décrit le contrat attendu : points d'entrée, formats d'échange, erreurs et sécurité.

Toutes les opérations peuvent aussi être fournies directement en JavaScript, sans API HTTP
(voir [Surcharge en JavaScript](#surcharge-en-javascript)).

## Configuration

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcmedia onlcresponsiveimages',
  toolbar: 'onlcimage onlcmedialibrary',

  // Racine de l'API : tous les points d'entrée sont relatifs à cette URL
  onlc_media_api_url: 'https://exemple.tld/api/media',

  // En-têtes ajoutés à chaque requête (jeton d'authentification par exemple)
  onlc_media_api_headers: { Authorization: 'Bearer …' },

  // 'same-origin' (défaut), 'include' ou 'omit'
  onlc_media_api_credentials: 'same-origin',

  // Dossier affiché à l'ouverture de l'explorateur
  onlc_media_root_path: '/',

  // Taille maximale d'un fichier téléversé, en octets (0 = pas de limite côté éditeur)
  onlc_media_max_upload_size: 10 * 1024 * 1024
});
```

## Conventions générales

- Toutes les réponses sont en JSON, encodées en UTF‑8.
- Les chemins (`path`) sont absolus, séparés par `/`, et commencent toujours par `/`.
  La racine est `/`. Ils désignent l'arborescence exposée par l'API, pas le disque du serveur.
- Les URL publiques (`url`, `thumbnailUrl`) sont des URL absolues ou relatives au site,
  directement utilisables dans un attribut `src`.
- Un statut HTTP `2xx` signale un succès. Tout autre statut est traité comme une erreur.
- Un corps d'erreur peut préciser le message affiché à l'utilisateur :

```json
{ "error": { "message": "Dossier protégé en écriture" } }
```

Les formes `{"message": "…"}` et `{"error": "…"}` sont également acceptées.

### Objets échangés

`MediaFolder` :

| Champ      | Type     | Obligatoire | Description                                  |
|------------|----------|-------------|----------------------------------------------|
| `name`     | string   | oui         | Nom affiché du dossier                        |
| `path`     | string   | non         | Chemin absolu (déduit du parent si absent)    |
| `count`    | number   | non         | Nombre d'éléments contenus                    |
| `modified` | string   | non         | Date ISO 8601 de dernière modification        |

`MediaFile` :

| Champ          | Type   | Obligatoire | Description                                        |
|----------------|--------|-------------|----------------------------------------------------|
| `name`         | string | oui         | Nom du fichier avec son extension                   |
| `url`          | string | oui         | URL publique du fichier                             |
| `path`         | string | non         | Chemin absolu dans l'arborescence                   |
| `thumbnailUrl` | string | non         | URL d'une miniature (l'aperçu utilise `url` sinon)  |
| `mime`         | string | non         | Type MIME                                           |
| `size`         | number | non         | Taille en octets                                    |
| `width`        | number | non         | Largeur en pixels                                   |
| `height`       | number | non         | Hauteur en pixels                                   |
| `modified`     | string | non         | Date ISO 8601                                       |
| `editable`     | bool   | non         | `false` pour interdire l'édition dans Pixel         |

## Points d'entrée

### `GET /list?path=/photos`

Contenu d'un dossier.

```json
{
  "path": "/photos",
  "parent": "/",
  "folders": [
    { "name": "2024", "path": "/photos/2024", "count": 12 }
  ],
  "files": [
    {
      "name": "plage.jpg",
      "path": "/photos/plage.jpg",
      "url": "https://exemple.tld/media/photos/plage.jpg",
      "thumbnailUrl": "https://exemple.tld/media/photos/.thumbs/plage.jpg",
      "mime": "image/jpeg",
      "size": 284913,
      "width": 1920,
      "height": 1080,
      "modified": "2026-04-12T09:31:00Z"
    }
  ]
}
```

`parent` vaut `null` à la racine : le bouton « Dossier parent » est alors masqué.

### `POST /upload`

Téléversement, en `multipart/form-data`.

| Champ  | Type   | Description                          |
|--------|--------|--------------------------------------|
| `path` | string | Dossier de destination               |
| `file` | file   | Fichier téléversé                    |

Réponse : `{ "file": MediaFile }` (l'objet `MediaFile` seul est également accepté).

### `POST /folder`

```json
{ "path": "/photos", "name": "2026" }
```

Réponse : `{ "folder": MediaFolder }`.

### `DELETE /folder?path=/photos/2026`

Supprime un dossier et son contenu. Réponse : n'importe quel corps `2xx`.

### `DELETE /file?path=/photos/plage.jpg`

Supprime un fichier. Réponse : n'importe quel corps `2xx`.

### `POST /move` et `POST /copy`

```json
{ "sources": ["/photos/plage.jpg"], "target": "/photos/2026" }
```

Réponse : `{ "files": [MediaFile] }` — les fichiers dans leur nouvel emplacement.

### `POST /rename`

```json
{ "path": "/photos/plage.jpg", "name": "plage-2026.jpg" }
```

Réponse : `{ "file": MediaFile }`.

### `POST /save`

Enregistre une image produite par l'éditeur Pixel (création ou modification).

```json
{
  "path": "/photos",
  "name": "plage-retouchee.png",
  "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg…"
}
```

Réponse : `{ "file": MediaFile }`. Si un fichier du même nom existe déjà, c'est au serveur de
décider : écrasement ou création d'un nom unique (le `MediaFile` renvoyé fait foi).

## Erreurs

| Statut | Signification attendue                                       |
|--------|--------------------------------------------------------------|
| `400`  | Requête invalide (chemin manquant, nom vide…)                 |
| `401`  | Authentification requise                                      |
| `403`  | Opération interdite (dossier en lecture seule, quota…)        |
| `404`  | Dossier ou fichier introuvable                                |
| `413`  | Fichier trop volumineux                                       |
| `415`  | Type de fichier refusé                                        |
| `500`  | Erreur serveur                                                |

Le message du corps de réponse est affiché tel quel à l'utilisateur : rédigez-le en français et
sans détail technique inutile.

## Sécurité

L'API est le seul garde-fou : l'éditeur s'exécute chez le client et ses contrôles
(taille maximale, types acceptés) ne sont qu'un confort d'utilisation.

- Vérifiez l'authentification et les droits d'écriture à chaque requête.
- Normalisez les chemins reçus et refusez tout ce qui sort de la racine autorisée
  (`..`, chemins absolus système, liens symboliques).
- Contrôlez le type réel des fichiers téléversés (et pas seulement l'extension), refusez
  les formats exécutables, et servez le dossier média sans exécution de script.
- Pour `POST /save`, validez l'entête du `data:` reçu et la taille décodée avant écriture.
- Protégez les requêtes d'écriture contre le CSRF (jeton d'en-tête ou cookie `SameSite`).

## Surcharge en JavaScript

Chaque opération peut être remplacée par une fonction, ce qui permet de brancher un back-office
existant sans respecter les URL ci-dessus. Les fonctions non fournies utilisent l'API HTTP.

```js
hugerte.init({
  plugins: 'onlcmedia',
  onlc_media_handlers: {
    list: (path) => monBackOffice.listerDossier(path),          // Promise<MediaListing>
    upload: (path, file) => monBackOffice.televerser(path, file), // Promise<MediaFile>
    createFolder: (path, name) => …,   // Promise<MediaFolder>
    deleteFolder: (path) => …,         // Promise<void>
    deleteFile: (path) => …,           // Promise<void>
    move: (sources, target) => …,      // Promise<MediaFile[]>
    copy: (sources, target) => …,      // Promise<MediaFile[]>
    rename: (path, name) => …,         // Promise<MediaFile>
    save: (path, name, dataUrl) => …   // Promise<MediaFile>
  }
});
```

Si ni `onlc_media_api_url` ni un gestionnaire ne sont définis pour une opération, l'explorateur
affiche un message invitant à configurer l'API.

## Exemple minimal (Node/Express)

```js
app.get('/api/media/list', async (req, res) => {
  const dossier = resoudre(req.query.path ?? '/'); // refuse tout chemin hors racine
  const entrees = await fs.promises.readdir(dossier, { withFileTypes: true });

  res.json({
    path: req.query.path ?? '/',
    parent: req.query.path === '/' ? null : path.posix.dirname(req.query.path),
    folders: entrees.filter((e) => e.isDirectory()).map((e) => ({ name: e.name })),
    files: entrees.filter((e) => e.isFile()).map((e) => ({
      name: e.name,
      url: `/media${req.query.path}/${e.name}`.replace('//', '/')
    }))
  });
});
```
