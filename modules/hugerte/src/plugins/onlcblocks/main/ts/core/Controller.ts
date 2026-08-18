import { Arr, Optional, Throttler, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import * as InsertDialog from '../ui/InsertDialog';
import * as Overlay from '../ui/Overlay';
import * as Actions from './Actions';
import * as Blocks from './Blocks';
import * as DragDrop from './DragDrop';

/**
 * Wires the overlay to the editor: which block is active, when the ui is refreshed and what
 * each button does.
 */

export interface Controller {
  readonly isEnabled: () => boolean;
  readonly enable: () => void;
  readonly disable: () => void;
  readonly toggle: () => void;
  readonly getActive: () => Optional<HTMLElement>;
  readonly refresh: () => void;
  readonly insert: (where: 'start' | 'end' | 'before' | 'after') => void;
  readonly act: (action: string) => void;
}

const setup = (editor: Editor): Controller => {
  let enabled = Options.isEnabled(editor);
  let overlay: Overlay.Overlay | null = null;

  const getOverlay = (): Overlay.Overlay => {
    if (!Type.isNonNullable(overlay)) {
      overlay = Overlay.create(editor, {
        onAction: (action, block) => handleAction(action, block),
        onDragStart: (event, block) => DragDrop.start(editor, getOverlay(), event, block)
      });
    }
    return overlay;
  };

  const isEditable = (): boolean => enabled && !editor.mode.isReadOnly() && editor.selection.isEditable();

  const openInsertDialog = (reference: Optional<HTMLElement>, position: Actions.InsertPosition) => {
    InsertDialog.open(editor, reference, position);
  };

  const handleAction = (action: string, block: Optional<HTMLElement>): void => {
    switch (action) {
      case 'up':
        block.each((elm) => Actions.moveUp(editor, elm));
        break;
      case 'down':
        block.each((elm) => Actions.moveDown(editor, elm));
        break;
      case 'duplicate':
        block.each((elm) => Actions.duplicate(editor, elm));
        break;
      case 'remove':
        block.each((elm) => Actions.remove(editor, elm));
        getOverlay().hide();
        break;
      case 'parent':
        block.each((elm) => {
          Blocks.getParentBlock(editor, elm).each((parent) => {
            Actions.selectBlock(editor, parent);
            getOverlay().show(parent);
          });
        });
        break;
      case 'insert-before':
        openInsertDialog(block, 'before');
        break;
      case 'insert-after':
        openInsertDialog(block, 'after');
        break;
      case 'insert-start':
        openInsertDialog(Optional.none(), 'before');
        break;
      case 'insert-end':
        openInsertDialog(Optional.none(), 'after');
        break;
      default:
        break;
    }

    if (action !== 'remove') {
      refresh();
    }
  };

  const showFor = (node: Node | null) => {
    if (!isEditable()) {
      return;
    }
    Blocks.getBlockFor(editor, node).fold(
      () => getOverlay().refresh(),
      (block) => getOverlay().show(block)
    );
  };

  const refresh = () => {
    if (isEditable()) {
      getOverlay().refresh();
    } else if (Type.isNonNullable(overlay)) {
      overlay.hide();
    }
  };

  const throttledRefresh = Throttler.last(refresh, 60);

  const bindEvents = () => {
    editor.on('mouseover', (e) => showFor(e.target as Node));
    editor.on('NodeChange', (e) => showFor(e.element));
    Arr.each([ 'ScrollWindow', 'ResizeEditor', 'ResizeWindow', 'SetContent', 'Undo', 'Redo' ], (name) => {
      editor.on(name, () => throttledRefresh.throttle());
    });
    editor.on('SwitchMode', () => refresh());
    editor.on('remove', () => {
      throttledRefresh.cancel();
      if (Type.isNonNullable(overlay)) {
        overlay.destroy();
        overlay = null;
      }
    });
  };

  editor.on('init', () => {
    if (enabled) {
      editor.dom.addClass(editor.getBody(), 'onlc-blocks-enabled');
      getOverlay().refresh();
    }
    bindEvents();
  });

  const enable = () => {
    enabled = true;
    editor.dom.addClass(editor.getBody(), 'onlc-blocks-enabled');
    refresh();
  };

  const disable = () => {
    enabled = false;
    editor.dom.removeClass(editor.getBody(), 'onlc-blocks-enabled');
    if (Type.isNonNullable(overlay)) {
      overlay.destroy();
      overlay = null;
    }
  };

  return {
    isEnabled: () => enabled,
    enable,
    disable,
    toggle: () => enabled ? disable() : enable(),
    getActive: () => Type.isNonNullable(overlay) ? overlay.getActive() : Optional.none<HTMLElement>(),
    refresh,
    insert: (where) => {
      const active = Type.isNonNullable(overlay) ? overlay.getActive() : Optional.none<HTMLElement>();
      const selected = active.orThunk(() => Blocks.getBlockFor(editor, editor.selection.getNode()));
      switch (where) {
        case 'start':
          openInsertDialog(Optional.none(), 'before');
          break;
        case 'end':
          openInsertDialog(Optional.none(), 'after');
          break;
        case 'before':
          openInsertDialog(selected, 'before');
          break;
        default:
          openInsertDialog(selected, 'after');
          break;
      }
    },
    act: (action: string) => {
      const active = Type.isNonNullable(overlay) ? overlay.getActive() : Optional.none<HTMLElement>();
      handleAction(action, active.orThunk(() => Blocks.getBlockFor(editor, editor.selection.getNode())));
    }
  };
};

export {
  setup
};
