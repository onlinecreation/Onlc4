import { Arr, Optional, Throttler } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as Cards from 'hugerte/plugins/onlcshared/ui/Cards';

import * as Shortcodes from '../core/shortcodes/Shortcodes';
import * as Widgets from '../core/Widgets';
import * as ShortcodeDialog from './shortcodes/ShortcodeDialog';
import * as WidgetDialog from './WidgetDialog';

/**
 * Bibliothèque unique : blocs prédéfinis **et** éléments du site, dans la même fenêtre.
 *
 * Un bandeau Hero et un menu de site sont deux choses différentes pour le programme — l'un est
 * un bloc html, l'autre un code que le serveur remplace — mais la même pour le rédacteur : un
 * élément qu'on choisit dans une liste et qu'on règle dans un formulaire. Les faire chercher
 * dans deux bibliothèques séparées revenait à lui demander de connaître cette distinction.
 *
 * Les deux catalogues n'ont aucune catégorie en commun : les onglets se juxtaposent donc sans
 * ambiguïté. La valeur d'une carte porte son origine — `shortcode:` pour un élément du site,
 * `command:` pour un outil qui a sa propre fenêtre, l'identifiant seul pour un bloc.
 */

interface PickerData {
  readonly pattern: string;
  readonly items: Dialog.CollectionItem[];
}

const allCategory = 'Tous';

const normalize = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface Entry {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
  readonly icon: string;
}

/** Les deux catalogues, dans l'ordre où ils s'affichent. */
const allEntries = (editor: Editor): Entry[] =>
  (Widgets.entries(editor) as Entry[]).concat(
    Arr.map(Shortcodes.list(editor), (definition) => ({
      id: `shortcode:${definition.name}`,
      label: definition.label,
      description: definition.description,
      category: definition.category,
      icon: definition.icon
    })));

const categoriesOf = (editor: Editor): string[] =>
  Widgets.categories(editor).concat(
    Arr.filter(Shortcodes.categories(editor), (category) =>
      !Arr.contains(Widgets.categories(editor), category)));

const matching = (editor: Editor, category: string, pattern: string): Dialog.CollectionItem[] => {
  const needle = normalize(pattern.trim());
  const entries = Arr.filter(allEntries(editor), (entry) =>
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

  if (id.indexOf('shortcode:') === 0) {
    Shortcodes.find(editor, id.substring('shortcode:'.length)).each((definition) => {
      ShortcodeDialog.open(editor, definition, Optional.none());
    });
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
    { type: 'input', name: 'pattern', label: 'Rechercher', placeholder: 'Bouton, vidéo, menu, contact…' },
    { type: 'collection', name: 'items', label: 'Choisissez l’élément à insérer' }
  ];

  const body: Dialog.TabPanelSpec = {
    type: 'tabpanel',
    tabs: Arr.map([ allCategory ].concat(categoriesOf(editor)), (category) => ({
      title: category,
      name: category,
      items: tabItems
    }))
  };

  editor.windowManager.open<PickerData>({
    title: 'Blocs et éléments',
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
  allEntries,
  categoriesOf,
  matching,
  choose,
  open
};
