import Editor from 'hugerte/core/api/Editor';
import * as MenuEntries from 'hugerte/plugins/onlcshared/ui/MenuEntries';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as BlockKinds from 'hugerte/plugins/onlcshared/BlockKinds';
import * as ActionIcons from 'hugerte/plugins/onlcshared/ui/ActionIcons';
import * as KindIcons from 'hugerte/plugins/onlcshared/ui/KindIcons';

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

  // Réglages de l'élément, dans la barre du bloc quand elle existe (voir `BlockActions`).
  BlockKinds.declare(editor, {
    id: 'onlcwidgets-shortcode',
    label: 'Code court',
    icon: KindIcons.shortcode,
    order: 24,
    match: (target, element) => target.dom.hasClass(element, Dom.blockClass)
  });

  BlockActions.declare(editor, {
    id: 'onlcwidgets-shortcode',
    label: 'Modifier cet élément',
    icon: ActionIcons.edit,
    order: 111,
    match: (target, block) => BlockActions.matchIn(target, block, Dom.selector),
    run: (target, element) => {
      target.selection.select(element);
      target.execCommand('OnlcEditShortcode');
    }
  });

  editor.ui.registry.addContextToolbar('onlcshortcode', {
    predicate: (node) => Dom.isBlock(editor, node)
      && editor.dom.isEditable(node.parentNode)
      && !BlockActions.isHandledByToolbar(editor, node),
    items: 'onlcshortcodeedit onlcshortcodeduplicate onlcshortcoderemove',
    position: 'node',
    scope: 'node'
  });

  // Un double clic ouvre le formulaire, comme pour les autres objets de l'éditeur
  editor.on('dblclick', (e) => {
    // La barre des blocs ouvre déjà la configuration au double clic, pour tout objet et par le
    // registre des propriétés. Ce gestionnaire ne sert que sans elle — et jamais en lecture
    // seule, où un formulaire qui écrit dans le document n'a rien à faire.
    if (BlockActions.hasToolbar(editor) || editor.mode.isReadOnly()) {
      return;
    }
    if (Dom.isBlock(editor, editor.dom.getParent(e.target as Node, Dom.selector))) {
      editor.execCommand('OnlcEditShortcode');
    }
  });
  MenuEntries.declare(editor, 'insert', [ 'onlcshortcodes' ]);

};

export {
  register
};
