# `onlclink` — gestion des liens

Une seule boîte de dialogue pour tous les liens : liste prédéfinie fournie par une API, URL
personnalisée ou ancre de la page, cible (`_self` / `_blank`) et attributs `rel` les plus
courants.

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

| Champ | Rôle |
| --- | --- |
| Lien du site | Liste déroulante alimentée par l'API et/ou `onlc_link_list`, avec groupes |
| Adresse du lien | URL libre ; sélectionner une entrée ci-dessus la remplit automatiquement |
| Ancre dans la page | Éléments porteurs d'un `id` dans le document en cours |
| Texte à afficher | Visible uniquement lors de la création d'un lien sans sélection |
| Titre du lien | Attribut `title` |
| Ouvrir dans | Même onglet ou nouvel onglet (`target`) |
| Relation (rel) | `nofollow`, `noopener`, `noreferrer`, `sponsored`, `ugc`, … |
| Style du lien | Classes CSS proposées par `onlc_link_class_list` |

Les trois sources d'adresse restent synchronisées : saisir une URL déjà présente dans la liste
la sélectionne, et inversement.

Une barre d'outils contextuelle (modifier, ouvrir, supprimer) apparaît sur un lien sélectionné,
et le menu contextuel propose les mêmes actions.

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
  classes: 'btn btn-primary'
});
```
