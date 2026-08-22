import Editor from 'hugerte/core/api/Editor';
import * as MenuEntries from 'hugerte/plugins/onlcshared/ui/MenuEntries';

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
};

export {
  register
};
