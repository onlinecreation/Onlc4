'use strict';

/**
 * Simulation d'un catalogue d'icônes (docs/api/onlc-icons-api.md).
 *
 * La démonstration remplace le jeu Material Design intégré au plugin par un catalogue
 * FontAwesome : c'est le cas d'usage d'un projet qui a déjà sa propre bibliothèque d'icônes.
 * Côté éditeur, cela demande trois options :
 *
 *   onlc_icons_builtin: false,
 *   onlc_icons_output: 'class',
 *   onlc_icons_class_prefix: 'fa-solid fa-'
 */

const icons = [
  { name: 'house', category: 'Navigation', keywords: [ 'accueil', 'maison', 'home' ] },
  { name: 'magnifying-glass', category: 'Navigation', keywords: [ 'recherche', 'loupe', 'chercher' ] },
  { name: 'bars', category: 'Navigation', keywords: [ 'menu', 'burger', 'navigation' ] },
  { name: 'arrow-right', category: 'Navigation', keywords: [ 'flèche', 'suivant', 'droite' ] },
  { name: 'envelope', category: 'Contact', keywords: [ 'courriel', 'email', 'message' ] },
  { name: 'phone', category: 'Contact', keywords: [ 'téléphone', 'appel' ] },
  { name: 'location-dot', category: 'Contact', keywords: [ 'adresse', 'carte', 'position' ] },
  { name: 'clock', category: 'Contact', keywords: [ 'horaires', 'heure', 'temps' ] },
  { name: 'rocket', category: 'Marketing', keywords: [ 'fusée', 'lancement', 'rapide' ] },
  { name: 'handshake', category: 'Marketing', keywords: [ 'partenariat', 'accord', 'confiance' ] },
  { name: 'star', category: 'Marketing', keywords: [ 'étoile', 'avis', 'favori' ] },
  { name: 'heart', category: 'Marketing', keywords: [ 'coeur', 'aimer', 'favori' ] },
  { name: 'truck-fast', category: 'Commerce', keywords: [ 'livraison', 'expédition', 'camion' ] },
  { name: 'cart-shopping', category: 'Commerce', keywords: [ 'panier', 'achat', 'boutique' ] },
  { name: 'credit-card', category: 'Commerce', keywords: [ 'paiement', 'carte', 'bancaire' ] },
  { name: 'shield-halved', category: 'Commerce', keywords: [ 'sécurité', 'garantie', 'bouclier' ] },
  { name: 'leaf', category: 'Nature', keywords: [ 'écologie', 'feuille', 'vert' ] },
  { name: 'sun', category: 'Nature', keywords: [ 'soleil', 'météo', 'jour' ] },
  { name: 'graduation-cap', category: 'Services', keywords: [ 'formation', 'école', 'diplôme' ] },
  { name: 'headset', category: 'Services', keywords: [ 'assistance', 'support', 'conseiller' ] }
];

const handle = (request, url) => {
  if (url.pathname === '/' && request.method.toUpperCase() === 'GET') {
    return { icons };
  }
  return null;
};

module.exports = { handle, icons };
