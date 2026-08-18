import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Blocks from '../core/Blocks';
import { Controller } from '../core/Controller';
import * as Grid from '../core/Grid';
import * as RowDialog from './RowDialog';

const register = (editor: Editor, controller: Controller): void => {
  editor.ui.registry.addToggleButton('onlcblocks', {
    icon: 'edit-block',
    tooltip: 'Afficher les outils de blocs',
    onAction: () => editor.execCommand('OnlcBlocksToggle'),
    onSetup: (api) => {
      api.setActive(controller.isEnabled());
      const update = () => api.setActive(controller.isEnabled());
      editor.on('NodeChange', update);
      return () => editor.off('NodeChange', update);
    }
  });

  editor.ui.registry.addButton('onlcblocksinsert', {
    icon: 'plus',
    tooltip: 'Ajouter un bloc',
    onAction: () => editor.execCommand('OnlcBlockInsert', false, 'after')
  });

  editor.ui.registry.addMenuItem('onlcblocksinsert', {
    icon: 'plus',
    text: 'Ajouter un bloc...',
    onAction: () => editor.execCommand('OnlcBlockInsert', false, 'after')
  });

  // Les dispositions sont choisies sur un schéma, pas dans une liste de nombres
  const openRowDialog = () => {
    const reference = controller.getActive().orThunk(() => Blocks.getBlockFor(editor, editor.selection.getNode()));
    RowDialog.open(editor, reference, 'after');
  };

  editor.ui.registry.addButton('onlcblocksrow', {
    icon: 'table',
    tooltip: 'Ajouter des colonnes',
    onAction: openRowDialog
  });

  editor.ui.registry.addMenuItem('onlcblocksrow', {
    icon: 'table',
    text: 'Ajouter des colonnes...',
    onAction: openRowDialog
  });

  Arr.each([
    { name: 'onlcblockup', icon: 'chevron-up', tooltip: 'Monter le bloc', command: 'OnlcBlockMoveUp' },
    { name: 'onlcblockdown', icon: 'chevron-down', tooltip: 'Descendre le bloc', command: 'OnlcBlockMoveDown' },
    { name: 'onlcblockduplicate', icon: 'duplicate', tooltip: 'Dupliquer le bloc', command: 'OnlcBlockDuplicate' },
    { name: 'onlcblockremove', icon: 'remove', tooltip: 'Supprimer le bloc', command: 'OnlcBlockRemove' },
    { name: 'onlcblockparent', icon: 'chevron-up', tooltip: 'Sélectionner le bloc parent', command: 'OnlcBlockSelectParent' }
  ], (entry) => {
    editor.ui.registry.addButton(entry.name, {
      icon: entry.icon,
      tooltip: entry.tooltip,
      onAction: () => editor.execCommand(entry.command)
    });
  });

  Arr.each([
    { name: 'onlccolumnwiden', icon: 'chevron-right', tooltip: 'Élargir la colonne', command: 'OnlcColumnResize', value: 1 },
    { name: 'onlccolumnnarrow', icon: 'chevron-left', tooltip: 'Rétrécir la colonne', command: 'OnlcColumnResize', value: -1 }
  ], (entry) => {
    editor.ui.registry.addButton(entry.name, {
      icon: entry.icon,
      tooltip: entry.tooltip,
      onAction: () => editor.execCommand(entry.command, false, entry.value)
    });
  });

  editor.ui.registry.addButton('onlccolumnadd', {
    icon: 'table-insert-column-after',
    tooltip: 'Ajouter une colonne',
    onAction: () => editor.execCommand('OnlcColumnAdd')
  });

  editor.ui.registry.addButton('onlccolumnremove', {
    icon: 'table-delete-column',
    tooltip: 'Supprimer la colonne',
    onAction: () => editor.execCommand('OnlcColumnRemove')
  });

  // Column tools appear as soon as the caret sits inside a bootstrap column
  editor.ui.registry.addContextToolbar('onlcblockscolumn', {
    predicate: (node) => Type.isNonNullable(node)
      && Grid.getParentColumn(editor, node as HTMLElement).isSome()
      && editor.dom.isEditable(node),
    items: 'onlccolumnnarrow onlccolumnwiden onlccolumnadd onlccolumnremove',
    position: 'node',
    scope: 'node'
  });
};

export {
  register
};
