import { Arr, Strings, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import { LinkListItem } from './LinkTypes';

const isInternalId = (id: string): boolean => Strings.startsWith(id, 'mce_') || Strings.startsWith(id, 'mce-');

const label = (element: Element, id: string): string => {
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length === 0 ? `#${id}` : `${text.substring(0, 60)} (#${id})`;
};

/**
 * Every element carrying an id, plus the legacy `<a name="...">` anchors, can be targeted
 * from a link inside the same page.
 */
const getAnchors = (editor: Editor): LinkListItem[] => {
  const body = editor.getBody();
  if (!Type.isNonNullable(body)) {
    return [];
  }

  const elements = editor.dom.select('[id], a[name]', body);
  const items = Arr.bind(elements, (element) => {
    const id = editor.dom.getAttrib(element, 'id') || editor.dom.getAttrib(element, 'name');
    return id === '' || isInternalId(id) ? [] : [{ text: label(element, id), value: `#${id}` }];
  });

  // Keep the first occurrence of every anchor
  return Arr.foldl(items, (acc: LinkListItem[], item) =>
    Arr.exists(acc, (existing) => existing.value === item.value) ? acc : acc.concat([ item ]), []);
};

export {
  getAnchors
};
