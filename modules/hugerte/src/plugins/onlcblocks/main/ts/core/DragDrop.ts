import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import { Overlay } from '../ui/Overlay';
import * as Actions from './Actions';
import * as Blocks from './Blocks';

/**
 * Pointer driven move of a block. A horizontal indicator shows where the block will land, and
 * the move itself is a single undo step.
 */

type DropPosition = 'before' | 'after' | 'append';

interface DropTarget {
  readonly block: HTMLElement;
  readonly position: DropPosition;
}

const scrollMargin = 40;
const scrollStep = 18;

const isInside = (parent: HTMLElement, node: Node | null): boolean =>
  Type.isNonNullable(node) && (parent === node || parent.contains(node));

const findTarget = (editor: Editor, dragged: HTMLElement, x: number, y: number): Optional<DropTarget> => {
  const doc = editor.getDoc();
  const element = doc.elementFromPoint(x, y);

  return Blocks.getBlockFor(editor, element).bind((block) => {
    if (isInside(dragged, block)) {
      return Optional.none<DropTarget>();
    }

    const rect = block.getBoundingClientRect();

    // An empty container - typically a bootstrap column - accepts the block inside itself
    if (Blocks.isContainer(editor, block) && Blocks.childBlocks(editor, block).length === 0) {
      return Optional.some<DropTarget>({ block, position: 'append' });
    }

    const position: DropPosition = y < rect.top + rect.height / 2 ? 'before' : 'after';
    return Optional.some<DropTarget>({ block, position });
  });
};

const autoScroll = (editor: Editor, y: number): void => {
  const win = editor.getWin();
  const height = editor.getDoc().documentElement.clientHeight;

  if (y < scrollMargin) {
    win.scrollBy(0, -scrollStep);
  } else if (y > height - scrollMargin) {
    win.scrollBy(0, scrollStep);
  }
};

const start = (editor: Editor, overlay: Overlay, event: MouseEvent, block: HTMLElement): void => {
  const doc = editor.getDoc();
  const body = editor.getBody();
  let target = Optional.none<DropTarget>();

  editor.dom.addClass(body, 'onlc-blocks-dragging');
  editor.dom.addClass(block, 'onlc-blocks-dragged');

  const onMove = (e: MouseEvent) => {
    e.preventDefault();
    autoScroll(editor, e.clientY);
    target = findTarget(editor, block, e.clientX, e.clientY);
    target.fold(
      () => overlay.hideIndicator(),
      (found) => overlay.showIndicator(found.block, found.position)
    );
  };

  const cleanup = () => {
    editor.dom.unbind(doc, 'mousemove', onMove);
    editor.dom.unbind(doc, 'mouseup', onUp);
    editor.dom.unbind(doc, 'keydown', onKey);
    editor.dom.unbind(document, 'mouseup', onUp);
    editor.dom.removeClass(body, 'onlc-blocks-dragging');
    editor.dom.removeClass(block, 'onlc-blocks-dragged');
    overlay.hideIndicator();
    overlay.refresh();
  };

  const onUp = () => {
    const drop = target;
    cleanup();
    drop.each((found) => {
      if (found.position === 'before') {
        Actions.moveBefore(editor, block, found.block);
      } else if (found.position === 'after') {
        Actions.moveAfter(editor, block, found.block);
      } else {
        Actions.moveInto(editor, block, found.block);
      }
      overlay.show(block);
    });
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      target = Optional.none();
      cleanup();
    }
  };

  editor.dom.bind(doc, 'mousemove', onMove);
  editor.dom.bind(doc, 'mouseup', onUp);
  editor.dom.bind(doc, 'keydown', onKey);
  editor.dom.bind(document, 'mouseup', onUp);

  onMove(event);
};

export {
  start
};
