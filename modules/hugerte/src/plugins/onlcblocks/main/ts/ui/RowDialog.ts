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

/**
 * Change la disposition d'une ligne **existante**, avec les mêmes schémas que l'insertion.
 *
 * C'est le même geste que « Insérer des colonnes », appliqué à une ligne déjà là : présenter une
 * autre interface pour la même décision obligerait à apprendre deux fois la même chose.
 */
const openLayout = (editor: Editor, row: HTMLElement): void => {
  LayoutSchema.ensureStyles(editor);

  editor.windowManager.open<RowDialogData>({
    title: 'Disposition des colonnes',
    size: 'normal',
    body: {
      type: 'panel',
      items: [
        {
          type: 'htmlpanel',
          presets: 'presentation',
          html: `<p class="onlc-field-help">${editor.dom.encode(
            editor.translate('Le contenu des colonnes est conservé. Une disposition qui en compte moins ' +
              'ramène le contenu des colonnes en trop dans la dernière.') as string)}</p>`
        },
        { type: 'collection', name: 'layouts', label: 'Disposition' }
      ]
    },
    initialData: { layouts: items(editor) },
    onAction: (api, details) => {
      if (details.name === 'layouts') {
        const widths = widthsOf(String(details.value));
        api.close();
        if (widths.length > 0) {
          Grid.applyLayout(editor, row, widths);
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
  open,
  openLayout
};
