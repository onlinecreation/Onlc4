import { Arr, Optional } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import * as Spacer from '../core/Spacer';

interface SpacerDialogData {
  readonly size: string;
  readonly unit: string;
}

const toData = (editor: Editor, element: Optional<HTMLElement>): SpacerDialogData => {
  const size = element.fold(
    () => Spacer.parseSize(editor, null),
    (elm) => Spacer.getHeight(editor, elm)
  );
  return { size: String(size.value), unit: size.unit };
};

const open = (editor: Editor, element: Optional<HTMLElement>): void => {
  const units = Options.getUnits(editor);
  const presets = Options.getPresets(editor);

  const presetItems: Dialog.BodyComponentSpec[] = Arr.map(presets, (preset) => ({
    type: 'button',
    text: preset,
    name: `preset-${preset}`,
    borderless: true
  }));

  const body: Dialog.PanelSpec = {
    type: 'panel',
    items: [
      {
        type: 'grid',
        columns: 2,
        items: [
          {
            type: 'input',
            name: 'size',
            label: 'Hauteur',
            inputMode: 'numeric'
          },
          {
            type: 'listbox',
            name: 'unit',
            label: 'Unité',
            items: Arr.map(units, (unit) => ({ text: unit, value: unit }))
          }
        ]
      },
      {
        type: 'label',
        label: 'Tailles rapides',
        items: [
          {
            type: 'bar',
            items: presetItems
          }
        ]
      }
    ]
  };

  editor.windowManager.open<SpacerDialogData>({
    title: element.isSome() ? 'Modifier le séparateur' : 'Ajouter un séparateur',
    size: 'normal',
    body,
    initialData: toData(editor, element),
    onAction: (api, details) => {
      const preset = Arr.find(presets, (p) => details.name === `preset-${p}`);
      preset.each((value) => {
        Spacer.parseSizeString(value).each((size) => {
          api.setData({ size: String(size.value), unit: size.unit });
        });
      });
    },
    buttons: [
      {
        type: 'cancel',
        name: 'cancel',
        text: 'Annuler'
      },
      {
        type: 'submit',
        name: 'save',
        text: 'Enregistrer',
        primary: true
      }
    ],
    onSubmit: (api) => {
      const data = api.getData();
      const size = Spacer.parseSize(editor, `${data.size}${data.unit}`);
      element.fold(
        () => Spacer.insert(editor, size),
        (elm) => Spacer.update(editor, elm, size)
      );
      api.close();
    }
  });
};

export {
  open
};
