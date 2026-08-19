import Editor from 'hugerte/core/api/Editor';

/**
 * Un seul bouton suffit : la fenêtre porte les deux onglets.
 *
 * `onlcemoji` et `onlcmaterialicons` restent disponibles pour une barre d'outils qui préfère
 * ouvrir directement l'un des deux onglets, mais ils ne portent plus le même dessin que
 * `onlcicons` — deux boutons identiques côte à côte n'apprenaient rien à personne.
 */
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
};

export {
  register
};
