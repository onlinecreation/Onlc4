import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as BlockKinds from 'hugerte/plugins/onlcshared/BlockKinds';
import * as MenuEntries from 'hugerte/plugins/onlcshared/ui/MenuEntries';

import * as Anim from '../core/Anim';
import * as Dialog from '../ui/Dialog';
import * as Icons from './Icons';

/**
 * Le bouton, l'entrée de menu, le repère de type et le double clic.
 *
 * Un texte animé n'est pas un bloc : c'est un passage **dans** une phrase. Il n'a donc pas de
 * contour à lui, mais il se déclare tout de même au registre des types — un paragraphe qui en
 * contient un le montre dans sa pastille — et au registre des propriétés, qui est ce que le
 * double clic interroge.
 */

const openFor = (editor: Editor, node: Node | null): void =>
  Dialog.open(editor, Anim.at(editor, node));

const register = (editor: Editor): void => {
  editor.ui.registry.addButton('onlcanimtext', {
    icon: 'onlc-animtext',
    tooltip: 'Texte animé',
    onAction: () => openFor(editor, editor.selection.getNode())
  });

  editor.ui.registry.addMenuItem('onlcanimtext', {
    icon: 'onlc-animtext',
    text: 'Texte animé...',
    onAction: () => openFor(editor, editor.selection.getNode())
  });

  MenuEntries.declare(editor, 'insert', [ 'onlcanimtext' ]);

  BlockKinds.declare(editor, {
    id: 'onlcanimtext',
    label: 'Texte animé',
    icon: Icons.kind,
    order: 26,
    match: (target, element) => Type.isNonNullable(target.dom.select(`.${Anim.containerClass}`, element)[0])
  });

  BlockActions.declare(editor, {
    id: 'onlcanimtext-edit',
    label: 'Modifier le texte animé',
    icon: Icons.action,
    order: 118,
    match: (target, block) => BlockActions.matchIn(target, block,
      `.${Anim.containerClass}, .${Anim.legacyContainerClass}`),
    run: (target, element) => Dialog.open(target, Optional.some(element))
  });

  /**
   * Sans la barre des blocs, le plugin garde son propre double clic : le registre des propriétés
   * n'est consulté que par elle.
   */
  editor.on('dblclick', (e) => {
    if (BlockActions.hasToolbar(editor) || editor.mode.isReadOnly()) {
      return;
    }
    Anim.at(editor, e.target as Node).each((element) => {
      if (editor.dom.isEditable(element)) {
        Dialog.open(editor, Optional.some(element));
      }
    });
  });
};

export {
  openFor,
  register
};
