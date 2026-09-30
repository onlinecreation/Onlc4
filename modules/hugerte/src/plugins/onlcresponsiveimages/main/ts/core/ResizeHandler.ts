import { Arr, Throttler, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import * as Normalize from './Normalize';

const setup = (editor: Editor): void => {
  const normalizeAll = Throttler.last(() => {
    Normalize.normalizeAll(editor);
  }, 100);

  // The core writes `width`/`height` attributes on unstyled elements while resizing, they are
  // turned into a percentage as soon as the resize is over.
  editor.on('ObjectResized', (e) => {
    if (Type.isNonNullable(e.target) && Normalize.needsNormalizing(editor, e.target)) {
      Normalize.normalizeElement(editor, e.target);
    }
  });

  Arr.each([ 'init', 'SetContent', 'PastePostProcess' ], (name) => {
    editor.on(name, () => normalizeAll.throttle());
  });

  editor.on('NodeChange', (e) => {
    const elements = Arr.filter(e.parents.concat([ e.element ]), (elm) =>
      editor.dom.is(elm, Options.getElementNames(editor))) as HTMLElement[];
    Normalize.normalizeElements(editor, elements);
  });

  editor.on('remove', () => {
    normalizeAll.cancel();
  });
};

export {
  setup
};
