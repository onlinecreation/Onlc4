import { Arr, Obj, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Anchors from './Anchors';
import * as LinkApi from './LinkApi';
import { LinkAttributes, LinkContext, LinkListGroup, LinkListItem, LinkListOption } from './LinkTypes';
import * as LinkOptions from './Options';

/**
 * The link section is used as is by the link plugin, by the media plugin (image links) and by
 * the blocks plugin, so that a link is always configured the same way: a predefined link coming
 * from the site api, a custom url or an anchor of the current page, plus a target and a rel.
 */

export const fields = {
  url: 'onlc_link_url',
  predefined: 'onlc_link_predefined',
  anchor: 'onlc_link_anchor',
  title: 'onlc_link_title_attr',
  target: 'onlc_link_target',
  rel: 'onlc_link_rel',
  cls: 'onlc_link_class'
};

export interface LinkFieldValues {
  readonly [key: string]: unknown;
}

const emptyItem = (text: string): LinkListItem => ({ text, value: '' });

const readString = (data: LinkFieldValues, name: string): string => {
  const value = data[name];
  if (Type.isString(value)) {
    return value;
  } else if (Type.isObject(value) && Type.isString((value as Dialog.UrlInputData).value)) {
    return (value as Dialog.UrlInputData).value;
  } else {
    return '';
  }
};

const collectContext = (editor: Editor): Promise<LinkContext> =>
  LinkApi.getLinks(editor).then((links) => ({
    links,
    anchors: LinkOptions.useAnchors(editor) ? Anchors.getAnchors(editor) : []
  }));

const isGroup = (option: LinkListOption): option is LinkListGroup => Type.isArray((option as LinkListGroup).items);

const hasOption = (options: LinkListOption[], value: string): boolean =>
  Arr.exists(options, (option) =>
    isGroup(option)
      ? Arr.exists(option.items, (item) => item.value === value)
      : option.value === value);

/**
 * Builds the dialog items of the link section.
 */
const getItems = (editor: Editor, context: LinkContext): Dialog.BodyComponentSpec[] => {
  const items: Dialog.BodyComponentSpec[] = [];

  if (context.links.length > 0) {
    items.push({
      type: 'listbox',
      name: fields.predefined,
      label: 'Lien du site',
      items: ([ emptyItem('— Personnalisé —') ] as Dialog.ListBoxItemSpec[]).concat(context.links as Dialog.ListBoxItemSpec[])
    });
  }

  items.push({
    type: 'urlinput',
    name: fields.url,
    filetype: 'file',
    label: 'Adresse du lien'
  });

  if (context.anchors.length > 0) {
    items.push({
      type: 'listbox',
      name: fields.anchor,
      label: 'Ancre dans la page',
      items: [ emptyItem('— Aucune —') ].concat(context.anchors)
    });
  }

  items.push({
    type: 'input',
    name: fields.title,
    label: 'Titre du lien'
  });

  items.push({
    type: 'grid',
    columns: 2,
    items: [
      {
        type: 'listbox',
        name: fields.target,
        label: 'Ouvrir dans',
        items: LinkOptions.getTargetList(editor)
      },
      {
        type: 'listbox',
        name: fields.rel,
        label: 'Relation (rel)',
        items: LinkOptions.getRelList(editor)
      }
    ]
  });

  const classList = LinkOptions.getClassList(editor);
  if (classList.length > 0) {
    items.push({
      type: 'listbox',
      name: fields.cls,
      label: 'Style du lien',
      items: [ emptyItem('— Aucun —') ].concat(classList)
    });
  }

  return items;
};

const hasPredefinedField = (context: LinkContext): boolean => context.links.length > 0;
const hasAnchorField = (context: LinkContext): boolean => context.anchors.length > 0;
const hasClassField = (editor: Editor): boolean => LinkOptions.getClassList(editor).length > 0;

const getInitialData = (editor: Editor, context: LinkContext, attributes: Partial<LinkAttributes>): Record<string, unknown> => {
  const href = attributes.href ?? '';
  return {
    [fields.url]: { value: href, meta: {}},
    ...(hasPredefinedField(context) ? { [fields.predefined]: hasOption(context.links, href) ? href : '' } : {}),
    ...(hasAnchorField(context) ? { [fields.anchor]: Arr.exists(context.anchors, (anchor) => anchor.value === href) ? href : '' } : {}),
    [fields.title]: attributes.title ?? '',
    [fields.target]: attributes.target ?? LinkOptions.getDefaultTarget(editor),
    [fields.rel]: attributes.rel ?? LinkOptions.getDefaultRel(editor),
    ...(hasClassField(editor) ? { [fields.cls]: attributes.classes ?? '' } : {})
  };
};

/**
 * Keeps the url field in sync when a predefined link or an anchor is picked. Call it from the
 * `onChange` handler of the dialog.
 */
const onChange = (context: LinkContext) => (api: Dialog.DialogInstanceApi<any>, details: { name: string | number | symbol }): void => {
  const data = api.getData() as LinkFieldValues;
  const name = String(details.name);

  if (name === fields.predefined || name === fields.anchor) {
    const value = readString(data, name);
    if (value !== '') {
      const isPredefined = name === fields.predefined;
      const clearedName = isPredefined ? fields.anchor : fields.predefined;
      const hasCleared = isPredefined ? hasAnchorField(context) : hasPredefinedField(context);
      const other = hasCleared ? { [clearedName]: '' } : {};
      api.setData({ [fields.url]: { value, meta: {}}, ...other });
    }
  } else if (name === fields.url) {
    // Typing an address by hand keeps the two lists in sync instead of showing a stale selection
    const url = readString(data, fields.url);
    const patch: Record<string, unknown> = {};
    const predefined = hasOption(context.links, url) ? url : '';
    const anchor = Arr.exists(context.anchors, (item) => item.value === url) ? url : '';

    if (hasPredefinedField(context) && readString(data, fields.predefined) !== predefined) {
      patch[fields.predefined] = predefined;
    }
    if (hasAnchorField(context) && readString(data, fields.anchor) !== anchor) {
      patch[fields.anchor] = anchor;
    }
    if (Obj.keys(patch).length > 0) {
      api.setData(patch);
    }
  }
};

const toAttributes = (data: LinkFieldValues): LinkAttributes => ({
  href: readString(data, fields.url).trim(),
  title: readString(data, fields.title).trim(),
  target: readString(data, fields.target),
  rel: readString(data, fields.rel),
  classes: readString(data, fields.cls)
});

export {
  collectContext,
  getItems,
  getInitialData,
  onChange,
  toAttributes,
  readString
};
