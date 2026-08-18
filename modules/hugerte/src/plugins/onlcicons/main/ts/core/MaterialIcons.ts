import { Arr, Fun, Optional, Singleton, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import * as Http from 'hugerte/plugins/onlcshared/Http';

import * as Options from '../api/Options';
import { materialIcons, RawMaterialIcon } from './IconsData';

export interface IconEntry {
  readonly name: string;
  readonly title: string;
  readonly keywords: string[];
  readonly category: string;
}

interface RemoteIcon {
  readonly name?: string;
  readonly keywords?: string[] | string;
  readonly category?: string;
}

export interface IconDatabase {
  readonly listAll: () => IconEntry[];
  readonly listCategory: (category: string) => IconEntry[];
  readonly listCategories: () => string[];
  readonly hasLoaded: () => boolean;
  readonly waitForLoad: () => Promise<boolean>;
}

const ALL_CATEGORY = 'Toutes';
const CUSTOM_CATEGORY = 'Personnalisées';

const toKeywords = (keywords: string[] | string | undefined): string[] => {
  if (Type.isArray(keywords)) {
    return keywords;
  } else if (Type.isString(keywords)) {
    return keywords.split(/[\s,]+/);
  } else {
    return [];
  }
};

const toTitle = (name: string): string => name.replace(/_/g, ' ');

const fromRaw = (raw: RawMaterialIcon): IconEntry => ({
  name: raw.name,
  title: toTitle(raw.name),
  keywords: toKeywords(raw.keywords).concat(raw.name.split('_')),
  category: raw.category
});

const fromRemote = (raw: RemoteIcon | string): Optional<IconEntry> => {
  const name = Type.isString(raw) ? raw : raw.name;
  if (!Type.isString(name) || name.length === 0) {
    return Optional.none();
  }
  const category = Type.isString(raw) ? CUSTOM_CATEGORY : (raw.category ?? CUSTOM_CATEGORY);
  const keywords = Type.isString(raw) ? [] : toKeywords(raw.keywords);
  return Optional.some({
    name,
    title: toTitle(name),
    keywords: keywords.concat(name.split('_')),
    category
  });
};

const loadRemote = (editor: Editor): Promise<IconEntry[]> => {
  const url = Options.getMaterialUrl(editor);
  if (url === '') {
    return Promise.resolve([]);
  }

  return Http.request<{ icons?: Array<RemoteIcon | string> } | Array<RemoteIcon | string>>({ url })
    .then((response) => {
      const raws = Type.isArray(response) ? response : response.icons;
      const list = Type.isArray(raws) ? raws : [];
      return Arr.bind(list, (raw) => fromRemote(raw).toArray());
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[onlc] Impossible de charger la liste des icônes :', err);
      return [];
    });
};

const dedupe = (entries: IconEntry[]): IconEntry[] => {
  const seen: Record<string, boolean> = {};
  return Arr.filter(entries, (entry) => {
    if (seen[entry.name] === true) {
      return false;
    }
    seen[entry.name] = true;
    return true;
  });
};

/**
 * The icon list is the bundled subset - unless `onlc_icons_builtin` is off - extended by the
 * remote list and by the `onlc_icons_material_append` option.
 */
const initDatabase = (editor: Editor): IconDatabase => {
  const state = Singleton.value<IconEntry[]>();

  const appended = Arr.bind(Options.getAppendedIcons(editor), (entry) => fromRemote(entry as RemoteIcon).toArray());
  const bundled = Options.useBuiltinIcons(editor) ? Arr.map(materialIcons, fromRaw) : [];

  // The bundled icons are usable straight away, remote ones are merged in when they arrive
  state.set(dedupe(appended.concat(bundled)));

  const loaded = loadRemote(editor).then((remote) => {
    state.set(dedupe(appended.concat(bundled).concat(remote)));
    return true;
  });

  const listAll = (): IconEntry[] => state.get().getOr([]);

  const listCategories = (): string[] =>
    [ ALL_CATEGORY ].concat(Arr.foldl(listAll(), (acc: string[], entry) =>
      Arr.contains(acc, entry.category) ? acc : acc.concat([ entry.category ]), []));

  const listCategory = (category: string): IconEntry[] =>
    category === ALL_CATEGORY ? listAll() : Arr.filter(listAll(), (entry) => entry.category === category);

  return {
    listAll,
    listCategory,
    listCategories,
    hasLoaded: () => state.isSet(),
    waitForLoad: Fun.constant(loaded)
  };
};

export {
  ALL_CATEGORY,
  CUSTOM_CATEGORY,
  initDatabase,
  toTitle
};
