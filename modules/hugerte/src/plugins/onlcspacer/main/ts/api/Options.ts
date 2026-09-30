import { Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { EditorOptions } from 'hugerte/core/api/OptionTypes';

const option: {
  <K extends keyof EditorOptions>(name: K): (editor: Editor) => EditorOptions[K];
  <T>(name: string): (editor: Editor) => T;
} = (name: string) => (editor: Editor) =>
  editor.options.get(name);

const register = (editor: Editor): void => {
  const registerOption = editor.options.register;

  registerOption('onlc_spacer_class', {
    processor: 'string',
    default: 'onlc-spacer'
  });

  registerOption('onlc_spacer_default_height', {
    processor: 'string',
    default: '30px'
  });

  registerOption('onlc_spacer_units', {
    processor: 'string[]',
    default: [ 'px', 'rem', 'vh', '%' ]
  });

  registerOption('onlc_spacer_presets', {
    processor: (value) => {
      const valid = Type.isArrayOf(value, Type.isString);
      return valid ? { value, valid } : { valid: false, message: 'Must be an array of strings.' };
    },
    default: [ '10px', '20px', '30px', '50px', '80px', '120px' ]
  });

  registerOption('onlc_spacer_step', {
    processor: 'number',
    default: 10
  });
};

const getSpacerClass = option<string>('onlc_spacer_class');
const getDefaultHeight = option<string>('onlc_spacer_default_height');
const getUnits = option<string[]>('onlc_spacer_units');
const getPresets = option<string[]>('onlc_spacer_presets');
const getStep = option<number>('onlc_spacer_step');

export {
  register,
  getSpacerClass,
  getDefaultHeight,
  getUnits,
  getPresets,
  getStep
};
