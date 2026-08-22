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

La carte est **monolithique** : rien ne s'y sélectionne, rien ne s'y modifie au clavier. Ce n'est
pas la fiche, c'est un résumé reconstruit depuis les données à chaque ouverture — le curseur posé
au milieu ferait croire qu'on peut le corriger, et le texte copié n'aurait pas de rapport avec ce
qui sera publié. Tout passe par le formulaire.

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

### Une image se choisit dans la médiathèque

Une propriété d'image — `image`, `logo`, `thumbnailUrl` — n'a **pas de champ d'adresse** : une
vignette cliquable, l'adresse choisie écrite en clair, et deux boutons, « Changer l'image… » et
« Retirer ». Personne n'écrit de mémoire l'adresse d'une photo, et une adresse recopiée de
travers donne une fiche que les moteurs rejettent sans rien dire.

Le champ d'adresse ne reparaît que si l'explorateur de médias — [`onlcmedia`](onlcmedia.md) —
n'est pas chargé.

### Un champ peut avoir une version par langue

Une valeur est **internationale** par défaut : elle est publiée quelle que soit la langue
demandée, et c'est ce que veut la quasi-totalité des propriétés — un prix, une référence, un
code-barres n'ont pas de traduction. Le nom et la description d'un produit, si.

Chaque champ de texte porte donc une barre : « Toutes les langues », puis une pastille par langue
déclarée. Un point vert marque celles pour lesquelles une version est écrite ; sans lui, il
faudrait cliquer sur chacune pour savoir ce que la fiche contient. **Vider un champ retire la
version**, ce qui ramène à l'international sans qu'on ait à chercher un bouton de suppression.

La fiche stocke ces versions avec les marqueurs du moteur du site, exactement comme le reste de
la page :

```json
"name": "[LG=fr]Coque de clef[/LG][LG=en]Key case[/LG]"
```

La barre n'apparaît **que si le site déclare des langues** (`onlc_multilang_languages`, voir
[`onlcmultilang`](onlcmultilang.md)). Sur un site monolingue, le champ est celui d'avant : rien
de tout ceci n'aurait de sens à montrer.

### Le formulaire défile

Il est long — une fiche produit complète fait plus de mille pixels — et il défile dans son cadre.
Il ne l'a pas toujours fait : le dialogue place un composant libre dans un cadre en
`overflow: hidden`, et tout ce qui passait sous la ligne de flottaison, l'aperçu du json compris,
était **hors d'atteinte**, sans barre de défilement pour le dire.

## Où va la fiche

**Tout en haut du document** — à l'ouverture comme à l'enregistrement, quel que soit l'endroit où
elle était écrite ou a été déplacée entre-temps. Ce sont des métadonnées : elles décrivent ce qui
suit, et celui qui ouvre la source doit les trouver sans dérouler la page.

Une page réelle l'écrit parfois au milieu d'un paragraphe, tout en bas, après le pied de page.
Elle est remontée dès l'ouverture : ce qu'on voit à l'écran est alors ce qui sera publié.

Si une page arrive avec plusieurs fiches — d'un autre éditeur, d'un copier-coller — la première
est conservée, les autres retirées, et le rédacteur en est averti. Les retirer en silence serait
modifier le travail de quelqu'un sans le lui dire.

## Ce que les autres plugins ne doivent pas en faire

Une fiche est un `script`, mais elle ne contient que des données : personne ne l'exécute jamais.
Deux plugins pourraient s'y tromper, et le plugin le leur dit.

**`onlcwidgets`** remplace chaque `script` d'une page par un jeton de code. `onlcseo` revendique
le type `application/ld+json` par le registre partagé `ScriptTypes`, posé sur l'objet éditeur :
la fiche traverse le jeton et arrive à son propre bloc. La revendication passait autrefois par
une option, ce qui n'était possible que si `onlcwidgets` avait été chargé **avant** — l'ordre des
plugins appartenant au projet, la fiche revenait alors en pavé de code sans que rien ne
l'explique. L'ordre n'a plus d'effet.

**`onlcmultilang`** transforme les marqueurs `[LG=fr]…[/LG]` en sections de langue. Une fiche
réelle en porte dans ses valeurs :

```json
"name": "[LG=en]Keychain[/LG][LG=fr]Coque de clef[/LG]"
```

Ce sont des données, que le moteur du site résoudra à la publication. Les transformer en éléments
y poserait des guillemets, au milieu d'une chaîne json : la fiche devenait illisible, et
l'éditeur en affichait une vide. Le plugin des langues s'arrête désormais aux portes d'un
`script` et d'un `style` — la même règle que le plugin des codes courts appliquait déjà.

Un projet qui ajoute ses propres types de `script` de données passe par l'option
`onlc_script_ignored_types` d'[`onlcwidgets`](onlcwidgets.md) : les deux s'additionnent.

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
