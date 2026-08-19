import Editor from 'hugerte/core/api/Editor';

const register = (editor: Editor): void => {
  editor.ui.registry.addButton('onlcicons', {
    icon: 'emoji',
    tooltip: 'Emojis et icônes',
    onAction: () => editor.execCommand('OnlcIcons')
  });

  editor.ui.registry.addButton('onlcemoji', {
    icon: 'emoji',
    tooltip: 'Emojis',
    onAction: () => editor.execCommand('OnlcEmojis')
  });

  editor.ui.registry.addButton('onlcmaterialicons', {
    icon: 'gallery',
    tooltip: 'Icônes',
    onAction: () => editor.execCommand('OnlcMaterialIcons')
  });

  editor.ui.registry.addMenuItem('onlcicons', {
    icon: 'emoji',
    text: 'Emojis et icônes...',
    onAction: () => editor.execCommand('OnlcIcons')
  });
};

export {
  register
};
