import { Arr } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Menu } from 'hugerte/core/api/ui/Ui';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as BlockKinds from 'hugerte/plugins/onlcshared/BlockKinds';
import * as ActionIcons from 'hugerte/plugins/onlcshared/ui/ActionIcons';
import * as KindIcons from 'hugerte/plugins/onlcshared/ui/KindIcons';

import * as Jsonld from '../core/Jsonld';
import * as Meta from '../core/Meta';

/**
 * Un seul bouton : « Référencement ».
 *
 * Les deux aides qu'il regroupe n'ont rien en commun techniquement — l'une est un code court,
 * l'autre un objet json — mais tout en commun pour qui écrit une page : elles décrivent la page
 * aux moteurs, elles ne se voient pas sur le site, et il n'en faut qu'une de chaque. Les ranger
 * à deux endroits différents obligerait à savoir laquelle est un code court, ce qui n'intéresse
 * personne.
 *
 * L'intitulé de chaque entrée dit si elle existe déjà : « Ajouter… » ou « Modifier… ». On sait
 * donc avant d'ouvrir si la page en a une.
 */

const items = (editor: Editor): Menu.NestedMenuItemContents[] => {
  const entries: Menu.NestedMenuItemContents[] = [];

  if (Meta.isAvailable(editor)) {
    entries.push({
      type: 'menuitem',
      icon: 'search',
      text: Meta.existing(editor).isSome()
        ? 'Modifier la description pour les moteurs…'
        : 'Ajouter une description pour les moteurs…',
      onAction: () => editor.execCommand('OnlcSeoMeta')
    });
  }

  entries.push({
    type: 'menuitem',
    icon: 'code-sample',
    text: Jsonld.existing(editor).isSome()
      ? 'Modifier les microdonnées de la page…'
      : 'Décrire la page pour les moteurs (microdonnées)…',
    onAction: () => editor.execCommand('OnlcSeoMicrodata')
  });

  return entries;
};

const register = (editor: Editor): void => {
  editor.ui.registry.addMenuButton('onlcseo', {
    icon: 'search',
    tooltip: 'Référencement de la page',
    fetch: (callback) => callback(items(editor))
  });

  editor.ui.registry.addNestedMenuItem('onlcseo', {
    icon: 'search',
    text: 'Référencement',
    getSubmenuItems: () => items(editor)
  });

  editor.ui.registry.addButton('onlcseomicrodataedit', {
    icon: 'edit-block',
    tooltip: 'Modifier les microdonnées',
    onAction: () => editor.execCommand('OnlcSeoMicrodata')
  });

  editor.ui.registry.addButton('onlcseomicrodataremove', {
    icon: 'remove',
    tooltip: 'Supprimer les microdonnées',
    onAction: () => editor.execCommand('OnlcSeoRemoveMicrodata')
  });

  // Réglages de la fiche, dans la barre du bloc quand elle existe (voir `BlockActions`).
  BlockKinds.declare(editor, {
    id: 'onlcseo',
    label: 'Microdonnées de la page',
    icon: KindIcons.tag,
    order: 20,
    match: (target, element) => target.dom.hasClass(element, Jsonld.blockClass)
  });

  BlockActions.declare(editor, {
    id: 'onlcseo-microdata',
    label: 'Modifier les microdonnées',
    icon: ActionIcons.tag,
    order: 113,
    match: (target, block) => BlockActions.matchIn(target, block, Jsonld.selector),
    run: (target) => target.execCommand('OnlcSeoMicrodata')
  });

  editor.ui.registry.addContextToolbar('onlcseomicrodata', {
    predicate: (node) => Jsonld.isBlock(editor, node)
      && editor.dom.isEditable(node.parentNode)
      && !BlockActions.isHandledByToolbar(editor, node),
    items: 'onlcseomicrodataedit onlcseomicrodataremove',
    position: 'node',
    scope: 'node'
  });

  // Un double clic ouvre le formulaire, comme pour les autres objets de l'éditeur.
  editor.on('dblclick', (e) => {
    if (Jsonld.isBlock(editor, editor.dom.getParent(e.target as Node, Jsonld.selector))) {
      editor.execCommand('OnlcSeoMicrodata');
    }
  });

  /**
   * Les doublons entrés avec un contenu déjà publié sont ramenés à un, et on le dit.
   *
   * Une page qui arrive avec deux descriptions vient d'ailleurs — d'un autre éditeur, d'un
   * copier-coller. Les laisser toutes deux, c'est laisser un problème invisible ; les retirer en
   * silence, c'est modifier le travail de quelqu'un sans le prévenir.
   */
  editor.on('SetContent', () => {
    const removedMeta = Meta.dedupe(editor);
    const blocks = editor.dom.select(Jsonld.selector, editor.getBody());
    const removedMicrodata = Math.max(0, blocks.length - 1);

    if (removedMicrodata > 0) {
      editor.undoManager.transact(() => {
        Arr.each(blocks.slice(1), (element) => editor.dom.remove(element));
      });
    }

    if (removedMeta + removedMicrodata > 0) {
      editor.windowManager.alert(
        'Cette page contenait plusieurs fiches de référencement. Une seule a été conservée : ' +
        'les moteurs de recherche n’en lisent qu’une, et choisissent au hasard quand il y en a plusieurs.');
    }
  });
};

export {
  items,
  register
};
