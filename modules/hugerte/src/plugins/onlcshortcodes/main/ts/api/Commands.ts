import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Dom from '../core/Dom';
import * as Shortcodes from '../core/Shortcodes';
import * as Picker from '../ui/Picker';
import * as ShortcodeDialog from '../ui/ShortcodeDialog';

const register = (editor: Editor): void => {
  editor.addCommand('OnlcShortcodeLibrary', () => {
    Picker.open(editor);
  });

  /** Ouvre directement le formulaire d'un code donné, ou la bibliothèque si le nom est inconnu. */
  editor.addCommand('OnlcInsertShortcode', (_ui, value?: string) => {
    if (!Type.isString(value) || value === '') {
      Picker.open(editor);
      return;
    }
    Shortcodes.find(editor, value).fold(
      () => Picker.open(editor),
      (definition) => ShortcodeDialog.open(editor, definition, Optional.none())
    );
  });

  editor.addCommand('OnlcEditShortcode', () => {
    Dom.getSelected(editor).each((element) => {
      Dom.definitionOf(editor, element).fold(
        () => editor.windowManager.alert(
          'Cet élément n’est pas reconnu par l’éditeur : il sera réécrit tel quel dans la page.'),
        (definition) => ShortcodeDialog.open(editor, definition, Optional.some(element))
      );
    });
  });

  editor.addCommand('OnlcDuplicateShortcode', () => {
    Dom.getSelected(editor).each((element) => Dom.duplicate(editor, element));
  });

  editor.addCommand('OnlcRemoveShortcode', () => {
    Dom.getSelected(editor).each((element) => Dom.remove(editor, element));
  });
};

export {
  register
};
