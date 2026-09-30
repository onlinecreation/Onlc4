import { Arr } from '@ephox/katamari';

import { ShortcodeDefinition, ShortcodeFieldItem, ShortcodeFlag, ShortcodeValues } from '../../api/ShortcodeTypes';
import * as Icons from './Icons';
import * as Timezones from './Timezones';

/**
 * Codes courts reconnus par les gabarits d'Online Création.
 *
 * Chacun est décrit une fois pour toutes : son nom, ce qu'il produit sur le site, et les
 * réglages que le rédacteur peut modifier. Le plugin se charge du reste — l'afficher sous forme
 * de bloc dans l'éditeur, ouvrir le bon formulaire, et le réécrire à l'identique dans la page.
 *
 * Les attributs `fixed` ne sont jamais proposés : ils sont écrits tels quels parce que les
 * gabarits les attendent, sans qu'ils aient de sens pour le rédacteur.
 */

const socialNetworks: ShortcodeFlag[] = [
  { name: 'Facebook', label: 'Facebook' },
  { name: 'Twitter', label: 'Twitter / X' },
  { name: 'Tumblr', label: 'Tumblr' },
  { name: 'Pinterest', label: 'Pinterest' },
  { name: 'LinkedIn', label: 'LinkedIn' },
  { name: 'Reddit', label: 'Reddit' },
  { name: 'XING', label: 'XING' },
  { name: 'WhatsApp', label: 'WhatsApp' },
  { name: 'VK', label: 'VK' },
  { name: 'Telegram', label: 'Telegram' }
];

const chosenNetworks = (values: ShortcodeValues): string => {
  const chosen = Arr.filter(socialNetworks, (network) => values[network.name] === 'true');
  return chosen.length === 0
    ? 'Tous les réseaux'
    : Arr.map(chosen, (network) => network.label).join(', ');
};

const socialButtons = (name: string, label: string, size: string): ShortcodeDefinition => ({
  name,
  label,
  description: `Boutons de partage vers les réseaux sociaux, ${size}`,
  category: 'Réseaux sociaux',
  icon: Icons.share,
  fields: [],
  flags: socialNetworks,
  summary: chosenNetworks
});

const currencies: ShortcodeFieldItem[] = [
  { text: 'Euro (EUR)', value: 'EUR' },
  { text: 'Dollar américain (USD)', value: 'USD' },
  { text: 'Livre sterling (GBP)', value: 'GBP' },
  { text: 'Franc suisse (CHF)', value: 'CHF' },
  { text: 'Dollar canadien (CAD)', value: 'CAD' }
];

const alignments: ShortcodeFieldItem[] = [
  { text: 'Gauche', value: 'left' },
  { text: 'Centré', value: 'center' },
  { text: 'Droite', value: 'right' }
];

const targets: ShortcodeFieldItem[] = [
  { text: 'Nouvel onglet', value: '_blank' },
  { text: 'Même onglet', value: '_self' }
];

/** Apparences proposées par le bouton d'ajout au calendrier. */
const calendarStyles: ShortcodeFieldItem[] = [
  { text: 'Bouton ombré', value: 'default' },
  { text: '3D', value: '3d' },
  { text: 'Vintage', value: 'flat' },
  { text: 'Arrondi', value: 'round' },
  { text: 'Sans bordure', value: 'neumorphism' },
  { text: 'Souligné', value: 'text' },
  { text: 'Date', value: 'date' }
];

const getBuiltIns = (): ShortcodeDefinition[] => [
  {
    name: 'MenuSite',
    label: 'Menu',
    description: 'Liste des pages de votre site',
    category: 'Navigation',
    icon: Icons.menu,
    fixed: { type: 'ul' },
    fields: [
      { name: 'classparent', label: 'Classe CSS contenant', type: 'text', placeholder: 'nav navbar-nav',
        help: 'Classe posée sur la liste qui entoure les pages.' },
      { name: 'classchild', label: 'Classe CSS élément', type: 'text', placeholder: 'class-menuitem',
        help: 'Classe posée sur chaque page du menu.' },
      { name: 'classactivechild', label: 'Classe CSS élément actif', type: 'text', placeholder: 'active',
        help: 'Classe ajoutée à la page en cours de consultation.' }
    ],
    defaults: { classparent: 'nav navbar-nav', classchild: 'class-menuitem', classactivechild: 'active' },
    summary: (values) => `Classe du menu : ${values.classparent || '—'}`
  },
  {
    name: 'Contact',
    label: 'Formulaire de contact',
    description: 'Un formulaire dont les messages arrivent dans votre boîte mail',
    category: 'Formulaires',
    icon: Icons.mail,
    fields: [
      { name: 'email', label: 'E-mail destinataire', type: 'email', placeholder: 'contact@exemple.fr',
        help: 'Adresse à laquelle les messages du formulaire seront envoyés.' }
    ],
    defaults: { email: '' },
    summary: (values) => values.email === '' ? 'Aucune adresse renseignée' : `Messages envoyés à ${values.email}`
  },
  {
    name: 'Meta',
    label: 'Description pour les moteurs de recherche',
    description: 'Le résumé et les mots-clés affichés par Google — invisible sur la page',
    category: 'Référencement',
    icon: Icons.search,
    fields: [
      { name: 'description', label: 'Description de la page', type: 'textarea',
        help: 'Une à deux phrases, environ 160 caractères : c’est le texte affiché sous le titre dans les résultats de recherche.' },
      { name: 'keywords', label: 'Mots-clés', type: 'text', placeholder: 'boulangerie, pain bio, Bordeaux',
        help: 'Séparés par des virgules.' }
    ],
    defaults: { description: '', keywords: '' },
    summary: (values) => values.description === '' ? 'Aucune description' : values.description.substring(0, 80)
  },
  socialButtons('SocialButtons', 'Boutons de partage', 'en taille normale'),
  socialButtons('SocialButtonsSmall', 'Boutons de partage (petits)', 'en petite taille'),
  socialButtons('SocialButtonsTiny', 'Boutons de partage (minuscules)', 'réduits à leur icône'),
  {
    name: 'PaypalButton',
    label: 'Bouton de paiement PayPal',
    description: 'Un bouton « Acheter » qui ouvre le paiement PayPal',
    category: 'Commerce',
    icon: Icons.card,
    fixed: { type: 'buynow' },
    fields: [
      { name: 'email', label: 'Compte PayPal du vendeur', type: 'email', placeholder: 'vente@exemple.fr',
        help: 'L’adresse du compte PayPal qui recevra le paiement.' },
      { name: 'item', label: 'Nom de l’article', type: 'text', placeholder: 'Abonnement annuel' },
      { name: 'price', label: 'Prix', type: 'number', half: true, placeholder: '19.90' },
      { name: 'currency', label: 'Devise', type: 'select', items: currencies, half: true },
      { name: 'label', label: 'Texte du bouton', type: 'text', half: true, placeholder: 'Acheter',
        help: 'Laissez vide pour afficher le bouton officiel de PayPal.' },
      { name: 'class', label: 'Classe CSS du bouton', type: 'text', half: true },
      { name: 'target', label: 'Ouvrir dans', type: 'select', items: targets, half: true },
      { name: 'align', label: 'Alignement', type: 'select', items: alignments, half: true }
    ],
    defaults: { email: '', item: '', price: '', currency: 'EUR', label: 'Acheter', class: 'btn btn-primary', target: '_blank', align: 'center' },
    summary: (values) => values.item === ''
      ? 'Article non renseigné'
      : `${values.item} — ${values.price || '?'} ${values.currency}`
  },
  {
    name: 'LogoSite',
    label: 'Logo du site',
    description: 'Le logo enregistré dans les réglages de votre site',
    category: 'Identité',
    icon: Icons.image,
    fields: [],
    positional: [
      { name: 'width', label: 'Largeur maximale (px)', type: 'number', half: true, placeholder: '200' },
      { name: 'height', label: 'Hauteur maximale (px)', type: 'number', half: true, placeholder: '80' }
    ],
    defaults: { width: '200', height: '80' },
    summary: (values) => `Au plus ${values.width || '?'} × ${values.height || '?'} pixels`
  },
  {
    name: 'TitreLogoSite',
    label: 'Titre du site avec son logo',
    description: 'Le nom du site, affiché par-dessus le logo',
    category: 'Identité',
    icon: Icons.image,
    fields: []
  },
  {
    name: 'add-to-calendar-button',
    label: 'Ajouter à mon calendrier',
    description: 'Un bouton qui enregistre votre événement dans l’agenda du visiteur',
    category: 'Événements',
    icon: Icons.calendar,
    fixed: {
      lightMode: 'bodyScheme',
      options: `'Apple','Google','iCal','Microsoft365','MicrosoftTeams','Outlook.com','Yahoo'`
    },
    fields: [
      { name: 'name', label: 'Nom de l’événement', type: 'text', placeholder: 'Portes ouvertes' },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'startDate', label: 'Date de début', type: 'date', half: true },
      { name: 'endDate', label: 'Date de fin', type: 'date', half: true },
      { name: 'startTime', label: 'Heure de début', type: 'time', half: true },
      { name: 'endTime', label: 'Heure de fin', type: 'time', half: true },
      { name: 'timeZone', label: 'Fuseau horaire', type: 'timezone',
        help: 'Le fuseau dans lequel les heures ci-dessus sont exprimées.' },
      { name: 'location', label: 'Adresse de l’événement', type: 'text', placeholder: '61 rue du Château d’Eau, 33000 Bordeaux' },
      { name: 'buttonStyle', label: 'Apparence', type: 'select', items: calendarStyles }
    ],
    defaults: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      timeZone: Timezones.current(),
      location: '',
      buttonStyle: 'date'
    },
    summary: (values) => values.name === ''
      ? 'Événement non renseigné'
      : `${values.name} — ${values.startDate || 'date à définir'}`
  }
];

export {
  socialNetworks,
  currencies,
  alignments,
  targets,
  calendarStyles,
  chosenNetworks,
  getBuiltIns
};
