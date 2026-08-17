import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import { figureClass } from './ImageHtml';

const hasFigureClass = (node: AstNode): boolean => {
  const className = node.attr('class');
  return Type.isString(className) && Arr.contains(className.split(/\s+/), figureClass);
};

/**
 * Inside the editor the figure is selected as a whole, while the overlay text stays editable
 * in place. Both `contenteditable` attributes are removed again when the content is serialized.
 */
const toggleContentEditable = (state: boolean) => (nodes: AstNode[]): void => {
  Arr.each(nodes, (node) => {
    if (hasFigureClass(node)) {
      node.attr('contenteditable', state ? 'false' : null);
      Arr.each(node.getAll('figcaption'), (caption) => {
        caption.attr('contenteditable', state ? 'true' : null);
      });
    }
  });
};

const setup = (editor: Editor): void => {
  editor.on('PreInit', () => {
    editor.parser.addNodeFilter('figure', toggleContentEditable(true));
    editor.serializer.addNodeFilter('figure', toggleContentEditable(false));
  });
};

export {
  setup
};
