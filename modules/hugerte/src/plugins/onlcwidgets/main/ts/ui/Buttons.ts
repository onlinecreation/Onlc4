import Editor from 'hugerte/core/api/Editor';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as BlockAtoms from 'hugerte/plugins/onlcshared/BlockAtoms';
import * as BlockKinds from 'hugerte/plugins/onlcshared/BlockKinds';
import * as ActionIcons from 'hugerte/plugins/onlcshared/ui/ActionIcons';
import * as KindIcons from 'hugerte/plugins/onlcshared/ui/KindIcons';

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

  /**
   * Modifier un bloc, depuis la barre du bloc lui-même.
   *
   * Le bouton se range à côté des commandes de déplacement plutôt que dans une seconde bulle
   * ouverte par-dessus : c'est le même bloc, il n'y a pas de raison d'avoir deux barres. La
   * suppression n'est pas reprise ici — la barre du bloc a déjà sa croix.
   */
  // Un bloc prédéfini se manipule d'une pièce : c'est l'éditeur qui possède son markup, et son
  // formulaire qui en change le contenu. L'espace de travail le traite donc comme insécable,
  // faute de quoi la barre se poserait sur le titre ou l'image qu'il contient, et proposerait de
  // les déplacer hors du bloc qui les a produits.
  BlockKinds.declare(editor, {
    id: 'onlcwidgets-widget',
    label: 'Bloc prédéfini',
    icon: KindIcons.widget,
    order: 20,
    match: (target, element) => WidgetDom.isWidget(target, element)
  });

  BlockKinds.declare(editor, {
    id: 'onlcwidgets-script',
    label: 'Script',
    icon: KindIcons.script,
    order: 22,
    match: (target, element) => target.dom.is(element, `[${Script.dataAttribute}]`) as boolean
  });

  BlockAtoms.declare(editor, {
    id: 'onlcwidgets',
    match: (target, element) => WidgetDom.isWidget(target, element)
  });

  BlockActions.declare(editor, {
    id: 'onlcwidgets-edit',
    label: 'Modifier le bloc',
    icon: ActionIcons.edit,
    order: 110,
    match: (target, block) => BlockActions.matchIn(target, block, WidgetDom.blockSelector(target)),
    run: (target, element) => {
      target.selection.select(element);
      target.execCommand('OnlcEditWidget');
    }
  });

  BlockActions.declare(editor, {
    id: 'onlcwidgets-script',
    label: 'Modifier le script',
    icon: ActionIcons.code,
    order: 112,
    match: (target, block) => BlockActions.matchIn(target, block, `.${Script.placeholderClass}`),
    run: (target, element) => {
      target.selection.select(element);
      target.execCommand('OnlcScript');
    }
  });

  /**
   * Les bulles restent, pour les configurations sans espace de travail en blocs.
   *
   * Quand `onlcblocks` est chargé, le bouton est déjà dans la barre du bloc : une bulle de plus
   * ne ferait que la recouvrir. Quand il ne l'est pas, il n'y a aucune barre à masquer, et la
   * bulle est le seul accès aux réglages du bloc.
   */
  editor.ui.registry.addContextToolbar('onlcwidget', {
    predicate: (node) => WidgetDom.isWidget(editor, node)
      && editor.dom.isEditable(node.parentNode)
      && !BlockActions.isHandledByToolbar(editor, node),
    items: 'onlcwidgetedit onlcwidgetremove',
    position: 'node',
    scope: 'node'
  });

  editor.ui.registry.addContextToolbar('onlcscript', {
    predicate: (node) => Script.isPlaceholder(editor, node)
      && editor.dom.isEditable(node.parentNode)
      && !BlockActions.isHandledByToolbar(editor, node),
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

  editor.ui.registry.addButton('onlcpreview', {
    icon: 'preview',
    tooltip: 'Aperçu comme un visiteur',
    onAction: () => editor.execCommand('OnlcPreview')
  });

  editor.ui.registry.addMenuItem('onlcpreview', {
    icon: 'preview',
    text: 'Aperçu comme un visiteur...',
    onAction: () => editor.execCommand('OnlcPreview')
  });

};

export {
  register
};
