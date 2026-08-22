/**
 * Dessins des boutons de propriétés posés dans la barre des blocs.
 *
 * Ils sont écrits en svg plutôt que pris dans le jeu d'icônes du thème : la barre des blocs vit
 * **dans** la zone d'écriture, où le chargeur d'icônes de l'interface n'a pas cours. Un caractère
 * de police, lui, dépendrait de la police du contenu — celle du site — et se décentrerait.
 *
 * Tous partagent la même boîte de 24 × 24 et le même trait, pour qu'ils s'alignent entre eux et
 * avec les commandes de manipulation.
 */

const draw = (paths: string): string =>
  '<svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"' +
  ` fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

/** Curseurs de réglage : les propriétés d'un bloc ordinaire. */
const sliders = draw('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"></path>' +
  '<circle cx="16" cy="7" r="2"></circle><circle cx="10" cy="17" r="2"></circle>');

/** Crayon : modifier le contenu d'un bloc. */
const edit = draw('<path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4z"></path><path d="M14 6l4 4"></path>');

/** Chevrons de code : un script, un fragment html. */
const code = draw('<path d="M9 8l-5 4 5 4M15 8l5 4-5 4"></path>');

/** Cadre et montagne : une image. */
const image = draw('<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 16l5-5 4 4 3-3 5 5"></path>');

/** Flèches opposées : la hauteur d'un espace. */
const spacing = draw('<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"></path>');

/** Trois colonnes : la disposition d'une ligne de grille. */
const columns = draw('<rect x="3" y="5" width="4.5" height="14" rx="1"></rect>' +
  '<rect x="9.75" y="5" width="4.5" height="14" rx="1"></rect><rect x="16.5" y="5" width="4.5" height="14" rx="1"></rect>');

/** Cadre encadré de deux traits : un diaporama. */
const slideshow = draw('<rect x="6" y="6" width="12" height="12" rx="2"></rect><path d="M3 9v6M21 9v6"></path>');

/** Étiquette : les données de référencement d'une page. */
const tag = draw('<path d="M4 4h8l8 8-8 8-8-8z"></path><circle cx="8.5" cy="8.5" r="1.2"></circle>');

export {
  draw,
  sliders,
  edit,
  code,
  image,
  spacing,
  columns,
  slideshow,
  tag
};
