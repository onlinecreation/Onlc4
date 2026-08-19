import { Arr, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';

import * as Options from '../api/Options';
import { ShortcodeDefinition } from '../api/Types';
import * as ShortcodesData from './ShortcodesData';

/**
 * Registre des codes courts : ceux livrés avec le plugin, puis ceux du projet
 * (`onlc_shortcodes_custom`). Une définition qui reprend un nom existant remplace la définition
 * intégrée, ce qui permet d'adapter un libellé ou d'ajouter un réglage sans toucher au plugin.
 */

const isValid = (value: unknown): value is ShortcodeDefinition => {
  const definition = value as ShortcodeDefinition;
  return Type.isObject(value) && Type.isString(definition.name) && Type.isArray(definition.fields);
};

const list = (editor: Editor): ShortcodeDefinition[] => {
  const custom = Arr.filter(Options.getCustomShortcodes(editor), isValid);
  const overridden = Arr.map(custom, (definition) => definition.name.toLowerCase());
  const excluded = Arr.map(Options.getExcludedShortcodes(editor), (name) => name.toLowerCase());

  const builtIns = Arr.filter(ShortcodesData.getBuiltIns(), (definition) =>
    !Arr.contains(overridden, definition.name.toLowerCase()));

  return Arr.filter(builtIns.concat(custom), (definition) =>
    !Arr.contains(excluded, definition.name.toLowerCase()));
};

const find = (editor: Editor, name: string): Optional<ShortcodeDefinition> =>
  Arr.find(list(editor), (definition) => definition.name.toLowerCase() === name.toLowerCase());

const categories = (editor: Editor): string[] =>
  Arr.foldl(list(editor), (acc: string[], definition) =>
    Arr.contains(acc, definition.category) ? acc : acc.concat([ definition.category ]), []);

export {
  isValid,
  list,
  find,
  categories
};
