import { Arr, Optional, Throttler } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as Cards from 'hugerte/plugins/onlcshared/ui/Cards';

import * as Shortcodes from '../core/Shortcodes';
import * as ShortcodeDialog from './ShortcodeDialog';

/**
 * Bibliothèque des codes courts : une carte par code, avec son dessin, son nom et ce qu'il fait.
 * Personne n'a à retenir la syntaxe exacte d'un code pour s'en servir.
 */

interface PickerData {
  readonly pattern: string;
  readonly items: Dialog.CollectionItem[];
}

const allCategory = 'Tous';

const normalize = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const matching = (editor: Editor, category: string, pattern: string): Dialog.CollectionItem[] => {
  const needle = normalize(pattern.trim());
  const entries = Arr.filter(Shortcodes.list(editor), (definition) =>
    category === allCategory || definition.category === category);

  const filtered = needle === '' ? entries : Arr.filter(entries, (definition) =>
    normalize(`${definition.label} ${definition.description} ${definition.name} ${definition.category}`).indexOf(needle) !== -1);

  return Arr.map(filtered, (definition) => ({
    value: definition.name,
    text: definition.label,
    icon: Cards.render(editor, {
      icon: definition.icon,
      label: definition.label,
      description: definition.description
    })
  }));
};

const open = (editor: Editor): void => {
  Cards.ensureStyles(editor);

  let currentTab = allCategory;

  const refresh = Throttler.last((api: Dialog.DialogInstanceApi<PickerData>) => {
    api.setData({ items: matching(editor, currentTab, api.getData().pattern) });
  }, 150);

  const tabItems: Dialog.BodyComponentSpec[] = [
    { type: 'input', name: 'pattern', label: 'Rechercher', placeholder: 'menu, contact, partage…' },
    { type: 'collection', name: 'items', label: 'Choisissez l’élément à insérer' }
  ];

  const body: Dialog.TabPanelSpec = {
    type: 'tabpanel',
    tabs: Arr.map([ allCategory ].concat(Shortcodes.categories(editor)), (category) => ({
      title: category,
      name: category,
      items: tabItems
    }))
  };

  editor.windowManager.open<PickerData>({
    title: 'Éléments du site',
    size: 'large',
    body,
    initialData: { pattern: '', items: matching(editor, allCategory, '') },
    onTabChange: (api, details) => {
      currentTab = details.newTabName;
      refresh.throttle(api);
    },
    onChange: (api) => refresh.throttle(api),
    onAction: (api, details) => {
      if (details.name === 'items') {
        api.close();
        Shortcodes.find(editor, String(details.value)).each((definition) => {
          ShortcodeDialog.open(editor, definition, Optional.none());
        });
      }
    },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Fermer', primary: true }
    ]
  }).focus('pattern');
};

export {
  matching,
  open
};
