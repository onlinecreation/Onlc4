import { SchemaField, SchemaType } from '../api/Types';

/**
 * Le vocabulaire schema.org, tel que l'éditeur le présente.
 *
 * ## Pourquoi un catalogue et non le vocabulaire entier
 *
 * schema.org compte plus de huit cents types et treize cents propriétés, dont l'immense majorité
 * ne concerne ni un site vitrine ni une boutique — `MolecularEntity`, `MedicalTrial`,
 * `APIReference`. Les charger tous ferait un fichier de plusieurs centaines de kilooctets, à
 * télécharger par tout le monde pour que personne ne s'en serve, et surtout une liste de choix
 * dans laquelle « Produit » se trouverait entre « Procédure médicale » et « Programme de radio ».
 *
 * Ce catalogue décrit donc **ce que les moteurs savent lire** et ce qu'un site de PME publie :
 * les types que Google exploite en résultats enrichis, plus les types de valeur dont ils ont
 * besoin. L'héritage fait le reste — les propriétés de `CreativeWork` sont disponibles sur un
 * article comme sur une recette sans être écrites deux fois.
 *
 * Trois portes de sortie, pour que le catalogue ne soit jamais une limite :
 *
 * * `onlc_seo_schema_types` ajoute des types, ou complète ceux d'ici ;
 * * `onlc_seo_schema_exclude` en retire ;
 * * le formulaire accepte toujours une **propriété libre**, écrite à la main.
 *
 * ## Comment les intitulés sont écrits
 *
 * Chaque propriété porte son nom schema.org **et** une formulation ordinaire. Le formulaire
 * affiche les deux : « Titre » suivi de `headline` en petit. Le néophyte lit la première moitié,
 * l'intégrateur la seconde, et personne n'a besoin d'ouvrir la documentation du vocabulaire pour
 * vérifier qu'on parle bien de la même chose.
 */

/** Propriétés de `Thing` : tout type du vocabulaire en hérite. */
const thingFields: SchemaField[] = [
  { name: 'name', label: 'Nom', type: 'text',
    help: 'Le nom sous lequel cette chose est connue. C’est ce que les moteurs affichent en titre.',
    placeholder: 'Coque de carte Renault' },
  { name: 'description', label: 'Description', type: 'textarea',
    help: 'Quelques phrases qui décrivent la chose. Souvent reprise sous le titre dans les résultats.' },
  { name: 'url', label: 'Adresse de la page', type: 'url',
    help: 'L’adresse à laquelle cette chose est présentée. Le plus souvent, la page courante.' },
  { name: 'image', label: 'Image', type: 'image', many: true,
    help: 'Une photo qui représente la chose. Les moteurs préfèrent une image large, d’au moins 1200 pixels.' },
  { name: 'identifier', label: 'Référence', type: 'text',
    help: 'Un code qui désigne cette chose sans ambiguïté : référence interne, numéro de catalogue.' },
  { name: 'sameAs', label: 'Autres pages qui parlent de cette chose', type: 'url', many: true,
    help: 'Page Wikipédia, profil Facebook, fiche Google : les adresses qui désignent la même chose ailleurs.' },
  { name: 'alternateName', label: 'Autre nom', type: 'text',
    help: 'Un second nom sous lequel la chose est aussi connue.' }
];

const creativeWorkFields: SchemaField[] = [
  { name: 'headline', label: 'Titre', type: 'text',
    help: 'Le titre du contenu. Restez sous 110 caractères : au-delà, les moteurs le coupent.' },
  { name: 'author', label: 'Auteur', type: 'nested', of: [ 'Person', 'Organization' ], many: true,
    help: 'Qui a écrit ce contenu : une personne, ou l’entreprise elle-même.' },
  { name: 'publisher', label: 'Éditeur', type: 'nested', of: [ 'Organization', 'Person' ],
    help: 'Qui publie ce contenu — le plus souvent votre entreprise.' },
  { name: 'datePublished', label: 'Date de publication', type: 'date',
    help: 'Le jour où le contenu a été mis en ligne.' },
  { name: 'dateModified', label: 'Date de dernière mise à jour', type: 'date',
    help: 'Le jour de la dernière modification. Les moteurs s’en servent pour juger de la fraîcheur.' },
  { name: 'inLanguage', label: 'Langue', type: 'text', placeholder: 'fr',
    help: 'Le code de la langue du contenu : fr, en, nl.' },
  { name: 'keywords', label: 'Mots-clés', type: 'text',
    help: 'Séparés par des virgules. Ils décrivent le sujet, pas la page.' },
  { name: 'about', label: 'Sujet', type: 'nested', of: [ 'Thing' ],
    help: 'La chose dont ce contenu parle.' },
  { name: 'license', label: 'Licence', type: 'url',
    help: 'L’adresse des conditions de réutilisation du contenu.' },
  { name: 'isAccessibleForFree', label: 'Accessible sans payer', type: 'select',
    items: [
      { text: 'Oui', value: 'true' },
      { text: 'Non', value: 'false' }
    ],
    help: 'Non pour un contenu réservé aux abonnés.' }
];

const catalog: SchemaType[] = [
  {
    name: 'Thing',
    label: 'Chose',
    description: 'Le type le plus général : à n’employer que si aucun autre ne convient.',
    fields: thingFields
  },

  /* Contenus éditoriaux ---------------------------------------------------- */

  {
    name: 'CreativeWork',
    label: 'Œuvre',
    description: 'Un contenu créé : texte, image, vidéo, logiciel.',
    parent: 'Thing',
    fields: creativeWorkFields
  },
  {
    name: 'Article',
    label: 'Article',
    description: 'Un texte de fond : billet, dossier, tribune.',
    parent: 'CreativeWork',
    category: 'Contenus',
    required: [ 'headline', 'image', 'datePublished' ],
    recommended: [ 'author', 'publisher', 'dateModified' ],
    fields: [
      { name: 'articleBody', label: 'Texte de l’article', type: 'textarea',
        help: 'Le corps de l’article. Facultatif : les moteurs le lisent déjà dans la page.' },
      { name: 'articleSection', label: 'Rubrique', type: 'text',
        help: 'La section du site où l’article paraît : Actualités, Recettes, Juridique.' },
      { name: 'wordCount', label: 'Nombre de mots', type: 'number' }
    ]
  },
  {
    name: 'BlogPosting',
    label: 'Billet de blog',
    description: 'Un article publié au fil de l’eau sur un blog.',
    parent: 'Article',
    category: 'Contenus',
    required: [ 'headline', 'image', 'datePublished' ],
    recommended: [ 'author', 'dateModified' ],
    fields: []
  },
  {
    name: 'NewsArticle',
    label: 'Article de presse',
    description: 'Un article d’actualité, daté et signé.',
    parent: 'Article',
    category: 'Contenus',
    required: [ 'headline', 'image', 'datePublished' ],
    recommended: [ 'author', 'publisher', 'dateline' ],
    fields: [
      { name: 'dateline', label: 'Lieu et date de rédaction', type: 'text', placeholder: 'Tours, 14 mars 2026' },
      { name: 'printSection', label: 'Rubrique de l’édition papier', type: 'text' }
    ]
  },
  {
    name: 'WebPage',
    label: 'Page web',
    description: 'Une page ordinaire du site : présentation, mentions légales, contact.',
    parent: 'CreativeWork',
    category: 'Contenus',
    recommended: [ 'name', 'description', 'url' ],
    fields: [
      { name: 'breadcrumb', label: 'Fil d’Ariane', type: 'nested', of: [ 'BreadcrumbList' ],
        help: 'Le chemin qui mène à cette page depuis l’accueil.' },
      { name: 'lastReviewed', label: 'Dernière vérification', type: 'date',
        help: 'Le jour où le contenu a été relu et confirmé exact.' },
      { name: 'primaryImageOfPage', label: 'Image principale', type: 'image' }
    ]
  },
  {
    name: 'WebSite',
    label: 'Site web',
    description: 'Le site dans son ensemble. À poser sur la page d’accueil.',
    parent: 'CreativeWork',
    category: 'Contenus',
    required: [ 'name', 'url' ],
    fields: []
  },
  {
    name: 'VideoObject',
    label: 'Vidéo',
    description: 'Une vidéo hébergée ou intégrée dans la page.',
    parent: 'CreativeWork',
    category: 'Contenus',
    required: [ 'name', 'description', 'thumbnailUrl', 'uploadDate' ],
    fields: [
      { name: 'thumbnailUrl', label: 'Image d’aperçu', type: 'image',
        help: 'L’image montrée avant la lecture.' },
      { name: 'uploadDate', label: 'Date de mise en ligne', type: 'date' },
      { name: 'duration', label: 'Durée', type: 'text', placeholder: 'PT2M30S',
        help: 'Au format ISO 8601 : PT2M30S vaut 2 minutes 30.' },
      { name: 'contentUrl', label: 'Adresse du fichier vidéo', type: 'url' },
      { name: 'embedUrl', label: 'Adresse du lecteur intégré', type: 'url',
        help: 'L’adresse que l’on met dans un cadre intégré, par exemple celle d’un lecteur YouTube.' }
    ]
  },
  {
    name: 'ImageObject',
    label: 'Image',
    description: 'Une image décrite pour elle-même : auteur, licence, dimensions.',
    parent: 'CreativeWork',
    fields: [
      { name: 'contentUrl', label: 'Adresse du fichier', type: 'image' },
      { name: 'width', label: 'Largeur (pixels)', type: 'number' },
      { name: 'height', label: 'Hauteur (pixels)', type: 'number' },
      { name: 'caption', label: 'Légende', type: 'text' }
    ]
  },

  /* Commerce --------------------------------------------------------------- */

  {
    name: 'Product',
    label: 'Produit',
    description: 'Un article à vendre : son prix, sa disponibilité, ses avis.',
    parent: 'Thing',
    category: 'Commerce',
    required: [ 'name', 'image', 'offers' ],
    recommended: [ 'description', 'brand', 'aggregateRating' ],
    fields: [
      { name: 'offers', label: 'Prix et disponibilité', type: 'nested', of: [ 'Offer', 'AggregateOffer' ],
        help: 'Ce que le produit coûte et s’il est en stock. C’est ce bloc qui fait apparaître le prix dans Google.' },
      { name: 'brand', label: 'Marque', type: 'nested', of: [ 'Brand', 'Organization' ] },
      { name: 'sku', label: 'Référence (SKU)', type: 'text',
        help: 'Votre référence interne, celle du bon de commande.' },
      { name: 'gtin13', label: 'Code-barres (EAN 13)', type: 'text', placeholder: '3760123456789' },
      { name: 'mpn', label: 'Référence du fabricant', type: 'text' },
      { name: 'aggregateRating', label: 'Note moyenne', type: 'nested', of: [ 'AggregateRating' ],
        help: 'La moyenne des avis. Ce sont les étoiles affichées sous le résultat.' },
      { name: 'review', label: 'Avis', type: 'nested', of: [ 'Review' ], many: true },
      { name: 'color', label: 'Couleur', type: 'text' },
      { name: 'material', label: 'Matière', type: 'text' },
      { name: 'weight', label: 'Poids', type: 'nested', of: [ 'QuantitativeValue' ] },
      { name: 'itemCondition', label: 'État', type: 'select', items: [
        { text: 'Neuf', value: 'https://schema.org/NewCondition' },
        { text: 'Reconditionné', value: 'https://schema.org/RefurbishedCondition' },
        { text: 'Occasion', value: 'https://schema.org/UsedCondition' },
        { text: 'Endommagé', value: 'https://schema.org/DamagedCondition' }
      ] }
    ]
  },
  {
    name: 'Offer',
    label: 'Offre',
    description: 'Un prix, une devise et une disponibilité.',
    parent: 'Thing',
    required: [ 'price', 'priceCurrency' ],
    recommended: [ 'availability', 'url' ],
    fields: [
      { name: 'price', label: 'Prix', type: 'number', placeholder: '28',
        help: 'Sans symbole ni espace : 28 ou 28.50. La devise est indiquée à côté.' },
      { name: 'priceCurrency', label: 'Devise', type: 'select', items: [
        { text: 'Euro (EUR)', value: 'EUR' },
        { text: 'Dollar américain (USD)', value: 'USD' },
        { text: 'Livre sterling (GBP)', value: 'GBP' },
        { text: 'Franc suisse (CHF)', value: 'CHF' },
        { text: 'Dollar canadien (CAD)', value: 'CAD' }
      ] },
      { name: 'availability', label: 'Disponibilité', type: 'select', items: [
        { text: 'En stock', value: 'https://schema.org/InStock' },
        { text: 'En rupture', value: 'https://schema.org/OutOfStock' },
        { text: 'Sur commande', value: 'https://schema.org/BackOrder' },
        { text: 'Précommande', value: 'https://schema.org/PreOrder' },
        { text: 'Épuisé', value: 'https://schema.org/Discontinued' }
      ] },
      { name: 'priceValidUntil', label: 'Prix valable jusqu’au', type: 'date',
        help: 'Au-delà de cette date, les moteurs cessent d’afficher le prix.' },
      { name: 'shippingDetails', label: 'Livraison', type: 'nested', of: [ 'OfferShippingDetails' ] },
      { name: 'seller', label: 'Vendeur', type: 'nested', of: [ 'Organization', 'Person' ] }
    ]
  },
  {
    name: 'AggregateOffer',
    label: 'Fourchette de prix',
    description: 'Plusieurs offres pour le même produit : du moins cher au plus cher.',
    parent: 'Thing',
    required: [ 'lowPrice', 'priceCurrency' ],
    fields: [
      { name: 'lowPrice', label: 'Prix le plus bas', type: 'number' },
      { name: 'highPrice', label: 'Prix le plus haut', type: 'number' },
      { name: 'priceCurrency', label: 'Devise', type: 'text', placeholder: 'EUR' },
      { name: 'offerCount', label: 'Nombre d’offres', type: 'number' }
    ]
  },
  {
    name: 'OfferShippingDetails',
    label: 'Conditions de livraison',
    description: 'Frais, délais et zone de livraison.',
    parent: 'Thing',
    fields: [
      { name: 'shippingRate', label: 'Frais de port', type: 'nested', of: [ 'MonetaryAmount' ] },
      { name: 'shippingDestination', label: 'Zone livrée', type: 'text', placeholder: 'FR',
        help: 'Le code du pays livré : FR, BE, NL.' },
      { name: 'deliveryTime', label: 'Délai annoncé', type: 'text', placeholder: '2 à 3 jours ouvrés' }
    ]
  },
  {
    name: 'MonetaryAmount',
    label: 'Montant',
    description: 'Une somme et sa devise.',
    parent: 'Thing',
    fields: [
      { name: 'value', label: 'Montant', type: 'number' },
      { name: 'currency', label: 'Devise', type: 'text', placeholder: 'EUR' }
    ]
  },
  {
    name: 'Brand',
    label: 'Marque',
    description: 'La marque sous laquelle le produit est vendu.',
    parent: 'Thing',
    required: [ 'name' ],
    fields: [
      { name: 'logo', label: 'Logo', type: 'image' }
    ]
  },
  {
    name: 'QuantitativeValue',
    label: 'Mesure',
    description: 'Une valeur avec son unité : un poids, une longueur.',
    parent: 'Thing',
    fields: [
      { name: 'value', label: 'Valeur', type: 'number' },
      { name: 'unitCode', label: 'Unité', type: 'text', placeholder: 'GRM',
        help: 'Le code de l’unité : GRM pour un gramme, KGM pour un kilogramme, CMT pour un centimètre.' }
    ]
  },

  /* Avis ------------------------------------------------------------------- */

  {
    name: 'AggregateRating',
    label: 'Note moyenne',
    description: 'La moyenne des avis et leur nombre.',
    parent: 'Thing',
    required: [ 'ratingValue', 'reviewCount' ],
    fields: [
      { name: 'ratingValue', label: 'Note moyenne', type: 'number', placeholder: '4.7' },
      { name: 'reviewCount', label: 'Nombre d’avis', type: 'number', placeholder: '128' },
      { name: 'bestRating', label: 'Note maximale', type: 'number', placeholder: '5',
        help: 'Cinq par défaut. À préciser si votre échelle est différente.' },
      { name: 'worstRating', label: 'Note minimale', type: 'number', placeholder: '1' }
    ]
  },
  {
    name: 'Rating',
    label: 'Note',
    description: 'Une note isolée, celle d’un avis.',
    parent: 'Thing',
    required: [ 'ratingValue' ],
    fields: [
      { name: 'ratingValue', label: 'Note', type: 'number' },
      { name: 'bestRating', label: 'Note maximale', type: 'number', placeholder: '5' }
    ]
  },
  {
    name: 'Review',
    label: 'Avis',
    description: 'L’avis d’un client, avec sa note et son texte.',
    parent: 'CreativeWork',
    category: 'Avis',
    required: [ 'author', 'reviewRating' ],
    fields: [
      { name: 'reviewRating', label: 'Note donnée', type: 'nested', of: [ 'Rating' ] },
      { name: 'reviewBody', label: 'Texte de l’avis', type: 'textarea' },
      { name: 'itemReviewed', label: 'Ce qui est évalué', type: 'nested', of: [ 'Product', 'LocalBusiness', 'Thing' ] }
    ]
  },

  /* Organisations et lieux -------------------------------------------------- */

  {
    name: 'Organization',
    label: 'Organisation',
    description: 'Une entreprise, une association, une administration.',
    parent: 'Thing',
    category: 'Identité',
    required: [ 'name' ],
    recommended: [ 'url', 'logo' ],
    fields: [
      { name: 'legalName', label: 'Raison sociale', type: 'text',
        help: 'Le nom déposé, tel qu’il figure au registre du commerce.' },
      { name: 'logo', label: 'Logo', type: 'image',
        help: 'Le logo affiché dans les résultats de recherche. Au moins 112 pixels de côté.' },
      { name: 'address', label: 'Adresse', type: 'nested', of: [ 'PostalAddress' ] },
      { name: 'telephone', label: 'Téléphone', type: 'text', placeholder: '+33671211911',
        help: 'Au format international, indicatif compris.' },
      { name: 'email', label: 'Adresse e-mail', type: 'text' },
      { name: 'vatID', label: 'Numéro de TVA', type: 'text', placeholder: 'FR77951326875' },
      { name: 'taxID', label: 'Numéro d’identification', type: 'text', placeholder: '951326875' },
      { name: 'foundingDate', label: 'Date de création', type: 'date' },
      { name: 'contactPoint', label: 'Service à contacter', type: 'nested', of: [ 'ContactPoint' ], many: true }
    ]
  },
  {
    name: 'LocalBusiness',
    label: 'Commerce de proximité',
    description: 'Un établissement où l’on se rend : boutique, cabinet, restaurant.',
    parent: 'Organization',
    category: 'Identité',
    required: [ 'name', 'address' ],
    recommended: [ 'telephone', 'openingHoursSpecification', 'geo', 'priceRange' ],
    fields: [
      { name: 'openingHoursSpecification', label: 'Horaires d’ouverture', type: 'nested',
        of: [ 'OpeningHoursSpecification' ], many: true },
      { name: 'geo', label: 'Coordonnées géographiques', type: 'nested', of: [ 'GeoCoordinates' ] },
      { name: 'priceRange', label: 'Niveau de prix', type: 'text', placeholder: 'EUR EUR',
        help: 'De « € » à « €€€€ », ou une fourchette : « 15 € – 40 € ».' },
      { name: 'servesCuisine', label: 'Type de cuisine', type: 'text', placeholder: 'Française' },
      { name: 'areaServed', label: 'Zone desservie', type: 'text', placeholder: 'Indre-et-Loire' }
    ]
  },
  {
    name: 'Person',
    label: 'Personne',
    description: 'Une personne : auteur, dirigeant, artisan.',
    parent: 'Thing',
    category: 'Identité',
    required: [ 'name' ],
    fields: [
      { name: 'givenName', label: 'Prénom', type: 'text' },
      { name: 'familyName', label: 'Nom de famille', type: 'text' },
      { name: 'jobTitle', label: 'Fonction', type: 'text', placeholder: 'Gérant' },
      { name: 'worksFor', label: 'Employeur', type: 'nested', of: [ 'Organization' ] },
      { name: 'email', label: 'Adresse e-mail', type: 'text' },
      { name: 'telephone', label: 'Téléphone', type: 'text' }
    ]
  },
  {
    name: 'PostalAddress',
    label: 'Adresse postale',
    description: 'Une adresse complète, telle qu’on l’écrit sur une enveloppe.',
    parent: 'Thing',
    required: [ 'streetAddress', 'addressLocality', 'postalCode', 'addressCountry' ],
    fields: [
      { name: 'streetAddress', label: 'Numéro et rue', type: 'text', placeholder: '26 rue de la Roquille' },
      { name: 'postalCode', label: 'Code postal', type: 'text', placeholder: '37250' },
      { name: 'addressLocality', label: 'Ville', type: 'text', placeholder: 'Veigné' },
      { name: 'addressRegion', label: 'Région ou département', type: 'text', placeholder: 'Indre-et-Loire' },
      { name: 'addressCountry', label: 'Pays', type: 'text', placeholder: 'FR',
        help: 'Le code du pays sur deux lettres : FR, BE, NL.' }
    ]
  },
  {
    name: 'GeoCoordinates',
    label: 'Coordonnées géographiques',
    description: 'La latitude et la longitude du lieu.',
    parent: 'Thing',
    required: [ 'latitude', 'longitude' ],
    fields: [
      { name: 'latitude', label: 'Latitude', type: 'number', placeholder: '47.2896' },
      { name: 'longitude', label: 'Longitude', type: 'number', placeholder: '0.7052' }
    ]
  },
  {
    name: 'OpeningHoursSpecification',
    label: 'Plage d’ouverture',
    description: 'Un jour ou un groupe de jours, avec l’heure d’ouverture et de fermeture.',
    parent: 'Thing',
    required: [ 'dayOfWeek', 'opens', 'closes' ],
    fields: [
      { name: 'dayOfWeek', label: 'Jour', type: 'select', many: true, items: [
        { text: 'Lundi', value: 'https://schema.org/Monday' },
        { text: 'Mardi', value: 'https://schema.org/Tuesday' },
        { text: 'Mercredi', value: 'https://schema.org/Wednesday' },
        { text: 'Jeudi', value: 'https://schema.org/Thursday' },
        { text: 'Vendredi', value: 'https://schema.org/Friday' },
        { text: 'Samedi', value: 'https://schema.org/Saturday' },
        { text: 'Dimanche', value: 'https://schema.org/Sunday' }
      ] },
      { name: 'opens', label: 'Ouverture', type: 'time', placeholder: '09:00' },
      { name: 'closes', label: 'Fermeture', type: 'time', placeholder: '18:30' }
    ]
  },
  {
    name: 'ContactPoint',
    label: 'Point de contact',
    description: 'Un service et la façon de le joindre.',
    parent: 'Thing',
    required: [ 'contactType' ],
    fields: [
      { name: 'contactType', label: 'Service', type: 'select', items: [
        { text: 'Service client', value: 'customer service' },
        { text: 'Assistance technique', value: 'technical support' },
        { text: 'Facturation', value: 'billing support' },
        { text: 'Commercial', value: 'sales' },
        { text: 'Presse', value: 'press relations' }
      ] },
      { name: 'telephone', label: 'Téléphone', type: 'text' },
      { name: 'email', label: 'Adresse e-mail', type: 'text' },
      { name: 'availableLanguage', label: 'Langues parlées', type: 'text', many: true, placeholder: 'Français' }
    ]
  },
  {
    name: 'Place',
    label: 'Lieu',
    description: 'Un endroit : salle, monument, parking.',
    parent: 'Thing',
    category: 'Identité',
    required: [ 'name', 'address' ],
    fields: [
      { name: 'address', label: 'Adresse', type: 'nested', of: [ 'PostalAddress' ] },
      { name: 'geo', label: 'Coordonnées géographiques', type: 'nested', of: [ 'GeoCoordinates' ] }
    ]
  },

  /* Événements, recettes, aide ---------------------------------------------- */

  {
    name: 'Event',
    label: 'Événement',
    description: 'Une date à retenir : concert, portes ouvertes, formation.',
    parent: 'Thing',
    category: 'Événements',
    required: [ 'name', 'startDate', 'location' ],
    recommended: [ 'description', 'image', 'endDate', 'offers' ],
    fields: [
      { name: 'startDate', label: 'Début', type: 'datetime' },
      { name: 'endDate', label: 'Fin', type: 'datetime' },
      { name: 'location', label: 'Lieu', type: 'nested', of: [ 'Place', 'VirtualLocation' ] },
      { name: 'offers', label: 'Billetterie', type: 'nested', of: [ 'Offer' ], many: true },
      { name: 'performer', label: 'Intervenant', type: 'nested', of: [ 'Person', 'Organization' ], many: true },
      { name: 'organizer', label: 'Organisateur', type: 'nested', of: [ 'Organization', 'Person' ] },
      { name: 'eventAttendanceMode', label: 'Mode de participation', type: 'select', items: [
        { text: 'Sur place', value: 'https://schema.org/OfflineEventAttendanceMode' },
        { text: 'En ligne', value: 'https://schema.org/OnlineEventAttendanceMode' },
        { text: 'Les deux', value: 'https://schema.org/MixedEventAttendanceMode' }
      ] },
      { name: 'eventStatus', label: 'État', type: 'select', items: [
        { text: 'Maintenu', value: 'https://schema.org/EventScheduled' },
        { text: 'Reporté', value: 'https://schema.org/EventPostponed' },
        { text: 'Annulé', value: 'https://schema.org/EventCancelled' },
        { text: 'Déplacé en ligne', value: 'https://schema.org/EventMovedOnline' }
      ] }
    ]
  },
  {
    name: 'VirtualLocation',
    label: 'Lieu en ligne',
    description: 'L’adresse à laquelle l’événement se tient à distance.',
    parent: 'Thing',
    required: [ 'url' ],
    fields: []
  },
  {
    name: 'Recipe',
    label: 'Recette',
    description: 'Une recette de cuisine, avec ses ingrédients et ses étapes.',
    parent: 'CreativeWork',
    category: 'Contenus',
    required: [ 'name', 'image', 'recipeIngredient', 'recipeInstructions' ],
    fields: [
      { name: 'recipeIngredient', label: 'Ingrédients', type: 'text', many: true, placeholder: '200 g de farine' },
      { name: 'recipeInstructions', label: 'Étapes', type: 'textarea', many: true },
      { name: 'prepTime', label: 'Temps de préparation', type: 'text', placeholder: 'PT20M',
        help: 'Au format ISO 8601 : PT20M vaut 20 minutes, PT1H30M une heure et demie.' },
      { name: 'cookTime', label: 'Temps de cuisson', type: 'text', placeholder: 'PT45M' },
      { name: 'recipeYield', label: 'Pour combien de personnes', type: 'text', placeholder: '4 parts' },
      { name: 'recipeCategory', label: 'Catégorie', type: 'text', placeholder: 'Dessert' },
      { name: 'recipeCuisine', label: 'Cuisine', type: 'text', placeholder: 'Française' },
      { name: 'nutrition', label: 'Valeurs nutritionnelles', type: 'nested', of: [ 'NutritionInformation' ] }
    ]
  },
  {
    name: 'NutritionInformation',
    label: 'Valeurs nutritionnelles',
    description: 'Ce que contient une portion.',
    parent: 'Thing',
    fields: [
      { name: 'calories', label: 'Calories', type: 'text', placeholder: '240 calories' },
      { name: 'servingSize', label: 'Taille d’une portion', type: 'text', placeholder: '100 g' },
      { name: 'fatContent', label: 'Matières grasses', type: 'text', placeholder: '12 g' },
      { name: 'proteinContent', label: 'Protéines', type: 'text', placeholder: '8 g' }
    ]
  },
  {
    name: 'FAQPage',
    label: 'Questions fréquentes',
    description: 'Une page de questions-réponses. Les moteurs les affichent dépliables.',
    parent: 'CreativeWork',
    category: 'Contenus',
    required: [ 'mainEntity' ],
    fields: [
      { name: 'mainEntity', label: 'Questions', type: 'nested', of: [ 'Question' ], many: true }
    ]
  },
  {
    name: 'Question',
    label: 'Question',
    description: 'Une question et sa réponse.',
    parent: 'CreativeWork',
    required: [ 'name', 'acceptedAnswer' ],
    fields: [
      { name: 'acceptedAnswer', label: 'Réponse', type: 'nested', of: [ 'Answer' ] }
    ]
  },
  {
    name: 'Answer',
    label: 'Réponse',
    description: 'Le texte d’une réponse.',
    parent: 'CreativeWork',
    required: [ 'text' ],
    fields: [
      { name: 'text', label: 'Texte de la réponse', type: 'textarea',
        help: 'La mise en forme simple est acceptée : gras, liens, listes.' }
    ]
  },
  {
    name: 'HowTo',
    label: 'Mode d’emploi',
    description: 'Une marche à suivre, étape par étape.',
    parent: 'CreativeWork',
    category: 'Contenus',
    required: [ 'name', 'step' ],
    fields: [
      { name: 'step', label: 'Étapes', type: 'nested', of: [ 'HowToStep' ], many: true },
      { name: 'totalTime', label: 'Durée totale', type: 'text', placeholder: 'PT15M' },
      { name: 'tool', label: 'Outils nécessaires', type: 'text', many: true },
      { name: 'supply', label: 'Fournitures', type: 'text', many: true }
    ]
  },
  {
    name: 'HowToStep',
    label: 'Étape',
    description: 'Une étape du mode d’emploi.',
    parent: 'CreativeWork',
    required: [ 'name', 'text' ],
    fields: [
      { name: 'text', label: 'Ce qu’il faut faire', type: 'textarea' }
    ]
  },
  {
    name: 'BreadcrumbList',
    label: 'Fil d’Ariane',
    description: 'Le chemin qui mène à la page depuis l’accueil.',
    parent: 'Thing',
    category: 'Navigation',
    required: [ 'itemListElement' ],
    fields: [
      { name: 'itemListElement', label: 'Étapes du chemin', type: 'nested', of: [ 'ListItem' ], many: true }
    ]
  },
  {
    name: 'ListItem',
    label: 'Élément de liste',
    description: 'Une étape du fil d’Ariane : sa position, son nom et son adresse.',
    parent: 'Thing',
    required: [ 'position', 'name' ],
    fields: [
      { name: 'position', label: 'Rang', type: 'number', placeholder: '1',
        help: 'Un pour l’accueil, deux pour la rubrique, et ainsi de suite.' },
      { name: 'item', label: 'Adresse de la page', type: 'url' }
    ]
  },

  /* Services et emploi ------------------------------------------------------ */

  {
    name: 'Service',
    label: 'Prestation',
    description: 'Un service proposé plutôt qu’un objet vendu.',
    parent: 'Thing',
    category: 'Commerce',
    required: [ 'name', 'provider' ],
    fields: [
      { name: 'provider', label: 'Prestataire', type: 'nested', of: [ 'Organization', 'Person' ] },
      { name: 'serviceType', label: 'Nature de la prestation', type: 'text', placeholder: 'Peinture automobile' },
      { name: 'areaServed', label: 'Zone desservie', type: 'text' },
      { name: 'offers', label: 'Tarif', type: 'nested', of: [ 'Offer' ], many: true }
    ]
  },
  {
    name: 'JobPosting',
    label: 'Offre d’emploi',
    description: 'Un poste à pourvoir.',
    parent: 'Thing',
    category: 'Commerce',
    required: [ 'title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation' ],
    fields: [
      { name: 'title', label: 'Intitulé du poste', type: 'text', placeholder: 'Peintre carrossier' },
      { name: 'datePosted', label: 'Date de publication', type: 'date' },
      { name: 'validThrough', label: 'Candidatures jusqu’au', type: 'date' },
      { name: 'hiringOrganization', label: 'Employeur', type: 'nested', of: [ 'Organization' ] },
      { name: 'jobLocation', label: 'Lieu de travail', type: 'nested', of: [ 'Place' ] },
      { name: 'employmentType', label: 'Type de contrat', type: 'select', items: [
        { text: 'Temps plein', value: 'FULL_TIME' },
        { text: 'Temps partiel', value: 'PART_TIME' },
        { text: 'Prestataire', value: 'CONTRACTOR' },
        { text: 'Intérim', value: 'TEMPORARY' },
        { text: 'Stage', value: 'INTERN' }
      ] },
      { name: 'baseSalary', label: 'Rémunération', type: 'nested', of: [ 'MonetaryAmount' ] }
    ]
  },
  {
    name: 'Course',
    label: 'Formation',
    description: 'Un cours ou une formation proposée.',
    parent: 'CreativeWork',
    category: 'Contenus',
    required: [ 'name', 'description', 'provider' ],
    fields: [
      { name: 'provider', label: 'Organisme', type: 'nested', of: [ 'Organization' ] },
      { name: 'courseCode', label: 'Code de la formation', type: 'text' },
      { name: 'educationalLevel', label: 'Niveau', type: 'text', placeholder: 'Débutant' }
    ]
  },
  {
    name: 'SoftwareApplication',
    label: 'Application',
    description: 'Un logiciel ou une application mobile.',
    parent: 'CreativeWork',
    category: 'Contenus',
    required: [ 'name', 'operatingSystem', 'applicationCategory' ],
    fields: [
      { name: 'operatingSystem', label: 'Système', type: 'text', placeholder: 'iOS, Android' },
      { name: 'applicationCategory', label: 'Catégorie', type: 'text', placeholder: 'BusinessApplication' },
      { name: 'softwareVersion', label: 'Version', type: 'text' },
      { name: 'offers', label: 'Prix', type: 'nested', of: [ 'Offer' ] },
      { name: 'aggregateRating', label: 'Note moyenne', type: 'nested', of: [ 'AggregateRating' ] }
    ]
  }
];

export {
  thingFields,
  creativeWorkFields,
  catalog
};
