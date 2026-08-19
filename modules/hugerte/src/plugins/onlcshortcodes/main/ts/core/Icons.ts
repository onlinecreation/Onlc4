/**
 * Dessins des blocs de code court.
 *
 * Ce sont des svg en ligne plutôt que des noms d'icônes du thème : ils apparaissent à la fois
 * dans la page en cours d'écriture — où le jeu d'icônes de l'éditeur n'est pas disponible — et
 * dans la bibliothèque. Tous partagent la même grille de 24 pixels et prennent la couleur du
 * texte environnant.
 */

const wrap = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" ` +
  `fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const menu = wrap('<path d="M4 7h16M4 12h16M4 17h10"></path>');

const mail = wrap('<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3.5 7l8.5 6 8.5-6"></path>');

const search = wrap('<circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path>');

const share = wrap(
  '<circle cx="6" cy="12" r="2.6"></circle><circle cx="18" cy="6" r="2.6"></circle>' +
  '<circle cx="18" cy="18" r="2.6"></circle><path d="M8.4 10.8l7.2-3.6M8.4 13.2l7.2 3.6"></path>');

const card = wrap('<rect x="2.5" y="5.5" width="19" height="13" rx="2"></rect><path d="M2.5 10h19M6 15h4"></path>');

const image = wrap(
  '<rect x="3" y="5" width="18" height="14" rx="2"></rect>' +
  '<path d="M5 16l4.5-4.5 3.5 3.5 2.5-2.5L19 16"></path><circle cx="9" cy="9.5" r="1.3"></circle>');

const calendar = wrap(
  '<rect x="3.5" y="5" width="17" height="15" rx="2"></rect>' +
  '<path d="M3.5 10h17M8 3.5v3M16 3.5v3"></path>');

const code = wrap('<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"></path>');

export {
  wrap,
  menu,
  mail,
  search,
  share,
  card,
  image,
  calendar,
  code
};
