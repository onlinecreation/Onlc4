# `onlclink` — gestion des liens

Une seule boîte de dialogue pour tous les liens : une page du site fournie par une API, une
adresse écrite à la main ou une ancre de la page en cours, plus la cible (`_self` / `_blank`),
les attributs `rel` les plus courants et, dans un second onglet, ce qu'un intégrateur règle.

Le contrat de l'API est décrit dans [API des liens](../api/onlc-link-api.md).

## Activation

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlclink',
  toolbar: 'onlclink onlcunlink onlcopenlink',
  onlc_link_api_url: 'https://exemple.tld/api/links'
});
```

## Interface

La fenêtre a deux onglets. **Lien** suffit à un rédacteur ; **Avancé** ne sert qu'à qui écrit du
css ou du javascript. Elle prend la hauteur d'une fenêtre à onglets : sans hauteur fixée, le
thème la calcule sur le premier onglet rendu, et le pied de page remonte par-dessus les champs
du second.

### Les trois sortes de lien

Un lien mène **soit** à une page du site, **soit** à une ancre de la page en cours, **soit** à
une adresse écrite à la main. Ces trois cas ne se mélangent jamais.

Une seule liste — « Pages du site » — les propose donc toutes les trois, et le champ
correspondant n'apparaît qu'**ensuite** :

| Choix dans la liste | Ce qui apparaît en dessous |
| --- | --- |
| Une page du site | Rien : l'adresse de la page choisie suffit |
| « Personnalisé (adresse) » | Le champ **Adresse du lien** |
| « Page actuelle (ancres) » | La liste **Ancre dans la page**, alimentée par les `id` du document |

Cette dernière entrée n'est proposée que si la page contient au moins une ancre. La fenêtre se
redessine à chaque changement de sorte : c'est le seul moyen, avec l'api des dialogues, de faire
disparaître un champ.

> **Pourquoi pas les trois champs à la fois ?** C'est ce que faisait la version précédente, et
> elle demandait au rédacteur de deviner lequel comptait. Il en remplissait deux, et l'un
> écrasait l'autre en silence. La liste décide, et elle seule.

### Onglet « Lien »

| Champ | Rôle |
| --- | --- |
| Texte à afficher | Visible uniquement lors de la création d'un lien sans sélection |
| Pages du site | La sorte de lien, et la page choisie le cas échéant |
| Adresse du lien | URL libre — sorte « Personnalisé (adresse) » seulement |
| Ancre dans la page | Éléments porteurs d'un `id` — sorte « Page actuelle (ancres) » seulement |
| Ouvrir dans | Même onglet ou nouvel onglet (`target`) |
| Relation (rel) | `nofollow`, `noopener`, `noreferrer`, `sponsored`, `ugc`, … |
| Style du lien | Classes proposées par `onlc_link_class_list`, quand l'option est renseignée |

### Onglet « Avancé »

| Champ | Attribut produit | Rôle |
| --- | --- | --- |
| Titre du lien | `title` | La bulle d'aide au survol, lue à voix haute par les lecteurs d'écran |
| Classes CSS | `class` | Le même sélecteur que les propriétés de bloc : les classes de la feuille du site et celles déjà posées dans la page sont proposées |
| Style CSS écrit à même le lien | `style` | Pour un lien qui doit sortir du lot sans classe dédiée |
| Action javascript au clic | `onclick` | Voir ci-dessous |

Le champ « Classes CSS » et la liste « Style du lien » ne s'excluent pas : la classe choisie
dans la liste s'ajoute à celles du champ. Les noms sont revalidés avant d'atteindre l'attribut,
et pas seulement à la saisie — ce qui atteint le document ne doit dépendre d'aucun composant
d'interface, si soigneux soit-il.

### L'action au clic ne s'exécute pas pendant l'écriture

Un `onclick` posé sur un lien de la zone d'écriture **s'exécute** : le rédacteur qui clique sur
son propre lien déclencherait son propre code, au milieu de l'éditeur. C'est exactement ce que
le bac à sable des scripts évite par ailleurs, et un lien n'a pas de raison d'y échapper.

L'attribut voyage donc sous un nom inerte, `data-onlc-click`, pendant toute l'écriture, et
redevient `onclick` à l'enregistrement :

```html
<!-- Dans la zone d'écriture -->
<a href="/contact" data-onlc-click="return confirm('Partir ?')">contact</a>

<!-- Ce que getContent() renvoie, et ce qui est publié -->
<a href="/contact" onclick="return confirm('Partir ?')">contact</a>
```

La conversion se fait dans les deux sens : un `onclick` présent dans le html chargé est désarmé
à l'ouverture, et le champ le montre. Le plugin neutralise aussi le ctrl-clic et le clic du
milieu sur un lien de la zone d'écriture, que le navigateur suivrait sans prévenir — on quitte
son back-office sans avoir rien demandé.

### Ouvrir un lien pour le modifier

Un **double-clic** sur un lien ouvre cette fenêtre. C'est le mécanisme générique des blocs :
voir [`onlcblocks`](onlcblocks.md#le-double-clic-ouvre-la-configuration-du-bloc). Une barre
d'outils contextuelle (modifier, ouvrir, supprimer) apparaît par ailleurs sur un lien
sélectionné, et le menu contextuel propose les mêmes actions.

## Options

Toutes les options `onlc_link_*` sont documentées dans
[API des liens](../api/onlc-link-api.md#configuration). Elles sont partagées avec `onlcmedia`
et `onlcwidgets` : configurez-les une fois, elles servent partout.

## Commandes

| Commande | Effet |
| --- | --- |
| `OnlcLink` | Ouvre la boîte de dialogue sur le lien sélectionné ou en crée un |
| `OnlcApplyLink` | Applique un lien sans interface (`value` : objet `LinkAttributes`) |
| `OnlcUnlink` | Supprime le lien de la sélection |
| `OnlcRefreshLinkList` | Vide le cache de la liste prédéfinie et la recharge |

```js
editor.execCommand('OnlcApplyLink', false, {
  href: '/contact',
  title: 'Nous écrire',
  target: '_blank',
  rel: 'noopener',
  classes: 'btn btn-primary',
  style: 'text-transform: uppercase',
  click: 'return confirm(\'Partir ?\')'
});
```

`style` et `click` sont facultatifs. `click` suit la règle ci-dessus : il est posé en
`data-onlc-click`, et ne devient un `onclick` qu'à l'enregistrement.
