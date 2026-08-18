import { Arr, Optional } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import * as Actions from '../core/Actions';
import * as Grid from '../core/Grid';
import * as LayoutSchema from './LayoutSchema';

/**
 * Choix d'une disposition de colonnes, présentée sous forme de schémas.
 */

interface RowDialogData {
  readonly layouts: Dialog.CollectionItem[];
}

const items = (editor: Editor): Dialog.CollectionItem[] => {
  const total = Options.getGridColumns(editor);
  return Arr.map(Options.getLayouts(editor), (layout) => ({
    value: LayoutSchema.valueOf(layout),
    text: layout.text,
    icon: LayoutSchema.forLayout(layout, total)
  }));
};

const widthsOf = (value: string): number[] =>
  Arr.bind(value.split('-'), (part) => {
    const width = parseInt(part, 10);
    return isNaN(width) ? [] : [ width ];
  });

const open = (editor: Editor, reference: Optional<HTMLElement>, position: Actions.InsertPosition): void => {
  LayoutSchema.ensureStyles(editor);

  editor.windowManager.open<RowDialogData>({
    title: 'Insérer des colonnes',
    size: 'normal',
    body: {
      type: 'panel',
      items: [
        { type: 'collection', name: 'layouts', label: 'Disposition' }
      ]
    },
    initialData: { layouts: items(editor) },
    onAction: (api, details) => {
      if (details.name === 'layouts') {
        const widths = widthsOf(String(details.value));
        api.close();
        if (widths.length > 0) {
          Grid.insertRow(editor, widths, reference, position);
        }
      }
    },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Annuler', primary: true }
    ]
  });
};

export {
  items,
  widthsOf,
  open
};
