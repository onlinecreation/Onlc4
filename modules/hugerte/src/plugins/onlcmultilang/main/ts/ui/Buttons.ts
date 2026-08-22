import { Arr, Fun } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Menu } from 'hugerte/core/api/ui/Ui';
import * as BlockKinds from 'hugerte/plugins/onlcshared/BlockKinds';
import * as KindIcons from 'hugerte/plugins/onlcshared/ui/KindIcons';

import * as Dom from '../core/Dom';
import * as Languages from '../core/Languages';
import * as Scope from '../core/Scope';
import * as Sections from '../core/Sections';
import * as View from '../core/View';
import * as Work from '../core/Work';

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

/**
 * L'entrée qui pose une langue — ou la phrase qui explique pourquoi on ne peut pas.
 *
 * À l'intérieur d'un bloc prédéfini, une section de bloc disloquerait la structure du bloc : seule
 * une sélection de texte peut y être marquée. Plutôt qu'une entrée qui ne ferait rien, le menu dit
 * ce qu'il faut faire — c'est la seule chose utile à savoir à cet instant.
 */
const settingItems = (editor: Editor): Menu.NestedMenuItemContents[] =>
  Scope.resolve(editor).fold<Menu.NestedMenuItemContents[]>(
    () => [
      {
        type: 'menuitem',
        text: 'Sélectionnez du texte pour lui donner une langue',
        enabled: false,
        onAction: Fun.noop
      }
    ],
    () => [
      {
        type: 'nestedmenuitem',
        text: targetLabel(editor),
        getSubmenuItems: () => languageItems(editor)
      }
    ]
  );

/**
 * Les entrées du mode de travail.
 *
 * Il est présenté à part de l'aperçu visiteur, et nommé autrement, parce qu'il ne fait pas la
 * même chose : l'aperçu **montre**, celui-ci **écrit**. Confondre les deux, c'est croire qu'on
 * relit alors qu'on est en train de marquer tout ce qu'on ajoute.
 */
const workItems = (editor: Editor): Menu.ToggleMenuItemSpec[] => {
  const working = Work.current(editor);

  const none: Menu.ToggleMenuItemSpec = {
    type: 'togglemenuitem',
    text: 'Écrire dans toutes les langues',
    active: working === '',
    onAction: () => editor.execCommand('OnlcWorkInLanguage', false, '')
  };

  return [ none ].concat(Arr.map(Languages.list(editor), (language): Menu.ToggleMenuItemSpec => ({
    type: 'togglemenuitem',
    text: language.label,
    active: working === language.code,
    onAction: () => editor.execCommand('OnlcWorkInLanguage', false, language.code)
  })));
};

const fetchItems = (editor: Editor): Menu.NestedMenuItemContents[] => {
  const inside = Sections.getSelected(editor).isSome();

  const setting = settingItems(editor);

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
      text: 'Travailler dans une seule langue',
      getSubmenuItems: () => workItems(editor)
    },
    {
      type: 'nestedmenuitem',
      text: 'Afficher comme un visiteur',
      getSubmenuItems: () => viewItems(editor)
    }
  ];

  return setting.concat(completing, viewing);
};

const register = (editor: Editor): void => {
  BlockKinds.declare(editor, {
    id: 'onlcmultilang',
    label: 'Section de langue',
    icon: KindIcons.language,
    order: 28,
    match: (target, element) => target.dom.hasClass(element, Dom.blockClass)
  });

  /**
   * Le mode de rédaction, dans la barre d'outils.
   *
   * Il vivait au troisième niveau du menu des langues — « Langues › Travailler dans une seule
   * langue › Français » — c'est-à-dire nulle part : personne ne trouve un mode de travail à trois
   * crans de profondeur. Il a donc son propre bouton, qui **porte le nom de la langue en cours**
   * et s'allume quand le mode est ouvert. On voit ainsi du premier coup d'œil qu'on n'écrit pas
   * dans toutes les langues, ce qui est l'essentiel : sans cela, on cherche un paragraphe qu'on
   * croit perdu.
   */
  editor.ui.registry.addMenuButton('onlcmultilangwork', {
    icon: 'language',
    tooltip: 'Travailler dans une seule langue',
    text: '',
    fetch: (callback) => callback(workItems(editor)),
    onSetup: (api) => {
      const refresh = () => {
        const code = Work.current(editor);
        api.setActive(code !== '');
        api.setText(code === '' ? '' : Languages.displayOf(editor, code));
      };
      refresh();
      editor.on('NodeChange SetContent', refresh);
      return () => editor.off('NodeChange SetContent', refresh);
    }
  });

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
  settingItems,
  languageItems,
  viewItems,
  workItems,
  fetchItems,
  register
};
