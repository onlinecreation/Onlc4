# API relais des feuilles de style du site

Cette API est **facultative**. Sans elle, la feuille de style du site habille l'éditeur et
l'aperçu comme prévu ; seules les **suggestions de classes** des formulaires restent vides quand
la feuille est servie par un autre domaine.

## Le problème

Une feuille de style s'affiche sans contrôle d'origine : un `<link>` vers
`https://exemple.tld/design.css` fonctionne depuis n'importe quel domaine. **En lire le texte**,
en revanche, est soumis au contrôle d'origine :

* `document.styleSheets[i].cssRules` lève une `SecurityError` sur une feuille d'un autre domaine ;
* `fetch()` est refusé si le site n'a pas posé d'en-tête `Access-Control-Allow-Origin`.

Or c'est ce texte qu'il faut lire pour proposer `flex-v-center` ou `btn-outline-default` dans le
champ « Classes CSS » d'un bloc. Un back-office qui administre `client.fr` depuis
`admin.onlinecreation.pro` ne peut donc rien proposer.

Le relais va chercher la feuille **côté serveur**, où le contrôle d'origine n'existe pas.

## Contrat

```
GET  <onlc_site_css_proxy>
```

L'éditeur remplace `{url}` par l'adresse encodée. Sans marqueur, elle est ajoutée en paramètre
`url` :

```js
onlc_site_css_proxy: '/api/site-css?url={url}'
// → GET /api/site-css?url=https%3A%2F%2Fexemple.tld%2Fdesign.css
```

### Réponse

```json
{
  "css": ".screen0 { min-height: 70vh } .flex-v-center { align-items: center }",
  "url": "https://exemple.tld/design.css"
}
```

Seul `css` est lu par l'éditeur. `url` sert au débogage : elle dit quelle adresse a finalement
répondu, après d'éventuelles redirections.

### Erreurs

Le format est celui des autres API : `{ "error": { "message": "…" } }`, avec un statut http.

| Statut | Quand |
|---|---|
| `400` | Adresse absente, illisible, ou protocole autre que `http`/`https` |
| `403` | Le domaine n'est pas dans la liste autorisée |
| `413` | Feuille trop volumineuse |
| `502` | Le site n'a pas répondu, ou a refusé |

Une erreur n'est jamais fatale côté éditeur : la feuille continue d'habiller la page, et le champ
« Classes CSS » explique que les classes n'ont pas pu être lues.

## Ce que l'implémentation doit refuser

Un relais qui va chercher n'importe quelle adresse pour le compte de celui qui la demande est une
porte ouverte sur le réseau interne — c'est la faille dite de **requête falsifiée côté serveur**
(SSRF). Une simple demande suffirait alors à lire
`http://169.254.169.254/latest/meta-data/`, c'est-à-dire les identifiants de la machine.

Trois garde-fous, dans cet ordre :

1. **le protocole** : `http` et `https` uniquement. Ni `file:`, ni `gopher:`, ni `data:` ;
2. **une liste de domaines autorisés**, fermée. C'est le garde-fou qui compte : sans liste, rien
   n'est servi. Une liste d'adresses *interdites* ne s'écrit jamais complètement — il y a toujours
   une notation de plus pour désigner `127.0.0.1` ;
3. **des bornes** : taille maximale, durée maximale, nombre de redirections.

Deux précautions de plus, moins évidentes :

* **chaque redirection repasse par le contrôle de domaine.** Un site autorisé qui redirige vers
  `127.0.0.1` contournerait autrement toute la protection ;
* **le message d'erreur ne dit pas ce qui a échoué.** « Hôte inconnu » et « connexion refusée »
  renseignent l'un et l'autre sur ce qui existe derrière le pare-feu. Une seule réponse pour tous
  les échecs réseau.

La comparaison de domaine porte sur le nom entier ou sur un suffixe **précédé d'un point** :
`exemple.tld` autorise `www.exemple.tld` mais pas `notexemple.tld`.

## Implémentation de référence

`example/api/site-css-api.js` — une centaine de lignes, sans dépendance. Les épreuves de
`example/test/site-css-api.test.js` vérifient chacun des refus ci-dessus.

```js
const relais = siteCssApi.create({ allowedHosts: [ 'lmparts.fr', 'static.onlc.eu' ] });
```

En production, la liste contient les domaines des sites que le back-office administre. Elle se
déduit naturellement de la base : ce sont les domaines des clients.

## Configuration côté éditeur

```js
hugerte.init({
  // Les feuilles du design : elles habillent la zone d'écriture et l'aperçu.
  onlc_site_css: [ 'https://exemple.tld/design.a1b2c3.css' ],
  // Le relais, pour que leurs classes soient proposées dans les formulaires.
  onlc_site_css_proxy: '/api/site-css?url={url}'
});
```

L'éditeur essaie trois choses, dans cet ordre, et s'arrête à la première qui réussit :

1. la feuille **déjà chargée** dans le document d'écriture — gratuit, et suffisant quand le site
   et le back-office partagent une origine ;
2. un `fetch` direct — suffisant quand le site autorise la lecture ;
3. le relais.

Le résultat est mémorisé : les formulaires l'appellent à chaque ouverture sans relancer le
moindre transfert.
