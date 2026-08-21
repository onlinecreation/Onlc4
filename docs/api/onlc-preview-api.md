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

Elles sont ajoutées **à la fin du `<head>`**, après celles du gabarit, en deux temps :

1. **celles que les plugins déclarent nécessaires à la page publiée** — l'allure d'un bandeau, la
   grille d'un calendrier, la visionneuse d'un pdf, la taille d'un emoji, la parallaxe d'une
   image. Elles sont livrées avec les plugins ; le projet n'a rien à en dire ;
2. **celles du site** : `onlc_preview_css` si le projet l'a réglée, sinon son `content_css`. Elles
   viennent en dernier et ont donc le dernier mot, comme dans la zone d'écriture.

Les adresses sont rendues absolues, dédoublonnées, échappées, et les schémas exécutables refusés.
Un nom d'habillage (`default`, `dark`) est écarté : ce n'est pas une adresse, mais une ressource
interne de l'éditeur, qui ne décrit rien de la page publiée.

Les feuilles **d'écriture** ne sont jamais reprises : le pointillé d'un bloc survolé, la pastille
d'une section de langue, les hachures d'un espaceur vide n'existent pas dans la page publiée. Le
partage se fait dans `hugerte/plugins/onlcshared/PublishedCss` — un plugin y range ce dont le site
a besoin, et rien d'autre :

```ts
import * as PublishedCss from 'hugerte/plugins/onlcshared/PublishedCss';

PublishedCss.declareSheets(editor, [ `${pluginUrl}/css/monplugin.css` ]);
PublishedCss.declareRules(editor, `.${classe} { min-height: 4px; }`);
```

## L'adresse de base

L'adresse `blob:` du cadre n'est pas celle du site : une image en `/media/photo.jpg`, un pdf, une
police appelée par le gabarit n'ont donc rien à quoi se rapporter, et ne se chargent pas.

Une balise `<base>` posée en tête de `<head>` leur rend ce point de départ en une fois : celui du
document où l'on écrit, c'est-à-dire le site. Un gabarit qui déclare déjà sa propre base garde la
sienne, c'est un choix du site et non un oubli.

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

## Comment la page est servie

Par une adresse **`blob:`**, que le navigateur charge comme n'importe quelle page. Rien n'est
écrit sur le serveur pour autant : l'adresse ne vit que dans l'onglet, et elle est révoquée dès
que l'aperçu change ou se ferme.

Elle ne passe **pas** par `srcdoc`. Un document logé dans un attribut doit être transmis d'un
processus à l'autre dès que le cadre est isolé, et au-delà d'une dizaine de milliers de caractères
il arrive **tronqué**. Rien ne le signale : l'analyseur referme les balises ouvertes et rend une
page complète, amputée de sa fin. Une page de démonstration y perdait sept blocs sur treize — la
visionneuse de pdf et la vidéo n'étaient pas cassées, elles n'existaient pas.

## Ce que l'aperçu exécute

Les jetons du bac à sable viennent de `onlc_preview_sandbox`. Par défaut :

```
allow-scripts allow-same-origin allow-popups allow-forms allow-presentation
```

* les scripts du gabarit tournent — sans eux, ni menu déroulant ni carrousel ;
* `alert()`, `confirm()` et `prompt()` sont ignorés (`allow-modals` n'est pas accordé) : une page
  d'aperçu n'a pas à pouvoir bloquer l'éditeur ;
* la navigation de la fenêtre entière est refusée (`allow-top-navigation` non plus).

### Pourquoi `allow-same-origin`

Parce qu'une page **sans origine** ne peut presque rien faire de ce qu'une vraie page fait :

| Sans `allow-same-origin` | Pourquoi |
| --- | --- |
| Les polices d'icônes ne s'affichent pas | Le chargement d'une police est **toujours** soumis au contrôle d'origine ; depuis une origine opaque la requête part avec `Origin: null` et le serveur la refuse |
| La visionneuse de pdf reste vide | Elle va chercher le fichier sur le site : requête inter-origines, refusée |
| Une intégration tierce (YouTube, une carte) reste noire | Un cadre imbriqué **hérite** de l'isolement du cadre parent : le lecteur perd sa propre origine et refuse de démarrer |

En contrepartie, l'aperçu partage l'origine du back-office : un script de la page — celui du
gabarit, ou celui qu'un rédacteur a collé dans un bloc « Script » — peut atteindre le document qui
l'entoure.

### Les deux façons de retrouver l'isolement

**Isolement strict** — le projet accepte un aperçu approximatif :

```js
onlc_preview_sandbox: 'allow-scripts'
```

**Isolement réel, sans rien perdre** — servir le back-office et le site depuis **deux origines
distinctes** (`admin.exemple.fr` et `www.exemple.fr`). `allow-same-origin` ne désigne alors plus
que l'origine du site, et le back-office reste hors d'atteinte. C'est la configuration
recommandée en production.

## Options

| Option | Type | Défaut | Rôle |
|---|---|---|---|
| `onlc_preview_css` | `string[]` | le `content_css` de l'éditeur | feuilles du **site** dans l'aperçu ; celles des plugins s'y ajoutent toujours |
| `onlc_preview_sandbox` | `string` | `allow-scripts allow-same-origin allow-popups allow-forms allow-presentation` | jetons du bac à sable du cadre d'aperçu |
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
