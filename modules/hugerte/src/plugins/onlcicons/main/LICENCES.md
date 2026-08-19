# Ressources embarquées dans le plugin onlcicons

Ce plugin embarque des ressources produites par des tiers. Elles gardent leur licence d'origine,
et les mentions ci-dessous doivent être conservées.

## OpenMoji — dessins des emojis

* Site : <https://openmoji.org>
* Fichiers : `main/openmoji/*.svg` (4 495 dessins couleur)
* Licence : **CC BY-SA 4.0** — <https://creativecommons.org/licenses/by-sa/4.0/>

La licence impose une **attribution visible** : toute page qui affiche ces emojis doit créditer
OpenMoji. Le plugin ne peut pas le faire à votre place ; ajoutez la mention dans le pied de page
de votre site, par exemple :

```html
<p>Emojis dessinés par <a href="https://openmoji.org">OpenMoji</a> — licence CC BY-SA 4.0.</p>
```

Pour régénérer le jeu de dessins depuis une version plus récente d'OpenMoji :

```sh
node modules/hugerte/tools/openmoji/build-openmoji.js /chemin/vers/openmoji/color/svg
```

## Font Awesome Free 6.7.2 — police d'icônes

* Site : <https://fontawesome.com>
* Fichiers : `main/css/fontawesome.css`, `main/fonts/fa-*.woff2`
* Licences : **SIL OFL 1.1** pour les fontes, **MIT** pour les feuilles de style,
  **CC BY 4.0** pour les dessins. Copyright 2024 Fonticons, Inc.

La feuille embarquée est la concaténation de `all.min.css` et de `v4-shims.min.css` : les anciens
noms de classes (`fa fa-home`) continuent donc de fonctionner à côté des nouveaux (`fa-solid
fa-house`).

## Material Icons — police d'icônes

* Site : <https://github.com/google/material-design-icons>
* Fichiers : `main/css/material-icons.css`, `main/fonts/material-icons.woff2`
* Licence : **Apache 2.0**. Copyright Google LLC.
