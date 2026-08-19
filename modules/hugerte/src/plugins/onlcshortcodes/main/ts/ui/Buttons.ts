import Editor from 'hugerte/core/api/Editor';

import * as Dom from '../core/Dom';

/**
 * Un bouton pour insérer un élément du site, et une barre contextuelle sur les blocs déjà posés.
 */

const register = (editor: Editor): void => {
  editor.ui.registry.addButton('onlcshortcodes', {
    icon: 'template',
    tooltip: 'Éléments du site',
    onAction: () => editor.execCommand('OnlcShortcodeLibrary')
  });

  editor.ui.registry.addMenuItem('onlcshortcodes', {
    icon: 'template',
    text: 'Éléments du site...',
    onAction: () => editor.execCommand('OnlcShortcodeLibrary')
  });

  editor.ui.registry.addButton('onlcshortcodeedit', {
    icon: 'edit-block',
    tooltip: 'Modifier cet élément',
    onAction: () => editor.execCommand('OnlcEditShortcode')
  });

  editor.ui.registry.addButton('onlcshortcodeduplicate', {
    icon: 'duplicate',
    tooltip: 'Dupliquer cet élément',
    onAction: () => editor.execCommand('OnlcDuplicateShortcode')
  });

  editor.ui.registry.addButton('onlcshortcoderemove', {
    icon: 'remove',
    tooltip: 'Supprimer cet élément',
    onAction: () => editor.execCommand('OnlcRemoveShortcode')
  });

  editor.ui.registry.addContextToolbar('onlcshortcode', {
    predicate: (node) => Dom.isBlock(editor, node) && editor.dom.isEditable(node.parentNode),
    items: 'onlcshortcodeedit onlcshortcodeduplicate onlcshortcoderemove',
    position: 'node',
    scope: 'node'
  });

  // Un double clic ouvre le formulaire, comme pour les autres objets de l'éditeur
  editor.on('dblclick', (e) => {
    if (Dom.isBlock(editor, editor.dom.getParent(e.target as Node, Dom.selector))) {
      editor.execCommand('OnlcEditShortcode');
    }
  });
};

export {
  register
};
