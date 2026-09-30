import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { ScriptData } from '../api/Types';
import * as Excerpt from './Excerpt';
import * as Highlight from './Highlight';

/**
 * Scripts never live as real `<script>` elements inside the editable area: they are shown as a
 * chip carrying their serialized definition, and turned back into a `<script>` tag when the
 * content is read. Nothing can therefore be executed while editing.
 */

export const placeholderClass = 'onlc-script';
export const dataAttribute = 'data-onlc-script';

const emptyData = (editor: Editor): ScriptData => ({
  code: '',
  src: '',
  type: Options.getScriptType(editor),
  async: false,
  defer: false,
  position: 'inline'
});

const encode = (data: ScriptData): string => encodeURIComponent(JSON.stringify(data));

const decode = (editor: Editor, value: string | null): ScriptData => {
  if (!Type.isString(value) || value === '') {
    return emptyData(editor);
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<ScriptData>;
    return { ...emptyData(editor), ...parsed };
  } catch (_err) {
    return emptyData(editor);
  }
};

const label = (data: ScriptData): string => {
  if (data.src !== '') {
    const name = data.src.split(/[?#]/)[0].split('/').filter((part) => part !== '').pop();
    return name ?? data.src;
  }
  const firstLine = data.code.split('\n').find((line) => line.trim() !== '') ?? '';
  return firstLine.trim().substring(0, 60) || 'script vide';
};

/**
 * Jeton affiché à la place du script pendant l'édition. Il montre les trois premières lignes du
 * code et une ligne « … » quand il en reste : de quoi reconnaître le script d'un coup d'œil
 * sans ouvrir le dialogue, et sans jamais l'exécuter.
 */
const toPlaceholderHtml = (editor: Editor, data: ScriptData): string => {
  const kind = data.src === '' ? 'JS' : 'SRC';
  const heading = data.src === '' ? 'Script JavaScript' : label(data);
  const body = data.src === ''
    ? Excerpt.text(data.code)
    : data.src;
  const shown = body.trim() === '' ? 'script vide' : body;

  return `<span class="${placeholderClass}" ${dataAttribute}="${encode(data)}" contenteditable="false">` +
    `<span class="${placeholderClass}__head">` +
    `<span class="${placeholderClass}__badge">${kind}</span>` +
    `<span class="${placeholderClass}__title">${Highlight.escape(heading)}</span></span>` +
    `<span class="${placeholderClass}__code">${Highlight.escape(shown)}</span></span>`;
};

const attributeString = (data: ScriptData): string => {
  const attributes = [ `type="${Highlight.escape(data.type)}"` ];
  if (data.src !== '') {
    attributes.push(`src="${Highlight.escape(data.src)}"`);
  }
  if (data.async) {
    attributes.push('async');
  }
  if (data.defer) {
    attributes.push('defer');
  }
  if (data.position !== 'inline') {
    attributes.push(`data-onlc-position="${Highlight.escape(data.position)}"`);
  }
  return attributes.join(' ');
};

const toScriptHtml = (data: ScriptData): string =>
  `<script ${attributeString(data)}>${data.src === '' ? data.code : ''}<\/script>`;

const isPlaceholder = (editor: Editor, node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && editor.dom.is(node, `.${placeholderClass}`);

const getSelected = (editor: Editor): Optional<HTMLElement> => {
  const node = editor.selection.getNode();
  const placeholder = editor.dom.getParent<HTMLElement>(node, `.${placeholderClass}`);
  return Optional.from(placeholder);
};

const read = (editor: Editor, element: HTMLElement): ScriptData =>
  decode(editor, editor.dom.getAttrib(element, dataAttribute));

const insert = (editor: Editor, data: ScriptData): void => {
  editor.undoManager.transact(() => {
    editor.insertContent(toPlaceholderHtml(editor, data));
  });
  editor.nodeChanged();
};

const update = (editor: Editor, element: HTMLElement, data: ScriptData): void => {
  editor.undoManager.transact(() => {
    editor.dom.setOuterHTML(element, toPlaceholderHtml(editor, data));
  });
  editor.nodeChanged();
};

const remove = (editor: Editor, element: HTMLElement): void => {
  editor.undoManager.transact(() => {
    editor.dom.remove(element);
  });
  editor.nodeChanged();
};

export {
  emptyData,
  encode,
  decode,
  label,
  toPlaceholderHtml,
  toScriptHtml,
  attributeString,
  isPlaceholder,
  getSelected,
  read,
  insert,
  update,
  remove
};
