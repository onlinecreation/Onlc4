import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import AstNode from 'hugerte/core/api/html/Node';

import * as Detect from './Detect';

/**
 * Ce que l'écriture ajoute au diaporama, et que la page publiée ne doit pas porter.
 *
 * Le conteneur est rendu non modifiable pendant l'écriture — le diaporama se manipule d'une
 * pièce, voir `core/Card`. `contenteditable` est un état d'éditeur : il est retiré à
 * l'enregistrement, faute de quoi le site publierait une zone morte.
 *
 * Le bandeau et la mention, eux, sont des nœuds fantômes que le cœur retire tout seul.
 */

/** Ce nœud a-t-il une piste de diaporama pour enfant direct ? */
const holdsWrapper = (node: AstNode): boolean => {
  let child = node.firstChild;
  while (Type.isNonNullable(child)) {
    const classes = child.attr('class') ?? '';
    if (Arr.contains(classes.split(/\s+/), Detect.wrapperClass)) {
      return true;
    }
    child = child.next;
  }
  return false;
};

const setup = (editor: Editor): void => {
  editor.on('PreInit', () => {
    editor.serializer.addAttributeFilter('contenteditable', (nodes) => {
      Arr.each(nodes, (node) => {
        if (node.attr('contenteditable') === 'false' && holdsWrapper(node)) {
          node.attr('contenteditable', null);
        }
      });
    });
  });
};

export {
  holdsWrapper,
  setup
};
