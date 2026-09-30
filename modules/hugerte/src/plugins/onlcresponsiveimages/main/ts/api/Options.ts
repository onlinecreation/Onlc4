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

  registerOption('onlc_responsive_images', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_responsive_images_elements', {
    processor: 'string',
    default: 'img'
  });

  registerOption('onlc_responsive_images_height_auto', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_responsive_images_max_percent', {
    processor: 'number',
    default: 100
  });

  registerOption('onlc_responsive_images_precision', {
    processor: 'number',
    default: 2
  });

  registerOption('onlc_responsive_images_container_width', {
    processor: (value) => {
      const valid = value === 'auto' || (Type.isNumber(value) && value > 0);
      return valid ? { value, valid } : { valid: false, message: 'Must be "auto" or a positive number.' };
    },
    default: 'auto'
  });

  registerOption('onlc_responsive_images_convert_existing', {
    processor: 'boolean',
    default: true
  });

  registerOption('onlc_responsive_images_lock_schema', {
    processor: 'boolean',
    default: false
  });
};

const isEnabled = option<boolean>('onlc_responsive_images');
const getElementNames = option<string>('onlc_responsive_images_elements');
const isHeightAuto = option<boolean>('onlc_responsive_images_height_auto');
const getMaxPercent = option<number>('onlc_responsive_images_max_percent');
const getPrecision = option<number>('onlc_responsive_images_precision');
const getContainerWidth = option<number | 'auto'>('onlc_responsive_images_container_width');
const shouldConvertExisting = option<boolean>('onlc_responsive_images_convert_existing');
const shouldLockSchema = option<boolean>('onlc_responsive_images_lock_schema');

export {
  register,
  isEnabled,
  getElementNames,
  isHeightAuto,
  getMaxPercent,
  getPrecision,
  getContainerWidth,
  shouldConvertExisting,
  shouldLockSchema
};
