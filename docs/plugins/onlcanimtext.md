# `onlcanimtext` — texte animé

Trois façons d'animer un passage de texte : **clignotant**, **défilant**, ou plusieurs mots qui
**se relaient** à la même place.

```js
hugerte.init({
  selector: 'textarea',
  plugins: 'onlcanimtext',
  toolbar: 'onlcanimtext'
});
```

Aucune option : le module écrit lui-même la feuille dont les passages animés ont besoin.

## Ce qu'il apporte à une page qui le faisait déjà

Une page peut très bien animer un passage sans lui — quelques images-clés dans la feuille du site,
des mots superposés — et cela fonctionne **sur le site**. Deux choses manquent alors :

* **dans l'éditeur, rien ne bouge.** Les images-clés vivent le plus souvent dans un bloc `<style>`
  posé dans le contenu, que le nettoyeur du cœur retire — c'est ce qui protège la zone d'écriture
  d'une feuille venue d'ailleurs ;
* **la mise en page saute.** Des mots superposés en `position: absolute` ne dimensionnent pas leur
  conteneur : il faut lui deviner une largeur, `min-width: 5em`. La devinette est fausse dès qu'on
  ajoute un mot plus long — il déborde — ou trop large, et laisse un trou.

Le module reprend ces passages à son compte : il **reconnaît l'écriture d'origine**, la configure
d'un double clic, et écrit la feuille en tête de la page enregistrée.

## Une seule case de grille, et la largeur se règle toute seule

Les mots d'une ronde sont empilés dans **une même case de grille** :

```css
.onlc-animtext { display: inline-grid; grid-template-areas: "onlc-animtext"; }
.onlc-animtext > .onlc-animtext__item { grid-area: onlc-animtext; }
```

Le navigateur dimensionne la case sur le plus long des mots, sans qu'on ait rien à mesurer, et le
texte qui suit ne bouge plus quand ils se relaient. C'est la seule différence de méthode avec des
animations croisées écrites à la main, et c'est elle qui fait tenir la mise en page.

## Ce que la page contient

```html
<style data-onlc-animtext="1">…</style>

<p>La carte de votre <span class="onlc-animtext onlc-animtext--rotate"
      style="--onlc-animtext-duration: 6s;" data-onlc-animtext-count="3"
      data-onlc-animtext="%7B%22kind%22%3A%22rotate%22…">
  <span class="onlc-animtext__item" style="--onlc-animtext-index: 0;">Renault</span>
  <span class="onlc-animtext__item" style="--onlc-animtext-index: 1;">Dacia</span>
  <span class="onlc-animtext__item" style="--onlc-animtext-index: 2;">Alpine</span>
</span></p>
```

Le html se lit **sans la feuille** : les mots s'y suivent en texte ordinaire. Un moteur de
recherche, un lecteur d'écran ou un navigateur qui n'appliquerait pas la feuille voit donc
« Renault Dacia Alpine », et non un trou.

### La feuille est déduite du contenu

Elle est **retirée à l'ouverture** et **réécrite à l'enregistrement**. Trois conséquences :

* elle ne peut pas dériver de ce que la page contient ;
* elle ne s'empile pas d'un aller-retour à l'autre — une page rouverte cinq fois n'en porte pas
  cinq ;
* une page sans texte animé n'en porte **aucune**.

Une seule feuille sert toute la page, quel que soit le nombre de passages animés. Ce qui change de
l'un à l'autre — la durée du cycle, le rang d'un mot — voyage dans des propriétés personnalisées
posées en style sur l'élément.

Elle porte en revanche **un jeu d'images-clés par nombre de mots employé dans la page** : un
sélecteur d'image-clé est un pourcentage, et `calc()` n'y est pas admis. La part du cycle pendant
laquelle un mot reste visible — un `n`-ième — ne peut donc pas être calculée par le navigateur.
Une ronde de trois mots et une de quatre produisent deux jeux, et c'est tout.

## Le formulaire

| Champ | Rôle |
| --- | --- |
| Sorte d'animation | Mots qui se relaient, clignotant, défilant |
| Mots qui se relaient | Un par ligne — c'est la façon d'écrire une liste que tout le monde connaît, et elle évite de choisir un séparateur qu'un mot pourrait contenir |
| Texte animé | Pour le clignotant et le défilant, qui n'ont qu'un passage |
| Durée d'un cycle | En secondes, bornée entre 0,1 et 300 |

La durée est **bornée**, et pas seulement conseillée : en dessous d'un dixième de seconde une
animation devient un scintillement, que certaines personnes ne supportent pas et qui peut
déclencher une crise ; au-delà de cinq minutes, plus personne ne voit qu'il se passe quelque chose.

## Reprise d'une page existante

L'écriture reconnue est celle-ci — un conteneur `alternate-brands-container` et des mots
`alternate-brands` :

```html
<span class="alternate-brands-container">
  <span class="alternate-brands alternate-brands-1">Renault</span>…
</span>
```

Un double clic l'ouvre, les mots y sont déjà. À l'enregistrement du formulaire, les classes de
l'ancienne technique **s'en vont** : elles portaient la largeur devinée, et la garder ferait
exactement ce que le module vient supprimer. Les mots, eux, sont conservés — c'est la présentation
qui change de mains, pas le contenu.

## Accessibilité

Le réglage « réduire les animations » du système est un besoin, pas une préférence : certaines
personnes ont des migraines ou des crises devant un texte qui clignote. Sous
`prefers-reduced-motion: reduce`, tout s'arrête sur son **état de repos**, qui est un texte
lisible : le premier mot d'une ronde reste visible, un clignotant reste allumé, un défilant se lit
en place.

## Commandes et API

| Commande | Effet |
| --- | --- |
| `OnlcAnimText` | Ouvre le formulaire sur le passage animé de la sélection, ou en crée un |

```js
const anim = editor.plugins.onlcanimtext;
anim.openDialog(nœud);  // le formulaire, sur le passage qui contient ce nœud
anim.list();            // les passages animés de la page
anim.css();             // la feuille que la page enregistrée portera
```
