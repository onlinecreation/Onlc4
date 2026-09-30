import { Arr, Obj, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { WidgetConfig, WidgetDefinition } from '../api/Types';
import * as WidgetsData from './WidgetsData';

/**
 * Registry of the predefined blocks: the built-in ones, the ones added through
 * `onlc_widgets_custom`, and the shortcuts to the other ONLC plugins when they are loaded.
 */

export interface WidgetEntry {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
  readonly icon: string;
  /** Set when choosing the entry runs an editor command instead of opening the widget form. */
  readonly command?: string;
}

const isValidDefinition = (value: unknown): value is WidgetDefinition => {
  const definition = value as WidgetDefinition;
  return Type.isObject(value) && Type.isString(definition.id) && Type.isFunction(definition.render);
};

/**
 * Built-in definitions first, then the project ones. A custom definition reusing an existing id
 * replaces the built-in block of the same name.
 */
const list = (editor: Editor): WidgetDefinition[] => {
  const custom = Arr.filter(Options.getCustomWidgets(editor), isValidDefinition);
  const excluded = Options.getExcludedWidgets(editor);
  const overridden = Arr.map(custom, (definition) => definition.id);

  const builtIns = Arr.filter(WidgetsData.getBuiltIns(editor), (definition) =>
    !Arr.contains(overridden, definition.id));

  return Arr.filter(builtIns.concat(custom), (definition) => !Arr.contains(excluded, definition.id));
};

const find = (editor: Editor, id: string): Optional<WidgetDefinition> =>
  Arr.find(list(editor), (definition) => definition.id === id);

/**
 * Shortcuts towards the dialogs of the other ONLC plugins, only shown when they are loaded.
 */
const commandEntries = (editor: Editor): WidgetEntry[] => {
  const entries: WidgetEntry[] = [];
  const has = (name: string) => Type.isNonNullable(editor.plugins[name]);

  if (has('onlcmedia')) {
    entries.push({
      id: 'command:OnlcImage',
      label: 'Image de la bibliothèque',
      description: 'Choisir un fichier dans l’explorateur de médias',
      category: 'Médias',
      icon: 'gallery',
      command: 'OnlcImage'
    });
  }

  // Pas d'entrée « Emoji ou icône » ici : un emoji est du texte, pas un bloc. Il s'insère par
  // le bouton de la barre d'outils ou par les compléments « : » et « :: », et le proposer une
  // troisième fois dans une bibliothèque de blocs ne faisait qu'ajouter un doublon.

  if (has('onlcspacer')) {
    entries.push({
      id: 'command:OnlcEditSpacer',
      label: 'Séparateur réglable',
      description: 'Ajouter un espace vertical de la hauteur de votre choix',
      category: 'Contenu',
      icon: 'line-height',
      command: 'OnlcEditSpacer'
    });
  }

  return entries;
};

const entries = (editor: Editor): WidgetEntry[] => {
  const widgets: WidgetEntry[] = Arr.map(list(editor), (definition) => ({
    id: definition.id,
    label: definition.label,
    description: definition.description ?? '',
    category: definition.category,
    icon: definition.icon
  }));
  return widgets.concat(commandEntries(editor));
};

const categories = (editor: Editor): string[] =>
  Arr.foldl(entries(editor), (acc: string[], entry) =>
    Arr.contains(acc, entry.category) ? acc : acc.concat([ entry.category ]), []);

/**
 * Completes a configuration with the default values of its definition, so that a renderer can
 * read every field without checking for undefined.
 */
const withDefaults = (definition: WidgetDefinition, config: WidgetConfig): WidgetConfig => {
  const merged: Record<string, string> = { ...definition.defaults };
  Arr.each(definition.fields, (field) => {
    if (!Obj.has(merged, field.name)) {
      merged[field.name] = '';
    }
  });
  Obj.each(config, (value, key) => {
    if (Type.isString(value)) {
      merged[key] = value;
    }
  });
  return merged;
};

export {
  list,
  find,
  entries,
  commandEntries,
  categories,
  withDefaults
};
