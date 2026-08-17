import { Arr, Merger, Obj, Optional, Singleton } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import Resource from 'hugerte/core/api/Resource';

import * as Options from '../api/Options';

export interface RawEmojiEntry {
  readonly keywords: string[];
  readonly char: string;
  readonly category: string;
}

export interface EmojiEntry {
  readonly title: string;
  readonly char: string;
  readonly keywords: string[];
  readonly category: string;
}

export interface EmojiDatabase {
  readonly listAll: () => EmojiEntry[];
  readonly listCategory: (category: string) => EmojiEntry[];
  readonly listCategories: () => string[];
  readonly hasLoaded: () => boolean;
  readonly waitForLoad: () => Promise<boolean>;
}

const ALL_CATEGORY = 'Tous';

const categoryNames: Record<string, string> = {
  symbols: 'Symboles',
  people: 'Personnes',
  animals_and_nature: 'Animaux et nature',
  food_and_drink: 'Nourriture et boissons',
  activity: 'Activités',
  travel_and_places: 'Voyages et lieux',
  objects: 'Objets',
  flags: 'Drapeaux',
  user: 'Personnalisés'
};

const translateCategory = (name: string): string => Obj.has(categoryNames, name) ? categoryNames[name] : name;

const getUserDefinedEmoji = (editor: Editor): Record<string, RawEmojiEntry> =>
  Obj.map(Options.getAppendedEmoji(editor), (value) => ({ keywords: [], category: 'user', ...value }));

/**
 * Loads the Unicode emoji database - the very same database as the emoticons plugin, generated
 * from the emojilib package by the `grunt emoji` task.
 */
const initDatabase = (editor: Editor): EmojiDatabase => {
  const all = Singleton.value<EmojiEntry[]>();
  const categories = Singleton.value<Record<string, EmojiEntry[]>>();

  const databaseUrl = Options.getEmojiDatabaseUrl(editor);
  const databaseId = Options.getEmojiDatabaseId(editor);

  const process = (emojis: Record<string, RawEmojiEntry>) => {
    const grouped: Record<string, EmojiEntry[]> = {};
    const everything: EmojiEntry[] = [];

    Obj.each(emojis, (raw, title) => {
      const entry: EmojiEntry = {
        title,
        char: raw.char,
        keywords: Arr.map(raw.keywords ?? [], (keyword) => keyword).concat(title.split('_')),
        category: translateCategory(raw.category)
      };
      grouped[entry.category] = (grouped[entry.category] ?? []).concat([ entry ]);
      everything.push(entry);
    });

    categories.set(grouped);
    all.set(everything);
  };

  const loaded = new Promise<boolean>((resolve) => {
    editor.on('init', () => {
      Resource.load(databaseId, databaseUrl).then((emojis: Record<string, RawEmojiEntry>) => {
        process(Merger.merge(emojis, getUserDefinedEmoji(editor)));
        resolve(true);
      }, (err) => {
        // eslint-disable-next-line no-console
        console.warn(`[onlc] Impossible de charger la base d'emojis (${databaseUrl}) :`, err);
        process(getUserDefinedEmoji(editor));
        resolve(false);
      });
    });
  });

  const listAll = (): EmojiEntry[] => all.get().getOr([]);

  const listCategory = (category: string): EmojiEntry[] =>
    category === ALL_CATEGORY
      ? listAll()
      : categories.get().bind((cats) => Optional.from(cats[category])).getOr([]);

  const listCategories = (): string[] => [ ALL_CATEGORY ].concat(Obj.keys(categories.get().getOr({})));

  return {
    listAll,
    listCategory,
    listCategories,
    hasLoaded: () => all.isSet(),
    waitForLoad: () => loaded
  };
};

export {
  ALL_CATEGORY,
  initDatabase
};
