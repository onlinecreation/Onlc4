import { Arr, Optional, Throttler } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as Cards from 'hugerte/plugins/onlcshared/ui/Cards';

import * as Widgets from '../core/Widgets';
import * as WidgetDialog from './WidgetDialog';

/**
 * Library of the predefined blocks: one tab per category, a search field and a grid of blocks.
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
  const entries = Arr.filter(Widgets.entries(editor), (entry) =>
    category === allCategory || entry.category === category);

  const filtered = needle === '' ? entries : Arr.filter(entries, (entry) =>
    normalize(`${entry.label} ${entry.description} ${entry.category}`).indexOf(needle) !== -1);

  // La « vignette » porte toute la carte : nom du bloc et explication de son usage
  return Arr.map(filtered, (entry) => ({
    value: entry.id,
    text: entry.label,
    icon: Cards.render(editor, { icon: entry.icon, label: entry.label, description: entry.description })
  }));
};

const choose = (editor: Editor, id: string): void => {
  if (id.indexOf('command:') === 0) {
    editor.execCommand(id.substring('command:'.length));
    return;
  }

  Widgets.find(editor, id).each((definition) => {
    WidgetDialog.open(editor, definition, Optional.none());
  });
};

const open = (editor: Editor): void => {
  Cards.ensureStyles(editor);

  let currentTab = allCategory;

  const refresh = Throttler.last((api: Dialog.DialogInstanceApi<PickerData>) => {
    api.setData({ items: matching(editor, currentTab, api.getData().pattern) });
  }, 150);

  const tabItems: Dialog.BodyComponentSpec[] = [
    { type: 'input', name: 'pattern', label: 'Rechercher un bloc', placeholder: 'Bouton, vidéo, carte…' },
    { type: 'collection', name: 'items', label: 'Choisissez le bloc à insérer' }
  ];

  const body: Dialog.TabPanelSpec = {
    type: 'tabpanel',
    tabs: Arr.map([ allCategory ].concat(Widgets.categories(editor)), (category) => ({
      title: category,
      name: category,
      items: tabItems
    }))
  };

  editor.windowManager.open<PickerData>({
    title: 'Blocs prédéfinis',
    size: 'large',
    body,
    initialData: {
      pattern: '',
      items: matching(editor, allCategory, '')
    },
    onTabChange: (api, details) => {
      currentTab = details.newTabName;
      refresh.throttle(api);
    },
    onChange: (api) => refresh.throttle(api),
    onAction: (api, details) => {
      if (details.name === 'items') {
        api.close();
        choose(editor, String(details.value));
      }
    },
    buttons: [
      { type: 'cancel', name: 'cancel', text: 'Fermer', primary: true }
    ]
  }).focus('pattern');
};

export {
  matching,
  choose,
  open
};
