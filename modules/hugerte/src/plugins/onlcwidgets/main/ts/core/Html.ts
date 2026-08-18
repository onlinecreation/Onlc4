import { Arr, Obj, Type } from '@ephox/katamari';

/**
 * Markup helpers shared by the built-in widget definitions.
 */

const escape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Renders `name="value"`, or nothing when the value is empty. */
const attr = (name: string, value: string | undefined | null): string =>
  Type.isString(value) && value !== '' ? ` ${name}="${escape(value)}"` : '';

/** Renders a boolean attribute. */
const boolAttr = (name: string, value: boolean): string => value ? ` ${name}` : '';

const classes = (...values: Array<string | undefined | false>): string => {
  const list = Arr.filter(values, (value) => Type.isString(value) && value.trim() !== '') as string[];
  return list.length === 0 ? '' : ` class="${escape(list.join(' ').replace(/\s+/g, ' ').trim())}"`;
};

const style = (declarations: Record<string, string | undefined>): string => {
  const parts: string[] = [];
  Obj.each(declarations, (value, key) => {
    if (Type.isString(value) && value.trim() !== '') {
      parts.push(`${key}: ${value.trim()}`);
    }
  });
  return parts.length === 0 ? '' : ` style="${escape(parts.join('; '))}"`;
};

/** Adds a unit to a bare number, so that `320` and `320px` both work in the dialogs. */
const withUnit = (value: string | undefined, unit = 'px'): string => {
  if (!Type.isString(value) || value.trim() === '') {
    return '';
  }
  const trimmed = value.trim();
  return /^-?[\d.]+$/.test(trimmed) ? `${trimmed}${unit}` : trimmed;
};

const isTrue = (value: string | undefined): boolean => value === 'true' || value === '1' || value === 'on';

const paragraphs = (value: string): string => {
  const blocks = value.split(/\n{2,}/);
  return Arr.map(blocks, (block) => `<p>${escape(block).replace(/\n/g, '<br>')}</p>`).join('');
};

export {
  escape,
  attr,
  boolAttr,
  classes,
  style,
  withUnit,
  isTrue,
  paragraphs
};
