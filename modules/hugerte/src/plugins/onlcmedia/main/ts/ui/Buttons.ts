import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as BlockActions from 'hugerte/plugins/onlcshared/BlockActions';
import * as ActionIcons from 'hugerte/plugins/onlcshared/ui/ActionIcons';

import * as ImageHtml from '../core/ImageHtml';

const register = (editor: Editor): void => {
  const openImage = () => editor.execCommand('OnlcImage');

  editor.ui.registry.addToggleButton('onlcimage', {
    icon: 'image',
    tooltip: 'Insérer ou modifier une image',
    onAction: openImage,
    onSetup: (api) => {
      const update = () => {
        api.setActive(ImageHtml.getSelectedImage(editor).isSome());
        api.setEnabled(editor.selection.isEditable());
      };
      update();
      editor.on('NodeChange', update);
      return () => editor.off('NodeChange', update);
    }
  });

  editor.ui.registry.addButton('onlcmedialibrary', {
    icon: 'gallery',
    tooltip: 'Explorateur de fichiers',
    onAction: () => editor.execCommand('OnlcMediaExplorer')
  });

  editor.ui.registry.addMenuItem('onlcimage', {
    icon: 'image',
    text: 'Image...',
    onAction: openImage
  });

  editor.ui.registry.addMenuItem('onlcmedialibrary', {
    icon: 'gallery',
    text: 'Explorateur de fichiers...',
    onAction: () => editor.execCommand('OnlcMediaExplorer')
  });

  editor.ui.registry.addContextMenu('onlcimage', {
    update: (element) => {
      if (!editor.dom.isEditable(element)) {
        return '';
      }
      return editor.dom.is(element, 'img') || ImageHtml.isFigure(editor, element) ? 'onlcimage' : '';
    }
  });

  /**
   * Réglages de l'image, dans la barre du bloc qui la contient.
   *
   * Une image est rarement un bloc à elle seule : elle vit dans un paragraphe, une colonne, une
   * légende. Sa bulle s'ouvrait donc juste au-dessus d'elle, c'est-à-dire par-dessus la barre du
   * bloc environnant. Le bouton rejoint cette barre, et vise l'image du bloc — celle qui est
   * sélectionnée, ou la seule qu'il contienne.
   */
  BlockActions.declare(editor, {
    id: 'onlcmedia-image',
    label: 'Propriétés de l’image',
    icon: ActionIcons.image,
    order: 120,
    match: (target, block) => BlockActions.matchIn(target, block, 'img'),
    run: (target, element) => {
      target.selection.select(element);
      target.execCommand('OnlcImage');
    }
  });

  editor.ui.registry.addContextToolbar('onlcimage', {
    predicate: (node) => {
      const isImage = editor.dom.is(node, 'img') || ImageHtml.isFigure(editor, node);
      return isImage && editor.dom.isEditable(node.parentNode)
        && !BlockActions.isHandledByToolbar(editor, node);
    },
    items: 'onlcimage onlcmediaeditimage',
    position: 'node',
    scope: 'node'
  });

  editor.ui.registry.addButton('onlcmediaeditimage', {
    icon: 'edit-image',
    tooltip: 'Modifier dans Pixel•OnlineCreation',
    onAction: () => editor.execCommand('OnlcEditImageInPixie')
  });

  /**
   * Double clicking an image opens its properties, as expected from a wysiwyg editor.
   *
   * Rien ne s'ouvre sur un contenu **non modifiable** : l'image d'une vue de diaporama appartient
   * au diaporama, qui se manipule d'une pièce, et le formulaire des images y laissait modifier ce
   * qui devait rester verrouillé.
   */
  editor.on('dblclick', (e) => {
    // La barre des blocs ouvre déjà la configuration au double clic, pour tout objet et par le
    // registre des propriétés. Ce gestionnaire ne sert que sans elle.
    if (BlockActions.hasToolbar(editor)) {
      return;
    }
    const cible = e.target as Node;
    const estImage = Type.isNonNullable(cible)
      && (editor.dom.is(cible, 'img') || ImageHtml.isFigure(editor, cible));
    if (estImage && editor.dom.isEditable(cible)) {
      openImage();
    }
  });
};

export {
  register
};
