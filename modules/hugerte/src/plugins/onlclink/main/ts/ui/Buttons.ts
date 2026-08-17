import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Toolbar } from 'hugerte/core/api/ui/Ui';
import * as LinkActions from 'hugerte/plugins/onlcshared/link/LinkActions';

const isInAnchor = (editor: Editor): boolean => LinkActions.getSelectedAnchor(editor).isSome();

/**
 * Enables a button only while the caret sits inside a link.
 */
const toggleAnchorState = (editor: Editor) => (api: Toolbar.ToolbarButtonInstanceApi): (() => void) => {
  const update = () => api.setEnabled(editor.selection.isEditable() && isInAnchor(editor));
  update();
  editor.on('NodeChange', update);
  return () => editor.off('NodeChange', update);
};

const register = (editor: Editor): void => {
  const onAction = () => editor.execCommand('OnlcLink');

  editor.ui.registry.addToggleButton('onlclink', {
    icon: 'link',
    tooltip: 'Insérer ou modifier un lien',
    shortcut: 'Meta+K',
    onAction,
    onSetup: (api) => {
      const update = () => {
        api.setActive(isInAnchor(editor));
        api.setEnabled(editor.selection.isEditable());
      };
      update();
      editor.on('NodeChange', update);
      return () => editor.off('NodeChange', update);
    }
  });

  editor.ui.registry.addButton('onlcunlink', {
    icon: 'unlink',
    tooltip: 'Supprimer le lien',
    onAction: () => editor.execCommand('OnlcUnlink'),
    onSetup: toggleAnchorState(editor)
  });

  editor.ui.registry.addButton('onlcopenlink', {
    icon: 'new-tab',
    tooltip: 'Ouvrir le lien',
    onAction: () => {
      LinkActions.getSelectedAnchor(editor).each((anchor) => {
        const href = editor.dom.getAttrib(anchor, 'href');
        if (href !== '' && Type.isNonNullable(editor.getWin())) {
          editor.getWin().open(href, '_blank', 'noopener');
        }
      });
    },
    onSetup: toggleAnchorState(editor)
  });

  editor.ui.registry.addMenuItem('onlclink', {
    icon: 'link',
    text: 'Lien...',
    shortcut: 'Meta+K',
    onAction
  });

  editor.ui.registry.addMenuItem('onlcunlink', {
    icon: 'unlink',
    text: 'Supprimer le lien',
    onAction: () => editor.execCommand('OnlcUnlink')
  });

  editor.ui.registry.addContextMenu('onlclink', {
    update: (element) => editor.dom.isEditable(element)
      ? (Type.isNonNullable(editor.dom.getParent(element, 'a[href]')) ? 'onlclink onlcunlink' : 'onlclink')
      : ''
  });

  editor.ui.registry.addContextToolbar('onlclink', {
    predicate: (node) => Type.isNonNullable(editor.dom.getParent(node, 'a[href]')) && editor.dom.isEditable(node),
    items: 'onlcopenlink onlclink onlcunlink',
    position: 'node',
    scope: 'node'
  });

  editor.addShortcut('Meta+K', 'Insérer ou modifier un lien', () => editor.execCommand('OnlcLink'));
};

export {
  register
};
