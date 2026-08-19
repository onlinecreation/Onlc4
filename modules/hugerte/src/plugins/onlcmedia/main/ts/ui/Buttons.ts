import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

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

  editor.ui.registry.addContextToolbar('onlcimage', {
    predicate: (node) => {
      const isImage = editor.dom.is(node, 'img') || ImageHtml.isFigure(editor, node);
      return isImage && editor.dom.isEditable(node.parentNode);
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

  // Double clicking an image opens its properties, as expected from a wysiwyg editor
  editor.on('dblclick', (e) => {
    if (Type.isNonNullable(e.target) && (editor.dom.is(e.target as Node, 'img') || ImageHtml.isFigure(editor, e.target as Node))) {
      openImage();
    }
  });
};

export {
  register
};
