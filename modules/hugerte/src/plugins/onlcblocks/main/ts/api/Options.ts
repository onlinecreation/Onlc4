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

const defaultLayouts: GridLayout[] = [
  { text: '1 colonne', columns: [ 12 ] },
  { text: '2 colonnes', columns: [ 6, 6 ] },
  { text: '3 colonnes', columns: [ 4, 4, 4 ] },
  { text: '4 colonnes', columns: [ 3, 3, 3, 3 ] },
  { text: '2/3 + 1/3', columns: [ 8, 4 ] },
  { text: '1/3 + 2/3', columns: [ 4, 8 ] },
  { text: '1/4 + 3/4', columns: [ 3, 9 ] },
  { text: '3/4 + 1/4', columns: [ 9, 3 ] }
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

  registerOption('onlc_blocks_column_class_prefix', {
    processor: 'string',
    default: 'col-md-'
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
const getColumnClassPrefix = option<string>('onlc_blocks_column_class_prefix');
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
  getGridColumns,
  getLayouts,
  getInsertItems,
  shouldInjectStyles,
  getRootBlock
};
