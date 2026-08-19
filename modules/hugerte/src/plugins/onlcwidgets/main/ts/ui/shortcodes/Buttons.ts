import Editor from 'hugerte/core/api/Editor';

import * as Dom from '../../core/shortcodes/Dom';

/**
 * Barre contextuelle des éléments du site déjà posés, et raccourcis de compatibilité.
 *
 * `onlcshortcodes` ouvre désormais la **même** bibliothèque que `onlcwidget` : les deux
 * catalogues sont réunis. Le bouton reste enregistré pour les barres d'outils qui le nomment
 * déjà, mais il n'y a plus de raison de mettre les deux côte à côte.
 */

const register = (editor: Editor): void => {
  editor.ui.registry.addButton('onlcshortcodes', {
    icon: 'template',
    tooltip: 'Blocs et éléments du site',
    onAction: () => editor.execCommand('OnlcShortcodeLibrary')
  });

  editor.ui.registry.addMenuItem('onlcshortcodes', {
    icon: 'template',
    text: 'Blocs et éléments du site...',
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
