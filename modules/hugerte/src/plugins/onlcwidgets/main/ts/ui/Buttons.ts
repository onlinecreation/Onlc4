import Editor from 'hugerte/core/api/Editor';

import * as Script from '../core/Script';
import * as WidgetDom from '../core/WidgetDom';

/**
 * Three tools: a javascript snippet, the html source and the library of predefined blocks.
 */

const register = (editor: Editor): void => {
  const onScriptSetup = (api: { setActive: (state: boolean) => void }) => {
    const update = () => api.setActive(Script.getSelected(editor).isSome());
    update();
    editor.on('NodeChange', update);
    return () => editor.off('NodeChange', update);
  };

  editor.ui.registry.addToggleButton('onlcscript', {
    icon: 'code-sample',
    tooltip: 'Script JavaScript',
    onAction: () => editor.execCommand('OnlcScript'),
    onSetup: onScriptSetup
  });

  editor.ui.registry.addButton('onlcsource', {
    icon: 'sourcecode',
    tooltip: 'Code source HTML',
    onAction: () => editor.execCommand('OnlcSourceCode')
  });

  editor.ui.registry.addButton('onlcwidget', {
    icon: 'template',
    tooltip: 'Blocs prédéfinis',
    onAction: () => editor.execCommand('OnlcWidgetLibrary')
  });

  editor.ui.registry.addMenuItem('onlcscript', {
    icon: 'code-sample',
    text: 'Script JavaScript...',
    onAction: () => editor.execCommand('OnlcScript')
  });

  editor.ui.registry.addMenuItem('onlcsource', {
    icon: 'sourcecode',
    text: 'Code source HTML...',
    onAction: () => editor.execCommand('OnlcSourceCode')
  });

  editor.ui.registry.addMenuItem('onlcwidget', {
    icon: 'template',
    text: 'Blocs prédéfinis...',
    onAction: () => editor.execCommand('OnlcWidgetLibrary')
  });

  editor.ui.registry.addButton('onlcwidgetedit', {
    icon: 'edit-block',
    tooltip: 'Modifier le bloc',
    onAction: () => editor.execCommand('OnlcEditWidget')
  });

  editor.ui.registry.addButton('onlcwidgetremove', {
    icon: 'remove',
    tooltip: 'Supprimer le bloc',
    onAction: () => editor.execCommand('OnlcRemoveWidget')
  });

  editor.ui.registry.addButton('onlcscriptedit', {
    icon: 'edit-block',
    tooltip: 'Modifier le script',
    onAction: () => editor.execCommand('OnlcScript')
  });

  editor.ui.registry.addButton('onlcscriptremove', {
    icon: 'remove',
    tooltip: 'Supprimer le script',
    onAction: () => editor.execCommand('OnlcRemoveScript')
  });

  editor.ui.registry.addContextToolbar('onlcwidget', {
    predicate: (node) => WidgetDom.isWidget(editor, node) && editor.dom.isEditable(node.parentNode),
    items: 'onlcwidgetedit onlcwidgetremove',
    position: 'node',
    scope: 'node'
  });

  editor.ui.registry.addContextToolbar('onlcscript', {
    predicate: (node) => Script.isPlaceholder(editor, node) && editor.dom.isEditable(node.parentNode),
    items: 'onlcscriptedit onlcscriptremove',
    position: 'node',
    scope: 'node'
  });

  editor.ui.registry.addContextMenu('onlcwidgets', {
    update: (element) => {
      if (!editor.dom.isEditable(element)) {
        return '';
      }
      return WidgetDom.isWidget(editor, element) || Script.isPlaceholder(editor, element) ? 'onlcwidget' : '';
    }
  });

  // Double clicking a block opens its form, like every other object of the editor
  editor.on('dblclick', (e) => {
    const node = e.target as Node;
    if (Script.isPlaceholder(editor, node)) {
      editor.execCommand('OnlcScript');
    } else if (WidgetDom.isWidget(editor, editor.dom.getParent(node, WidgetDom.blockSelector(editor)))) {
      editor.execCommand('OnlcEditWidget');
    }
  });
};

export {
  register
};
