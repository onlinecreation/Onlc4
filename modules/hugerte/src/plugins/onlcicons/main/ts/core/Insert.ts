import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';

/**
 * Markup of a Material Design icon. Two flavours are supported:
 * - `ligature` (default): `<span class="material-icons">home</span>` (Google Material Icons font)
 * - `class`: `<i class="mdi mdi-home"></i>` (Material Design Icons webfont)
 */
const toIconHtml = (editor: Editor, name: string): string => {
  const title = editor.dom.encode(name.replace(/_/g, ' '));
  if (Options.getOutputMode(editor) === 'class') {
    const cls = editor.dom.encode(Options.getClassPrefix(editor) + name);
    return `<i class="${cls}" role="img" aria-label="${title}"></i>`;
  } else {
    const cls = editor.dom.encode(Options.getIconClass(editor));
    return `<span class="${cls}" role="img" aria-label="${title}">${editor.dom.encode(name)}</span>`;
  }
};

const insertIcon = (editor: Editor, name: string): void => {
  editor.undoManager.transact(() => {
    editor.insertContent(toIconHtml(editor, name));
  });
  editor.nodeChanged();
};

const insertEmoji = (editor: Editor, char: string): void => {
  editor.undoManager.transact(() => {
    editor.insertContent(char);
  });
  editor.nodeChanged();
};

export {
  toIconHtml,
  insertIcon,
  insertEmoji
};
