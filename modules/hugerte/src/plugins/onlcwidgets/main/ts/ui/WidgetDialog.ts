import { Arr, Obj, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';

import * as Options from '../api/Options';
import { WidgetConfig, WidgetDefinition, WidgetField } from '../api/Types';
import * as CodeEditor from '../core/CodeEditor';
import * as Html from '../core/Html';
import * as ListEditor from '../core/ListEditor';
import * as LocationEditor from '../core/LocationEditor';
import * as WidgetDom from '../core/WidgetDom';
import * as Widgets from '../core/Widgets';

/**
 * Form of a predefined block, built from the fields declared by its definition.
 */

const defaultTab = 'Général';

const isUrlField = (field: WidgetField): boolean =>
  field.type === 'url' || field.type === 'image' || field.type === 'file';

/** Les champs qui gèrent eux-mêmes leur affichage sont enveloppés dans un intitulé. */
const framed = (field: WidgetField, item: Dialog.BodyComponentSpec): Dialog.BodyComponentSpec => ({
  type: 'label',
  label: field.label,
  items: Type.isString(field.help)
    ? [ item, { type: 'htmlpanel', html: `<p class="onlc-field-help">${Html.escape(field.help)}</p>`, presets: 'presentation' } as Dialog.HtmlPanelSpec ]
    : [ item ]
});

const toItem = (editor: Editor, field: WidgetField): Dialog.BodyComponentSpec => {
  switch (field.type) {
    case 'textarea':
      return { type: 'textarea', name: field.name, label: field.label, placeholder: field.placeholder };
    case 'select':
      return { type: 'listbox', name: field.name, label: field.label, items: field.items ?? [] };
    case 'checkbox':
      return { type: 'checkbox', name: field.name, label: field.label };
    case 'color':
      return { type: 'colorinput', name: field.name, label: field.label };
    case 'code':
      return framed(field, CodeEditor.field(field.name, field.label, {
        language: field.language ?? 'html',
        tabSize: Options.getTabSize(editor),
        lineNumbers: Options.hasLineNumbers(editor)
      }));
    case 'images':
      return framed(field, ListEditor.field(editor, field.name, {
        columns: [
          { name: 'src', label: 'Adresse de l’image', type: 'text', grow: 3 },
          { name: 'title', label: 'Intitulé affiché', type: 'text', grow: 2 }
        ],
        addLabel: 'Ajouter des images…',
        emptyLabel: 'Aucune image pour l’instant. Cliquez sur « Ajouter des images… » pour en choisir.',
        picker: true,
        thumbnail: 'src'
      }));
    case 'events':
      return framed(field, ListEditor.field(editor, field.name, {
        columns: [
          { name: 'day', label: 'Jour du mois', type: 'number', grow: 1 },
          { name: 'time', label: 'Heure', type: 'time', grow: 1 },
          { name: 'label', label: 'Intitulé', type: 'text', grow: 4 }
        ],
        addLabel: 'Ajouter un rendez-vous',
        emptyLabel: 'Aucun rendez-vous pour ce mois. Ajoutez-en un pour le voir apparaître dans la grille.'
      }));
    case 'location':
      return framed(field, LocationEditor.field(editor, field.name));
    case 'month':
      return Type.isString(field.help)
        ? framed(field, { type: 'input', name: field.name, label: field.label, placeholder: field.placeholder ?? 'AAAA-MM' })
        : { type: 'input', name: field.name, label: field.label, placeholder: field.placeholder ?? 'AAAA-MM' };
    case 'url':
    case 'image':
    case 'file':
      return { type: 'urlinput', name: field.name, label: field.label, filetype: field.type === 'image' ? 'image' : 'file' };
    case 'number':
      return { type: 'input', name: field.name, label: field.label, inputMode: 'numeric', placeholder: field.placeholder };
    default:
      return { type: 'input', name: field.name, label: field.label, placeholder: field.placeholder };
  }
};

/** Pairs the fields flagged as half width two by two inside a grid. */
const layout = (editor: Editor, fields: WidgetField[]): Dialog.BodyComponentSpec[] => {
  const items: Dialog.BodyComponentSpec[] = [];
  let pending: WidgetField[] = [];

  const flush = () => {
    if (pending.length === 2) {
      items.push({ type: 'grid', columns: 2, items: Arr.map(pending, (field) => toItem(editor, field)) });
    } else if (pending.length === 1) {
      items.push(toItem(editor, pending[0]));
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
      items.push(toItem(editor, field));
    }
  });

  flush();
  return items;
};

const tabsOf = (definition: WidgetDefinition): string[] =>
  Arr.foldl(definition.fields, (acc: string[], field) => {
    const tab = field.tab ?? defaultTab;
    return Arr.contains(acc, tab) ? acc : acc.concat([ tab ]);
  }, []);

const bodyOf = (editor: Editor, definition: WidgetDefinition): Dialog.PanelSpec | Dialog.TabPanelSpec => {
  const tabs = tabsOf(definition);

  if (tabs.length <= 1) {
    return { type: 'panel', items: layout(editor, definition.fields) };
  }

  return {
    type: 'tabpanel',
    tabs: Arr.map(tabs, (tab) => ({
      title: tab,
      name: tab.toLowerCase().replace(/\W+/g, '-'),
      items: layout(editor, Arr.filter(definition.fields, (field) => (field.tab ?? defaultTab) === tab))
    }))
  };
};

const toDialogData = (definition: WidgetDefinition, config: WidgetConfig): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  Arr.each(definition.fields, (field) => {
    const value = config[field.name] ?? '';
    if (field.type === 'checkbox') {
      data[field.name] = value === 'true';
    } else if (isUrlField(field)) {
      data[field.name] = { value, meta: {}};
    } else {
      data[field.name] = value;
    }
  });
  return data;
};

const fromDialogData = (definition: WidgetDefinition, data: Record<string, unknown>): WidgetConfig => {
  const config: Record<string, string> = {};
  Arr.each(definition.fields, (field) => {
    const value = data[field.name];
    if (field.type === 'checkbox') {
      config[field.name] = value === true ? 'true' : 'false';
    } else if (Type.isObject(value) && Obj.has(value as Record<string, unknown>, 'value')) {
      config[field.name] = String((value as { value: string }).value ?? '');
    } else {
      config[field.name] = Type.isString(value) ? value : String(value ?? '');
    }
  });
  return config;
};

const open = (editor: Editor, definition: WidgetDefinition, element: Optional<HTMLElement>): void => {
  const stored = element.fold(
    () => ({} as WidgetConfig),
    (elm) => WidgetDom.syncFromSlots(editor, elm, WidgetDom.readConfig(editor, elm))
  );
  const config = Widgets.withDefaults(definition, stored);

  const buttons: Dialog.DialogFooterButtonSpec[] = [
    { type: 'cancel', name: 'cancel', text: 'Annuler' }
  ];

  element.each(() => {
    buttons.push({ type: 'custom', name: 'remove', text: 'Supprimer' });
  });

  buttons.push({ type: 'submit', name: 'save', text: element.isSome() ? 'Mettre à jour' : 'Insérer', primary: true });

  editor.windowManager.open<Record<string, unknown>>({
    title: definition.label,
    // Les formulaires de blocs comportent souvent une dizaine de réglages, parfois un éditeur
    // de code ou une carte : en taille normale, la moitié du contenu se retrouve hors du cadre.
    size: 'large',
    body: bodyOf(editor, definition),
    initialData: toDialogData(definition, config),
    buttons,
    onAction: (api, details) => {
      if (details.name === 'remove') {
        element.each((elm) => WidgetDom.remove(editor, elm));
        api.close();
      }
    },
    onSubmit: (api) => {
      const updated = fromDialogData(definition, api.getData());
      element.fold(
        () => WidgetDom.insert(editor, definition, updated),
        (elm) => WidgetDom.update(editor, elm, definition, updated)
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
