import { Arr, Fun, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import { ShortcodeDefinition, ShortcodeValues } from '../../api/ShortcodeTypes';
import * as Icons from './Icons';
import * as Parse from './Parse';
import * as Shortcodes from './Shortcodes';

/**
 * Représentation d'un code court dans la zone d'édition.
 *
 * Un code court est illisible tel quel : `[MenuSite type="ul" classparent="nav navbar-nav" …]`
 * ne dit rien à personne. Il est donc remplacé par une carte — un dessin, un nom, une phrase
 * d'explication et un résumé des réglages — que l'on déplace, duplique et supprime comme un
 * bloc ordinaire.
 *
 * ```html
 * <span class="onlc-shortcode" data-onlc-shortcode="MenuSite"
 *       data-onlc-shortcode-raw="%5BMenuSite%20type%3D%22ul%22…%5D" contenteditable="false">…</span>
 * ```
 *
 * Le texte d'origine voyage avec la carte : à l'enregistrement, il est réécrit **à l'identique**,
 * y compris pour un code que le plugin ne connaît pas.
 *
 * Le conteneur est un `<span>` mis en `display: flex` par la feuille de styles : il se comporte
 * comme un bloc pour l'espace de travail, tout en restant valide à l'intérieur d'un paragraphe.
 */

export const blockClass = 'onlc-shortcode';
export const nameAttribute = 'data-onlc-shortcode';
export const rawAttribute = 'data-onlc-shortcode-raw';

const encode = (value: string): string => encodeURIComponent(value);

const decode = (value: string | null): string => {
  if (!Type.isString(value) || value === '') {
    return '';
  }
  try {
    return decodeURIComponent(value);
  } catch (_err) {
    return value;
  }
};

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const selector = `span.${blockClass}`;

/** Carte affichée à la place du code. */
const toHtml = (definition: Optional<ShortcodeDefinition>, parsed: Parse.ParsedShortcode): string => {
  const label = definition.fold(() => parsed.name, (found) => found.label);
  const description = definition.fold(
    Fun.constant('Code non reconnu : il sera réécrit tel quel dans la page.'),
    (found) => found.description
  );
  const icon = definition.fold(() => Icons.code, (found) => found.icon);

  const summary = definition.bind((found) => Type.isFunction(found.summary)
    ? Optional.some(found.summary(Parse.toValues(found, Optional.some(parsed))))
    : Optional.none<string>()).getOr('');

  const summaryMarkup = summary === ''
    ? ''
    : `<span class="${blockClass}__summary">${escape(summary)}</span>`;

  return `<span class="${blockClass}"` +
    ` ${nameAttribute}="${escape(parsed.name)}"` +
    ` ${rawAttribute}="${escape(encode(parsed.raw))}"` +
    ` contenteditable="false">` +
    `<span class="${blockClass}__icon">${icon}</span>` +
    `<span class="${blockClass}__body">` +
    `<span class="${blockClass}__label">${escape(label)}</span>` +
    `<span class="${blockClass}__description">${escape(description)}</span>` +
    summaryMarkup +
    `</span></span>`;
};

/** Carte construite à partir d'une définition et des valeurs saisies. */
const fromValues = (definition: ShortcodeDefinition, values: ShortcodeValues, content?: string): string => {
  const raw = Parse.build(definition, values, content);
  const parsed = Arr.head(Parse.findAll(raw)).getOrThunk(() => ({
    raw, name: definition.name, attributes: {}, flags: [], positional: [], content: '', start: 0, end: raw.length
  }));
  return toHtml(Optional.some(definition), parsed);
};

const isBlock = (editor: Editor, node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && editor.dom.is(node, selector);

const getSelected = (editor: Editor): Optional<HTMLElement> =>
  Optional.from(editor.dom.getParent<HTMLElement>(editor.selection.getNode(), selector));

const rawOf = (editor: Editor, element: HTMLElement): string =>
  decode(editor.dom.getAttrib(element, rawAttribute));

const parsedOf = (editor: Editor, element: HTMLElement): Optional<Parse.ParsedShortcode> =>
  Arr.head(Parse.findAll(rawOf(editor, element)));

const definitionOf = (editor: Editor, element: HTMLElement): Optional<ShortcodeDefinition> =>
  Shortcodes.find(editor, editor.dom.getAttrib(element, nameAttribute));

const insert = (editor: Editor, definition: ShortcodeDefinition, values: ShortcodeValues): void => {
  editor.undoManager.transact(() => {
    editor.insertContent(fromValues(definition, values));
  });
  editor.nodeChanged();
};

const update = (editor: Editor, element: HTMLElement, definition: ShortcodeDefinition, values: ShortcodeValues): void => {
  editor.undoManager.transact(() => {
    editor.dom.setOuterHTML(element, fromValues(definition, values));
  });
  editor.nodeChanged();
};

const remove = (editor: Editor, element: HTMLElement): void => {
  editor.undoManager.transact(() => {
    editor.dom.remove(element);
  });
  editor.nodeChanged();
};

const duplicate = (editor: Editor, element: HTMLElement): void => {
  editor.undoManager.transact(() => {
    const copy = element.cloneNode(true) as HTMLElement;
    element.parentNode?.insertBefore(copy, element.nextSibling);
  });
  editor.nodeChanged();
};

export {
  selector,
  encode,
  decode,
  escape,
  toHtml,
  fromValues,
  isBlock,
  getSelected,
  rawOf,
  parsedOf,
  definitionOf,
  insert,
  update,
  remove,
  duplicate
};
