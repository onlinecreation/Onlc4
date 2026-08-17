import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Normalize from '../core/Normalize';
import * as Options from './Options';

const register = (editor: Editor): void => {
  // Normalizes the whole document, or only the selected element when it is a supported element.
  editor.addCommand('OnlcNormalizeResponsiveImages', () => {
    const selected = editor.selection.getNode();
    const elements = Type.isNonNullable(selected) && editor.dom.is(selected, Options.getElementNames(editor))
      ? [ selected as HTMLElement ]
      : editor.dom.select(Options.getElementNames(editor), editor.getBody()) as HTMLElement[];

    editor.undoManager.transact(() => {
      Arr.each(elements, (elm) => Normalize.normalizeElement(editor, elm));
    });
  });
};

export {
  register
};
