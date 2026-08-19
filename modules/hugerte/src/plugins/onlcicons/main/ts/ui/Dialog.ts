import { Arr, Cell, Optional, Throttler } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import * as EmojiDatabase from '../core/EmojiDatabase';
import * as IconDatabase from '../core/IconDatabase';
import * as Insert from '../core/Insert';
import * as OpenMoji from '../core/OpenMoji';
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

const styleId = 'onlc-icons-picker-styles';

/**
 * Les vignettes du thème font 24 pixels et la grille est plafonnée à 208 pixels de haut : sur un
 * écran tactile on vise à côté, et on ne voit qu'une poignée de symboles à la fois. Chaque
 * vignette passe donc à 64 × 64 pixels — au-delà du minimum de 50 recommandé au doigt — le
 * dessin à 34 pixels, et la grille occupe toute la hauteur disponible.
 */
const styles = `
/* Le reset du thème (.tox :not(svg):not(rect)) impose \`font-family: inherit\` avec une
   spécificité de (0,1,2) : les classes des polices d'icônes, à (0,1,0), perdent contre lui et
   les icônes s'affichent alors sous forme de mots. Ces règles reprennent la main. */
.tox .tox-dialog .material-icons { font-family: "Material Icons", sans-serif; font-weight: normal; font-style: normal; letter-spacing: normal; text-transform: none; font-feature-settings: "liga"; }
.tox .tox-dialog .fa-solid, .tox .tox-dialog .fa-regular, .tox .tox-dialog .fas, .tox .tox-dialog .far { font-family: "Font Awesome 6 Free", sans-serif; font-style: normal; }
.tox .tox-dialog .fa-brands, .tox .tox-dialog .fab { font-family: "Font Awesome 6 Brands", sans-serif; font-style: normal; font-weight: 400; }
.tox .tox-dialog .fa-solid, .tox .tox-dialog .fas { font-weight: 900; }
.tox .tox-dialog .fa-regular, .tox .tox-dialog .far { font-weight: 400; }
.tox .tox-collection--grid .tox-collection__group.onlc-symbols { display: flex; flex-wrap: wrap; gap: 4px; max-height: none; padding: 4px; }
.tox .onlc-symbols .tox-collection__item { flex: 0 0 auto; width: 64px; height: 64px; padding: 4px; border-radius: 8px; }
.tox .onlc-symbols .tox-collection__item-icon { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 30px; line-height: 1; }
.tox .onlc-symbols .tox-collection__item-icon img { width: 34px; height: 34px; object-fit: contain; }
.tox .onlc-symbols .tox-collection__item-icon .material-icons { font-size: 30px; }
.tox .onlc-symbols .tox-collection__item-icon i { font-size: 28px; }
.tox .onlc-symbols .tox-collection__item--active { background: #eef4fd; outline: 2px solid #006ce7; }
.tox .onlc-symbols-hint { margin: 0 0 6px; font-size: 12px; color: #5a6570; }
`;

const injectStyles = (editor: Editor): void => {
  const doc = editor.getContainer()?.ownerDocument ?? document;
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

/**
 * Les grilles du thème n'acceptent pas de classe : le marqueur est posé après l'ouverture, sur
 * les groupes de la fenêtre courante.
 */
const markGrids = (editor: Editor): void => {
  const doc = editor.getContainer()?.ownerDocument ?? document;
  window.setTimeout(() => {
    Arr.each(Array.from(doc.querySelectorAll('.tox-dialog .tox-collection--grid .tox-collection__group')), (group) => {
      group.classList.add('onlc-symbols');
    });
  }, 0);
};

const toEmojiItems = (editor: Editor, index: OpenMoji.OpenMojiIndex, entries: EmojiDatabase.EmojiEntry[]): CollectionItem[] =>
  Arr.map(entries, (entry) => ({
    value: entry.char,
    text: entry.title.replace(/_/g, ' '),
    icon: index.fileOf(entry.char).fold(
      () => editor.dom.encode(entry.char),
      (file) => `<img src="${editor.dom.encode(OpenMoji.urlOf(editor, file))}" alt="${editor.dom.encode(entry.char)}" loading="lazy">`
    )
  }));

const toIconItems = (editor: Editor, entries: IconDatabase.IconEntry[]): CollectionItem[] =>
  Arr.map(entries, (entry) => ({
    value: `${entry.family}:${entry.style ?? ''}:${entry.name}`,
    text: entry.title,
    icon: Insert.toHtml(editor, entry)
  }));

const categoryItems = (categories: string[]): Dialog.ListBoxItemSpec[] =>
  Arr.map(categories, (category) => ({ text: category, value: category }));

/** Retrouve l'entrée de catalogue depuis la valeur portée par la vignette. */
const entryOf = (icons: IconDatabase.IconDatabase, value: string): Optional<IconDatabase.IconEntry> => {
  const parts = value.split(':');
  const name = parts.slice(2).join(':');
  return Arr.find(icons.listAll(), (entry) =>
    entry.name === name && entry.family === parts[0] && (entry.style ?? '') === parts[1]);
};

const open = (
  editor: Editor,
  emojis: EmojiDatabase.EmojiDatabase,
  icons: IconDatabase.IconDatabase,
  index: OpenMoji.OpenMojiIndex,
  initialTab: string
): void => {
  injectStyles(editor);

  const limit = Optional.some(Options.getResultsLimit(editor));
  const currentTab = Cell(initialTab);

  const emojiCategories = () => emojis.listCategories();
  const iconCategories = () => icons.listCategories();

  const computeEmoji = (pattern: string, category: string): CollectionItem[] =>
    toEmojiItems(editor, index, Search.search(emojis.listCategory(category), pattern, limit));

  const computeIcons = (pattern: string, category: string): CollectionItem[] =>
    toIconItems(editor, Search.search(icons.listCategory(category), pattern, limit));

  const refresh = (api: Dialog.DialogInstanceApi<IconsDialogData>) => {
    const data = api.getData();
    if (currentTab.get() === emojiTab) {
      api.setData({ emoji_results: computeEmoji(data.emoji_pattern, data.emoji_category) });
    } else {
      api.setData({ icon_results: computeIcons(data.icon_pattern, data.icon_category) });
    }
    markGrids(editor);
  };

  const throttledRefresh = Throttler.last((api: Dialog.DialogInstanceApi<IconsDialogData>) => refresh(api), 150);

  const searchField = (name: string, placeholder: string): Dialog.BodyComponentSpec => ({
    type: 'input',
    name,
    label: 'Rechercher',
    placeholder
  });

  const hint = (text: string): Dialog.BodyComponentSpec => ({
    type: 'htmlpanel',
    html: `<p class="onlc-symbols-hint">${editor.dom.encode(text)}</p>`,
    presets: 'presentation'
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
            hint('Cliquez sur un emoji pour l’insérer. Les dessins sont ceux d’OpenMoji : ils s’affichent de la même façon sur tous les appareils.'),
            searchField('emoji_pattern', 'sourire, cœur, drapeau…'),
            { type: 'listbox', name: 'emoji_category', label: 'Catégorie', items: categoryItems(emojiCategories()) },
            { type: 'collection', name: 'emoji_results' }
          ]
        },
        {
          title: 'Icônes',
          name: iconTab,
          items: [
            hint('Cliquez sur une icône pour l’insérer. Elle prend la taille et la couleur du texte qui l’entoure.'),
            searchField('icon_pattern', 'panier, téléphone, flèche…'),
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
      icon_category: IconDatabase.ALL_CATEGORY,
      icon_results: computeIcons('', IconDatabase.ALL_CATEGORY)
    },
    onTabChange: (api, details) => {
      currentTab.set(details.newTabName);
      throttledRefresh.throttle(api);
    },
    onChange: (api) => throttledRefresh.throttle(api),
    onAction: (api, details) => {
      if (details.name === 'emoji_results') {
        Insert.insertEmoji(editor, details.value as string, index);
        api.close();
      } else if (details.name === 'icon_results') {
        entryOf(icons, details.value as string).each((entry) => Insert.insertEntry(editor, entry));
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
  markGrids(editor);

  // The emoji database is loaded asynchronously, the dialog is refreshed as soon as it lands
  const pending = [ emojis.hasLoaded() ? Promise.resolve(true) : emojis.waitForLoad(),
    index.hasLoaded() ? Promise.resolve(true) : index.waitForLoad() ];

  if (!emojis.hasLoaded() || !index.hasLoaded()) {
    Promise.all(pending).then(() => {
      api.redial(spec());
      api.showTab(currentTab.get());
      api.focus(focusField);
      markGrids(editor);
    });
  }
};

export {
  emojiTab,
  iconTab,
  entryOf,
  open
};
