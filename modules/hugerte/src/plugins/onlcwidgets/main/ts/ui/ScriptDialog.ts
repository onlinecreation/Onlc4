import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import { ScriptData } from '../api/Types';
import * as CodeEditor from '../core/CodeEditor';
import * as Script from '../core/Script';

/**
 * Insert or edit a javascript snippet, with syntax highlighting.
 */

interface ScriptDialogData {
  readonly code: string;
  readonly src: string;
  readonly type: string;
  readonly position: string;
  readonly async: boolean;
  readonly defer: boolean;
}

const toDialogData = (data: ScriptData): ScriptDialogData => ({
  code: data.code,
  src: data.src,
  type: data.type,
  position: data.position,
  async: data.async,
  defer: data.defer
});

const fromDialogData = (data: ScriptDialogData): ScriptData => ({
  code: Type.isString(data.code) ? data.code : '',
  src: data.src.trim(),
  type: data.type.trim() === '' ? 'text/javascript' : data.type.trim(),
  position: data.position,
  async: data.async === true,
  defer: data.defer === true
});

const open = (editor: Editor, element: Optional<HTMLElement>): void => {
  const initial = element.fold(
    () => Script.emptyData(editor),
    (elm) => Script.read(editor, elm)
  );

  const items: Dialog.BodyComponentSpec[] = [
    {
      type: 'label',
      label: 'Code JavaScript',
      items: [
        CodeEditor.field('code', 'Code JavaScript', {
          language: 'javascript',
          tabSize: Options.getTabSize(editor),
          lineNumbers: Options.hasLineNumbers(editor)
        })
      ]
    }
  ];

  if (Options.allowScriptSrc(editor)) {
    items.push({
      type: 'input',
      name: 'src',
      label: 'Fichier externe (src)',
      placeholder: 'https://exemple.com/script.js'
    });
  }

  items.push({
    type: 'grid',
    columns: 2,
    items: [
      {
        type: 'input',
        name: 'type',
        label: 'Type MIME'
      },
      {
        type: 'listbox',
        name: 'position',
        label: 'Emplacement dans la page',
        items: Arr.map(Options.getScriptPositions(editor), (item) => ({ text: item.text, value: item.value }))
      }
    ]
  });

  items.push({
    type: 'grid',
    columns: 2,
    items: [
      { type: 'checkbox', name: 'async', label: 'Chargement asynchrone (async)' },
      { type: 'checkbox', name: 'defer', label: 'Exécution différée (defer)' }
    ]
  });

  const buttons: Dialog.DialogFooterButtonSpec[] = [
    { type: 'cancel', name: 'cancel', text: 'Annuler' }
  ];

  element.each(() => {
    buttons.push({ type: 'custom', name: 'remove', text: 'Supprimer' });
  });

  buttons.push({ type: 'submit', name: 'save', text: 'Enregistrer', primary: true });

  editor.windowManager.open<ScriptDialogData>({
    title: element.isSome() ? 'Modifier le script' : 'Insérer un script',
    size: 'large',
    body: {
      type: 'panel',
      items
    },
    initialData: toDialogData(initial),
    buttons,
    onAction: (api, details) => {
      if (details.name === 'remove') {
        element.each((elm) => Script.remove(editor, elm));
        api.close();
      }
    },
    onSubmit: (api) => {
      const data = fromDialogData(api.getData());
      if (data.code.trim() === '' && data.src === '') {
        element.each((elm) => Script.remove(editor, elm));
      } else {
        element.fold(
          () => Script.insert(editor, data),
          (elm) => Script.update(editor, elm, data)
        );
      }
      api.close();
    }
  });
};

export {
  open
};
