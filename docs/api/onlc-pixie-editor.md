# Intégration de Pixie (Pixel•OnlineCreation)

Le plugin `onlcmedia` ouvre un éditeur d'images dans une boîte de dialogue
(`windowManager.openUrl`) pour retoucher une image existante ou en créer une.

L'éditeur employé par Online Création est **[Pixie](https://pixie.vebto.com/)**, habillé et
proposé aux clients sous le nom **Pixel•OnlineCreation**. Le produit est Pixie ; la marque est
Pixel•OnlineCreation. C'est une distinction utile quand on cherche de la documentation : les
options de configuration, elles, sont celles de Pixie.

ONLC ne réécrit pas l'éditeur : il fournit un **adaptateur**, une page qui traduit le contrat
ci-dessous vers l'api de Pixie. Celui de la démonstration tient en deux fichiers et sert de
modèle :

| Fichier | Rôle |
|---|---|
| [`example/public/pixie/index.html`](../../example/public/pixie/index.html) | l'adaptateur : contrat postMessage ↔ api Pixie |
| [`example/public/pixie/branding.js`](../../example/public/pixie/branding.js) | l'habillage Pixel•OnlineCreation |

Le plugin, lui, ne connaît que le contrat : n'importe quel éditeur qui le respecte fonctionne à
la place de Pixie.

## Configuration

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcmedia',

  // Adresse de l'éditeur : votre déploiement de Pixie
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
| `integration` | Toujours `onlc`, permet à l'éditeur d'adapter son interface. |

Immédiatement après l'ouverture, HugeRTE envoie également le message suivant dans l'iframe :

```json
{ "mceAction": "onlc:open", "url": "https://…/photo.jpg", "name": "photo.jpg" }
```

Une intégration peut donc lire les paramètres d'URL **ou** attendre ce message.

## Retour vers l'éditeur

L'adaptateur communique avec HugeRTE via `window.parent.postMessage`.

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

### Versions

Retoucher une image ne l'écrase pas. HugeRTE ajoute aux métadonnées de `POST /save` un champ
`replaces` désignant ce que ce binaire remplace — le chemin du fichier quand il le connaît, son
adresse d'origine sinon — et l'api en fait une **version de plus**.

L'éditeur n'a rien à faire pour cela : il lui suffit de renvoyer le binaire. C'est HugeRTE qui
sait d'où venait l'image, puisque c'est lui qui l'a ouverte.

### Fermer sans enregistrer

```js
window.parent.postMessage({ mceAction: 'onlc:close' }, '*'); // 'close' est également accepté
```

## L'habillage Pixel•OnlineCreation

Tout passe par les **options de configuration de Pixie** : aucune feuille de style n'est plaquée
par-dessus, aucun sélecteur interne n'est visé. Une montée de version de Pixie ne peut donc pas
défaire l'habillage en silence — au pire une option disparaîtrait, et l'éditeur reprendrait son
apparence d'origine plutôt que de s'afficher de travers.

| Levier | Option Pixie | Ce qu'il porte |
|---|---|---|
| Couleurs | `ui.themes` + `ui.activeTheme` | le bleu d'ONLC, en triplets « R V B » |
| Marque | `ui.menubar.items` | un svg posé en tête de la barre du haut |
| Langue | `languages` + `activeLanguage` | l'interface en français |

```js
new Pixie({
  selector: '#pixie',
  activeLanguage: 'fr',
  languages: { fr: { Save: 'Enregistrer', Done: 'Enregistrer', crop: 'recadrer', /* … */ } },
  ui: {
    activeTheme: 'pixel-onlinecreation',
    themes: [ { name: 'pixel-onlinecreation', colors: { '--be-primary': '0 108 231', /* … */ } } ],
    // Une seule entrée : la marque. Voir l'encadré ci-dessous.
    menubar: { items: [ { type: 'image', src: logo, align: 'left', position: 0 } ] }
  }
});
```

> **Pixie fusionne la configuration reçue avec la sienne, et concatène les tableaux.** On n'ajoute
> donc que la marque : annuler/rétablir, zoom, historique et enregistrement restent ceux de Pixie.
> Les redéclarer les afficherait **deux fois** — et il faudrait ensuite les tenir à jour à chaque
> version. Le thème, lui, vient s'ajouter aux siens (clair, sombre, le nôtre) et c'est
> `activeTheme` qui désigne celui qui s'applique.

L'intitulé du bouton d'enregistrement passe en français par les **traductions** (`Done`), ce qui
laisse à Pixie son icône et son action.

Les clés de traduction sont les chaînes anglaises de Pixie. Celles de la barre de navigation sont
en minuscules (`crop`, `draw`, `filter`…) : c'est ainsi que Pixie les déclare.

### Vérifier l'habillage

`example/test/branding.test.js` (lancé par `yarn test-node`) contrôle ce qui se contrôle sans
navigateur : que l'habillage n'ajoute que la marque, que le thème est complet et écrit en triplets
« R V B », que rien ne vise un sélecteur interne de Pixie. Le rendu lui-même se regarde à l'œil,
Pixie n'étant pas versionné ici.

## Sécurité

- L'image renvoyée doit être une *data URL* : aucun fichier n'est lu depuis le disque du serveur
  de l'éditeur.
- Le stockage effectif est réalisé par votre API média, qui reste responsable des contrôles
  (type MIME autorisé, taille, quota, droits de l'utilisateur) et de la résolution de
  `replaces` : une adresse qu'elle ne sert pas ne doit jamais désigner un fichier à écraser.
- Renseignez `onlc_media_image_editor_origin` si l'éditeur est hébergé sur un autre domaine que
  celui indiqué dans `onlc_media_image_editor_url`.
