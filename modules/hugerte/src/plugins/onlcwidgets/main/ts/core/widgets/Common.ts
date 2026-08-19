import * as TextStyle from 'hugerte/plugins/onlcshared/text/TextStyle';

import { WidgetConfig, WidgetField, WidgetFieldItem } from '../../api/Types';
import * as Html from '../Html';

/**
 * Réglages et fragments de markup partagés par les blocs prédéfinis : listes de choix
 * récurrentes, classes de bouton, styles de texte. Les blocs eux-mêmes sont répartis par famille
 * dans les modules voisins.
 */

const targets: WidgetFieldItem[] = [
  { text: 'Même onglet', value: '' },
  { text: 'Nouvel onglet', value: '_blank' }
];

const rels: WidgetFieldItem[] = [
  { text: 'Aucune', value: '' },
  { text: 'nofollow', value: 'nofollow' },
  { text: 'noopener', value: 'noopener' },
  { text: 'noopener noreferrer', value: 'noopener noreferrer' },
  { text: 'sponsored', value: 'sponsored' },
  { text: 'ugc', value: 'ugc' }
];

const alignments: WidgetFieldItem[] = [
  { text: 'Gauche', value: 'left' },
  { text: 'Centré', value: 'center' },
  { text: 'Droite', value: 'right' }
];

const ratios: WidgetFieldItem[] = [
  { text: '16:9 (paysage)', value: '56.25%' },
  { text: '4:3', value: '75%' },
  { text: '1:1 (carré)', value: '100%' },
  { text: '21:9 (cinéma)', value: '42.85%' },
  { text: '9:16 (vertical)', value: '177.77%' }
];

const textStyleTab = 'Style du texte';

/**
 * Réglages de couleur, de dégradé et d'ombre proposés par les blocs qui contiennent du texte.
 * Ils sont identiques à ceux du texte posé sur une image, dans `onlcmedia`.
 */
const textStyleFields: WidgetField[] = [
  { name: 'color', label: 'Couleur du texte', type: 'color', tab: textStyleTab, half: true },
  { name: 'gradientFrom', label: 'Dégradé : couleur de départ', type: 'color', tab: textStyleTab, half: true },
  { name: 'gradientTo', label: 'Dégradé : couleur d’arrivée', type: 'color', tab: textStyleTab, half: true },
  { name: 'gradientAngle', label: 'Dégradé : angle (°)', type: 'number', tab: textStyleTab, half: true },
  { name: 'shadowX', label: 'Ombre : décalage horizontal', type: 'number', tab: textStyleTab, half: true },
  { name: 'shadowY', label: 'Ombre : décalage vertical', type: 'number', tab: textStyleTab, half: true },
  { name: 'shadowBlur', label: 'Ombre : flou', type: 'number', tab: textStyleTab, half: true },
  { name: 'shadowColor', label: 'Ombre : couleur', type: 'color', tab: textStyleTab, half: true }
];

const textStyleDefaults: WidgetConfig = {
  color: '',
  gradientFrom: '',
  gradientTo: '',
  gradientAngle: '90',
  shadowX: '',
  shadowY: '',
  shadowBlur: '',
  shadowColor: ''
};

const textStyleOf = (c: WidgetConfig): Record<string, string> => TextStyle.toStyles({
  color: c.color ?? '',
  gradientFrom: c.gradientFrom ?? '',
  gradientTo: c.gradientTo ?? '',
  gradientAngle: c.gradientAngle ?? '90',
  shadowX: c.shadowX ?? '',
  shadowY: c.shadowY ?? '',
  shadowBlur: c.shadowBlur ?? '',
  shadowColor: c.shadowColor ?? ''
});

const linkAttributes = (url: string, target: string, rel: string): string => {
  const safeRel = rel === '' && target === '_blank' ? 'noopener' : rel;
  return Html.attr('href', url === '' ? '#' : url) + Html.attr('target', target) + Html.attr('rel', safeRel);
};

const variantClass = (style: string): string => {
  if (style === 'outline') {
    return 'btn-outline-primary';
  }
  return style === 'link' ? 'btn-link' : `btn-${style}`;
};

const buttonClasses = (style: string, size: string, fullWidth: boolean): string => {
  const variant = variantClass(style);
  const scale = size === 'md' ? '' : `btn-${size}`;
  return Html.classes('onlc-btn', 'btn', variant, scale, fullWidth ? 'w-100' : '');
};

/** Convertit une saisie en nombre sûr : les valeurs entrées finissent dans du code javascript. */
const number = (value: string | undefined, fallback: number): number => {
  const parsed = parseFloat(String(value ?? '').replace(',', '.'));
  return isNaN(parsed) ? fallback : parsed;
};

const integer = (value: string | undefined, fallback: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(number(value, fallback))));

/** Cadre affiché quand un réglage indispensable manque encore. */
const missing = (message: string): string =>
  `<div class="onlc-widget__static onlc-widget__empty" contenteditable="false">${Html.escape(message)}</div>`;

export {
  targets,
  rels,
  alignments,
  ratios,
  textStyleTab,
  textStyleFields,
  textStyleDefaults,
  textStyleOf,
  linkAttributes,
  variantClass,
  buttonClasses,
  number,
  integer,
  missing
};
