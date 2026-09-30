import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Http from '../Http';
import { LinkListEntry, LinkListItem, LinkListOption } from './LinkTypes';
import * as LinkOptions from './Options';

interface LinkListResponse {
  readonly items?: LinkListEntry[];
}

const cache = new WeakMap<Editor, Promise<LinkListOption[]>>();

const entryUrl = (entry: LinkListEntry): string => entry.url ?? entry.value ?? '';

const entryChildren = (entry: LinkListEntry): LinkListEntry[] | undefined => entry.menu ?? entry.children;

/**
 * Turns the api payload into listbox items. One level of nesting is kept as an option group,
 * deeper levels are flattened with a `parent › child` label so that no entry gets lost.
 */
const toOptions = (entries: LinkListEntry[]): LinkListOption[] => {
  const flatten = (entry: LinkListEntry, prefix: string): LinkListItem[] => {
    const label = prefix === '' ? entry.title : `${prefix} › ${entry.title}`;
    const children = entryChildren(entry);
    const self: LinkListItem[] = entryUrl(entry) === '' ? [] : [{ text: label, value: entryUrl(entry) }];
    return Type.isArray(children)
      ? self.concat(Arr.bind(children, (child) => flatten(child, label)))
      : self;
  };

  return Arr.bind(entries, (entry) => {
    const children = entryChildren(entry);
    if (Type.isArray(children) && children.length > 0) {
      const items = Arr.bind(children, (child) => flatten(child, ''));
      const own: LinkListItem[] = entryUrl(entry) === '' ? [] : [{ text: entry.title, value: entryUrl(entry) }];
      return [ { text: entry.title, items: own.concat(items) } as LinkListOption ];
    } else {
      return flatten(entry, '');
    }
  });
};

const fromCallbackOption = (setting: (callback: (items: LinkListEntry[]) => void) => void): Promise<LinkListEntry[]> =>
  new Promise((resolve) => {
    setting((items) => resolve(Type.isArray(items) ? items : []));
  });

const fromUrl = (editor: Editor, url: string): Promise<LinkListEntry[]> =>
  Http.request<LinkListResponse | LinkListEntry[]>({
    url,
    headers: LinkOptions.getApiHeaders(editor),
    credentials: LinkOptions.getApiCredentials(editor)
  }).then((response) => {
    if (Type.isArray(response)) {
      return response;
    }
    return Type.isArray(response.items) ? response.items : [];
  });

const fromSetting = (editor: Editor): Promise<LinkListEntry[]> => {
  const setting = LinkOptions.getLinkList(editor);
  if (setting === false) {
    return Promise.resolve([]);
  } else if (Type.isString(setting)) {
    return fromUrl(editor, setting);
  } else if (Type.isArray(setting)) {
    return Promise.resolve(setting);
  } else if (Type.isFunction(setting)) {
    return fromCallbackOption(setting);
  } else {
    return Promise.resolve([]);
  }
};

const fromApi = (editor: Editor): Promise<LinkListEntry[]> => {
  const url = LinkOptions.getApiUrl(editor);
  return url === '' ? Promise.resolve([]) : fromUrl(editor, url);
};

const load = (editor: Editor): Promise<LinkListOption[]> =>
  Promise.all([ fromApi(editor), fromSetting(editor) ])
    .then(([ apiEntries, settingEntries ]) => toOptions(apiEntries.concat(settingEntries)))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[onlc] Impossible de charger la liste des liens :', err);
      return [];
    });

/**
 * Loads the predefined links once per editor instance.
 */
const getLinks = (editor: Editor): Promise<LinkListOption[]> => {
  const cached = cache.get(editor);
  if (Type.isNonNullable(cached)) {
    return cached;
  }
  const promise = load(editor);
  cache.set(editor, promise);
  editor.once('remove', () => cache.delete(editor));
  return promise;
};

const invalidate = (editor: Editor): void => {
  cache.delete(editor);
};

export {
  toOptions,
  getLinks,
  invalidate
};
