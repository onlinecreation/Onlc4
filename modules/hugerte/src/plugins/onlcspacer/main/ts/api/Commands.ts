import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Spacer from '../core/Spacer';
import * as Dialog from '../ui/Dialog';

const register = (editor: Editor): void => {
  // Inserts a spacer. The optional value is a css height, for example '40px' or '2rem'.
  editor.addCommand('OnlcInsertSpacer', (_ui, value?: string) => {
    const size = Spacer.parseSize(editor, Type.isString(value) ? value : null);
    Spacer.getSelectedSpacer(editor).fold(
      () => Spacer.insert(editor, size),
      (elm) => Spacer.update(editor, elm, size)
    );
  });

  // Opens the spacer dialog, either on the selected spacer or to create a new one.
  editor.addCommand('OnlcEditSpacer', () => {
    Dialog.open(editor, Spacer.getSelectedSpacer(editor));
  });

  editor.addCommand('OnlcRemoveSpacer', () => {
    Spacer.getSelectedSpacer(editor).each((elm) => Spacer.remove(editor, elm));
  });

  editor.addCommand('OnlcGrowSpacer', (_ui, value?: number) => {
    const direction = Type.isNumber(value) && value < 0 ? -1 : 1;
    Spacer.getSelectedSpacer(editor).each((elm) => Spacer.grow(editor, elm, direction));
  });
};

const registerQuery = (editor: Editor): void => {
  editor.addQueryValueHandler('OnlcSpacerHeight', () =>
    Spacer.getSelectedSpacer(editor)
      .map((elm) => Spacer.sizeToString(Spacer.getHeight(editor, elm)))
      .getOr('')
  );
};

const getSelected = (editor: Editor): Optional<HTMLElement> => Spacer.getSelectedSpacer(editor);

export {
  register,
  registerQuery,
  getSelected
};
