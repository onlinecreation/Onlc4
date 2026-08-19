import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as Destroy from 'hugerte/plugins/onlcshared/ui/Destroy';

import { ShortcodeDefinition, ShortcodeField, ShortcodeValues } from '../api/Types';
import * as Dom from '../core/Dom';
import * as Parse from '../core/Parse';
import * as Timezones from '../core/Timezones';

/**
 * Formulaire d'un code court, construit à partir de sa définition.
 *
 * Chaque champ porte son intitulé en français et, quand le réglage n'est pas évident, une
 * phrase qui explique à quoi il sert : la personne qui remplit ce formulaire n'a pas à savoir
 * qu'il existe un code court derrière.
 */

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const help = (field: ShortcodeField): Dialog.BodyComponentSpec[] =>
  Type.isString(field.help)
    ? [ { type: 'htmlpanel', html: `<p class="onlc-shortcode-help">${escape(field.help)}</p>`, presets: 'presentation' } as Dialog.HtmlPanelSpec ]
    : [];

const toItem = (field: ShortcodeField): Dialog.BodyComponentSpec => {
  switch (field.type) {
    case 'textarea':
      return { type: 'textarea', name: field.name, label: field.label, placeholder: field.placeholder };
    case 'select':
      return { type: 'listbox', name: field.name, label: field.label, items: field.items ?? [] };
    case 'timezone':
      return { type: 'listbox', name: field.name, label: field.label, items: Timezones.items() };
    case 'url':
      return { type: 'urlinput', name: field.name, label: field.label, filetype: 'file' };
    case 'number':
      return { type: 'input', name: field.name, label: field.label, inputMode: 'decimal', placeholder: field.placeholder };
    case 'date':
      return { type: 'input', name: field.name, label: field.label, placeholder: field.placeholder ?? 'AAAA-MM-JJ' };
    case 'time':
      return { type: 'input', name: field.name, label: field.label, placeholder: field.placeholder ?? 'HH:MM' };
    case 'email':
      return { type: 'input', name: field.name, label: field.label, inputMode: 'email', placeholder: field.placeholder };
    default:
      return { type: 'input', name: field.name, label: field.label, placeholder: field.placeholder };
  }
};

/** Deux champs de demi-largeur se placent côte à côte, les autres occupent toute la ligne. */
const layout = (fields: ShortcodeField[]): Dialog.BodyComponentSpec[] => {
  const items: Dialog.BodyComponentSpec[] = [];
  let pending: ShortcodeField[] = [];

  const flush = () => {
    if (pending.length === 2) {
      items.push({ type: 'grid', columns: 2, items: Arr.map(pending, toItem) });
      Arr.each(pending, (field) => Arr.each(help(field), (note) => items.push(note)));
    } else if (pending.length === 1) {
      items.push(toItem(pending[0]));
      Arr.each(help(pending[0]), (note) => items.push(note));
    }
    pending = [];
  };

  Arr.each(fields, (field) => {
    if (field.half === true) {
      pending.push(field);
      if (pending.length === 2) {
        flush();
      }
    } else {
      flush();
      items.push(toItem(field));
      Arr.each(help(field), (note) => items.push(note));
    }
  });

  flush();
  return items;
};

const bodyOf = (definition: ShortcodeDefinition): Dialog.PanelSpec => {
  const items: Dialog.BodyComponentSpec[] = [
    { type: 'htmlpanel', html: `<p class="onlc-shortcode-intro">${escape(definition.description)}</p>`, presets: 'presentation' }
  ];

  const positional = definition.positional ?? [];
  if (positional.length > 0) {
    Arr.each(layout(positional), (item) => items.push(item));
  }

  Arr.each(layout(definition.fields), (item) => items.push(item));

  const flags = definition.flags ?? [];
  if (flags.length > 0) {
    items.push({
      type: 'htmlpanel',
      html: '<p class="onlc-shortcode-help">Cochez les réseaux à proposer. Si vous n’en cochez aucun, tous seront affichés.</p>',
      presets: 'presentation'
    } as Dialog.HtmlPanelSpec);
    items.push({
      type: 'grid',
      columns: 2,
      items: Arr.map(flags, (flag) => ({ type: 'checkbox', name: flag.name, label: flag.label } as Dialog.BodyComponentSpec))
    });
  }

  return { type: 'panel', items };
};

const toDialogData = (definition: ShortcodeDefinition, values: ShortcodeValues): Record<string, unknown> => {
  const data: Record<string, unknown> = {};

  Arr.each((definition.positional ?? []).concat(definition.fields), (field) => {
    const value = values[field.name] ?? '';
    data[field.name] = field.type === 'url' ? { value, meta: {}} : value;
  });

  Arr.each(definition.flags ?? [], (flag) => {
    data[flag.name] = values[flag.name] === 'true';
  });

  return data;
};

const fromDialogData = (definition: ShortcodeDefinition, data: Record<string, unknown>): ShortcodeValues => {
  const values: Record<string, string> = {};

  Arr.each((definition.positional ?? []).concat(definition.fields), (field) => {
    const value = data[field.name];
    values[field.name] = Type.isObject(value) && Object.prototype.hasOwnProperty.call(value, 'value')
      ? String((value as { value: string }).value ?? '')
      : String(value ?? '');
  });

  Arr.each(definition.flags ?? [], (flag) => {
    values[flag.name] = data[flag.name] === true ? 'true' : 'false';
  });

  return values;
};

const open = (editor: Editor, definition: ShortcodeDefinition, element: Optional<HTMLElement>): void => {
  const parsed = element.bind((elm) => Dom.parsedOf(editor, elm));
  const values = Parse.toValues(definition, parsed);

  const buttons: Dialog.DialogFooterButtonSpec[] = [
    { type: 'cancel', name: 'cancel', text: 'Annuler' }
  ];

  element.each(() => {
    buttons.push({ type: 'custom', name: 'remove', text: 'Supprimer' });
  });

  buttons.push({ type: 'submit', name: 'save', text: element.isSome() ? 'Mettre à jour' : 'Insérer', primary: true });

  editor.windowManager.open<Record<string, unknown>>({
    title: definition.label,
    size: 'large',
    body: bodyOf(definition),
    initialData: toDialogData(definition, values),
    buttons,
    onAction: (api, details) => {
      if (details.name === 'remove') {
        element.each((elm) => Destroy.open(editor, {
          what: `${editor.translate('l’élément')} « ${editor.translate(definition.label)} »`,
          onConfirm: () => {
            Dom.remove(editor, elm);
            api.close();
          }
        }));
      }
    },
    onSubmit: (api) => {
      const updated = fromDialogData(definition, api.getData());
      element.fold(
        () => Dom.insert(editor, definition, updated),
        (elm) => Dom.update(editor, elm, definition, updated)
      );
      api.close();
    }
  });
};

export {
  toItem,
  layout,
  bodyOf,
  toDialogData,
  fromDialogData,
  open
};
