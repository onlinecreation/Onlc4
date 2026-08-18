'use strict';

/**
 * Simulation du catalogue d'icônes Material Design (docs/api/onlc-icons-api.md).
 *
 * Le plugin `onlcicons` embarque déjà une sélection : les icônes renvoyées ici s'y ajoutent,
 * ce qui permet de vérifier la fusion et la recherche multilingue.
 */

const icons = [
  { name: 'rocket_launch', category: 'Action', keywords: [ 'fusée', 'lancement', 'décollage' ] },
  { name: 'handshake', category: 'Social', keywords: [ 'partenariat', 'accord', 'main' ] },
  { name: 'eco', category: 'Nature', keywords: [ 'écologie', 'feuille', 'vert' ] },
  { name: 'savings', category: 'Finance', keywords: [ 'tirelire', 'économie', 'budget' ] },
  { name: 'support_agent', category: 'Social', keywords: [ 'assistance', 'conseiller', 'aide' ] },
  { name: 'local_shipping', category: 'Transport', keywords: [ 'livraison', 'camion', 'expédition' ] },
  { name: 'restaurant', category: 'Lieux', keywords: [ 'restaurant', 'repas', 'couverts' ] },
  { name: 'school', category: 'Lieux', keywords: [ 'école', 'formation', 'étudiant' ] },
  { name: 'volunteer_activism', category: 'Social', keywords: [ 'don', 'solidarité', 'entraide' ] },
  { name: 'workspace_premium', category: 'Action', keywords: [ 'qualité', 'médaille', 'certification' ] }
];

const handle = (request, url) => {
  if (url.pathname === '/' && request.method.toUpperCase() === 'GET') {
    return { icons };
  }
  return null;
};

module.exports = { handle, icons };
