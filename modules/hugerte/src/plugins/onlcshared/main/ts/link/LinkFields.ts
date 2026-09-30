import { Arr, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as ClassField from '../ui/ClassField';
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
  cls: 'onlc_link_class',
  classes: 'onlc_link_classes',
  style: 'onlc_link_style',
  click: 'onlc_link_click'
};

/**
 * Les trois sortes de lien, et comment on passe de l'une à l'autre.
 *
 * Un lien mène **soit** à une page du site, **soit** à une ancre de la page courante, **soit** à
 * une adresse écrite à la main. Ces trois cas ne se mélangent jamais, et montrer les trois champs
 * ensemble revenait à demander au rédacteur de deviner lequel comptait : il en remplissait deux,
 * et l'un écrasait l'autre en silence.
 *
 * Une seule liste les propose donc, et le champ correspondant n'apparaît qu'ensuite. Les valeurs
 * sentinelles portent des soulignés doubles pour ne pouvoir se confondre avec l'adresse d'une
 * page.
 */
export const kinds = {
  custom: '__personnalise__',
  anchor: '__ancres__'
};

/** Ce que la liste de gauche vaut, pour un lien donné. */
const kindOf = (context: LinkContext, href: string): string => {
  if (href !== '' && hasOptionIn(context.links, href)) {
    return href;
  }
  if (href.indexOf('#') === 0 || Arr.exists(context.anchors, (anchor) => anchor.value === href)) {
    return kinds.anchor;
  }
  return kinds.custom;
};

export interface LinkFieldValues {
  readonly [key: string]: unknown;
}

const emptyItem = (text: string): LinkListItem => ({ text, value: '' });

const isGroupOption = (option: LinkListOption): option is LinkListGroup =>
  Type.isArray((option as LinkListGroup).items);

const hasOptionIn = (options: LinkListOption[], value: string): boolean =>
  Arr.exists(options, (option) =>
    isGroupOption(option)
      ? Arr.exists(option.items, (item) => item.value === value)
      : option.value === value);

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

/**
 * Builds the dialog items of the link section.
 */
/**
 * Les champs de la section « lien », pour la sorte de lien choisie.
 *
 * `kind` décide de ce qui s'affiche : rien de plus qu'une liste de pages pour un lien interne, le
 * champ d'adresse pour un lien personnalisé, la liste des ancres pour une ancre de la page. Le
 * dialogue rappelle `getItems` et se redessine à chaque changement de sorte.
 */
const getItems = (editor: Editor, context: LinkContext, kind: string): Dialog.BodyComponentSpec[] => {
  const items: Dialog.BodyComponentSpec[] = [];

  const choix: Dialog.ListBoxItemSpec[] = ([
    { text: 'Personnalisé (adresse)', value: kinds.custom }
  ] as Dialog.ListBoxItemSpec[])
    .concat(context.anchors.length > 0 ? [{ text: 'Page actuelle (ancres)', value: kinds.anchor }] : [])
    .concat(context.links as Dialog.ListBoxItemSpec[]);

  items.push({
    type: 'listbox',
    name: fields.predefined,
    label: context.links.length > 0 ? 'Pages du site' : 'Sorte de lien',
    items: choix
  });

  if (kind === kinds.custom) {
    items.push({
      type: 'urlinput',
      name: fields.url,
      filetype: 'file',
      label: 'Adresse du lien'
    });
  }

  if (kind === kinds.anchor && context.anchors.length > 0) {
    items.push({
      type: 'listbox',
      name: fields.anchor,
      label: 'Ancre dans la page',
      items: [ emptyItem('— Choisir une ancre —') ].concat(context.anchors)
    });
  }

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

/**
 * L'onglet « Avancé » : ce qu'un intégrateur règle, et qu'un rédacteur ne voit jamais.
 *
 * Le titre est la bulle d'aide au survol, lue à voix haute par les lecteurs d'écran. Les classes
 * et le style habillent le lien sans passer par la feuille du site. L'action au clic est du
 * javascript, et **ne s'exécute pas** dans la zone d'écriture : elle voyage dans un attribut de
 * données jusqu'à l'enregistrement.
 */
const getAdvancedItems = (editor: Editor): Dialog.BodyComponentSpec[] => [
  {
    type: 'input',
    name: fields.title,
    label: 'Titre du lien (bulle d’aide au survol)'
  },
  {
    type: 'label',
    label: 'Classes CSS',
    items: [ ClassField.field(editor, fields.classes, { extra: ClassField.inPage(editor) }) ]
  },
  {
    type: 'textarea',
    name: fields.style,
    label: 'Style CSS écrit à même le lien',
    placeholder: 'color: #c0392b; font-weight: 600'
  },
  {
    type: 'textarea',
    name: fields.click,
    label: 'Action javascript au clic',
    placeholder: 'return confirm(\'Quitter la page ?\')'
  },
  {
    type: 'htmlpanel',
    presets: 'document',
    html: '<p>L’action au clic devient l’attribut <code>onclick</code> du lien à l’enregistrement. ' +
      'Elle ne s’exécute jamais pendant que vous écrivez.</p>'
  }
];

const hasClassField = (editor: Editor): boolean => LinkOptions.getClassList(editor).length > 0;

const getInitialData = (editor: Editor, context: LinkContext, attributes: Partial<LinkAttributes>): Record<string, unknown> => {
  const href = attributes.href ?? '';
  const kind = kindOf(context, href);
  return {
    [fields.predefined]: kind,
    [fields.url]: { value: kind === kinds.custom ? href : '', meta: {}},
    [fields.anchor]: kind === kinds.anchor ? href : '',
    [fields.title]: attributes.title ?? '',
    [fields.target]: attributes.target ?? LinkOptions.getDefaultTarget(editor),
    [fields.rel]: attributes.rel ?? LinkOptions.getDefaultRel(editor),
    [fields.classes]: attributes.classes ?? '',
    [fields.style]: attributes.style ?? '',
    [fields.click]: attributes.click ?? '',
    ...(hasClassField(editor) ? { [fields.cls]: attributes.classes ?? '' } : {})
  };
};

/**
 * La sorte de lien vient-elle de changer ?
 *
 * Le dialogue s'en sert pour se redessiner : les champs d'une sorte de lien ne sont pas ceux
 * d'une autre. Il n'y a plus rien à synchroniser entre eux — un seul champ porte l'adresse à la
 * fois, et c'est la liste de gauche qui dit lequel.
 */
const isKindChange = (name: string | number | symbol): boolean => String(name) === fields.predefined;

/**
 * L'adresse retenue, selon la sorte de lien choisie.
 *
 * C'est la liste de gauche qui fait foi : elle porte soit une page du site, soit l'une des deux
 * sentinelles, et le champ correspondant donne alors la valeur. Sans cette règle, une adresse
 * restée dans un champ masqué écrasait la page qu'on venait de choisir.
 */
const hrefOf = (data: LinkFieldValues): string => {
  const kind = readString(data, fields.predefined);
  if (kind === kinds.custom) {
    return readString(data, fields.url).trim();
  }
  if (kind === kinds.anchor) {
    return readString(data, fields.anchor).trim();
  }
  return kind.trim();
};

const toAttributes = (data: LinkFieldValues): LinkAttributes => {
  // Les classes viennent de l'onglet avancé ; la liste « Style du lien », quand le projet en
  // propose une, ajoute la sienne à celles qui étaient déjà là.
  const libres = readString(data, fields.classes).trim();
  const choisie = readString(data, fields.cls).trim();
  // Les noms sont revalidés ici, et pas seulement à la saisie : ce qui atteint l'attribut ne doit
  // dépendre d'aucun composant d'interface, si soigneux soit-il.
  const toutes = Arr.unique(Arr.filter(ClassField.split(`${libres} ${choisie}`), ClassField.isValidName));

  return {
    href: hrefOf(data),
    title: readString(data, fields.title).trim(),
    target: readString(data, fields.target),
    rel: readString(data, fields.rel),
    classes: toutes.join(' '),
    style: readString(data, fields.style).trim(),
    click: readString(data, fields.click).trim()
  };
};

export {
  collectContext,
  getItems,
  getAdvancedItems,
  getInitialData,
  isKindChange,
  kindOf,
  toAttributes,
  readString
};
