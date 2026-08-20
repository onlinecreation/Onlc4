import { Arr } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Menu } from 'hugerte/core/api/ui/Ui';

import * as Languages from '../core/Languages';
import * as Scope from '../core/Scope';
import * as Sections from '../core/Sections';
import * as View from '../core/View';

/**
 * Les commandes polyglottes, dans un seul menu.
 *
 * Un rédacteur ne rencontre le multilingue que par intermittence : huit boutons dans la barre
 * d'outils coûteraient de la place tous les jours pour un besoin occasionnel. Un menu unique,
 * intitulé « Langues », rassemble donc tout.
 *
 * ## Ce que l'interface ne demande pas
 *
 * Le site connaît deux écritures pour une section de langue — `[LG]` et `<multilang>`. Les deux
 * sont **lues** et **réécrites** telles qu'elles arrivent, mais aucune n'est jamais proposée au
 * choix : c'est une distinction de gabarit, sans effet visible sur la page, et la faire trancher
 * par le rédacteur ne lui apprendrait qu'une chose — que le sujet est compliqué.
 *
 * De même, il n'y a **qu'un seul geste** pour marquer : poser une langue là où l'on est. Ce que
 * cela englobe se déduit de la sélection (voir `core/Scope.ts`), et l'intitulé du menu le dit
 * avant qu'on ait cliqué — « la sélection » quand du texte est sélectionné, « ce bloc » sinon.
 */

/** Ce que le marquage va englober, dit en clair avant le clic. */
const targetLabel = (editor: Editor): string =>
  Scope.resolve(editor)
    .map((scope) => scope.kind === 'inline' ? 'Définir la langue de la sélection' : 'Définir la langue de ce bloc')
    .getOr('Définir la langue');

const languageItems = (editor: Editor): Menu.ToggleMenuItemSpec[] => {
  const current = Sections.currentCode(editor);

  const none: Menu.ToggleMenuItemSpec = {
    type: 'togglemenuitem',
    text: 'Aucune — visible par tous',
    active: current === '',
    onAction: () => editor.execCommand('OnlcUnmarkLanguage')
  };

  return [ none ].concat(Arr.map(Languages.list(editor), (language): Menu.ToggleMenuItemSpec => ({
    type: 'togglemenuitem',
    text: language.label,
    active: current === language.code,
    onAction: () => editor.execCommand('OnlcMarkLanguage', false, language.code)
  })));
};

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

  const setting: Menu.NestedMenuItemContents[] = [
    {
      type: 'nestedmenuitem',
      text: targetLabel(editor),
      getSubmenuItems: () => languageItems(editor)
    }
  ];

  const completing: Menu.NestedMenuItemContents[] = inside ? [
    {
      type: 'menuitem',
      text: 'Compléter les langues manquantes',
      onAction: () => editor.execCommand('OnlcCompleteLanguages')
    }
  ] : [];

  const viewing: Menu.NestedMenuItemContents[] = [
    { type: 'separator' },
    {
      type: 'nestedmenuitem',
      text: 'Afficher comme un visiteur',
      getSubmenuItems: () => viewItems(editor)
    }
  ];

  return setting.concat(completing, viewing);
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
};

export {
  targetLabel,
  languageItems,
  viewItems,
  fetchItems,
  register
};
