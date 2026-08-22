import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Menu } from 'hugerte/core/api/ui/Ui';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as ActionIcons from 'hugerte/plugins/onlcshared/ui/ActionIcons';

import * as Options from '../api/Options';
import * as Actions from '../core/Actions';
import * as Blocks from '../core/Blocks';
import { Controller } from '../core/Controller';
import * as Grid from '../core/Grid';
import * as LayoutSchema from './LayoutSchema';
import * as RowDialog from './RowDialog';

/** Ligne visée par les actions : celle du bloc actif, sinon celle du curseur. */
const selectedRow = (editor: Editor, controller: Controller): Optional<HTMLElement> =>
  controller.getActive()
    .filter((block) => Grid.isRow(editor, block))
    .orThunk(() => Grid.getParentRow(editor, editor.selection.getNode() as HTMLElement));

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

  // Chaque disposition devient une icône, pour être reconnaissable dans les menus
  const layouts = Options.getLayouts(editor);
  const total = Options.getGridColumns(editor);
  Arr.each(layouts, (layout) => {
    editor.ui.registry.addIcon(`onlc-layout-${LayoutSchema.valueOf(layout)}`, LayoutSchema.forLayout(layout, total));
  });

  /**
   * Choix de la disposition d'une ligne existante : la liste est fermée, on ne peut donc pas
   * ajouter des colonnes à l'infini.
   */
  editor.ui.registry.addMenuButton('onlcrowlayout', {
    icon: 'table',
    text: 'Disposition',
    tooltip: 'Choisir la disposition des colonnes',
    fetch: (callback) => {
      const items: Menu.MenuItemSpec[] = Arr.map(layouts, (layout) => ({
        type: 'menuitem',
        text: `Colonnes ${layout.text}`,
        icon: `onlc-layout-${LayoutSchema.valueOf(layout)}`,
        onAction: () => {
          selectedRow(editor, controller).each((row) => Grid.applyLayout(editor, row, layout.columns));
        }
      }));
      callback(items);
    }
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

  /**
   * Disposition de la ligne, dans la barre de la ligne elle-même.
   *
   * Une ligne de grille **est** un bloc : elle a déjà sa barre, avec sa poignée et sa croix. La
   * bulle qui proposait la disposition s'ouvrait par-dessus. Seul le choix de la disposition la
   * rejoint : dupliquer et supprimer sont déjà dans la barre du bloc.
   */
  BlockActions.declare(editor, {
    id: 'onlcblocks-row-layout',
    label: 'Disposition des colonnes',
    icon: ActionIcons.columns,
    order: 105,
    match: (target, block) => target.dom.hasClass(block, Options.getRowClass(target))
      ? Optional.some(block)
      : Optional.none<HTMLElement>(),
    run: (target, row) => RowDialog.openLayout(target, row)
  });

  // Dès que le curseur entre dans une colonne, la barre de la ligne apparaît : elle propose la
  // disposition, la duplication et la suppression de la ligne entière. Elle ne s'ouvre plus quand
  // l'espace de travail en blocs est là : ses commandes sont alors dans la barre du bloc.
  editor.ui.registry.addContextToolbar('onlcblocksrowtools', {
    predicate: (node) => Type.isNonNullable(node)
      && Grid.getParentColumn(editor, node as HTMLElement).isSome()
      && editor.dom.isEditable(node)
      && !BlockActions.isHandledByToolbar(editor, node),
    items: 'onlcrowlayout | onlcrowduplicate onlcrowremove',
    position: 'node',
    scope: 'node'
  });

  editor.ui.registry.addButton('onlcrowduplicate', {
    icon: 'duplicate',
    tooltip: 'Dupliquer la ligne',
    onAction: () => {
      selectedRow(editor, controller).each((row) => Actions.duplicate(editor, row));
    }
  });

  editor.ui.registry.addButton('onlcrowremove', {
    icon: 'remove',
    tooltip: 'Supprimer la ligne et ses colonnes',
    onAction: () => {
      selectedRow(editor, controller).each((row) => Actions.remove(editor, row));
    }
  });
};

export {
  register
};
