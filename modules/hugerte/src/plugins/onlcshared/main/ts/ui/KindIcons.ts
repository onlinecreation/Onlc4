/**
 * Dessins du **type** d'un bloc, posés dans l'angle haut gauche de son contour.
 *
 * Ils tiennent dans 16 × 16 : c'est un repère, pas un bouton. On ne clique pas dessus, on le
 * reconnaît du coin de l'œil — d'où un trait plus épais que celui des commandes, sans quoi le
 * dessin disparaît à cette taille.
 *
 * Comme les icônes des boutons, ils sont écrits en svg : la barre des blocs vit **dans** la zone
 * d'écriture, où le chargeur d'icônes de l'interface n'a pas cours, et un caractère de police
 * dépendrait de la police du site.
 */

const draw = (paths: string): string =>
  '<svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"' +
  ` fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

/** Lignes de texte : un paragraphe. */
const paragraph = draw('<path d="M4 6h16M4 12h16M4 18h10"></path>');

/** Un « H » : un titre. */
const heading = draw('<path d="M6 5v14M18 5v14M6 12h12"></path>');

/** Points et lignes : une liste. */
const list = draw('<path d="M9 6h11M9 12h11M9 18h11"></path>' +
  '<circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none"></circle>' +
  '<circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none"></circle>' +
  '<circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none"></circle>');

/** Grille fermée : un tableau. */
const table = draw('<rect x="3" y="5" width="18" height="14" rx="1.5"></rect><path d="M3 10h18M9 10v9"></path>');

/** Cadre et montagne : une image. */
const image = draw('<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 16l5-5 4 4 3-3 5 5"></path>');

/** Guillemet : une citation. */
const quote = draw('<path d="M9 7H5v5h4v6H5M19 7h-4v5h4v6h-4"></path>');

/** Trois colonnes : une ligne de grille. */
const row = draw('<rect x="3" y="6" width="4.5" height="12" rx="1"></rect>' +
  '<rect x="9.75" y="6" width="4.5" height="12" rx="1"></rect>' +
  '<rect x="16.5" y="6" width="4.5" height="12" rx="1"></rect>');

/** Une colonne seule, dans son cadre : une colonne de grille. */
const column = draw('<rect x="3" y="5" width="18" height="14" rx="1.5"></rect>' +
  '<rect x="9" y="8" width="6" height="8" rx="0.8" fill="currentColor" stroke="none"></rect>');

/** Cadre large, coins arrondis : une section, un bloc d'enrobage. */
const section = draw('<rect x="3" y="4" width="18" height="16" rx="2.5"></rect><path d="M3 9h18"></path>');

/** Cadre encadré de deux traits : un diaporama. */
const slideshow = draw('<rect x="6" y="6" width="12" height="12" rx="2"></rect><path d="M3 9v6M21 9v6"></path>');

/** Deux maillons : un lien. */
const link = draw('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"></path>' +
  '<path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"></path>');

/** Losange percé : une étiquette de référencement. */
const tag = draw('<path d="M4 4h8l8 8-8 8-8-8z"></path><circle cx="8.5" cy="8.5" r="1.4"></circle>');

/** Chevrons : un script. */
const script = draw('<path d="M9 8l-5 4 5 4M15 8l5 4-5 4"></path>');

/** Crochets : un code court. */
const shortcode = draw('<path d="M9 4H5v16h4M15 4h4v16h-4"></path>');

/** Losange plein : un bloc prédéfini, dessiné par l'éditeur. */
const widget = draw('<path d="M12 3l9 9-9 9-9-9z"></path><path d="M12 8.5v7M8.5 12h7"></path>');

/** Flèches opposées : un espace réglable. */
const spacer = draw('<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"></path>');

/** Globe : une section de langue. */
const language = draw('<circle cx="12" cy="12" r="9"></circle>' +
  '<path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21C9.5 18.4 8.2 15.4 8.2 12S9.5 5.6 12 3z"></path>');

export {
  draw,
  paragraph,
  heading,
  list,
  table,
  image,
  quote,
  row,
  column,
  section,
  slideshow,
  link,
  tag,
  script,
  shortcode,
  widget,
  spacer,
  language
};
