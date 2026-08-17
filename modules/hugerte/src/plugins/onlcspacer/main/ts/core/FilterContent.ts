import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import * as Options from '../api/Options';

const hasSpacerClass = (node: AstNode, cls: string): boolean => {
  const className = node.attr('class');
  return Type.isString(className) && Arr.contains(className.split(/\s+/), cls);
};

const toggleContentEditable = (editor: Editor, state: boolean) => (nodes: AstNode[]): void => {
  const cls = Options.getSpacerClass(editor);
  Arr.each(nodes, (node) => {
    if (hasSpacerClass(node, cls)) {
      node.attr('contenteditable', state ? 'false' : null);
      node.attr('data-mce-selected', null);
    }
  });
};

/**
 * A spacer is an empty block: it has to be marked as non editable inside the editor so that it can
 * be selected as a whole, and cleaned up again when the content is serialized.
 */
const setup = (editor: Editor): void => {
  editor.on('PreInit', () => {
    editor.parser.addNodeFilter('div', toggleContentEditable(editor, true));
    editor.serializer.addNodeFilter('div', toggleContentEditable(editor, false));
  });

  const cls = Options.getSpacerClass(editor);
  editor.contentStyles.push(
    `.${cls} { position: relative; min-height: 4px; }` +
    `.${cls}[contenteditable="false"] { background-image: repeating-linear-gradient(135deg, rgba(0, 108, 231, 0.06), rgba(0, 108, 231, 0.06) 6px, transparent 6px, transparent 12px); outline: 1px dashed rgba(0, 108, 231, 0.4); outline-offset: -1px; }` +
    `.${cls}[data-mce-selected] { outline: 2px solid #006ce7; }`
  );
};

export {
  setup
};
