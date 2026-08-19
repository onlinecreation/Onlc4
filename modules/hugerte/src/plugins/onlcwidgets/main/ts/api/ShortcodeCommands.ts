import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

/**
 * Commandes des éléments du site.
 *
 * `OnlcShortcodeLibrary` ouvre la même bibliothèque que `OnlcWidgetLibrary` : depuis la fusion
 * des deux catalogues, il n'y a plus qu'une fenêtre. Le nom est conservé pour les barres
 * d'outils et les intégrations qui l'appellent déjà.
 */

import * as Dom from '../core/shortcodes/Dom';
import * as Shortcodes from '../core/shortcodes/Shortcodes';
import * as ShortcodeDialog from '../ui/shortcodes/ShortcodeDialog';
import * as WidgetPicker from '../ui/WidgetPicker';

const register = (editor: Editor): void => {
  editor.addCommand('OnlcShortcodeLibrary', () => {
    WidgetPicker.open(editor);
  });

  /** Ouvre directement le formulaire d'un code donné, ou la bibliothèque si le nom est inconnu. */
  editor.addCommand('OnlcInsertShortcode', (_ui, value?: string) => {
    if (!Type.isString(value) || value === '') {
      WidgetPicker.open(editor);
      return;
    }
    Shortcodes.find(editor, value).fold(
      () => WidgetPicker.open(editor),
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
