import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import * as Blocks from './Blocks';

export type InsertPosition = 'before' | 'after' | 'append';

const placeCaret = (editor: Editor, element: HTMLElement): void => {
  editor.selection.select(element, true);
  editor.selection.collapse(true);
  editor.focus();
  editor.nodeChanged();
};

const selectBlock = (editor: Editor, element: HTMLElement): void => {
  editor.selection.select(element);
  editor.nodeChanged();
};

const insertNode = (editor: Editor, node: HTMLElement, reference: Optional<HTMLElement>, position: InsertPosition): void => {
  const body = editor.getBody();

  reference.fold(
    () => {
      if (position === 'before' && Type.isNonNullable(body.firstChild)) {
        body.insertBefore(node, body.firstChild);
      } else {
        body.appendChild(node);
      }
    },
    (target) => {
      if (position === 'append') {
        target.appendChild(node);
      } else if (position === 'before') {
        target.parentNode?.insertBefore(node, target);
      } else {
        editor.dom.insertAfter(node, target);
      }
    }
  );
};

/**
 * Inserts a block of html before, after or inside a reference block. Without reference the block
 * goes to the beginning ('before') or to the end ('after'/'append') of the document.
 */
const insertHtml = (editor: Editor, html: string, reference: Optional<HTMLElement>, position: InsertPosition): Optional<HTMLElement> => {
  const fragment = editor.dom.createFragment(html);
  const first = fragment.firstChild as HTMLElement | null;

  if (!Type.isNonNullable(first)) {
    return Optional.none();
  }

  editor.undoManager.transact(() => {
    const wrapper = editor.dom.create('div');
    wrapper.appendChild(fragment);

    let node = wrapper.firstChild as HTMLElement | null;
    let last: HTMLElement | null = null;
    let anchor = reference;
    let anchorPosition = position;

    while (Type.isNonNullable(node)) {
      const next = node.nextSibling as HTMLElement | null;
      insertNode(editor, node, anchor, anchorPosition);
      last = node;
      // Following nodes are inserted after the previous one so that the order is kept
      anchor = Optional.some(node);
      anchorPosition = 'after';
      node = next;
    }

    if (Type.isNonNullable(last)) {
      placeCaret(editor, last);
    }
  });

  return Optional.from(first);
};

const duplicate = (editor: Editor, element: HTMLElement): void => {
  editor.undoManager.transact(() => {
    const clone = element.cloneNode(true) as HTMLElement;
    editor.dom.setAttrib(clone, 'id', null);
    editor.dom.insertAfter(clone, element);
    selectBlock(editor, clone);
  });
};

const remove = (editor: Editor, element: HTMLElement): void => {
  const neighbour = Blocks.nextBlock(editor, element).orThunk(() => Blocks.previousBlock(editor, element));

  editor.undoManager.transact(() => {
    editor.dom.remove(element);
    neighbour.fold(
      () => {
        // Never leave an empty document behind, the user needs somewhere to type
        if (Blocks.topLevelBlocks(editor).length === 0) {
          const rootBlock = Options.getRootBlock(editor);
          editor.setContent(`<${rootBlock}><br></${rootBlock}>`);
        }
      },
      (elm) => placeCaret(editor, elm)
    );
  });

  editor.nodeChanged();
};

const moveBefore = (editor: Editor, element: HTMLElement, target: HTMLElement): void => {
  editor.undoManager.transact(() => {
    target.parentNode?.insertBefore(element, target);
  });
  editor.nodeChanged();
};

const moveAfter = (editor: Editor, element: HTMLElement, target: HTMLElement): void => {
  editor.undoManager.transact(() => {
    editor.dom.insertAfter(element, target);
  });
  editor.nodeChanged();
};

const moveInto = (editor: Editor, element: HTMLElement, container: HTMLElement): void => {
  editor.undoManager.transact(() => {
    container.appendChild(element);
  });
  editor.nodeChanged();
};

const moveUp = (editor: Editor, element: HTMLElement): void => {
  Blocks.previousBlock(editor, element).each((previous) => moveBefore(editor, element, previous));
};

const moveDown = (editor: Editor, element: HTMLElement): void => {
  Blocks.nextBlock(editor, element).each((next) => moveAfter(editor, element, next));
};

export {
  placeCaret,
  selectBlock,
  insertHtml,
  duplicate,
  remove,
  moveBefore,
  moveAfter,
  moveInto,
  moveUp,
  moveDown
};
