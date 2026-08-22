import { Arr, Fun } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Menu } from 'hugerte/core/api/ui/Ui';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as ActionIcons from 'hugerte/plugins/onlcshared/ui/ActionIcons';

import * as Options from '../api/Options';
import * as Spacer from '../core/Spacer';

const register = (editor: Editor): void => {
  const onAction = () => editor.execCommand('OnlcEditSpacer');

  editor.ui.registry.addButton('onlcspacer', {
    icon: 'line-height',
    tooltip: 'Séparateur vertical',
    onAction
  });

  editor.ui.registry.addMenuItem('onlcspacer', {
    icon: 'line-height',
    text: 'Séparateur vertical...',
    onAction
  });

  // A split button so that the common case - the default height - is one click away,
  // while every preset stays reachable from the menu.
  editor.ui.registry.addSplitButton('onlcspacerquick', {
    icon: 'line-height',
    tooltip: 'Séparateur vertical',
    onAction: () => editor.execCommand('OnlcInsertSpacer'),
    onItemAction: (_api, value) => editor.execCommand('OnlcInsertSpacer', false, value),
    fetch: (callback) => {
      const items: Menu.ChoiceMenuItemSpec[] = Arr.map(Options.getPresets(editor), (preset) => ({
        type: 'choiceitem',
        text: preset,
        value: preset
      }));
      callback(items);
    },
    select: Fun.never
  });

  // Hauteur de l'espace, dans la barre du bloc quand elle existe (voir `BlockActions`).
  BlockActions.declare(editor, {
    id: 'onlcspacer-height',
    label: 'Hauteur du séparateur',
    icon: ActionIcons.spacing,
    order: 115,
    match: (target, block) => BlockActions.matchIn(target, block, `.${Options.getSpacerClass(target)}`),
    run: (target, element) => {
      target.selection.select(element);
      target.execCommand('OnlcEditSpacer');
    }
  });

  editor.ui.registry.addContextToolbar('onlcspacer', {
    predicate: (node) => Spacer.isSpacer(editor, node)
      && editor.dom.isEditable(node.parentNode)
      && !BlockActions.isHandledByToolbar(editor, node),
    items: 'onlcspacerdecrease onlcspacerincrease onlcspaceredit onlcspacerremove',
    position: 'node',
    scope: 'node'
  });

  editor.ui.registry.addButton('onlcspacerdecrease', {
    icon: 'minus',
    tooltip: 'Réduire',
    onAction: () => editor.execCommand('OnlcGrowSpacer', false, -1)
  });

  editor.ui.registry.addButton('onlcspacerincrease', {
    icon: 'plus',
    tooltip: 'Agrandir',
    onAction: () => editor.execCommand('OnlcGrowSpacer', false, 1)
  });

  editor.ui.registry.addButton('onlcspaceredit', {
    icon: 'settings',
    tooltip: 'Hauteur du séparateur',
    onAction
  });

  editor.ui.registry.addButton('onlcspacerremove', {
    icon: 'remove',
    tooltip: 'Supprimer le séparateur',
    onAction: () => editor.execCommand('OnlcRemoveSpacer')
  });
};

export {
  register
};
