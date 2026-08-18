import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import * as CodeEditor from '../core/CodeEditor';
import * as Pretty from '../core/Pretty';

/**
 * Edits the html of the page, with syntax highlighting and an optional indentation pass.
 */

interface SourceDialogData {
  readonly code: string;
}

const getSource = (editor: Editor): string => {
  const content = editor.getContent({ source_view: true });
  return Options.shouldPrettyPrint(editor) ? Pretty.format(content, Options.getTabSize(editor)) : content;
};

const setSource = (editor: Editor, value: string): void => {
  editor.focus();
  editor.undoManager.transact(() => {
    editor.setContent(value, { source_view: true });
  });
  editor.selection.setCursorLocation();
  editor.nodeChanged();
};

const open = (editor: Editor): void => {
  editor.windowManager.open<SourceDialogData>({
    title: 'Code source HTML',
    size: 'large',
    body: {
      type: 'panel',
      items: [
        CodeEditor.field('code', 'Code source HTML', {
          language: 'html',
          tabSize: Options.getTabSize(editor),
          lineNumbers: Options.hasLineNumbers(editor)
        })
      ]
    },
    initialData: {
      code: getSource(editor)
    },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Annuler' },
      { type: 'submit', name: 'save', text: 'Enregistrer', primary: true }
    ],
    onSubmit: (api) => {
      setSource(editor, api.getData().code);
      api.close();
    }
  });
};

export {
  getSource,
  setSource,
  open
};
