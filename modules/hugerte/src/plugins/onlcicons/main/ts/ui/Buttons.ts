import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as ActionIcons from 'hugerte/plugins/onlcshared/ui/ActionIcons';
import * as MenuEntries from 'hugerte/plugins/onlcshared/ui/MenuEntries';

import * as OpenMoji from '../core/OpenMoji';

/**
 * Un seul bouton suffit : la fenêtre porte les deux onglets.
 *
 * `onlcemoji` et `onlcmaterialicons` restent disponibles pour une barre d'outils qui préfère
 * ouvrir directement l'un des deux onglets, mais ils ne portent plus le même dessin que
 * `onlcicons` — deux boutons identiques côte à côte n'apprenaient rien à personne.
 */
/**
 * Une icône déjà posée dans la page, quelle que soit son écriture.
 *
 * Les icônes insérées ici portent `onlc-icon`, mais une page réelle en contient d'autres, écrites
 * à la main bien avant l'éditeur : `<i class="fa-solid fa-star">`, `<span class="material-icons">`.
 * Les reconnaître aussi, c'est permettre de les changer sans passer par le code source.
 */
const iconSelector = '.onlc-icon, i[class*="fa-"], i[class*="fa "], span.material-icons, span.material-symbols-outlined';

const emojiSelector = `img.${OpenMoji.emojiClass}`;

/**
 * Ouvre le sélectionneur **sur** l'icône visée.
 *
 * L'élément est sélectionné avant l'ouverture : le choix suivant remplace alors l'icône au lieu
 * d'en poser une seconde à côté, ce que ferait une insertion au point d'insertion courant.
 */
const openOn = (editor: Editor, element: HTMLElement, command: string): void => {
  editor.selection.select(element);
  editor.execCommand(command);
};

/**
 * Le double clic sur une icône ou un emoji rouvre le sélectionneur.
 *
 * Le registre des propriétés s'en charge : c'est lui que la barre des blocs affiche, et c'est lui
 * que le double clic interroge. Les deux entrées passent **devant** celle des images — un emoji
 * est un `img`, et sans cela il aurait ouvert le formulaire des images, où son adresse n'a aucun
 * sens.
 */
const registerActions = (editor: Editor): void => {
  BlockActions.declare(editor, {
    id: 'onlcicons-emoji',
    label: 'Changer cet emoji',
    icon: ActionIcons.edit,
    order: 104,
    match: (target, block) => BlockActions.matchIn(target, block, emojiSelector),
    run: (target, element) => openOn(target, element, 'OnlcEmojis')
  });

  BlockActions.declare(editor, {
    id: 'onlcicons-icon',
    label: 'Changer cette icône',
    icon: ActionIcons.edit,
    order: 105,
    match: (target, block) => BlockActions.matchIn(target, block, iconSelector),
    run: (target, element) => openOn(target, element, 'OnlcMaterialIcons')
  });

  /**
   * Sans la barre des blocs, le plugin garde son propre double clic : le registre ci-dessus n'est
   * consulté que par elle.
   */
  editor.on('dblclick', (e) => {
    if (BlockActions.hasToolbar(editor) || editor.mode.isReadOnly()) {
      return;
    }
    const cible = editor.dom.getParent<HTMLElement>(e.target as Node, `${emojiSelector}, ${iconSelector}`);
    if (Type.isNonNullable(cible) && editor.dom.isEditable(cible)) {
      openOn(editor, cible, editor.dom.is(cible, emojiSelector) ? 'OnlcEmojis' : 'OnlcMaterialIcons');
    }
  });
};

const register = (editor: Editor): void => {
  editor.ui.registry.addButton('onlcicons', {
    icon: 'emoji',
    tooltip: 'Emojis et icônes',
    onAction: () => editor.execCommand('OnlcIcons')
  });

  editor.ui.registry.addButton('onlcemoji', {
    icon: 'insert-character',
    tooltip: 'Emojis seuls',
    onAction: () => editor.execCommand('OnlcEmojis')
  });

  editor.ui.registry.addButton('onlcmaterialicons', {
    icon: 'template',
    tooltip: 'Icônes seules',
    onAction: () => editor.execCommand('OnlcMaterialIcons')
  });

  editor.ui.registry.addMenuItem('onlcicons', {
    icon: 'emoji',
    text: 'Emojis et icônes...',
    onAction: () => editor.execCommand('OnlcIcons')
  });

  editor.ui.registry.addMenuItem('onlcemoji', {
    icon: 'insert-character',
    text: 'Emojis seuls...',
    onAction: () => editor.execCommand('OnlcEmojis')
  });

  editor.ui.registry.addMenuItem('onlcmaterialicons', {
    icon: 'template',
    text: 'Icônes seules...',
    onAction: () => editor.execCommand('OnlcMaterialIcons')
  });

  // Les deux variantes ne sont pas rangées dans le menu : la fenêtre unique porte leurs deux
  // onglets, et trois entrées voisines qui ouvrent la même chose n'apprennent rien.
  MenuEntries.declare(editor, 'insert', [ 'onlcicons' ]);

  registerActions(editor);
};

export {
  register
};
