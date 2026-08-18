import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { EditorOptions } from 'hugerte/core/api/OptionTypes';

export interface InsertItem {
  readonly text: string;
  readonly icon?: string;
  readonly html?: string;
  readonly command?: string;
  readonly value?: string;
  readonly group?: string;
}

export interface GridLayout {
  readonly text: string;
  /** Column widths, expressed in grid columns (12 by default). */
  readonly columns: number[];
}

const option: {
  <K extends keyof EditorOptions>(name: K): (editor: Editor) => EditorOptions[K];
  <T>(name: string): (editor: Editor) => T;
} = (name: string) => (editor: Editor) =>
  editor.options.get(name);

/**
 * Dispositions proposées, décrites par la part de chaque colonne. Elles sont présentées sous
 * forme de schémas dans l'interface : le libellé n'est là que pour les lecteurs d'écran.
 */
const defaultLayouts: GridLayout[] = [
  { text: '⅓ + ⅔', columns: [ 4, 8 ] },
  { text: '⅔ + ⅓', columns: [ 8, 4 ] },
  { text: '½ + ½', columns: [ 6, 6 ] },
  { text: '⅓ + ⅓ + ⅓', columns: [ 4, 4, 4 ] },
  { text: '¼ + ¼ + ¼ + ¼', columns: [ 3, 3, 3, 3 ] },
  { text: '½ + ¼ + ¼', columns: [ 6, 3, 3 ] },
  { text: '¼ + ¼ + ½', columns: [ 3, 3, 6 ] }
];

const defaultInsertItems: InsertItem[] = [
  { text: 'Paragraphe', icon: 'paragraph', html: '<p>Nouveau paragraphe</p>', group: 'Texte' },
  { text: 'Titre 2', icon: 'text-size-increase', html: '<h2>Titre</h2>', group: 'Texte' },
  { text: 'Titre 3', icon: 'text-size-decrease', html: '<h3>Titre</h3>', group: 'Texte' },
  { text: 'Citation', icon: 'quote', html: '<blockquote><p>Citation</p></blockquote>', group: 'Texte' },
  { text: 'Liste à puces', icon: 'unordered-list', html: '<ul><li>Élément</li></ul>', group: 'Texte' },
  { text: 'Liste numérotée', icon: 'ordered-list', html: '<ol><li>Élément</li></ol>', group: 'Texte' },
  { text: 'Trait horizontal', icon: 'horizontal-rule', html: '<hr>', group: 'Mise en page' },
  { text: 'Séparateur vertical', icon: 'line-height', command: 'OnlcInsertSpacer', group: 'Mise en page' },
  { text: 'Image', icon: 'image', command: 'OnlcImage', group: 'Média' },
  { text: 'Tableau', icon: 'table', command: 'mceInsertTable', value: '{"rows":2,"columns":2}', group: 'Mise en page' },
  { text: 'Code source', icon: 'sourcecode', html: '<pre>code</pre>', group: 'Texte' }
];

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  registerOption('onlc_blocks_enabled', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_blocks_containers', {
    processor: 'string',
    default: '.row,.container,.container-fluid,section,article,aside,main,header,footer,[class*="col-"],.col'
  });

  registerOption('onlc_blocks_exclude', {
    processor: 'string',
    default: 'li,td,th,thead,tbody,tfoot,tr,figcaption,caption,option,legend'
  });

  registerOption('onlc_blocks_row_class', {
    processor: 'string',
    default: 'row'
  });

  registerOption('onlc_blocks_breakpoint', {
    processor: 'string',
    default: 'sm'
  });

  // Laissé vide, le préfixe est déduit du point de rupture : `col-sm-`, `col-lg-`...
  registerOption('onlc_blocks_column_class_prefix', {
    processor: 'string',
    default: ''
  });

  // Feuille de style de la grille chargée dans la zone d'édition (grille Bootstrap par exemple)
  registerOption('onlc_blocks_grid_css', {
    processor: 'string',
    default: ''
  });

  registerOption('onlc_blocks_grid_columns', {
    processor: 'number',
    default: 12
  });

  registerOption('onlc_blocks_layouts', {
    processor: (value) => {
      const valid = Type.isArrayOf(value, Type.isObject);
      return valid ? { value, valid } : { valid: false, message: 'Must be an array of layouts.' };
    },
    default: defaultLayouts
  });

  registerOption('onlc_blocks_insert_items', {
    processor: (value) => {
      const valid = Type.isArrayOf(value, Type.isObject);
      return valid ? { value, valid } : { valid: false, message: 'Must be an array of items.' };
    },
    default: defaultInsertItems
  });

  registerOption('onlc_blocks_inject_styles', {
    processor: 'boolean',
    default: true
  });
};

const isEnabled = option<boolean>('onlc_blocks_enabled');
const getContainerSelector = option<string>('onlc_blocks_containers');
const getExcludeSelector = option<string>('onlc_blocks_exclude');
const getRowClass = option<string>('onlc_blocks_row_class');
const getBreakpoint = option<string>('onlc_blocks_breakpoint');
const getGridCss = option<string>('onlc_blocks_grid_css');

/**
 * Préfixe des classes de colonne. Il vaut `col-<point de rupture>-`, sauf si le projet a
 * explicitement défini `onlc_blocks_column_class_prefix`.
 */
const getColumnClassPrefix = (editor: Editor): string => {
  const explicit = editor.options.get('onlc_blocks_column_class_prefix') as string;
  if (Type.isString(explicit) && explicit !== '') {
    return explicit;
  }
  const breakpoint = getBreakpoint(editor).trim();
  return breakpoint === '' ? 'col-' : `col-${breakpoint}-`;
};
const getGridColumns = option<number>('onlc_blocks_grid_columns');
const getLayouts = option<GridLayout[]>('onlc_blocks_layouts');
const getInsertItems = option<InsertItem[]>('onlc_blocks_insert_items');
const shouldInjectStyles = option<boolean>('onlc_blocks_inject_styles');

/** Root block of the editor, used when the document would otherwise be left empty. */
const getRootBlock = (editor: Editor): string => editor.options.get('forced_root_block') || 'p';

export {
  register,
  defaultLayouts,
  defaultInsertItems,
  isEnabled,
  getContainerSelector,
  getExcludeSelector,
  getRowClass,
  getColumnClassPrefix,
  getBreakpoint,
  getGridCss,
  getGridColumns,
  getLayouts,
  getInsertItems,
  shouldInjectStyles,
  getRootBlock
};
