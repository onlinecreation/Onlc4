import { Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';

export interface SpacerSize {
  readonly value: number;
  readonly unit: string;
}

const sizeRegExp = /^\s*(-?[\d.]+)\s*([a-z%]*)\s*$/i;

const parseSize = (editor: Editor, raw: string | null | undefined): SpacerSize => {
  const fallback = () => parseSizeString(Options.getDefaultHeight(editor)).getOrThunk(() => ({ value: 30, unit: 'px' }));
  return Type.isString(raw) ? parseSizeString(raw).getOrThunk(fallback) : fallback();
};

const parseSizeString = (raw: string): Optional<SpacerSize> => {
  const matches = sizeRegExp.exec(raw);
  if (matches === null) {
    return Optional.none();
  }
  const value = parseFloat(matches[1]);
  return isNaN(value) ? Optional.none() : Optional.some({ value, unit: matches[2] === '' ? 'px' : matches[2] });
};

const sizeToString = (size: SpacerSize): string => `${size.value}${size.unit}`;

const isSpacer = (editor: Editor, node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && editor.dom.is(node, `.${Options.getSpacerClass(editor)}`);

const getSelectedSpacer = (editor: Editor): Optional<HTMLElement> => {
  const node = editor.selection.getNode();
  return isSpacer(editor, node) ? Optional.some(node) : Optional.none<HTMLElement>();
};

const getHeight = (editor: Editor, element: HTMLElement): SpacerSize =>
  parseSize(editor, editor.dom.getStyle(element, 'height') || editor.dom.getAttrib(element, 'data-onlc-spacer'));

const toHtml = (editor: Editor, size: SpacerSize): string => {
  const height = sizeToString(size);
  const cls = Options.getSpacerClass(editor);
  return `<div class="${cls}" data-onlc-spacer="${height}" style="height: ${height};" aria-hidden="true"></div>`;
};

const insert = (editor: Editor, size: SpacerSize): void => {
  editor.undoManager.transact(() => {
    editor.insertContent(toHtml(editor, size));
  });
  editor.nodeChanged();
};

const update = (editor: Editor, element: HTMLElement, size: SpacerSize): void => {
  const height = sizeToString(size);
  editor.undoManager.transact(() => {
    editor.dom.setStyle(element, 'height', height);
    editor.dom.setAttrib(element, 'data-onlc-spacer', height);
  });
  editor.nodeChanged();
};

const remove = (editor: Editor, element: HTMLElement): void => {
  editor.undoManager.transact(() => {
    editor.dom.remove(element);
  });
  editor.nodeChanged();
};

/**
 * Increases or decreases the height of a spacer by `onlc_spacer_step`, keeping the current unit.
 */
const grow = (editor: Editor, element: HTMLElement, direction: number): void => {
  const size = getHeight(editor, element);
  const step = Options.getStep(editor) * direction;
  const value = Math.max(1, size.value + (size.unit === 'px' ? step : Math.max(1, Math.round(step / 10))));
  update(editor, element, { value, unit: size.unit });
};

export {
  parseSize,
  parseSizeString,
  sizeToString,
  isSpacer,
  getSelectedSpacer,
  getHeight,
  toHtml,
  insert,
  update,
  remove,
  grow
};
