import { Arr, Obj, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { WidgetConfig, WidgetDefinition } from '../api/Types';
import * as Assets from './Assets';
import * as Widgets from './Widgets';

/**
 * Reading and writing the predefined blocks in the document. A block keeps its configuration in
 * a data attribute, which is what makes it editable again later on.
 */

export const idAttribute = 'data-onlc-widget';
export const configAttribute = 'data-onlc-widget-config';
export const slotAttribute = 'data-onlc-slot';
export const staticClass = 'onlc-widget__static';

const encode = (config: WidgetConfig): string => encodeURIComponent(JSON.stringify(config));

const decode = (value: string | null): WidgetConfig => {
  if (!Type.isString(value) || value === '') {
    return {};
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return Type.isObject(parsed) ? parsed as WidgetConfig : {};
  } catch (_err) {
    return {};
  }
};

const blockSelector = (editor: Editor): string => `.${Options.getClassPrefix(editor)}[${idAttribute}]`;

/** Markup publié : c'est lui qui fait foi à l'enregistrement. */
const renderPublished = (definition: WidgetDefinition, config: WidgetConfig): string =>
  Assets.withAssets(definition, config, definition.render(config));

/** Aperçu affiché dans l'éditeur, identique au markup publié quand le bloc n'en propose pas. */
const renderEditing = (definition: WidgetDefinition, config: WidgetConfig): string =>
  Type.isFunction(definition.renderEditor) ? definition.renderEditor(config) : definition.render(config);

const toHtml = (editor: Editor, definition: WidgetDefinition, config: WidgetConfig): string => {
  const prefix = Options.getClassPrefix(editor);
  const full = Widgets.withDefaults(definition, config);
  return `<div class="${prefix} ${prefix}--${definition.id}" ${idAttribute}="${definition.id}" ` +
    `${configAttribute}="${encode(full)}">${renderEditing(definition, full)}</div>`;
};

const readConfig = (editor: Editor, element: HTMLElement): WidgetConfig =>
  decode(editor.dom.getAttrib(element, configAttribute));

const getDefinition = (editor: Editor, element: HTMLElement): Optional<WidgetDefinition> =>
  Widgets.find(editor, editor.dom.getAttrib(element, idAttribute));

const isWidget = (editor: Editor, node: Node | null): node is HTMLElement =>
  Type.isNonNullable(node) && editor.dom.is(node, blockSelector(editor));

const getSelected = (editor: Editor): Optional<HTMLElement> =>
  Optional.from(editor.dom.getParent<HTMLElement>(editor.selection.getNode(), blockSelector(editor)));

const listAll = (editor: Editor): HTMLElement[] =>
  editor.dom.select(blockSelector(editor), editor.getBody());

/** Text of a slot, so that an edit made directly in the page is reflected in the dialog. */
const slotToText = (element: HTMLElement): string =>
  element.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const getSlots = (editor: Editor, element: HTMLElement): Record<string, HTMLElement> => {
  const slots: Record<string, HTMLElement> = {};
  Arr.each(editor.dom.select(`[${slotAttribute}]`, element), (slot) => {
    slots[editor.dom.getAttrib(slot, slotAttribute)] = slot;
  });
  return slots;
};

/**
 * Refreshes a configuration with what the user typed directly inside the block, so that opening
 * the dialog never shows an outdated value.
 */
const syncFromSlots = (editor: Editor, element: HTMLElement, config: WidgetConfig): WidgetConfig => {
  const merged: Record<string, string> = { ...config };
  Obj.each(getSlots(editor, element), (slot, name) => {
    if (Obj.has(merged, name)) {
      merged[name] = slotToText(slot);
    }
  });
  return merged;
};

const insert = (editor: Editor, definition: WidgetDefinition, config: WidgetConfig): void => {
  editor.undoManager.transact(() => {
    editor.insertContent(toHtml(editor, definition, config));
  });
  editor.nodeChanged();
};

/**
 * Replaces a block by its new rendering. The content of the slots whose field did not change is
 * kept, so that formatting applied in the page survives an edit made in the dialog.
 */
const update = (editor: Editor, element: HTMLElement, definition: WidgetDefinition, config: WidgetConfig): void => {
  const previous = Widgets.withDefaults(definition, readConfig(editor, element));
  const merged = Widgets.withDefaults(definition, config);
  const oldSlots = getSlots(editor, element);

  const replacement = editor.dom.create('div');
  replacement.innerHTML = toHtml(editor, definition, merged);
  const block = replacement.firstChild as HTMLElement;

  Obj.each(getSlots(editor, block), (slot, name) => {
    const kept = oldSlots[name];
    if (Type.isNonNullable(kept) && previous[name] === merged[name]) {
      slot.innerHTML = kept.innerHTML;
    }
  });

  editor.undoManager.transact(() => {
    editor.dom.replace(block, element);
  });
  editor.selection.select(block);
  editor.nodeChanged();
};

const remove = (editor: Editor, element: HTMLElement): void => {
  editor.undoManager.transact(() => {
    editor.dom.remove(element);
  });
  editor.nodeChanged();
};

/** Raw html of a `html` widget, restored when the content is serialized. */
const rawCodeOf = (config: WidgetConfig): string => Type.isString(config.code) ? config.code : '';

export {
  encode,
  decode,
  toHtml,
  renderPublished,
  renderEditing,
  readConfig,
  getDefinition,
  isWidget,
  getSelected,
  listAll,
  blockSelector,
  slotToText,
  getSlots,
  syncFromSlots,
  insert,
  update,
  remove,
  rawCodeOf
};
