# API du gabarit d'aperçu

L'éditeur montre le contenu seul, sur fond blanc. Le visiteur, lui, verra ce contenu **dans le
site** : en-tête, menu, polices, pied de page. Le bouton « Aperçu comme un visiteur » demande donc
le gabarit à votre back-office et y pose le contenu en cours d'écriture.

## Le contrat

Une seule requête, sans paramètre obligatoire :

```
GET /api/template
```

Réponse :

```json
{ "template": "<!doctype html>\n<html lang=\"fr\">…</html>" }
```

Une réponse en texte brut (`Content-Type: text/html`) est acceptée aussi : c'est alors le corps
entier qui fait office de gabarit.

L'adresse est donnée par `onlc_preview_template_url`. Pour un gabarit fixe, `onlc_preview_template`
le porte directement et aucune requête n'est faite.

## Ce que le gabarit contient

Le gabarit est la page du site, avec ses codes courts intacts — exactement ce que votre moteur de
rendu manipule au moment de publier :

```html
<main role="main-inner-wrapper" class="container onlc_content">
  [ContenuPage]
</main>
```

| Code | Remplacé par |
|---|---|
| `[ContenuPage]` | le contenu en cours d'écriture, dans sa forme publiée |
| tout autre code | la valeur donnée dans `onlc_preview_values` |
| un code sans valeur | rien — il disparaît |

Les codes courts présents **dans le contenu** sont résolus eux aussi, avec les mêmes valeurs : un
`[Contact email="…"]` posé dans la page devient le formulaire, pas le texte entre crochets.

## Les feuilles de style

Les feuilles de la zone d'écriture sont ajoutées **à la fin du `<head>`**, après celles du
gabarit. Ce sont celles que l'éditeur charge pour écrire ; sans elles, l'aperçu montrerait la
même page avec une autre mise en forme, et ne servirait plus à grand-chose.

Par défaut ce sont exactement celles de `content_css`. `onlc_preview_css` permet d'en donner une
autre liste — un site dont la feuille d'écriture diffère de celle de publication, par exemple.
Les adresses sont échappées et les schémas exécutables refusés.

Les feuilles des plugins ne sont pas reprises : elles dessinent les cartes et les cadres de
l'écriture, qui n'existent plus dans la page publiée.

## Les valeurs

`onlc_preview_values` associe à chaque nom de code soit une chaîne, soit une fonction :

```js
onlc_preview_values: {
  TitreSite: 'Ma boutique',
  Copyrights: '© 2026 Ma boutique',

  // Une fonction reçoit les attributs écrits dans le gabarit et rend ce que le serveur rendrait.
  MenuSite: (attributs) => '<ul class="' + attributs.classparent + '">' +
    pages.map((page) => '<li class="' + attributs.classchild + '"><a href="' + page.url + '">' +
      page.nom + '</a></li>').join('') + '</ul>'
}
```

Ces valeurs sont **de l'aperçu**, pas de la publication : elles peuvent être approximatives. Un
formulaire de contact peut se résumer à une phrase, l'important étant que la page ait la bonne
forme et la bonne hauteur.

## Ce que l'aperçu exécute

La page est affichée dans un cadre portant `sandbox="allow-scripts"`, **sans**
`allow-same-origin`. Conséquences :

* les scripts du gabarit tournent — sans eux, ni menu déroulant ni carrousel, et l'aperçu ne
  montrerait pas grand-chose ;
* ils s'exécutent dans une **origine opaque** : ils ne voient ni les cookies de session du
  back-office, ni le document qui les contient ;
* `alert()`, `confirm()` et `prompt()` sont ignorés (`allow-modals` n'est pas accordé) — une page
  d'aperçu n'a pas à pouvoir bloquer l'éditeur.

Le html est passé par `srcdoc` : rien n'est écrit sur le serveur pour un simple aperçu.

## Options

| Option | Type | Défaut | Rôle |
|---|---|---|---|
| `onlc_preview_css` | `string[]` | le `content_css` de l'éditeur | feuilles ajoutées à la fin du `<head>` de l'aperçu |
| `onlc_preview_template_url` | `string` | `''` | adresse de l'api rendant le gabarit |
| `onlc_preview_template` | `string` | `''` | gabarit donné directement ; prioritaire |
| `onlc_preview_values` | `object` | `{}` | valeurs des codes courts dans l'aperçu |

Sans gabarit configuré, l'aperçu se rabat sur une page nue : mieux vaut voir son contenu sans
décor que ne rien voir du tout.

## Bouton et commande

| Bouton | Commande | Effet |
|---|---|---|
| `onlcpreview` | `OnlcPreview` | ouvre l'aperçu de la page entière |

Trois largeurs sont proposées dans la fenêtre — ordinateur, tablette (820 px), téléphone
(390 px) — pour vérifier d'un clic que la page tient sur un petit écran.

## Simulation

`example/api/template-api.js` sert le gabarit `b3_agency` d'Online Création, et
`example/public/assets/demo.js` montre les valeurs correspondantes, `MenuSite` compris sous sa
forme fonction.
