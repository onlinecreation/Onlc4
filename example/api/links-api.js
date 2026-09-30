'use strict';

/**
 * Simulation de l'API des liens prédéfinis (docs/api/onlc-link-api.md).
 *
 * Un vrai site renverrait ici l'arborescence de ses pages, issue de son CMS.
 */

const items = [
  { title: 'Accueil', url: '/' },
  {
    title: 'Services',
    url: '/services',
    children: [
      { title: 'Conseil', url: '/services/conseil' },
      { title: 'Formation', url: '/services/formation' },
      {
        title: 'Développement',
        url: '/services/developpement',
        children: [
          { title: 'Sites vitrines', url: '/services/developpement/sites-vitrines' },
          { title: 'Applications métier', url: '/services/developpement/applications' }
        ]
      }
    ]
  },
  {
    title: 'Réalisations',
    children: [
      { title: 'Toutes les réalisations', url: '/realisations' },
      { title: 'Étude de cas — Mairie de Saint-Ex', url: '/realisations/mairie-saint-ex' }
    ]
  },
  { title: 'Blog', url: '/blog' },
  { title: 'Contact', url: '/contact' },
  { title: 'Mentions légales', url: '/mentions-legales' }
];

const handle = (request, url) => {
  if (url.pathname === '/' && request.method.toUpperCase() === 'GET') {
    return { items };
  }
  return null;
};

module.exports = { handle, items };
