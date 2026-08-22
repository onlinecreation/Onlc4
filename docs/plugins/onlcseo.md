# `onlcseo` — description et microdonnées de la page

Deux choses décrivent une page aux moteurs de recherche sans jamais se voir sur le site :

* la **description et les mots-clés**, qui décident du texte affiché sous le titre dans les
  résultats ;
* les **microdonnées schema.org**, qui disent ce que la page décrit — un produit, un commerce, un
  événement — et permettent aux moteurs d'afficher un prix, des étoiles, une date de concert.

Elles ont une règle commune, et c'est elle qui justifie un plugin plutôt que deux blocs : **il
n'en faut qu'une de chaque par page**. Deux descriptions concurrentes, et les moteurs en
choisissent une au hasard ; deux fiches de microdonnées contradictoires, et ils rejettent les
deux. C'est la première cause de rejet dans leurs outils de test.

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcseo onlcwidgets',
  toolbar: 'onlcseo'
});
```

`onlcwidgets` n'est pas obligatoire, mais la description passe par son code court `[Meta]` : sans
lui, seule l'entrée « microdonnées » est proposée.

Le bouton ouvre un menu de deux entrées, dont l'intitulé dit si la page en a déjà une :
« Ajouter… » ou « Modifier… ».

## La description : un code court

La description et les mots-clés restent le code court des gabarits d'Online Création :

```
[Meta description="Coques de carte peintes à la teinte de votre véhicule." keywords="coque, Renault"]
```

C'est `onlcwidgets` qui sait le dessiner et le réécrire ; ce plugin-ci ne fait que **le retrouver**
et garantir qu'il n'y en a qu'un. Ce partage est délibéré : le format du code appartient au
moteur du site, pas à l'éditeur.

## Les microdonnées : du json, pas un code court

Une fiche schema.org est **hiérarchique** — un produit contient une offre, qui contient un
montant ; un commerce contient une adresse et six plages horaires. Un code court à quinze
attributs imbriqués serait illisible. Le plugin écrit donc du json :

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Coque de carte Renault",
  "image": "https://exemple.tld/coque.jpg",
  "offers": {
    "@type": "Offer",
    "price": "28",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

Dans l'éditeur, ce n'est pas ce texte qu'on voit : c'est une carte grise qui annonce le type
décrit, résume les valeurs principales et rappelle que rien n'en paraîtra sur le site.

## Le formulaire

Trois temps, dans cet ordre :

1. **Que décrit cette page ?** Les types sont présentés par rubrique, avec une phrase
   d'explication et leur nom schema.org en petit. Le rédacteur lit la phrase, l'intégrateur
   vérifie le nom.
2. **Ce qu'il faut renseigner.** Les propriétés exigées apparaissent d'emblée, marquées
   « Exigé », et ne peuvent pas être retirées ; les conseillées apparaissent aussi et se
   retirent.
3. **Ce que vous voulez ajouter.** Une liste déroulante propose le reste des propriétés du type —
   héritage compris — et une entrée permet d'en écrire une que le catalogue ignore.

Un objet imbriqué se modifie **dans la même fenêtre** : un fil d'Ariane en haut dit où l'on se
trouve et permet de remonter. Empiler des fenêtres pour renseigner une adresse serait
insupportable.

Le bas du formulaire montre le json produit, tel qu'il sera écrit dans la page.

## Où va la fiche

**Tout en haut du document**, à l'enregistrement, quel que soit l'endroit où le bloc a été
déplacé entre-temps. Ce sont des métadonnées : elles décrivent ce qui suit, et celui qui ouvre la
source doit les trouver sans dérouler la page.

Si une page arrive avec plusieurs fiches — d'un autre éditeur, d'un copier-coller — la première
est conservée, les autres retirées, et le rédacteur en est averti. Les retirer en silence serait
modifier le travail de quelqu'un sans le lui dire.

## Le catalogue schema.org

schema.org compte plus de huit cents types. Le plugin en décrit une cinquantaine : ceux que les
moteurs exploitent en résultats enrichis, plus les types de valeur dont ils ont besoin.

| Rubrique | Types |
|---|---|
| Contenus | Article, Billet de blog, Article de presse, Page web, Site web, Vidéo, Recette, Questions fréquentes, Mode d'emploi, Formation, Application |
| Commerce | Produit, Prestation, Offre d'emploi |
| Avis | Avis |
| Identité | Organisation, Commerce de proximité, Personne, Lieu |
| Événements | Événement |
| Navigation | Fil d'Ariane |

Les types de valeur — Offre, Adresse postale, Note moyenne, Plage d'ouverture, Montant… —
n'apparaissent pas dans cette liste : on n'y arrive que par la propriété qui les demande.

L'**héritage** fait le reste : les propriétés de `Thing` sont disponibles partout, celles de
`CreativeWork` sur tout contenu éditorial, sans être décrites deux fois.

### Quand le catalogue ne suffit pas

Trois portes de sortie, de la plus légère à la plus lourde :

* le formulaire accepte toujours une **propriété libre**, écrite à la main. Elle est écrite telle
  quelle dans la fiche, et signalée comme non vérifiée ;
* `onlc_seo_schema_types` **ajoute** des types, ou complète ceux d'origine — un type dont le nom
  existe déjà est fusionné, ce qui permet d'ajouter une propriété à `Product` sans recopier sa
  définition ;
* `onlc_seo_schema_exclude` en retire, pour raccourcir la liste de choix d'un projet qui n'a que
  faire des recettes de cuisine.

## Options

| Option | Défaut | Rôle |
|---|---|---|
| `onlc_seo_schema_types` | `[]` | Types ajoutés ou complétés, au format de `api/Types.ts` |
| `onlc_seo_schema_exclude` | `[]` | Types retirés du choix, par leur nom schema.org |
| `onlc_seo_context` | `https://schema.org` | Le contexte écrit en tête de la fiche |
| `onlc_seo_test_url` | outil de test de Google | Vide, aucun lien n'est proposé |

### Ajouter un type

```js
onlc_seo_schema_types: [{
  name: 'Vehicle',
  label: 'Véhicule',
  description: 'Une voiture, une moto, un utilitaire.',
  parent: 'Product',
  category: 'Commerce',
  required: [ 'name', 'image' ],
  fields: [
    { name: 'vehicleIdentificationNumber', label: 'Numéro de série (VIN)', type: 'text' },
    { name: 'mileageFromOdometer', label: 'Kilométrage', type: 'nested', of: [ 'QuantitativeValue' ] }
  ]
}]
```

`parent: 'Product'` suffit à hériter du prix, de la marque et des avis.

## Commandes

| Commande | Effet |
|---|---|
| `OnlcSeoMicrodata` | Ouvre le formulaire des microdonnées |
| `OnlcSeoRemoveMicrodata` | Retire la fiche de la page |
| `OnlcSeoMeta` | Ouvre le formulaire de la description (via `onlcwidgets`) |
| `OnlcSeoReport` | Émet un événement `OnlcSeoReport` décrivant l'état de la page |

`OnlcSeoReport` sert à un tableau de bord de back-office. Il rend ce qui existe et ce qui manque,
sans note ni jugement : une page de mentions légales n'a que faire d'une fiche de microdonnées.

```js
editor.on('OnlcSeoReport', (etat) => {
  // { hasMeta, hasMicrodata, microdataType, properties }
});
editor.execCommand('OnlcSeoReport');
```

## API du plugin

```js
const seo = editor.plugins.onlcseo;

seo.getMicrodata();               // l'objet de la page, ou null
seo.setMicrodata({ '@type': 'Product', name: 'Coque' });
seo.listTypes();                  // les types proposés
seo.listFields('Product');        // ses propriétés, héritage compris
seo.listRequired('Product');      // celles qu'il exige
seo.hasMeta();                    // la page a-t-elle une description ?
```

Un objet sans `@type` passé à `setMicrodata` **supprime** la fiche : c'est la façon de dire
« cette page ne décrit rien de particulier ».

## Ce que le plugin ne fait pas

Il ne dit pas si la fiche est valide. La validité d'une fiche schema.org dépend de règles que
chaque moteur fait évoluer de son côté ; un éditeur qui afficherait « c'est bon » se tromperait
tôt ou tard. Le formulaire signale seulement les propriétés **exigées restées vides**, et propose
d'ouvrir l'outil de test qui fait autorité.
