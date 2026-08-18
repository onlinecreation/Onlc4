import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Blocks from '../core/Blocks';
import { Controller } from '../core/Controller';
import * as Grid from '../core/Grid';

const selectedBlock = (editor: Editor, controller: Controller): Optional<HTMLElement> =>
  controller.getActive().orThunk(() => Blocks.getBlockFor(editor, editor.selection.getNode()));

const selectedColumn = (editor: Editor): Optional<HTMLElement> => {
  const node = editor.selection.getNode();
  return Type.isNonNullable(node) ? Grid.getParentColumn(editor, node as HTMLElement) : Optional.none();
};

const register = (editor: Editor, controller: Controller): void => {
  editor.addCommand('OnlcBlocksToggle', () => controller.toggle());

  editor.addCommand('OnlcBlockInsert', (_ui, value?: string) => {
    const where = value === 'start' || value === 'end' || value === 'before' ? value : 'after';
    controller.insert(where);
  });

  Arr.each([
    { command: 'OnlcBlockMoveUp', action: 'up' },
    { command: 'OnlcBlockMoveDown', action: 'down' },
    { command: 'OnlcBlockDuplicate', action: 'duplicate' },
    { command: 'OnlcBlockRemove', action: 'remove' },
    { command: 'OnlcBlockSelectParent', action: 'parent' }
  ], (entry) => {
    editor.addCommand(entry.command, () => controller.act(entry.action));
  });

  // Bootstrap grid
  editor.addCommand('OnlcInsertRow', (_ui, value?: string) => {
    const widths = Type.isString(value)
      ? Arr.bind(value.split(/[-,\s]+/), (part) => {
        const width = parseInt(part, 10);
        return isNaN(width) ? [] : [ width ];
      })
      : [ 6, 6 ];
    Grid.insertRow(editor, widths.length > 0 ? widths : [ 6, 6 ], selectedBlock(editor, controller), 'after');
  });

  editor.addCommand('OnlcColumnResize', (_ui, value?: number) => {
    const delta = Type.isNumber(value) ? value : 1;
    selectedColumn(editor).each((column) => Grid.resizeColumn(editor, column, delta));
  });

  editor.addCommand('OnlcColumnAdd', () => {
    selectedColumn(editor).each((column) => {
      Grid.getParentRow(editor, column).each((row) => Grid.addColumn(editor, row));
    });
  });

  editor.addCommand('OnlcColumnRemove', () => {
    selectedColumn(editor).each((column) => Grid.removeColumn(editor, column));
  });
};

export {
  selectedColumn,
  register
};
