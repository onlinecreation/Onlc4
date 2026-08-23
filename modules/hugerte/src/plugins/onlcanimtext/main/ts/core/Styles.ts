import { Arr } from '@ephox/katamari';

/**
 * La feuille dont un texte animé a besoin, dans la page publiée comme dans la zone d'écriture.
 *
 * ## Une seule feuille, quel que soit le nombre de passages animés
 *
 * Les images-clés d'une animation ne peuvent pas s'écrire dans un attribut `style` : il leur faut
 * une feuille. En écrire une **par passage** remplirait la page de blocs presque identiques, et il
 * faudrait les retrouver tous pour changer une durée.
 *
 * La feuille est donc unique. Ce qui change d'un passage à l'autre — la durée du cycle, le rang
 * d'un mot dans la ronde — voyage dans des **propriétés personnalisées** posées en style sur
 * l'élément. Deux textes animés de durées différentes partagent les mêmes images-clés.
 *
 * ## Ce qui dépend tout de même du nombre de mots
 *
 * Un sélecteur d'image-clé est un pourcentage : `calc()` n'y est pas admis. La part du cycle
 * pendant laquelle un mot reste visible — un `n`-ième — ne peut donc pas être calculée par le
 * navigateur. La feuille porte un jeu d'images-clés **par nombre de mots effectivement employé
 * dans la page** : une ronde de trois mots et une de quatre en produisent deux, et c'est tout.
 *
 * ## Ce que la feuille garantit quand rien ne s'anime
 *
 * Un navigateur qui refuse les animations — réglage « réduire les animations » du système — doit
 * montrer un texte lisible, pas un blanc. Chaque règle est écrite de façon que **l'état de repos
 * soit le texte visible** : le premier mot d'une ronde est opaque, un clignotant arrêté reste
 * allumé, un défilant arrêté se lit en place.
 */

/** Marque du bloc de style que le module pose en tête de la page publiée. */
export const marker = 'data-onlc-animtext';

/** Attribut qui porte le nombre de mots, et par lequel la bonne animation est choisie. */
export const countAttribute = 'data-onlc-animtext-count';

/** Fondu d'entrée et de sortie d'un mot, en pourcentage du cycle. */
const fade = 2;

const base = `
.onlc-animtext {
  --onlc-animtext-duration: 6s;
  display: inline-grid;
  grid-template-areas: "onlc-animtext";
  vertical-align: baseline;
}
.onlc-animtext > .onlc-animtext__item { grid-area: onlc-animtext; justify-self: start; }
.onlc-animtext--rotate > .onlc-animtext__item { opacity: 0; }
.onlc-animtext--rotate > .onlc-animtext__item:first-child { opacity: 1; }
.onlc-animtext--blink > .onlc-animtext__item {
  animation: onlc-animtext-blink var(--onlc-animtext-duration) step-end infinite;
}
.onlc-animtext--scroll { display: block; overflow: hidden; white-space: nowrap; }
.onlc-animtext--scroll > .onlc-animtext__item {
  display: inline-block;
  padding-left: 100%;
  animation: onlc-animtext-scroll var(--onlc-animtext-duration) linear infinite;
}
@keyframes onlc-animtext-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
@keyframes onlc-animtext-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
@media (prefers-reduced-motion: reduce) {
  .onlc-animtext > .onlc-animtext__item { animation: none; }
  .onlc-animtext--blink > .onlc-animtext__item { opacity: 1; }
  .onlc-animtext--scroll > .onlc-animtext__item { padding-left: 0; }
}
`.trim();

/**
 * Les images-clés d'une ronde de `count` mots.
 *
 * Chaque mot occupe un `count`-ième du cycle : il apparaît, reste, s'efface, puis attend son tour
 * suivant. Le décalage entre deux mots est posé en style sur chacun.
 */
const rotation = (count: number): string => {
  const part = 100 / count;
  const sortie = Math.max(fade, part - fade);
  return `.onlc-animtext--rotate[${countAttribute}="${count}"] > .onlc-animtext__item {` +
    ` animation: onlc-animtext-rotate-${count} var(--onlc-animtext-duration) linear infinite;` +
    ` animation-delay: calc(var(--onlc-animtext-duration) / ${count} * var(--onlc-animtext-index, 0)); }` +
    `@keyframes onlc-animtext-rotate-${count} {` +
    ` 0% { opacity: 0; } ${fade}% { opacity: 1; }` +
    ` ${sortie.toFixed(2)}% { opacity: 1; } ${part.toFixed(2)}% { opacity: 0; }` +
    ` 100% { opacity: 0; } }`;
};

/**
 * La feuille pour les rondes présentes dans la page.
 *
 * Une ronde d'un seul mot n'a pas d'images-clés : il n'y a rien à faire tourner, et le mot reste
 * visible — c'est déjà ce que dit la règle de base.
 */
const sheet = (counts: number[]): string => {
  const utiles = Arr.filter(Arr.unique(counts), (count) => count > 1).sort((a, b) => a - b);
  return [ base ].concat(Arr.map(utiles, rotation)).join('\n');
};

/** La feuille, réduite à une ligne : elle voyage dans la page, pas dans un fichier. */
const compact = (counts: number[]): string => sheet(counts).replace(/\s+/g, ' ').trim();

export {
  base,
  rotation,
  sheet,
  compact
};
