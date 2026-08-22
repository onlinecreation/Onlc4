# API des liens prédéfinis ONLC

Les plugins `onlclink`, `onlcmedia` (lien d'une image) et `onlcwidgets` (bouton d'appel à
l'action) proposent une liste de liens du site. Cette liste provient d'une API HTTP, d'un
tableau statique ou d'une fonction JavaScript.

## Configuration

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlclink',
  toolbar: 'onlclink onlcunlink',

  // API renvoyant l'arborescence des pages du site
  onlc_link_api_url: 'https://exemple.tld/api/links',
  onlc_link_api_headers: { Authorization: 'Bearer …' },
  onlc_link_api_credentials: 'same-origin',

  // Alternative ou complément : liste statique, url ou fonction
  onlc_link_list: [
    { title: 'Accueil', url: '/' },
    { title: 'Services', children: [
      { title: 'Conseil', url: '/services/conseil' }
    ] }
  ],

  // Valeurs proposées dans les listes déroulantes
  onlc_link_target_list: [
    { text: 'Même onglet', value: '' },
    { text: 'Nouvel onglet', value: '_blank' }
  ],
  onlc_link_rel_list: [
    { text: 'Aucune', value: '' },
    { text: 'nofollow', value: 'nofollow' },
    { text: 'noopener noreferrer', value: 'noopener noreferrer' }
  ],
  onlc_link_class_list: [ { text: 'Bouton', value: 'btn btn-primary' } ],

  // Ancres de la page en cours (éléments porteurs d'un id)
  onlc_link_anchors: true,

  // Valeurs appliquées à un nouveau lien
  onlc_link_default_target: '',
  onlc_link_default_rel: ''
});
```

Les deux sources sont fusionnées : les entrées de l'API sont affichées avant celles de
`onlc_link_list`.

## Point d'entrée

### `GET {onlc_link_api_url}`

Aucun paramètre n'est envoyé : la liste est chargée une fois par instance d'éditeur, puis
conservée en cache jusqu'à la destruction de celle-ci.

Réponse attendue :

```json
{
  "items": [
    { "title": "Accueil", "url": "/" },
    {
      "title": "Services",
      "url": "/services",
      "children": [
        { "title": "Conseil", "url": "/services/conseil" },
        { "title": "Formation", "url": "/services/formation" }
      ]
    },
    { "title": "Contact", "url": "/contact" }
  ]
}
```

Un tableau racine (`[ … ]`) est également accepté.

### Objet `LinkListEntry`

| Champ | Type | Description |
| --- | --- | --- |
| `title` | `string` | Libellé affiché dans la liste déroulante. **Obligatoire**. |
| `url` | `string` | Adresse du lien. `value` est accepté comme synonyme. |
| `children` | `LinkListEntry[]` | Sous-entrées. `menu` est accepté comme synonyme. |

Le premier niveau de `children` devient un groupe d'options. Les niveaux suivants sont aplatis
avec un libellé `Parent › Enfant`, de sorte qu'aucune entrée ne disparaisse.

Une entrée sans `url` sert uniquement de titre de groupe.

## Erreurs

En cas d'échec (statut HTTP ≥ 400, JSON invalide, réseau indisponible), l'éditeur écrit un
avertissement dans la console et affiche la boîte de dialogue **sans** la liste prédéfinie :
la saisie d'une URL personnalisée et le choix d'une ancre restent possibles. Le contenu de la
réponse d'erreur peut suivre le format des erreurs de l'[API média](onlc-media-api.md#erreurs).

## Fourniture en JavaScript

`onlc_link_list` accepte aussi :

```js
// Une URL, chargée comme l'API ci-dessus
onlc_link_list: '/api/links.json'

// Une fonction, utile pour une liste calculée côté client
onlc_link_list: (done) => {
  done([ { title: 'Accueil', url: '/' } ]);
}
```

## Attributs produits

Le lien inséré ou mis à jour porte les attributs suivants :

```html
<a href="/services/conseil" title="Notre offre" target="_blank" rel="noopener"
   class="btn btn-primary" style="text-transform: uppercase"
   onclick="return confirm('Partir ?')">Conseil</a>
```

- `target` et `rel` ne sont écrits que s'ils ne sont pas vides ;
- lorsque la cible est `_blank` sans `rel` choisi, `rel="noopener"` est ajouté par les blocs
  prédéfinis de `onlcwidgets` ;
- `class`, `style` et `onclick` viennent de l'onglet « Avancé » et sont facultatifs. Les noms de
  classe sont revalidés avant d'atteindre l'attribut ;
- `onclick` **n'existe pas** pendant l'écriture : le lien porte alors `data-onlc-click`, et
  l'attribut n'est reformé qu'à la sérialisation. Une api qui relit le contenu par
  `editor.getContent()` reçoit bien l'`onclick` ; une api qui inspecte le dom de l'éditeur doit
  lire `data-onlc-click`. Voir [`onlclink`](../plugins/onlclink.md#laction-au-clic-ne-sexécute-pas-pendant-lécriture) ;
- « Supprimer le lien » retire l'élément `<a>` sans toucher à son contenu.
