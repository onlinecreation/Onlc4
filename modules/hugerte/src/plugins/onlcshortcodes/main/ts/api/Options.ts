import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { EditorOptions } from 'hugerte/core/api/OptionTypes';

import { ShortcodeDefinition } from './Types';

const option: {
  <K extends keyof EditorOptions>(name: K): (editor: Editor) => EditorOptions[K];
  <T>(name: string): (editor: Editor) => T;
} = (name: string) => (editor: Editor) =>
  editor.options.get(name);

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  // Définitions supplémentaires, au format décrit dans `api/Types.ts`.
  registerOption('onlc_shortcodes_custom', {
    processor: (value) => {
      const valid = Type.isArrayOf(value, Type.isObject);
      return valid ? { value, valid } : { valid: false, message: 'Must be an array of shortcode definitions.' };
    },
    default: []
  });

  registerOption('onlc_shortcodes_exclude', {
    processor: 'string[]',
    default: []
  });

  /**
   * Transforme aussi les codes que le plugin ne connaît pas. Ils deviennent une carte neutre,
   * réécrite telle quelle : c'est utile pour ne pas les abîmer par mégarde, mais cela peut
   * gêner si vos pages contiennent des crochets à d'autres fins.
   */
  registerOption('onlc_shortcodes_show_unknown', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_shortcodes_inject_styles', {
    processor: 'boolean',
    default: true
  });
};

const getCustomShortcodes = option<ShortcodeDefinition[]>('onlc_shortcodes_custom');
const getExcludedShortcodes = option<string[]>('onlc_shortcodes_exclude');
const shouldShowUnknown = option<boolean>('onlc_shortcodes_show_unknown');
const shouldInjectStyles = option<boolean>('onlc_shortcodes_inject_styles');

export {
  register,
  getCustomShortcodes,
  getExcludedShortcodes,
  shouldShowUnknown,
  shouldInjectStyles
};
