import { Arr, Cell, Optional, Throttler } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import * as EmojiDatabase from '../core/EmojiDatabase';
import * as Insert from '../core/Insert';
import * as MaterialIcons from '../core/MaterialIcons';
import * as Search from '../core/Search';

type CollectionItem = Dialog.CollectionItem;

interface IconsDialogData {
  readonly emoji_pattern: string;
  readonly emoji_category: string;
  readonly emoji_results: CollectionItem[];
  readonly icon_pattern: string;
  readonly icon_category: string;
  readonly icon_results: CollectionItem[];
}

const emojiTab = 'emojis';
const iconTab = 'icons';

const toEmojiItems = (entries: EmojiDatabase.EmojiEntry[]): CollectionItem[] =>
  Arr.map(entries, (entry) => ({ value: entry.char, text: entry.title.replace(/_/g, ' '), icon: entry.char }));

const toIconItems = (editor: Editor, entries: MaterialIcons.IconEntry[]): CollectionItem[] =>
  Arr.map(entries, (entry) => ({
    value: entry.name,
    text: entry.title,
    icon: Insert.toIconHtml(editor, entry.name)
  }));

const categoryItems = (categories: string[]): Dialog.ListBoxItemSpec[] =>
  Arr.map(categories, (category) => ({ text: category, value: category }));

const open = (
  editor: Editor,
  emojis: EmojiDatabase.EmojiDatabase,
  icons: MaterialIcons.IconDatabase,
  initialTab: string
): void => {
  const limit = Optional.some(Options.getResultsLimit(editor));
  const currentTab = Cell(initialTab);

  const emojiCategories = () => emojis.listCategories();
  const iconCategories = () => icons.listCategories();

  const computeEmoji = (pattern: string, category: string): CollectionItem[] =>
    toEmojiItems(Search.search(emojis.listCategory(category), pattern, limit));

  const computeIcons = (pattern: string, category: string): CollectionItem[] =>
    toIconItems(editor, Search.search(icons.listCategory(category), pattern, limit));

  const refresh = (api: Dialog.DialogInstanceApi<IconsDialogData>) => {
    const data = api.getData();
    if (currentTab.get() === emojiTab) {
      api.setData({ emoji_results: computeEmoji(data.emoji_pattern, data.emoji_category) });
    } else {
      api.setData({ icon_results: computeIcons(data.icon_pattern, data.icon_category) });
    }
  };

  const throttledRefresh = Throttler.last((api: Dialog.DialogInstanceApi<IconsDialogData>) => refresh(api), 150);

  const searchField = (name: string): Dialog.BodyComponentSpec => ({
    type: 'input',
    name,
    label: 'Rechercher',
    placeholder: 'Nom ou mot-clé'
  });

  const spec = (): Dialog.DialogSpec<IconsDialogData> => ({
    title: 'Emojis et icônes',
    size: 'large',
    body: {
      type: 'tabpanel',
      tabs: [
        {
          title: 'Emojis',
          name: emojiTab,
          items: [
            searchField('emoji_pattern'),
            { type: 'listbox', name: 'emoji_category', label: 'Catégorie', items: categoryItems(emojiCategories()) },
            { type: 'collection', name: 'emoji_results' }
          ]
        },
        {
          title: 'Icônes',
          name: iconTab,
          items: [
            searchField('icon_pattern'),
            { type: 'listbox', name: 'icon_category', label: 'Catégorie', items: categoryItems(iconCategories()) },
            { type: 'collection', name: 'icon_results' }
          ]
        }
      ]
    },
    initialData: {
      emoji_pattern: '',
      emoji_category: EmojiDatabase.ALL_CATEGORY,
      emoji_results: computeEmoji('', EmojiDatabase.ALL_CATEGORY),
      icon_pattern: '',
      icon_category: MaterialIcons.ALL_CATEGORY,
      icon_results: computeIcons('', MaterialIcons.ALL_CATEGORY)
    },
    onTabChange: (api, details) => {
      currentTab.set(details.newTabName);
      throttledRefresh.throttle(api);
    },
    onChange: (api) => throttledRefresh.throttle(api),
    onAction: (api, details) => {
      if (details.name === 'emoji_results') {
        Insert.insertEmoji(editor, details.value as string);
        api.close();
      } else if (details.name === 'icon_results') {
        Insert.insertIcon(editor, details.value as string);
        api.close();
      }
    },
    buttons: [
      { type: 'cancel', name: 'close', text: 'Fermer', primary: true }
    ]
  });

  const api = editor.windowManager.open(spec());
  const focusField = initialTab === emojiTab ? 'emoji_pattern' : 'icon_pattern';

  api.showTab(initialTab);
  api.focus(focusField);

  // The emoji database is loaded asynchronously, the dialog is refreshed as soon as it lands
  if (!emojis.hasLoaded()) {
    emojis.waitForLoad().then(() => {
      api.redial(spec());
      api.showTab(currentTab.get());
      api.focus(focusField);
    });
  }
};

export {
  emojiTab,
  iconTab,
  open
};
