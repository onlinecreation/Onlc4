import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as ActionIcons from 'hugerte/plugins/onlcshared/ui/ActionIcons';

import * as Detect from '../core/Detect';
import * as SwiperDialog from '../ui/SwiperDialog';

/**
 * L'accès au formulaire d'un diaporama.
 *
 * Un diaporama est un bloc de la page : son bouton se range dans la barre du bloc, avec ceux qui
 * le déplacent et le suppriment (voir `BlockActions`). La bulle contextuelle reste pour les
 * configurations sans espace de travail en blocs.
 *
 * Il n'y a **pas** de bouton « insérer un diaporama » dans la barre d'outils : Swiper doit être
 * chargé par le gabarit du site, et poser le html d'un diaporama dans une page qui n'a pas la
 * bibliothèque donnerait une colonne d'images empilées sans que rien ne l'explique.
 */

const swiperAt = (editor: Editor, block: HTMLElement): Optional<HTMLElement> =>
  Detect.at(editor, block).map((swiper) => swiper.container);

const register = (editor: Editor): void => {
  editor.ui.registry.addButton('onlcswiperedit', {
    icon: 'gallery',
    tooltip: 'Modifier le diaporama',
    onAction: () => editor.execCommand('OnlcSwiper')
  });

  editor.ui.registry.addMenuItem('onlcswiper', {
    icon: 'gallery',
    text: 'Diaporama...',
    onAction: () => editor.execCommand('OnlcSwiper')
  });

  BlockActions.declare(editor, {
    id: 'onlcswiper-edit',
    label: 'Modifier le diaporama',
    icon: ActionIcons.slideshow,
    order: 118,
    match: swiperAt,
    run: (target, container) => {
      Detect.at(target, container).each((swiper) => SwiperDialog.open(target, swiper));
    }
  });

  editor.ui.registry.addContextToolbar('onlcswiper', {
    predicate: (node) => Type.isNonNullable(node)
      && Detect.at(editor, node).isSome()
      && editor.dom.isEditable(node)
      && !BlockActions.isHandledByToolbar(editor, node),
    items: 'onlcswiperedit',
    position: 'node',
    scope: 'node'
  });

  // Un double clic ouvre le formulaire, comme pour les autres objets de l'éditeur.
  editor.on('dblclick', (e) => {
    if (Detect.at(editor, e.target as Node).isSome()) {
      editor.execCommand('OnlcSwiper');
    }
  });
};

export {
  swiperAt,
  register
};
