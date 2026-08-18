import { Arr, Optional, Throttler, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import * as Actions from '../core/Actions';
import * as Grid from '../core/Grid';
import * as LayoutSchema from './LayoutSchema';

/**
 * "Add a block" picker, shown from the + buttons of the overlay and from the toolbar button.
 */

interface InsertDialogData {
  readonly pattern: string;
  readonly items: Dialog.CollectionItem[];
}

const itemPrefix = 'item:';
const layoutPrefix = 'layout:';

const normalize = (value: string): string => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const collectionItems = (editor: Editor, pattern: string): Dialog.CollectionItem[] => {
  const needle = normalize(pattern.trim());

  const items: Dialog.CollectionItem[] = Arr.map(Options.getInsertItems(editor), (item, index) => ({
    value: `${itemPrefix}${index}`,
    text: Type.isString(item.group) ? `${item.group} – ${item.text}` : item.text,
    icon: item.icon ?? 'plus'
  }));

  const total = Options.getGridColumns(editor);
  const layouts: Dialog.CollectionItem[] = Arr.map(Options.getLayouts(editor), (layout) => ({
    value: `${layoutPrefix}${LayoutSchema.valueOf(layout)}`,
    text: `Colonnes ${layout.text}`,
    icon: LayoutSchema.forLayout(layout, total)
  }));

  const all = items.concat(layouts);
  return needle === '' ? all : Arr.filter(all, (item) => normalize(item.text).indexOf(needle) !== -1);
};

const insertCommandItem = (editor: Editor, item: Options.InsertItem, reference: Optional<HTMLElement>, position: Actions.InsertPosition): void => {
  // The command inserts at the caret, so an empty block is created first at the wanted position
  Actions.insertHtml(editor, '<p><br></p>', reference, position).each((placeholder) => {
    Actions.placeCaret(editor, placeholder);
  });
  editor.execCommand(item.command as string, false, item.value);
};

const performInsert = (editor: Editor, value: string, reference: Optional<HTMLElement>, position: Actions.InsertPosition): void => {
  if (value.indexOf(layoutPrefix) === 0) {
    const widths = Arr.bind(value.substring(layoutPrefix.length).split('-'), (part) => {
      const width = parseInt(part, 10);
      return isNaN(width) ? [] : [ width ];
    });
    if (widths.length > 0) {
      Grid.insertRow(editor, widths, reference, position);
    }
    return;
  }

  const index = parseInt(value.substring(itemPrefix.length), 10);
  const item = Options.getInsertItems(editor)[index];

  if (!Type.isNonNullable(item)) {
    return;
  }

  if (Type.isString(item.html)) {
    Actions.insertHtml(editor, item.html, reference, position);
  } else if (Type.isString(item.command)) {
    insertCommandItem(editor, item, reference, position);
  }
};

const open = (editor: Editor, reference: Optional<HTMLElement>, position: Actions.InsertPosition): void => {
  LayoutSchema.ensureStyles(editor);

  const refresh = Throttler.last((api: Dialog.DialogInstanceApi<InsertDialogData>) => {
    api.setData({ items: collectionItems(editor, api.getData().pattern) });
  }, 150);

  editor.windowManager.open<InsertDialogData>({
    title: 'Ajouter un bloc',
    size: 'medium',
    body: {
      type: 'panel',
      items: [
        { type: 'input', name: 'pattern', label: 'Rechercher', placeholder: 'Paragraphe, image, colonnes...' },
        { type: 'collection', name: 'items' }
      ]
    },
    initialData: {
      pattern: '',
      items: collectionItems(editor, '')
    },
    onChange: (api) => refresh.throttle(api),
    onAction: (api, details) => {
      if (details.name === 'items') {
        api.close();
        performInsert(editor, String(details.value), reference, position);
      }
    },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Annuler', primary: true }
    ]
  }).focus('pattern');
};

export {
  performInsert,
  open
};
