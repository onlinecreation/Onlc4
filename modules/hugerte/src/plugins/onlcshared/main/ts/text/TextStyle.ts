import { Obj, Type } from '@ephox/katamari';

import { Dialog } from 'hugerte/core/api/ui/Ui';

/**
 * Couleur, dégradé et ombre portée d'un texte. Partagé par le bloc de texte de `onlcwidgets` et
 * par le texte posé sur une image de `onlcmedia`, pour que les deux éditeurs proposent
 * exactement les mêmes réglages.
 *
 * Un dégradé est rendu avec la technique du fond découpé sur le texte :
 *
 * ```css
 * background-image: linear-gradient(45deg, #ff0000, #0000ff);
 * background-clip: text;
 * color: transparent;
 * ```
 */

export interface TextStyleData {
  readonly color: string;
  readonly gradientFrom: string;
  readonly gradientTo: string;
  readonly gradientAngle: string;
  readonly shadowX: string;
  readonly shadowY: string;
  readonly shadowBlur: string;
  readonly shadowColor: string;
}

const empty: TextStyleData = {
  color: '',
  gradientFrom: '',
  gradientTo: '',
  gradientAngle: '90',
  shadowX: '',
  shadowY: '',
  shadowBlur: '',
  shadowColor: ''
};

const asString = (value: unknown): string => Type.isString(value) ? value.trim() : '';

const pixels = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return '0';
  }
  return /^-?[\d.]+$/.test(trimmed) ? `${trimmed}px` : trimmed;
};

const hasGradient = (data: TextStyleData): boolean =>
  data.gradientFrom.trim() !== '' && data.gradientTo.trim() !== '';

const hasShadow = (data: TextStyleData): boolean =>
  data.shadowColor.trim() !== '' &&
  (data.shadowX.trim() !== '' || data.shadowY.trim() !== '' || data.shadowBlur.trim() !== '');

/**
 * Déclarations css correspondant aux réglages. Les propriétés préfixées `-webkit-` sont
 * conservées : sans elles, le dégradé n'apparaît pas dans les navigateurs Webkit.
 */
const toStyles = (data: TextStyleData): Record<string, string> => {
  const styles: Record<string, string> = {};

  if (hasGradient(data)) {
    const angle = data.gradientAngle.trim() === '' ? '90' : data.gradientAngle.trim();
    const direction = /^-?[\d.]+$/.test(angle) ? `${angle}deg` : angle;
    styles['background-image'] = `linear-gradient(${direction}, ${data.gradientFrom.trim()}, ${data.gradientTo.trim()})`;
    styles['-webkit-background-clip'] = 'text';
    styles['background-clip'] = 'text';
    styles['-webkit-text-fill-color'] = 'transparent';
    styles.color = 'transparent';
  } else if (data.color.trim() !== '') {
    styles.color = data.color.trim();
  }

  if (hasShadow(data)) {
    styles['text-shadow'] = `${pixels(data.shadowX)} ${pixels(data.shadowY)} ${pixels(data.shadowBlur)} ${data.shadowColor.trim()}`;
  }

  return styles;
};

/** Relit les réglages depuis les styles d'un élément. */
const fromStyles = (styles: Record<string, string>): TextStyleData => {
  const gradient = /linear-gradient\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/.exec(styles['background-image'] ?? '');
  const shadow = /^(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/.exec((styles['text-shadow'] ?? '').trim());
  const angle = gradient === null ? '90' : gradient[1].trim().replace(/deg$/, '');

  return {
    color: gradient === null ? asString(styles.color) : '',
    gradientFrom: gradient === null ? '' : gradient[2].trim(),
    gradientTo: gradient === null ? '' : gradient[3].trim(),
    gradientAngle: angle,
    shadowX: shadow === null ? '' : shadow[1].replace('px', ''),
    shadowY: shadow === null ? '' : shadow[2].replace('px', ''),
    shadowBlur: shadow === null ? '' : shadow[3].replace('px', ''),
    shadowColor: shadow === null ? '' : shadow[4].trim()
  };
};

/**
 * Champs de dialogue. Le préfixe évite les collisions quand plusieurs sections coexistent dans
 * la même fenêtre.
 */
const getItems = (prefix: string): Dialog.BodyComponentSpec[] => [
  {
    type: 'grid',
    columns: 3,
    items: [
      { type: 'colorinput', name: `${prefix}color`, label: 'Couleur du texte' },
      { type: 'colorinput', name: `${prefix}gradientFrom`, label: 'Dégradé : départ' },
      { type: 'colorinput', name: `${prefix}gradientTo`, label: 'Dégradé : arrivée' }
    ]
  },
  {
    type: 'grid',
    columns: 4,
    items: [
      { type: 'input', name: `${prefix}gradientAngle`, label: 'Angle (°)', inputMode: 'numeric' },
      { type: 'input', name: `${prefix}shadowX`, label: 'Ombre : X', inputMode: 'numeric' },
      { type: 'input', name: `${prefix}shadowY`, label: 'Ombre : Y', inputMode: 'numeric' },
      { type: 'input', name: `${prefix}shadowBlur`, label: 'Ombre : flou', inputMode: 'numeric' }
    ]
  },
  { type: 'colorinput', name: `${prefix}shadowColor`, label: 'Couleur de l’ombre' }
];

const names = (prefix: string): string[] =>
  Obj.keys(empty).map((key) => `${prefix}${key}`);

const toDialogData = (prefix: string, data: TextStyleData): Record<string, string> => {
  const out: Record<string, string> = {};
  Obj.each(empty, (_value, key) => {
    out[`${prefix}${key}`] = asString((data as unknown as Record<string, unknown>)[key]);
  });
  return out;
};

const fromDialogData = (prefix: string, data: Record<string, unknown>): TextStyleData => {
  const out: Record<string, string> = {};
  Obj.each(empty, (fallback, key) => {
    const value = asString(data[`${prefix}${key}`]);
    out[key] = value === '' ? fallback : value;
  });
  return out as unknown as TextStyleData;
};

export {
  empty,
  hasGradient,
  hasShadow,
  toStyles,
  fromStyles,
  getItems,
  names,
  toDialogData,
  fromDialogData
};
