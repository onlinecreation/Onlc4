/**
 * Dessins du texte animé.
 *
 * Deux traits de texte et une flèche qui tourne : ce qui se répète, à la même place. Le dessin est
 * écrit en svg parce que la barre des blocs vit **dans** la zone d'écriture, où le chargeur
 * d'icônes de l'interface n'a pas cours.
 */

const draw = (size: number, width: number): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"` +
  ` focusable="false" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${width}"` +
  ' stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M4 8h9M4 13h6"></path>' +
  '<path d="M20 9.5a5 5 0 1 0-1.2 5.2"></path>' +
  '<path d="M20 5.5v4h-4"></path>' +
  '</svg>';

/** Repère de type, dans le contour d'un bloc : 16 pixels, trait épais. */
const kind = draw(16, 2.2);

/** Bouton de barre : 20 pixels, trait plus fin. */
const action = draw(20, 1.8);

export {
  kind,
  action
};
