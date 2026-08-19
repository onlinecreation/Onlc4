import { Arr } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Menu } from 'hugerte/core/api/ui/Ui';

import * as Dom from '../core/Dom';
import * as Languages from '../core/Languages';
import * as Sections from '../core/Sections';
import * as View from '../core/View';

/**
 * Les commandes polyglottes, dans un seul menu.
 *
 * Un rédacteur ne rencontre le multilingue que par intermittence : mettre huit boutons dans la
 * barre d'outils coûterait de la place tous les jours pour un besoin occasionnel. Un menu unique,
 * intitulé « Langues », rassemble donc tout — marquer, compléter, retirer, et l'aperçu par
 * langue. Ce qui est fréquent une fois dans une section — changer sa langue, la retirer — est
 * repris dans la barre contextuelle qui apparaît au contact.
 */

const markItems = (editor: Editor): Menu.MenuItemSpec[] =>
  Arr.map(Languages.list(editor), (language) => ({
    type: 'menuitem',
    text: language.label,
    onAction: () => editor.execCommand('OnlcMarkLanguage', false, language.code)
  }));

const viewItems = (editor: Editor): Menu.ToggleMenuItemSpec[] => {
  const viewed = View.current(editor);

  const all: Menu.ToggleMenuItemSpec = {
    type: 'togglemenuitem',
    text: 'Toutes les langues',
    active: viewed === '',
    onAction: () => editor.execCommand('OnlcViewLanguage', false, '')
  };

  return [ all ].concat(Arr.map(Languages.list(editor), (language): Menu.ToggleMenuItemSpec => ({
    type: 'togglemenuitem',
    text: language.label,
    active: viewed === language.code,
    onAction: () => editor.execCommand('OnlcViewLanguage', false, language.code)
  })));
};

const fetchItems = (editor: Editor): Menu.NestedMenuItemContents[] => {
  const inside = Sections.getSelected(editor).isSome();

  const marking: Menu.NestedMenuItemContents[] = [
    {
      type: 'nestedmenuitem',
      text: inside ? 'Changer la langue de cette section' : 'Marquer dans une langue',
      getSubmenuItems: () => markItems(editor)
    },
    {
      type: 'menuitem',
      text: 'Langue de la section…',
      onAction: () => editor.execCommand('OnlcEditLanguageSection')
    }
  ];

  const onSection: Menu.NestedMenuItemContents[] = inside ? [
    {
      type: 'menuitem',
      text: 'Compléter les langues manquantes',
      onAction: () => editor.execCommand('OnlcCompleteLanguages')
    },
    {
      type: 'menuitem',
      text: 'Retirer le marquage',
      onAction: () => editor.execCommand('OnlcUnmarkLanguage')
    }
  ] : [];

  const viewing: Menu.NestedMenuItemContents[] = [
    {
      type: 'nestedmenuitem',
      text: 'Afficher comme un visiteur',
      getSubmenuItems: () => viewItems(editor)
    }
  ];

  return marking.concat(onSection, viewing);
};

const register = (editor: Editor): void => {
  editor.ui.registry.addMenuButton('onlcmultilang', {
    icon: 'language',
    tooltip: 'Langues de la page',
    fetch: (callback) => callback(fetchItems(editor))
  });

  editor.ui.registry.addNestedMenuItem('onlcmultilang', {
    icon: 'language',
    text: 'Langues',
    getSubmenuItems: () => fetchItems(editor)
  });

  editor.ui.registry.addContextToolbar('onlcmultilang', {
    predicate: (node) => Dom.isSection(editor, node) && editor.dom.isEditable(node.parentNode),
    items: 'onlcmultilangedit onlcmultilangcomplete onlcmultilangunmark',
    position: 'node',
    scope: 'node'
  });

  editor.ui.registry.addButton('onlcmultilangedit', {
    icon: 'language',
    tooltip: 'Langue de la section',
    onAction: () => editor.execCommand('OnlcEditLanguageSection')
  });

  editor.ui.registry.addButton('onlcmultilangcomplete', {
    icon: 'duplicate',
    tooltip: 'Compléter les langues manquantes',
    onAction: () => editor.execCommand('OnlcCompleteLanguages')
  });

  editor.ui.registry.addButton('onlcmultilangunmark', {
    icon: 'remove',
    tooltip: 'Retirer le marquage de langue',
    onAction: () => editor.execCommand('OnlcUnmarkLanguage')
  });
};

export {
  markItems,
  viewItems,
  fetchItems,
  register
};
